import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
    PencilIcon, 
    ArrowUturnLeftIcon, 
    TrashIcon, 
    CheckCircleIcon,
    ArrowUpTrayIcon,
    ScissorsIcon,
    BookmarkSquareIcon,
    SparklesIcon,
    UserIcon,
    XMarkIcon,
    PlusIcon
} from '@heroicons/react/24/outline';

const STORAGE_KEY = 'civicore_saved_signatories';

/**
 * SignaturePad – multi-mode signature input supporting:
 * 1. Draw signature directly with pen/mouse.
 * 2. Upload photo/scan of signature, crop it, and remove white paper background.
 * 3. Pick from a saved Signatories Library for 1-click official stamping.
 */
const SignaturePad = ({ value, onChange, disabled = false, fieldKey = 'sig' }) => {
    const canvasRef = useRef(null);
    const cropCanvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const historyRef = useRef([]); // Stack of ImageData for undo

    const [isEmpty, setIsEmpty] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [mode, setMode] = useState('draw'); // 'draw' | 'crop' | 'library'

    // ── Crop Mode State ────────────────────────────────────────────────────────
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [cropRect, setCropRect] = useState({ x: 15, y: 25, w: 70, h: 50 }); // in percentages
    const [removePaperBg, setRemovePaperBg] = useState(true);
    const [bgThreshold, setBgThreshold] = useState(210);
    const [cropPreviewUrl, setCropPreviewUrl] = useState(null);
    const [signatoryName, setSignatoryName] = useState('');
    const [signatoryRole, setSignatoryRole] = useState('');
    const [isDraggingCrop, setIsDraggingCrop] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialRect: null });

    // ── Saved Signatories Library State ────────────────────────────────────────
    const [savedSignatories, setSavedSignatories] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    });

    const isNa = value === 'n/a';
    const hasExistingSignature = value && value !== 'n/a' && (value.startsWith('data:image') || value.startsWith('/storage') || value.startsWith('blob:') || value.startsWith('http'));

    // Sync saved signatories to localStorage
    const persistSignatories = (newList) => {
        setSavedSignatories(newList);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
        } catch (e) {
            console.error('Failed to save signatories:', e);
        }
    };

    // ── Draw existing signature onto canvas when entering draw edit mode ───────
    useEffect(() => {
        if (!isEditing || mode !== 'draw' || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        historyRef.current = [];

        if (hasExistingSignature) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setIsEmpty(false);
            };
            img.src = value;
        } else {
            setIsEmpty(true);
        }
    }, [isEditing, mode]);

    // ── Drawing Event Handlers ────────────────────────────────────────────────
    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if (e.touches && e.touches[0]) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const startDraw = useCallback((e) => {
        if (disabled) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (historyRef.current.length > 25) historyRef.current.shift();
        isDrawingRef.current = true;
        lastPosRef.current = getPos(e, canvas);
    }, [disabled]);

    const draw = useCallback((e) => {
        if (!isDrawingRef.current || disabled) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);

        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        lastPosRef.current = pos;
        setIsEmpty(false);
    }, [disabled]);

    const stopDraw = useCallback(() => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        if (canvasRef.current) {
            onChange(canvasRef.current.toDataURL('image/png'));
        }
    }, [onChange]);

    const handleUndo = () => {
        if (!canvasRef.current || historyRef.current.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const prev = historyRef.current.pop();
        ctx.putImageData(prev, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const blank = data.every(v => v === 0);
        if (blank) {
            setIsEmpty(true);
            onChange('n/a');
        } else {
            onChange(canvas.toDataURL('image/png'));
        }
    };

    const handleClear = () => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            historyRef.current = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setIsEmpty(true);
        onChange('n/a');
    };

    // ── Image Cropping Logic ──────────────────────────────────────────────────
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
            setCropImageSrc(loadEvt.target.result);
            setCropRect({ x: 10, y: 20, w: 80, h: 60 });
        };
        reader.readAsDataURL(file);
    };

    // Generate cropped output whenever cropRect, cropImageSrc, or transparency settings change
    useEffect(() => {
        if (!cropImageSrc) {
            setCropPreviewUrl(null);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const sx = Math.max(0, (cropRect.x / 100) * img.width);
            const sy = Math.max(0, (cropRect.y / 100) * img.height);
            const sw = Math.min(img.width - sx, (cropRect.w / 100) * img.width);
            const sh = Math.min(img.height - sy, (cropRect.h / 100) * img.height);

            if (sw <= 0 || sh <= 0) return;

            // Output resolution
            canvas.width = Math.min(600, Math.max(200, sw));
            canvas.height = Math.round(canvas.width * (sh / sw));

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

            // Binarization & White Paper Removal (Transparency)
            if (removePaperBg) {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const d = imgData.data;
                for (let i = 0; i < d.length; i += 4) {
                    const r = d[i];
                    const g = d[i + 1];
                    const b = d[i + 2];
                    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

                    if (brightness >= bgThreshold) {
                        // Background paper -> transparent
                        d[i + 3] = 0;
                    } else {
                        // Dark pen stroke -> crisp dark ink
                        const factor = Math.max(0, 1 - (brightness / bgThreshold));
                        d[i] = Math.min(d[i], 20);
                        d[i + 1] = Math.min(d[i + 1], 30);
                        d[i + 2] = Math.min(d[i + 2], 50);
                        d[i + 3] = Math.min(255, Math.floor(factor * 255 + 100));
                    }
                }
                ctx.putImageData(imgData, 0, 0);
            }

            setCropPreviewUrl(canvas.toDataURL('image/png'));
        };
        img.src = cropImageSrc;
    }, [cropImageSrc, cropRect, removePaperBg, bgThreshold]);

    const handleApplyCropped = () => {
        if (!cropPreviewUrl) return;
        onChange(cropPreviewUrl);
        setIsEmpty(false);
        setIsEditing(false);
    };

    const handleSaveToLibrary = () => {
        if (!cropPreviewUrl) {
            alert('Please select and crop a signature image first.');
            return;
        }
        const name = (signatoryName || 'Official Signatory').trim();
        const role = (signatoryRole || 'Civil Registry Staff').trim();
        const item = {
            id: 'sig_' + Date.now(),
            name,
            role,
            image: cropPreviewUrl,
            createdAt: new Date().toLocaleDateString()
        };
        persistSignatories([item, ...savedSignatories]);
        alert(`Saved "${name}" to Signatories Library!`);
        setSignatoryName('');
        setSignatoryRole('');
    };

    const handleSelectSignatory = (sig) => {
        onChange(sig.image);
        setIsEmpty(false);
        setIsEditing(false);
    };

    const handleDeleteSignatory = (id, e) => {
        e.stopPropagation();
        if (confirm('Remove this saved signatory from your library?')) {
            persistSignatories(savedSignatories.filter(s => s.id !== id));
        }
    };

    // ── Compact View (When Not Editing) ────────────────────────────────────────
    if (!isEditing) {
        return (
            <div className="space-y-1.5 w-full">
                <div
                    className={`relative w-full h-16 border-2 rounded-2xl flex items-center justify-center transition-all overflow-hidden cursor-pointer group ${
                        isNa || !hasExistingSignature
                            ? 'border-dashed border-slate-200 bg-slate-50/60 hover:border-[#d4a574]/60 hover:bg-[#d4a574]/5'
                            : 'border-slate-200 bg-white hover:border-[#d4a574]/60 shadow-xs'
                    }`}
                    onClick={() => !disabled && setIsEditing(true)}
                    title={disabled ? 'Signature (view only)' : 'Click to draw, crop, or pick signature'}
                >
                    {hasExistingSignature ? (
                        <>
                            <img
                                src={value}
                                alt="Signature"
                                className="h-full w-full object-contain p-1.5"
                            />
                            {!disabled && (
                                <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                    <PencilIcon className="w-4 h-4 text-[#d4a574]" />
                                    <span className="text-xs font-bold text-slate-800">Edit / Change Signature</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-400 group-hover:text-[#d4a574] transition-colors">
                            {isNa ? (
                                <>
                                    <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-widest">n/a</span>
                                    {!disabled && <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#d4a574]">· Click to add</span>}
                                </>
                            ) : (
                                <>
                                    <PencilIcon className="w-4 h-4" />
                                    <span className="text-xs font-bold">Draw, Crop, or Pick Signature</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Quick Pick Signatory Shortcuts when available */}
                {!disabled && savedSignatories.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                            <BookmarkSquareIcon className="w-3 h-3 text-[#d4a574]" />
                            Quick Pick:
                        </span>
                        {savedSignatories.slice(0, 3).map((sig) => (
                            <button
                                key={sig.id}
                                type="button"
                                onClick={() => handleSelectSignatory(sig)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9.5px] font-bold bg-slate-100 hover:bg-[#d4a574]/15 hover:text-[#b37f48] text-slate-700 border border-slate-200/80 transition-all shrink-0 cursor-pointer"
                                title={`Apply ${sig.name} (${sig.role})`}
                            >
                                <span className="truncate max-w-[100px]">{sig.name}</span>
                            </button>
                        ))}
                        {savedSignatories.length > 3 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(true);
                                    setMode('library');
                                }}
                                className="text-[9px] font-bold text-[#d4a574] hover:underline shrink-0"
                            >
                                +{savedSignatories.length - 3} more
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ── Full Editor Mode (Draw | Crop | Library) ───────────────────────────────
    return (
        <div className="w-full border-2 border-[#d4a574]/50 rounded-2xl overflow-hidden bg-white shadow-lg animate-in fade-in-50 duration-200">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setMode('draw')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            mode === 'draw'
                                ? 'bg-white text-slate-800 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <PencilIcon className="w-3 h-3 text-[#d4a574]" />
                        Draw
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('crop')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            mode === 'crop'
                                ? 'bg-white text-[#d4a574] shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <ScissorsIcon className="w-3 h-3 text-[#d4a574]" />
                        Crop Image
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('library')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            mode === 'library'
                                ? 'bg-white text-indigo-600 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <BookmarkSquareIcon className="w-3 h-3 text-indigo-500" />
                        Signatories ({savedSignatories.length})
                    </button>
                </div>

                <div className="flex items-center gap-1.5">
                    {mode === 'draw' && (
                        <>
                            <button
                                type="button"
                                onClick={handleUndo}
                                disabled={historyRef.current?.length === 0}
                                title="Undo last stroke"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all cursor-pointer"
                            >
                                <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                title="Clear signature (set to n/a)"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white bg-[#d4a574] hover:bg-[#c49060] transition-all cursor-pointer shadow-xs"
                    >
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Done
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: 1. DRAW MODE */}
            {mode === 'draw' && (
                <div className="relative">
                    <canvas
                        ref={canvasRef}
                        id={`sig-pad-${fieldKey}`}
                        width={600}
                        height={120}
                        className="w-full touch-none cursor-crosshair bg-white block"
                        style={{ height: '120px' }}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                    />

                    {isEmpty && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-slate-300 text-xs font-bold select-none">Sign here with mouse or touch →</span>
                        </div>
                    )}

                    <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                        <span>Draw with mouse or finger · Leave blank for n/a</span>
                        <button
                            type="button"
                            onClick={() => setMode('crop')}
                            className="font-bold text-[#d4a574] hover:underline"
                        >
                            Or crop signature from paper →
                        </button>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 2. CROP IMAGE MODE */}
            {mode === 'crop' && (
                <div className="p-3 space-y-3 bg-white">
                    {!cropImageSrc ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-[#d4a574] rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50 hover:bg-[#d4a574]/5 group"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <div className="w-10 h-10 rounded-full bg-[#d4a574]/10 text-[#d4a574] flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                                <ArrowUpTrayIcon className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-slate-700">Upload Signature Photo or Scanned Paper</p>
                            <p className="text-[10px] text-slate-400 mt-1">Supports PNG, JPG, WEBP. You can crop the exact signature area.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Image with Visual Crop Overlay */}
                            <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-900 select-none max-h-56 flex items-center justify-center">
                                <img
                                    src={cropImageSrc}
                                    alt="Source paper"
                                    className="max-h-56 max-w-full object-contain pointer-events-none opacity-85"
                                />

                                {/* Interactive Crop Rectangle Box */}
                                <div
                                    className="absolute border-2 border-[#d4a574] bg-[#d4a574]/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
                                    style={{
                                        left: `${cropRect.x}%`,
                                        top: `${cropRect.y}%`,
                                        width: `${cropRect.w}%`,
                                        height: `${cropRect.h}%`,
                                    }}
                                >
                                    <div className="absolute top-1 left-1 bg-[#d4a574] text-white text-[8px] font-black uppercase px-1 rounded">
                                        Signature Box
                                    </div>
                                </div>
                            </div>

                            {/* Position & Size Adjusters */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px]">
                                <div>
                                    <label className="font-bold text-slate-500 block mb-0.5">X Position ({cropRect.x}%)</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="80"
                                        value={cropRect.x}
                                        onChange={(e) => setCropRect(r => ({ ...r, x: Number(e.target.value) }))}
                                        className="w-full accent-[#d4a574]"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-500 block mb-0.5">Y Position ({cropRect.y}%)</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="80"
                                        value={cropRect.y}
                                        onChange={(e) => setCropRect(r => ({ ...r, y: Number(e.target.value) }))}
                                        className="w-full accent-[#d4a574]"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-500 block mb-0.5">Width ({cropRect.w}%)</label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        value={cropRect.w}
                                        onChange={(e) => setCropRect(r => ({ ...r, w: Number(e.target.value) }))}
                                        className="w-full accent-[#d4a574]"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-500 block mb-0.5">Height ({cropRect.h}%)</label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        value={cropRect.h}
                                        onChange={(e) => setCropRect(r => ({ ...r, h: Number(e.target.value) }))}
                                        className="w-full accent-[#d4a574]"
                                    />
                                </div>
                            </div>

                            {/* Transparency & Clean Ink Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={removePaperBg}
                                        onChange={(e) => setRemovePaperBg(e.target.checked)}
                                        className="rounded border-slate-300 text-[#d4a574] focus:ring-[#d4a574]"
                                    />
                                    <SparklesIcon className="w-3.5 h-3.5 text-[#d4a574]" />
                                    <span>Make Paper Transparent (Ink Only)</span>
                                </label>

                                {removePaperBg && (
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <span>Threshold:</span>
                                        <input
                                            type="range"
                                            min="150"
                                            max="245"
                                            value={bgThreshold}
                                            onChange={(e) => setBgThreshold(Number(e.target.value))}
                                            className="w-24 accent-[#d4a574]"
                                        />
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline"
                                >
                                    Upload Different Image
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </div>

                            {/* Cropped Output Preview */}
                            {cropPreviewUrl && (
                                <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 space-y-2">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-black text-slate-600 uppercase tracking-wider">Cropped Signature Preview</span>
                                        <span className="text-emerald-600 font-bold">✓ Ready to paste</span>
                                    </div>
                                    <div 
                                        className="h-16 w-full rounded-lg border border-slate-200 flex items-center justify-center p-1 overflow-hidden"
                                        style={{
                                            backgroundImage: 'repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%)',
                                            backgroundSize: '16px 16px'
                                        }}
                                    >
                                        <img
                                            src={cropPreviewUrl}
                                            alt="Crop preview"
                                            className="h-full w-full object-contain"
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleApplyCropped}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white bg-[#d4a574] hover:bg-[#c49060] transition-all shadow-sm cursor-pointer"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Apply to Certificate
                                        </button>
                                    </div>

                                    {/* Save to Signatories Library Form */}
                                    <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Official's Name (e.g. Maria Santos)"
                                            value={signatoryName}
                                            onChange={(e) => setSignatoryName(e.target.value)}
                                            className="flex-1 min-w-[140px] px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#d4a574]"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Title / Role (e.g. Civil Registrar)"
                                            value={signatoryRole}
                                            onChange={(e) => setSignatoryRole(e.target.value)}
                                            className="flex-1 min-w-[130px] px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#d4a574]"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSaveToLibrary}
                                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
                                        >
                                            <BookmarkSquareIcon className="w-3.5 h-3.5 text-[#d4a574]" />
                                            Save to Library
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: 3. SIGNATORIES LIBRARY */}
            {mode === 'library' && (
                <div className="p-3 space-y-3 bg-white max-h-72 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Official Signatories Library</h4>
                            <p className="text-[10px] text-slate-500">Pick an official to paste their pre-cropped signature onto paper</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMode('crop')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-[#d4a574] bg-[#d4a574]/10 hover:bg-[#d4a574]/20 transition-all"
                        >
                            <PlusIcon className="w-3 h-3" />
                            Add Signatory
                        </button>
                    </div>

                    {savedSignatories.length === 0 ? (
                        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 p-4">
                            <BookmarkSquareIcon className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                            <p className="text-xs font-bold text-slate-600">No Saved Signatures Yet</p>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                                Upload a photo of an official signature in the <strong>Crop Image</strong> tab and click "Save to Library" to store it for permanent reuse!
                            </p>
                            <button
                                type="button"
                                onClick={() => setMode('crop')}
                                className="mt-3 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#d4a574] hover:bg-[#c49060] transition-all"
                            >
                                Crop First Signature
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {savedSignatories.map((sig) => (
                                <div
                                    key={sig.id}
                                    onClick={() => handleSelectSignatory(sig)}
                                    className="p-2.5 rounded-xl border border-slate-200 hover:border-[#d4a574] bg-white hover:bg-[#d4a574]/5 transition-all cursor-pointer group flex flex-col justify-between"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <div className="truncate">
                                            <p className="text-xs font-black text-slate-800 truncate">{sig.name}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{sig.role || 'Signatory'}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteSignatory(sig.id, e)}
                                            className="p-1 text-slate-300 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors"
                                            title="Delete signature"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Thumbnail */}
                                    <div 
                                        className="h-12 w-full rounded-lg border border-slate-100 flex items-center justify-center p-1 bg-slate-50 overflow-hidden mb-2"
                                        style={{
                                            backgroundImage: 'repeating-conic-gradient(#f8fafc 0% 25%, #ffffff 0% 50%)',
                                            backgroundSize: '12px 12px'
                                        }}
                                    >
                                        <img
                                            src={sig.image}
                                            alt={sig.name}
                                            className="h-full w-full object-contain"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium">
                                        <span>Added {sig.createdAt}</span>
                                        <span className="font-bold text-[#d4a574] group-hover:underline">Click to Apply →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SignaturePad;
