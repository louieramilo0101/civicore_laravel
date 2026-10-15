import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowPathIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    CheckCircleIcon,
    CpuChipIcon,
    SparklesIcon,
    ServerStackIcon,
    CircleStackIcon
} from '@heroicons/react/24/outline';

/**
 * SystemRestartModal
 * Provides SuperAdmin with an interface to reboot the application,
 * flush backend framework caches (views, routes, queries, OPcache),
 * purge local browser memory/session caches, and smoothly re-initialize CiviCORE.
 */
const SystemRestartModal = ({ isOpen, onClose }) => {
    const [isRestarting, setIsRestarting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stepText, setStepText] = useState('');
    const [error, setError] = useState(null);

    if (!isOpen && !isRestarting) return null;

    const handleRestart = async () => {
        setIsRestarting(true);
        setError(null);
        setProgress(15);
        setStepText('Connecting to CiviCORE System Engine...');

        try {
            // Stage 1: Call backend restart endpoint
            setTimeout(() => {
                setProgress(40);
                setStepText('Flushing backend cache, view buffers & routing tables...');
            }, 400);

            const response = await fetch(`${window.location.origin}/api/system/restart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Server returned an error during restart.');
            }

            // Stage 2: Reset client cache & memory
            setTimeout(() => {
                setProgress(75);
                setStepText('Purging client session storage & memory buffers...');
                try {
                    // Retain auth in localStorage, purge temporary state
                    sessionStorage.clear();
                } catch (e) {}
            }, 900);

            // Stage 3: Finalize and reload
            setTimeout(() => {
                setProgress(100);
                setStepText('System engine refreshed! Re-initializing application...');
                setTimeout(() => {
                    window.location.reload();
                }, 600);
            }, 1500);

        } catch (err) {
            console.error('System restart failed:', err);
            setError(err.message || 'Failed to restart application.');
            setIsRestarting(false);
            setProgress(0);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={isRestarting ? undefined : onClose}
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 text-slate-100"
                >
                    {/* Glowing Top Border Accent */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-[#d4a574] to-emerald-500" />

                    {!isRestarting ? (
                        /* Confirmation Dialog */
                        <div className="p-6 sm:p-8 space-y-6">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="cursor-pointer absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>

                            {/* Header */}
                            <div className="flex items-start gap-4">
                                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-inner shrink-0">
                                    <ArrowPathIcon className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-black text-white tracking-tight">Restart Application</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                            SuperAdmin
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        System feeling laggy or unresponsive? Rebooting clears memory buffers, flushed stale caches, and refreshes the system engine.
                                    </p>
                                </div>
                            </div>

                            {/* Error Banner if any */}
                            {error && (
                                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                                    <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-rose-400" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* What will happen card */}
                            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono">
                                    What happens during restart:
                                </p>
                                <ul className="space-y-2.5 text-xs text-slate-300">
                                    <li className="flex items-center gap-2.5">
                                        <div className="p-1 rounded-md bg-amber-500/15 text-amber-400 shrink-0">
                                            <CircleStackIcon className="w-4 h-4" />
                                        </div>
                                        <span><strong>Flush Framework Caches:</strong> Clears Blade view cache, route cache, config cache, and database query cache.</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                        <div className="p-1 rounded-md bg-indigo-500/15 text-indigo-400 shrink-0">
                                            <ServerStackIcon className="w-4 h-4" />
                                        </div>
                                        <span><strong>Reset Queue Workers & Memory:</strong> Gracefully signals worker processes and frees PHP OPcache memory.</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                        <div className="p-1 rounded-md bg-emerald-500/15 text-emerald-400 shrink-0">
                                            <SparklesIcon className="w-4 h-4" />
                                        </div>
                                        <span><strong>Purge Client Storage:</strong> Clears browser session cache while safely preserving your active login session.</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    className="cursor-pointer px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRestart}
                                    className="cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#d4a574] hover:from-amber-600 hover:to-[#c29363] text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                                >
                                    <ArrowPathIcon className="w-4 h-4" />
                                    <span>Restart Application Now</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* In-Progress Reboot State */
                        <div className="p-8 sm:p-10 text-center space-y-6">
                            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                                {/* Orbiting glow rings */}
                                <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                                <div className="absolute inset-2 rounded-full border-2 border-emerald-500/30 border-b-emerald-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
                                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xl">
                                    <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain animate-pulse" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight">Restarting Application Engine</h3>
                                <p className="text-xs text-amber-400/90 font-medium mt-1 font-mono">{stepText}</p>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-amber-500 via-[#d4a574] to-emerald-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                />
                            </div>

                            <p className="text-[11px] text-slate-500 font-medium">
                                Please do not close this window. Your page will automatically refresh once completed.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SystemRestartModal;
