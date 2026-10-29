import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    SunIcon,
    MoonIcon,
    ComputerDesktopIcon,
    AdjustmentsHorizontalIcon,
    LanguageIcon,
    EyeIcon,
    ArrowPathIcon,
    CloudIcon,
    CpuChipIcon,
    ShieldCheckIcon,
    CheckIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAccessibility } from './AccessibilityContext.jsx';

/**
 * Universal Settings & Accessibility Modal.
 * Accessible from the Public portal, Staff header, and Accounts management.
 */
export default function SettingsModal() {
    const {
        theme,
        setTheme,
        isDark,
        fontScale,
        setFontScale,
        highContrast,
        setHighContrast,
        dyslexiaFont,
        setDyslexiaFont,
        reducedMotion,
        setReducedMotion,
        readingGuide,
        setReadingGuide,
        lang,
        setLang,
        resetAll,
        isSettingsOpen,
        closeSettings,
    } = useAccessibility();

    const [activeTab, setActiveTab] = useState('appearance'); // 'appearance' | 'accessibility' | 'language' | 'system'

    // Check if user is authenticated and is SuperAdmin for system settings
    const userStr = typeof window !== 'undefined' ? (localStorage.getItem('user') || sessionStorage.getItem('user')) : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const isSuperAdmin = user?.role === 'SuperAdmin';

    if (!isSettingsOpen) return null;

    const t = {
        en: {
            title: 'System & Display Settings',
            subtitle: 'Configure theme, visual accessibility, typography, and portal options.',
            tabAppearance: 'Appearance & Theme',
            tabAccessibility: 'Accessibility (PWD / Senior)',
            tabLanguage: 'Language',
            tabSystem: 'System Admin',
            themeLabel: 'Color Theme',
            themeDesc: 'Select your preferred visual mode for reducing eye fatigue.',
            themeLight: 'Light Mode',
            themeLightDesc: 'Crisp, high-clarity daylight theme',
            themeDark: 'Dark Mode',
            themeDarkDesc: 'Midnight navy for reduced eye strain',
            themeSystem: 'System Sync',
            themeSystemDesc: 'Automatically follows your OS preference',
            fontScaleLabel: 'Text Size Scaling',
            fontScaleDesc: 'Increase font size across all portals without breaking tables or layout.',
            fontNormal: 'Normal (100%)',
            fontLarge: 'Large (115%)',
            fontXLarge: 'Extra Large (130%)',
            highContrastLabel: 'High Contrast Mode (WCAG AAA)',
            highContrastDesc: 'Boosts outline definition, border contrast, and text sharpness (7:1+ ratio).',
            dyslexiaLabel: 'Dyslexia-Friendly Font (Lexend)',
            dyslexiaDesc: 'Applies an anti-crowding typeface with widened spacing for reading comfort.',
            readingGuideLabel: 'Reading Guide Line',
            readingGuideDesc: 'Draws a focus bar tracking your cursor to help read long registry documents.',
            reducedMotionLabel: 'Reduced Motion',
            reducedMotionDesc: 'Disables card entry animations and carousel slide transitions.',
            langLabel: 'Portal Language',
            langDesc: 'Choose your default language for explanations, instructions, and navigation.',
            resetBtn: 'Reset to Defaults',
            doneBtn: 'Save & Close',
        },
        fil: {
            title: 'Mga Setting at Aksibilidad',
            subtitle: 'Isaayos ang tema, hitsura ng teksto, at mga opsyon para sa PWD at nakatatanda.',
            tabAppearance: 'Hitsura at Tema',
            tabAccessibility: 'Aksibilidad (PWD / Senior)',
            tabLanguage: 'Wika',
            tabSystem: 'Admin ng Sistema',
            themeLabel: 'Kulay ng Tema',
            themeDesc: 'Pumili ng angkop na tema para maiwasan ang pagkapagod ng mata.',
            themeLight: 'Maliwanag',
            themeLightDesc: 'Malinaw at angkop sa maliwanag na paligid',
            themeDark: 'Madilim (Dark Mode)',
            themeDarkDesc: 'Midnight navy upang hindi sumakit ang mata',
            themeSystem: 'Awtomatiko sa Device',
            themeSystemDesc: 'Sumusunod sa kasalukuyang tema ng iyong kompyuter o selpon',
            fontScaleLabel: 'Sukat ng Titik (Font Size)',
            fontScaleDesc: 'Palakihin ang mga titik sa buong portal nang maayos at madaling basahin.',
            fontNormal: 'Karaniwan (100%)',
            fontLarge: 'Malaki (115%)',
            fontXLarge: 'Napakalaki (130%)',
            highContrastLabel: 'Mataas na Contrast (WCAG AAA)',
            highContrastDesc: 'Pinalalakas ang mga linya at talim ng kulay upang mas madaling mabasa ng may kapansanan sa paningin.',
            dyslexiaLabel: 'Tekstong Angkop sa Dyslexia (Lexend)',
            dyslexiaDesc: 'Gumagamit ng espesyal na font na may malawak na espasyo sa pagitan ng mga titik.',
            readingGuideLabel: 'Gabay sa Pagbasa (Reading Ruler)',
            readingGuideDesc: 'Naglalagay ng linyang sumusunod sa cursor para gabayan ang pagbasa ng mahahabang tala.',
            reducedMotionLabel: 'Bawasan ang Galaw (Reduced Motion)',
            reducedMotionDesc: 'Tinatanggal ang mga animation at slide carousel para maiwasan ang pagkahilo.',
            langLabel: 'Pangunahing Wika',
            langDesc: 'Pumili sa pagitan ng Ingles at Filipino para sa mga paliwanag.',
            resetBtn: 'Ibalik sa Karaniwan',
            doneBtn: 'I-save at Isara',
        }
    }[lang] || {};

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-[#d4a574]/20 border border-[#d4a574]/30 text-[#d4a574] flex items-center justify-center shadow-inner">
                                <AdjustmentsHorizontalIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                                    {t.title}
                                    <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#d4a574]/20 text-[#d4a574] border border-[#d4a574]/30">
                                        Accessibility
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5 font-medium">{t.subtitle}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeSettings}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            aria-label="Close settings"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/80 dark:bg-slate-900/60 overflow-x-auto gap-2 py-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('appearance')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                                activeTab === 'appearance'
                                    ? 'bg-white dark:bg-slate-800 text-[#bc8a59] dark:text-[#d4a574] shadow-xs border border-slate-200 dark:border-slate-700'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <SunIcon className="w-4 h-4" />
                            <span>{t.tabAppearance}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('accessibility')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                                activeTab === 'accessibility'
                                    ? 'bg-white dark:bg-slate-800 text-[#bc8a59] dark:text-[#d4a574] shadow-xs border border-slate-200 dark:border-slate-700'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <EyeIcon className="w-4 h-4" />
                            <span>{t.tabAccessibility}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('language')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                                activeTab === 'language'
                                    ? 'bg-white dark:bg-slate-800 text-[#bc8a59] dark:text-[#d4a574] shadow-xs border border-slate-200 dark:border-slate-700'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <LanguageIcon className="w-4 h-4" />
                            <span>{t.tabLanguage}</span>
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                        {/* ── Tab: Appearance & Theme ── */}
                        {activeTab === 'appearance' && (
                            <div className="space-y-5">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{t.themeLabel}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.themeDesc}</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Light Mode */}
                                    <button
                                        type="button"
                                        onClick={() => setTheme('light')}
                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                                            theme === 'light'
                                                ? 'bg-amber-500/10 border-[#d4a574] text-slate-900 dark:text-white ring-2 ring-[#d4a574]/40 shadow-sm'
                                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                                <SunIcon className="w-5 h-5" />
                                            </div>
                                            {theme === 'light' && (
                                                <span className="w-5 h-5 rounded-full bg-[#d4a574] text-slate-900 flex items-center justify-center">
                                                    <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs font-black">{t.themeLight}</div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{t.themeLightDesc}</div>
                                    </button>

                                    {/* Dark Mode */}
                                    <button
                                        type="button"
                                        onClick={() => setTheme('dark')}
                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                                            theme === 'dark'
                                                ? 'bg-amber-500/10 border-[#d4a574] text-slate-900 dark:text-white ring-2 ring-[#d4a574]/40 shadow-sm'
                                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                                                <MoonIcon className="w-5 h-5" />
                                            </div>
                                            {theme === 'dark' && (
                                                <span className="w-5 h-5 rounded-full bg-[#d4a574] text-slate-900 flex items-center justify-center">
                                                    <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs font-black">{t.themeDark}</div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{t.themeDarkDesc}</div>
                                    </button>

                                    {/* System Sync */}
                                    <button
                                        type="button"
                                        onClick={() => setTheme('system')}
                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                                            theme === 'system'
                                                ? 'bg-amber-500/10 border-[#d4a574] text-slate-900 dark:text-white ring-2 ring-[#d4a574]/40 shadow-sm'
                                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-9 h-9 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                                                <ComputerDesktopIcon className="w-5 h-5" />
                                            </div>
                                            {theme === 'system' && (
                                                <span className="w-5 h-5 rounded-full bg-[#d4a574] text-slate-900 flex items-center justify-center">
                                                    <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs font-black">{t.themeSystem}</div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{t.themeSystemDesc}</div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Accessibility (PWD & Seniors) ── */}
                        {activeTab === 'accessibility' && (
                            <div className="space-y-6">
                                {/* Font Scaling */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                            {t.fontScaleLabel}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.fontScaleDesc}</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setFontScale('normal')}
                                            className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                                fontScale === 'normal'
                                                    ? 'bg-[#d4a574] text-slate-950 border-[#d4a574] shadow-xs'
                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {t.fontNormal}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFontScale('large')}
                                            className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                                fontScale === 'large'
                                                    ? 'bg-[#d4a574] text-slate-950 border-[#d4a574] shadow-xs'
                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {t.fontLarge}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFontScale('xlarge')}
                                            className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                                fontScale === 'xlarge'
                                                    ? 'bg-[#d4a574] text-slate-950 border-[#d4a574] shadow-xs'
                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {t.fontXLarge}
                                        </button>
                                    </div>
                                </div>

                                {/* High Contrast */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                            {t.highContrastLabel}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.highContrastDesc}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHighContrast(!highContrast)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            highContrast ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                highContrast ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Dyslexia-Friendly Font (Lexend) */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                            {t.dyslexiaLabel}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.dyslexiaDesc}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDyslexiaFont(!dyslexiaFont)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            dyslexiaFont ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                dyslexiaFont ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Reading Guide Focus Line */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                            {t.readingGuideLabel}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.readingGuideDesc}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReadingGuide(!readingGuide)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            readingGuide ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                readingGuide ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Reduced Motion */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                            {t.reducedMotionLabel}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.reducedMotionDesc}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReducedMotion(!reducedMotion)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            reducedMotion ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                reducedMotion ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Language ── */}
                        {activeTab === 'language' && (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{t.langLabel}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.langDesc}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setLang('en')}
                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                            lang === 'en'
                                                ? 'bg-amber-500/10 border-[#d4a574] ring-2 ring-[#d4a574]/40 text-slate-900 dark:text-white shadow-xs'
                                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black uppercase tracking-wider text-[#d4a574]">EN</span>
                                            {lang === 'en' && <CheckIcon className="w-4 h-4 text-[#d4a574]" />}
                                        </div>
                                        <div className="font-extrabold text-sm">English</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Official Standard English</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setLang('fil')}
                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                            lang === 'fil'
                                                ? 'bg-amber-500/10 border-[#d4a574] ring-2 ring-[#d4a574]/40 text-slate-900 dark:text-white shadow-xs'
                                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black uppercase tracking-wider text-[#d4a574]">FIL</span>
                                            {lang === 'fil' && <CheckIcon className="w-4 h-4 text-[#d4a574]" />}
                                        </div>
                                        <div className="font-extrabold text-sm">Filipino</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Tagalog para sa mamamayan</div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={resetAll}
                            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            <span>{t.resetBtn}</span>
                        </button>

                        <button
                            type="button"
                            onClick={closeSettings}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d4a574] to-[#bc8a59] text-slate-950 font-black text-xs hover:brightness-105 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            {t.doneBtn}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

