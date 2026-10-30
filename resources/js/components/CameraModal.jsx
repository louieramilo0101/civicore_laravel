import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon, ArrowsRightLeftIcon,
    SparklesIcon, ArrowDownTrayIcon,
    VideoCameraIcon, CheckIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
    createCaptureEngine,
    detectCaptureEnvironment,
    detectDocumentCorners,
    extractFlatDocument,
    createCornerEditor
} from './captureEngine';

/**
 * Modern CamScanner Modal powered directly by Scanic WASM
 */
const CameraModal = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef(null);
    const editorContainerRef = useRef(null);
    const cornerEditorInstanceRef = useRef(null);
    const fileInputRef = useRef(null);
    const nativeCameraInputRef = useRef(null);
    const activeStreamRef = useRef(null);
    const modalOpenRef = useRef(isOpen);

    const [stream, setStream] = useState(null);
    const [facingMode, setFacingMode] = useState(() => detectCaptureEnvironment() === 'desktop' ? 'user' : 'environment');
    const [hasPermission, setHasPermission] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [streamStuck, setStreamStuck] = useState(false);

    // Preview / Corner Editor States
    const [capturedMedia, setCapturedMedia] = useState(null); // { canvas, dataUrl, file }
    const [currentCorners, setCurrentCorners] = useState(null);
    const [isProcessingWarp, setIsProcessingWarp] = useState(false);

    const captureEngine = useMemo(() => createCaptureEngine(), []);
    const isMobileDevice = useMemo(() => detectCaptureEnvironment() === 'mobile', []);

    // Camera Stream Management
    const startCamera = async () => {
        stopCamera();
        try {
            const newStream = await captureEngine.startPreview({
                videoElement: videoRef.current,
                facingMode
            });

            if (!modalOpenRef.current) {
                if (newStream?.getTracks) {
                    newStream.getTracks().forEach(t => t.stop());
                }
                return;
            }

            activeStreamRef.current = newStream;
            setStream(newStream);
            setHasPermission(true);
            setStreamStuck(false);
        } catch (err) {
            console.warn("Camera start failed:", err);
            setHasPermission(false);
        }
    };

    const stopCamera = () => {
        if (activeStreamRef.current) {
            try {
                activeStreamRef.current.getTracks().forEach(t => t.stop());
            } catch (e) {}
            activeStreamRef.current = null;
        }
        if (stream) {
            try {
                stream.getTracks().forEach(t => t.stop());
            } catch (e) {}
        }
        if (videoRef.current) {
            try {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            } catch (e) {}
        }
        try {
            captureEngine.stop();
        } catch (e) {}
        setStream(null);
    };

    useEffect(() => {
        modalOpenRef.current = isOpen;
        if (isOpen) {
            setCapturedMedia(null);
            setCurrentCorners(null);
            setIsProcessingWarp(false);
            startCamera();
        } else {
            stopCamera();
            if (cornerEditorInstanceRef.current) {
                try { cornerEditorInstanceRef.current.destroy(); } catch (e) {}
                cornerEditorInstanceRef.current = null;
            }
        }
        return () => stopCamera();
    }, [isOpen, facingMode]);

    // Attach stream to video tag when ready
    useEffect(() => {
        if (stream && videoRef.current) {
            if (videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
            }
            if (videoRef.current.paused) {
                videoRef.current.play().catch(e => console.warn("Video play failed:", e));
            }
        }
    }, [stream]);

    // Initialize Scanic's native CornerEditor when capturedMedia is set
    useEffect(() => {
        if (!capturedMedia?.canvas || !editorContainerRef.current) return;

        let active = true;

        const initEditor = async () => {
            // First run auto corner detection
            const detected = await detectDocumentCorners(capturedMedia.canvas);
            if (!active) return;

            const w = capturedMedia.canvas.width;
            const h = capturedMedia.canvas.height;

            const initialCorners = detected || {
                topLeft: { x: w * 0.1, y: h * 0.1 },
                topRight: { x: w * 0.9, y: h * 0.1 },
                bottomRight: { x: w * 0.9, y: h * 0.9 },
                bottomLeft: { x: w * 0.1, y: h * 0.9 }
            };

            setCurrentCorners(initialCorners);

            if (cornerEditorInstanceRef.current) {
                try { cornerEditorInstanceRef.current.destroy(); } catch (e) {}
                cornerEditorInstanceRef.current = null;
            }

            editorContainerRef.current.innerHTML = '';

            try {
                const editor = createCornerEditor({
                    container: editorContainerRef.current,
                    image: capturedMedia.canvas,
                    corners: initialCorners,
                    magnifier: {
                        enabled: true,
                        size: 90,
                        zoom: 2.2,
                        borderColor: '#d4a574',
                        borderWidth: 3
                    },
                    toolbar: {
                        enabled: false // We use our own high-end UI bar
                    },
                    theme: {
                        accent: '#d4a574',
                        edgeColor: '#10b981',
                        handleColor: '#d4a574',
                        edgeWidth: 3,
                        handleSize: isMobileDevice ? 24 : 18,
                        handleHit: 44
                    },
                    onChange: (corners) => {
                        setCurrentCorners(corners);
                    }
                });

                cornerEditorInstanceRef.current = editor;
            } catch (err) {
                console.error("Failed to mount Scanic corner editor:", err);
            }
        };

        initEditor();

        return () => {
            active = false;
            if (cornerEditorInstanceRef.current) {
                try { cornerEditorInstanceRef.current.destroy(); } catch (e) {}
                cornerEditorInstanceRef.current = null;
            }
        };
    }, [capturedMedia, isMobileDevice]);

    const handleClose = () => {
        modalOpenRef.current = false;
        stopCamera();
        onClose();
    };

    const toggleCamera = () => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');

    const capturePhoto = async () => {
        if (!videoRef.current || !stream) {
            openFilePicker();
            return;
        }

        setIsCapturing(true);
        const captured = await captureEngine.capture({
            videoElement: videoRef.current,
            quality: 0.95
        });

        if (captured) {
            setCapturedMedia(captured);
            stopCamera();
        }
        setIsCapturing(false);
    };

    const handleConfirmCrop = async () => {
        if (!capturedMedia?.canvas) return;

        setIsProcessingWarp(true);
        try {
            const corners = cornerEditorInstanceRef.current
                ? cornerEditorInstanceRef.current.getCorners()
                : currentCorners;

            const flattened = await extractFlatDocument(capturedMedia.canvas, corners);

            if (flattened) {
                onCapture({
                    file: flattened.file,
                    dataUrl: flattened.dataUrl,
                    corners: null, // already perspective corrected
                    wasFlattened: true
                });
                handleClose();
            } else {
                // Fallback to captured original
                onCapture({
                    file: capturedMedia.file,
                    dataUrl: capturedMedia.dataUrl,
                    corners: null,
                    wasFlattened: false
                });
                handleClose();
            }
        } catch (err) {
            console.error("Flatten confirm failed:", err);
        } finally {
            setIsProcessingWarp(false);
        }
    };

    const handleRetake = () => {
        if (cornerEditorInstanceRef.current) {
            try { cornerEditorInstanceRef.current.destroy(); } catch (e) {}
            cornerEditorInstanceRef.current = null;
        }
        setCapturedMedia(null);
        setCurrentCorners(null);
        startCamera();
    };

    const openFilePicker = () => fileInputRef.current?.click();

    const handleFileUpload = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            onCapture({
                file,
                corners: null,
                wasFlattened: false
            });
            handleClose();
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);

            setCapturedMedia({
                canvas,
                file,
                dataUrl: canvas.toDataURL('image/jpeg', 0.95)
            });
            stopCamera();
        };
        img.src = url;
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/85 backdrop-blur-md p-0 md:p-6 overflow-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full h-full md:max-w-4xl md:h-[680px] bg-slate-950 md:rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden text-white"
            >
                {/* Header */}
                <div className="p-4 lg:p-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md z-30 shrink-0">
                    <button
                        onClick={handleClose}
                        className="p-2.5 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all cursor-pointer"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-[#d4a574]/30 rounded-full">
                        <SparklesIcon className="w-4 h-4 text-[#d4a574] animate-pulse" />
                        <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            {capturedMedia ? 'Adjust Document Corners' : 'Scanic Document Scanner'}
                        </span>
                    </div>
                    {!capturedMedia ? (
                        <button
                            onClick={toggleCamera}
                            className="p-2.5 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all cursor-pointer"
                            title="Switch Front/Rear Camera"
                        >
                            <ArrowsRightLeftIcon className="w-5 h-5" />
                        </button>
                    ) : <div className="w-10" />}
                </div>

                {/* Viewport Area */}
                <div className="flex-1 w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                    {capturedMedia ? (
                        /* PHASE 2: Scanic Native Interactive Corner Editor */
                        <div
                            ref={editorContainerRef}
                            className="w-full h-full relative flex items-center justify-center overflow-hidden touch-none"
                        />
                    ) : (hasPermission === false || streamStuck) ? (
                        /* Camera Offline Fallback */
                        <div className="p-6 text-center max-w-sm mx-auto flex flex-col items-center gap-4 z-30">
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full animate-bounce">
                                <VideoCameraIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base">Camera Unavailable</h3>
                                <p className="text-xs text-white/60 leading-relaxed mt-1">
                                    Direct camera feed was blocked or is offline. You can upload a photo or select an existing scan.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 w-full mt-2">
                                <button
                                    onClick={() => nativeCameraInputRef.current?.click()}
                                    className="w-full py-3 bg-[#d4a574] hover:bg-[#c39463] text-slate-950 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-lg shadow-[#d4a574]/20 flex items-center justify-center gap-2"
                                >
                                    <VideoCameraIcon className="w-4 h-4" />
                                    <span>Snap with Phone Camera</span>
                                </button>
                                <button
                                    onClick={openFilePicker}
                                    className="w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-xs font-bold border border-white/10 transition-all cursor-pointer"
                                >
                                    Browse Photo / PDF
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Live Video Viewfinder */
                        <div className="w-full h-full relative flex items-center justify-center">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            {/* Document Alignment Frame Guide */}
                            <div className="absolute inset-8 md:inset-12 border-2 border-dashed border-[#d4a574]/60 rounded-3xl pointer-events-none flex items-center justify-center">
                                <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase tracking-widest text-[#d4a574] font-bold">
                                    Align Certificate Within Frame
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Control Bar */}
                <div className="p-4 lg:p-5 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-30">
                    {capturedMedia ? (
                        <>
                            <button
                                onClick={handleRetake}
                                disabled={isProcessingWarp}
                                className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                <span>Retake</span>
                            </button>
                            <button
                                onClick={handleConfirmCrop}
                                disabled={isProcessingWarp}
                                className="flex-1 max-w-sm py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                            >
                                <CheckIcon className="w-5 h-5 stroke-[3]" />
                                <span>{isProcessingWarp ? 'Flattening Document...' : 'Confirm & Flatten'}</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={openFilePicker}
                                className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer"
                                title="Browse from Device"
                            >
                                <ArrowDownTrayIcon className="w-5 h-5 rotate-180" />
                            </button>
                            <button
                                onClick={capturePhoto}
                                disabled={isCapturing}
                                className="flex-1 max-w-md py-4 rounded-2xl bg-white hover:bg-white/90 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl active:scale-95"
                            >
                                <VideoCameraIcon className="w-5 h-5" />
                                <span>Capture Document</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Hidden Native File Inputs */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                />
                <input
                    ref={nativeCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </motion.div>
        </div>,
        document.body
    );
};

export default CameraModal;
