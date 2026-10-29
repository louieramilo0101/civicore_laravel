import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    SunIcon,
    MoonIcon,
    EyeIcon,
    AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { useAccessibility } from './AccessibilityContext.jsx';

/**
 * Floating Accessibility Widget for Citizens (Philippine Web Accessibility Standard).
 * Fixed at the bottom-right corner for quick PWD / Senior Citizen assistance.
 */
export default function AccessibilityWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const widgetRef = useRef(null);
    const {
        isDark,
        toggleTheme,
        fontScale,
        setFontScale,
        highContrast,
        setHighContrast,
        dyslexiaFont,
        setDyslexiaFont,
        readingGuide,
        setReadingGuide,
        openSettings,
    } = useAccessibility();

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (widgetRef.current && !widgetRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={widgetRef} className="fixed bottom-5 right-5 z-40 font-sans print:hidden">
            {/* Expanded Quick Accessibility Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 15 }}
                        transition={{ duration: 0.18 }}
                        className="mb-3 w-80 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 ring-1 ring-black/5"
                        role="region"
                        aria-label="Quick Accessibility Menu"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xl">♿</span>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        Accessibility Options
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        For PWD &amp; Senior Citizens
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                                aria-label="Close accessibility menu"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Quick Text Resizing */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                                <span>Text Size</span>
                                <span className="text-[10px] text-[#d4a574] font-black uppercase">
                                    {fontScale === 'normal' ? '100%' : fontScale === 'large' ? '115%' : '130%'}
                                </span>
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setFontScale('normal')}
                                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                        fontScale === 'normal'
                                            ? 'bg-[#d4a574] text-slate-950 border-[#d4a574]'
                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    A
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFontScale('large')}
                                    className={`py-1.5 px-2 rounded-xl text-[13px] font-black border transition-all cursor-pointer ${
                                        fontScale === 'large'
                                            ? 'bg-[#d4a574] text-slate-950 border-[#d4a574]'
                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    A+
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFontScale('xlarge')}
                                    className={`py-1.5 px-2 rounded-xl text-[15px] font-black border transition-all cursor-pointer ${
                                        fontScale === 'xlarge'
                                            ? 'bg-[#d4a574] text-slate-950 border-[#d4a574]'
                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    A++
                                </button>
                            </div>
                        </div>

                        {/* Quick 2x2 Toggles */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {/* Dark Mode */}
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                                    isDark
                                        ? 'bg-amber-500/10 border-[#d4a574] text-slate-900 dark:text-white'
                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    {isDark ? <MoonIcon className="w-4 h-4 text-[#d4a574]" /> : <SunIcon className="w-4 h-4 text-amber-500" />}
                                    <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-[#d4a574]' : 'bg-slate-300'}`} />
                                </div>
                                <span className="text-[11px] font-black">
                                    {isDark ? 'Dark Mode' : 'Light Mode'}
                                </span>
                            </button>

                            {/* High Contrast */}
                            <button
                                type="button"
                                onClick={() => setHighContrast(!highContrast)}
                                className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                                    highContrast
                                        ? 'bg-amber-500/10 border-[#d4a574] text-slate-900 dark:text-white'
                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <EyeIcon className="w-4 h-4 text-[#d4a574]" />
                                    <span className={`w-2 h-2 rounded-full ${highContrast ? 'bg-[#d4a574]' : 'bg-slate-300'}`} />
                                </div>
                                <span className="text-[11px] font-black">
                                    High Contrast
                                </span>
                            </button>

                            {/* Dyslexia Font */}
                            <button
                                type="button"
                                onClick={() => setDyslexiaFont(!dyslexiaFont)}
                                className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                                    dyslexiaFont
                                        ? 'bg-amber-500/10 border-[#d4a574] text-slate-900 dark:text-white'
                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-bold text-[#d4a574]">Aa</span>
                                    <span className={`w-2 h-2 rounded-full ${dyslexiaFont ? 'bg-[#d4a574]' : 'bg-slate-300'}`} />
                                </div>
                                <span className="text-[11px] font-black">
                                    Dyslexia Font
                                </span>
                            </button>

                            {/* Reading Guide */}
                            <button
                                type="button"
                                onClick={() => setReadingGuide(!readingGuide)}
                                className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                                    readingGuide
                                        ? 'bg-amber-500/10 border-[#d4a574] text-slate-900 dark:text-white'
                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs">📏</span>
                                    <span className={`w-2 h-2 rounded-full ${readingGuide ? 'bg-[#d4a574]' : 'bg-slate-300'}`} />
                                </div>
                                <span className="text-[11px] font-black">
                                    Reading Ruler
                                </span>
                            </button>
                        </div>

                        {/* More Settings Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                openSettings();
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                            <AdjustmentsHorizontalIcon className="w-4 h-4 text-[#d4a574]" />
                            <span>All Display Settings...</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Trigger Pill */}
            <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-slate-900/90 dark:bg-[#1e293b]/90 text-white hover:text-white border border-[#d4a574]/40 shadow-xl shadow-black/20 backdrop-blur-md transition-all cursor-pointer group"
                aria-label="Open accessibility options"
                title="Accessibility & PWD Assistance (♿)"
            >
                <div className="w-7 h-7 rounded-full bg-[#d4a574]/20 border border-[#d4a574]/40 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                    ♿
                </div>
                <span className="text-xs font-extrabold tracking-tight text-slate-200 group-hover:text-[#d4a574] transition-colors pr-1 hidden sm:inline-block">
                    Accessibility
                </span>
            </motion.button>
        </div>
    );
}

