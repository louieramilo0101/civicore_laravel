import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowPathIcon,
    XMarkIcon,
    CheckIcon,
    SparklesIcon,
    ArrowsPointingOutIcon,
    ArrowUturnLeftIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';

/**
 * ImagePostFxModal
 * Allows rotating (90° steps), toggling black & white document filter,
 * and interactively cropping/adjusting document borders before attaching & uploading.
 */
const ImagePostFxModal = ({ isOpen, file, onClose, onApply }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [rotation, setRotation] = useState(0);
    const [isBnw, setIsBnw] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // 4 Corner coordinates (in percentage 0 - 100)
    const [corners, setCorners] = useState({
        tl: { x: 5, y: 5 },
        tr: { x: 95, y: 5 },
        br: { x: 95, y: 95 },
        bl: { x: 5, y: 95 }
    });

    const containerRef = useRef(null);
    const draggingCornerRef = useRef(null);

    // Load file into blob preview when opened
    useEffect(() => {
        if (!isOpen || !file) {
            setImageSrc(null);
            setRotation(0);
            setIsBnw(false);
            setCorners({
                tl: { x: 5, y: 5 },
                tr: { x: 95, y: 5 },
                br: { x: 95, y: 95 },
                bl: { x: 5, y: 95 }
            });
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setImageSrc(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [isOpen, file]);

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const handleResetCrop = () => {
        setCorners({
            tl: { x: 5, y: 5 },
            tr: { x: 95, y: 5 },
            br: { x: 95, y: 95 },
            bl: { x: 5, y: 95 }
        });
    };

    const handleFullCrop = () => {
        setCorners({
            tl: { x: 0, y: 0 },
            tr: { x: 100, y: 0 },
            br: { x: 100, y: 100 },
            bl: { x: 0, y: 100 }
        });
    };

    // Drag handle calculation
    const handlePointerDown = (cornerKey, e) => {
        e.preventDefault();
        e.stopPropagation();
        draggingCornerRef.current = cornerKey;
    };

    const handlePointerMove = (e) => {
        if (!draggingCornerRef.current || !containerRef.current) return;
        if (e.cancelable) e.preventDefault();

        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

        setCorners(prev => ({
            ...prev,
            [draggingCornerRef.current]: {
                x: Number(x.toFixed(1)),
                y: Number(y.toFixed(1))
            }
        }));
    };

    const handlePointerUp = () => {
        draggingCornerRef.current = null;
    };

    // Process canvas and create updated File object
    const handleApplyFx = async () => {
        if (!imageSrc || isProcessing) return;
        setIsProcessing(true);

        try {
            const processedFile = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const minX = Math.max(0, Math.min(img.width - 1, Math.round(Math.min(corners.tl.x, corners.bl.x, corners.tr.x, corners.br.x) / 100 * img.width)));
                        const maxX = Math.max(minX + 1, Math.min(img.width, Math.round(Math.max(corners.tl.x, corners.bl.x, corners.tr.x, corners.br.x) / 100 * img.width)));
                        const minY = Math.max(0, Math.min(img.height - 1, Math.round(Math.min(corners.tl.y, corners.bl.y, corners.tr.y, corners.br.y) / 100 * img.height)));
                        const maxY = Math.max(minY + 1, Math.min(img.height, Math.round(Math.max(corners.tl.y, corners.bl.y, corners.tr.y, corners.br.y) / 100 * img.height)));

                        const cropW = Math.max(10, maxX - minX);
                        const cropH = Math.max(10, maxY - minY);

                        const isSwapped = rotation === 90 || rotation === 270;
                        const outW = isSwapped ? cropH : cropW;
                        const outH = isSwapped ? cropW : cropH;

                        const canvas = document.createElement('canvas');
                        canvas.width = outW;
                        canvas.height = outH;
                        const ctx = canvas.getContext('2d');

                        if (isBnw) {
                            ctx.filter = 'grayscale(100%) contrast(115%) brightness(102%)';
                        }

                        ctx.translate(outW / 2, outH / 2);
                        ctx.rotate((rotation * Math.PI) / 180);

                        ctx.drawImage(
                            img,
                            minX, minY, cropW, cropH,
                            -cropW / 2, -cropH / 2, cropW, cropH
                        );

                        // Fallback pixel contrast loop if browser didn't apply ctx.filter
                        if (isBnw && !ctx.filter) {
                            const imgData = ctx.getImageData(0, 0, outW, outH);
                            const d = imgData.data;
                            for (let i = 0; i < d.length; i += 4) {
                                const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                                const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.2 + 128));
                                d[i] = contrast;
                                d[i + 1] = contrast;
                                d[i + 2] = contrast;
                            }
                            ctx.putImageData(imgData, 0, 0);
                        }

                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error('Failed to encode enhanced image'));
                                return;
                            }
                            const baseName = (file?.name || 'document_scan.jpg').replace(/\.[^/.]+$/, '');
                            const finalFile = new File([blob], `${baseName}_enhanced.jpg`, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(finalFile);
                        }, 'image/jpeg', 0.90);
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = () => reject(new Error('Failed to load image for processing'));
                img.src = imageSrc;
            });

            onApply(processedFile);
        } catch (err) {
            console.error('Post-FX processing failed:', err);
            // Fallback to original file on failure
            onApply(file);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden max-h-[92vh]"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>Document Post-FX Editor</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d4a574]/20 text-[#d4a574] border border-[#d4a574]/30 normal-case">
                                        Scan Enhancer
                                    </span>
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    Adjust rotation, apply black & white document filter, and drag corners to crop.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                            title="Close"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Viewport Toolbar */}
                    <div className="px-6 py-3 bg-black/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                        {/* Quick Crop Presets */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Crop:</span>
                            <button
                                type="button"
                                onClick={handleResetCrop}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer text-[11px]"
                            >
                                <ArrowUturnLeftIcon className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Reset Margins</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleFullCrop}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer text-[11px]"
                            >
                                <ArrowsPointingOutIcon className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Full Page</span>
                            </button>
                        </div>

                        {/* Effects (Rotate + B&W) */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleRotate}
                                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                title="Rotate 90 degrees clockwise"
                            >
                                <ArrowPathIcon className="w-4 h-4 text-amber-400" />
                                <span>Rotate ({rotation}°)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsBnw(prev => !prev)}
                                className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border ${
                                    isBnw
                                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                                        : 'bg-white/10 border-white/10 text-slate-300 hover:bg-white/15'
                                }`}
                            >
                                <span className={`w-2.5 h-2.5 rounded-full ${isBnw ? 'bg-white' : 'bg-slate-400'}`}></span>
                                <span>{isBnw ? 'B&W Active' : 'Make B&W'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Interactive Preview Canvas / Workspace */}
                    <div
                        className="flex-1 min-h-[380px] max-h-[58vh] bg-slate-950 p-6 flex items-center justify-center overflow-hidden relative select-none"
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        {imageSrc ? (
                            <div
                                ref={containerRef}
                                className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-xl overflow-hidden"
                                style={{
                                    width: 'fit-content',
                                    height: 'fit-content'
                                }}
                            >
                                {/* Rotated & Filtered Image */}
                                <img
                                    src={imageSrc}
                                    alt="Document Scan Preview"
                                    className="max-h-[50vh] max-w-[80vw] object-contain block transition-transform duration-200"
                                    style={{
                                        transform: `rotate(${rotation}deg)`,
                                        filter: isBnw ? 'grayscale(100%) contrast(115%) brightness(102%)' : 'none'
                                    }}
                                    draggable={false}
                                />

                                {/* SVG Crop Overlay with Dark Outside and Transparent Inside */}
                                <svg
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                >
                                    {/* Shaded Mask Outside Selection */}
                                    <path
                                        d={`M 0 0 H 100 V 100 H 0 Z M ${corners.tl.x} ${corners.tl.y} L ${corners.tr.x} ${corners.tr.y} L ${corners.br.x} ${corners.br.y} L ${corners.bl.x} ${corners.bl.y} Z`}
                                        fillRule="evenodd"
                                        fill="rgba(15, 23, 42, 0.65)"
                                    />
                                    {/* Crop Boundary Border */}
                                    <polygon
                                        points={`${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`}
                                        fill="none"
                                        stroke="#d4a574"
                                        strokeWidth="1.2"
                                        strokeDasharray="3 2"
                                    />
                                </svg>

                                {/* 4 Draggable Corner Handles */}
                                {[
                                    { key: 'tl', label: '1', coord: corners.tl },
                                    { key: 'tr', label: '2', coord: corners.tr },
                                    { key: 'br', label: '3', coord: corners.br },
                                    { key: 'bl', label: '4', coord: corners.bl }
                                ].map(({ key, label, coord }) => (
                                    <div
                                        key={key}
                                        onPointerDown={(e) => handlePointerDown(key, e)}
                                        className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#d4a574] text-slate-950 font-black text-[11px] flex items-center justify-center shadow-lg shadow-black/60 border-2 border-white cursor-grab active:cursor-grabbing hover:scale-125 transition-transform z-20 touch-none"
                                        style={{
                                            left: `${coord.x}%`,
                                            top: `${coord.y}%`
                                        }}
                                        title={`Corner handle ${label}`}
                                    >
                                        {label}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-slate-500">
                                <PhotoIcon className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                                <p className="text-xs font-bold">No Image Loaded</p>
                            </div>
                        )}
                    </div>

                    {/* Footer / Action Controls */}
                    <div className="px-6 py-4 bg-white/[0.03] border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span className="truncate max-w-[220px]" title={file?.name}>
                                {file?.name || 'document_scan.jpg'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => onApply(file)}
                                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                            >
                                Skip FX (Keep Original)
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyFx}
                                disabled={isProcessing}
                                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        <span>Enhancing...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon className="w-4 h-4 stroke-[3]" />
                                        <span>Apply & Attach Scan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ImagePostFxModal;
