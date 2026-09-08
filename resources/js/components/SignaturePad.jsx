import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PencilIcon, ArrowUturnLeftIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

/**
 * SignaturePad – canvas-based signature input.
 *
 * Props:
 *   value     {string}  Current value: a base64 data-URL, 'n/a', or ''.
 *   onChange  {fn}      Called with new value when signature changes or is cleared.
 *   disabled  {bool}    Disables drawing when true (view-only mode).
 *   fieldKey  {string}  Used for the canvas element ID.
 */
/** Captures, edits, and returns a handwritten signature as an image value. */
const SignaturePad = ({ value, onChange, disabled = false, fieldKey = 'sig' }) => {
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const historyRef = useRef([]); // Stack of ImageData for undo
    const [isEmpty, setIsEmpty] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // ── Determine current state ──────────────────────────────────────────────
    const isNa = value === 'n/a';
    const hasExistingSignature = value && value !== 'n/a' && value.startsWith('data:image');

    // ── Draw existing signature onto canvas when entering edit mode ──────────
    useEffect(() => {
        if (!isEditing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        historyRef.current = [];

        if (hasExistingSignature) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setIsEmpty(false);
            };
            img.src = value;
        } else {
            setIsEmpty(true);
        }
    }, [isEditing]);

    // ── Mouse/Touch drawing helpers ──────────────────────────────────────────
    /** Converts pointer coordinates into canvas-local coordinates. */
    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if (e.touches) {
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
        // Save state for undo
        const ctx = canvas.getContext('2d');
        historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (historyRef.current.length > 20) historyRef.current.shift(); // Limit history
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
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        lastPosRef.current = pos;
        setIsEmpty(false);
    }, [disabled]);

    const stopDraw = useCallback(() => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        // Emit updated value
        if (canvasRef.current) {
            onChange(canvasRef.current.toDataURL('image/png'));
        }
    }, [onChange]);

    /** Removes the most recent signature stroke. */
    const handleUndo = () => {
        if (!canvasRef.current || historyRef.current.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const prev = historyRef.current.pop();
        ctx.putImageData(prev, 0, 0);
        // Check if canvas is now blank
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const blank = data.every(v => v === 0);
        if (blank) {
            setIsEmpty(true);
            onChange('n/a');
        } else {
            onChange(canvas.toDataURL('image/png'));
        }
    };

    /** Clears the current signature canvas and value. */
    const handleClear = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        historyRef.current = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        onChange('n/a');
    };

    /** Serializes the signature canvas and returns it to the parent. */
    const handleDone = () => {
        if (isEmpty) onChange('n/a');
        setIsEditing(false);
    };

    // ── Compact display when not editing ─────────────────────────────────────
    if (!isEditing) {
        return (
            <div
                className={`relative w-full h-16 border-2 rounded-2xl flex items-center justify-center transition-all overflow-hidden cursor-pointer group ${
                    isNa || !hasExistingSignature
                        ? 'border-dashed border-slate-200 bg-slate-50/60 hover:border-[#d4a574]/60 hover:bg-[#d4a574]/5'
                        : 'border-slate-200 bg-white hover:border-[#d4a574]/60'
                }`}
                onClick={() => !disabled && setIsEditing(true)}
                title={disabled ? 'Signature (view only)' : 'Click to draw signature'}
            >
                {hasExistingSignature ? (
                    <>
                        <img
                            src={value}
                            alt="Signature"
                            className="h-full w-full object-contain p-1"
                        />
                        {!disabled && (
                            <div className="absolute inset-0 bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <PencilIcon className="w-4 h-4 text-[#d4a574]" />
                                <span className="text-xs font-bold text-slate-700">Edit Signature</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-[#d4a574] transition-colors">
                        {isNa ? (
                            <>
                                <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-widest">n/a</span>
                                {!disabled && <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#d4a574]">· Click to draw</span>}
                            </>
                        ) : (
                            <>
                                <PencilIcon className="w-4 h-4" />
                                <span className="text-xs font-bold">Click to draw signature</span>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ── Full signature pad in edit mode ───────────────────────────────────────
    return (
        <div className="w-full border-2 border-[#d4a574]/40 rounded-2xl overflow-hidden bg-white shadow-md">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                    <PencilIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Draw Signature</span>
                </div>
                <div className="flex items-center gap-1.5">
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
                    <button
                        type="button"
                        onClick={handleDone}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white bg-[#d4a574] hover:bg-[#c49060] transition-all cursor-pointer shadow-sm"
                    >
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Done
                    </button>
                </div>
            </div>

            {/* Canvas */}
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
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '38px', height: '120px', position: 'relative' }}>
                    <span className="text-slate-200 text-xs font-bold select-none">Sign here →</span>
                </div>
            )}

            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] text-slate-400 font-medium">
                    Draw with mouse or finger · Leave blank to mark as <span className="font-black">n/a</span>
                </p>
            </div>
        </div>
    );
};

export default SignaturePad;
