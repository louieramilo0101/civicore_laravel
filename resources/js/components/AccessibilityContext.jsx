import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext(null);

/**
 * Provides comprehensive accessibility, display preferences, and dark mode state across CiviCORE.
 */
export const AccessibilityProvider = ({ children }) => {
    // ── Theme State: 'light' | 'dark' | 'system' ──────────────────────────
    const [theme, setThemeState] = useState(() => {
        try {
            return localStorage.getItem('civicore_theme') || 'system';
        } catch {
            return 'system';
        }
    });

    const [isDark, setIsDark] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            const saved = localStorage.getItem('civicore_theme') || 'system';
            if (saved === 'dark') return true;
            if (saved === 'light') return false;
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch {
            return false;
        }
    });

    // ── Font Scaling: 'normal' | 'large' | 'xlarge' ──────────────────────
    const [fontScale, setFontScaleState] = useState(() => {
        try {
            return localStorage.getItem('civicore_font_scale') || 'normal';
        } catch {
            return 'normal';
        }
    });

    // ── High Contrast: boolean ───────────────────────────────────────────
    const [highContrast, setHighContrastState] = useState(() => {
        try {
            return localStorage.getItem('civicore_contrast') === 'true';
        } catch {
            return false;
        }
    });

    // ── Dyslexia-Friendly Typography (Lexend): boolean ───────────────────
    const [dyslexiaFont, setDyslexiaFontState] = useState(() => {
        try {
            return localStorage.getItem('civicore_dyslexia') === 'true';
        } catch {
            return false;
        }
    });

    // ── Reduced Motion: boolean ──────────────────────────────────────────
    const [reducedMotion, setReducedMotionState] = useState(() => {
        try {
            return localStorage.getItem('civicore_reduced_motion') === 'true';
        } catch {
            return false;
        }
    });

    // ── Reading Guide Focus Bar: boolean ─────────────────────────────────
    const [readingGuide, setReadingGuideState] = useState(() => {
        try {
            return localStorage.getItem('civicore_reading_guide') === 'true';
        } catch {
            return false;
        }
    });

    // ── Language: 'en' | 'fil' ───────────────────────────────────────────
    const [lang, setLangState] = useState(() => {
        try {
            return localStorage.getItem('civicore_lang') || 'en';
        } catch {
            return 'en';
        }
    });

    // ── Settings Modal Global State ──────────────────────────────────────
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);

    // ── Synchronize Theme & System OS Preference ─────────────────────────
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const applyTheme = () => {
            const effectiveDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
            setIsDark(effectiveDark);
            if (effectiveDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        applyTheme();

        const handleChange = () => {
            if (theme === 'system') applyTheme();
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const setTheme = (mode) => {
        setThemeState(mode);
        try {
            localStorage.setItem('civicore_theme', mode);
        } catch {}
    };

    const toggleTheme = () => {
        const next = isDark ? 'light' : 'dark';
        setTheme(next);
    };

    // ── Synchronize Font Scale ───────────────────────────────────────────
    useEffect(() => {
        document.documentElement.classList.remove('font-scale-lg', 'font-scale-xl');
        if (fontScale === 'large') document.documentElement.classList.add('font-scale-lg');
        if (fontScale === 'xlarge') document.documentElement.classList.add('font-scale-xl');
    }, [fontScale]);

    const setFontScale = (scale) => {
        setFontScaleState(scale);
        try {
            localStorage.setItem('civicore_font_scale', scale);
        } catch {}
    };

    // ── Synchronize High Contrast ────────────────────────────────────────
    useEffect(() => {
        if (highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    }, [highContrast]);

    const setHighContrast = (val) => {
        setHighContrastState(val);
        try {
            localStorage.setItem('civicore_contrast', val ? 'true' : 'false');
        } catch {}
    };

    // ── Synchronize Dyslexia-Friendly Font ────────────────────────────────
    useEffect(() => {
        if (dyslexiaFont) {
            document.documentElement.classList.add('dyslexia-font');
        } else {
            document.documentElement.classList.remove('dyslexia-font');
        }
    }, [dyslexiaFont]);

    const setDyslexiaFont = (val) => {
        setDyslexiaFontState(val);
        try {
            localStorage.setItem('civicore_dyslexia', val ? 'true' : 'false');
        } catch {}
    };

    // ── Synchronize Reduced Motion ───────────────────────────────────────
    useEffect(() => {
        if (reducedMotion) {
            document.documentElement.classList.add('reduced-motion');
        } else {
            document.documentElement.classList.remove('reduced-motion');
        }
    }, [reducedMotion]);

    const setReducedMotion = (val) => {
        setReducedMotionState(val);
        try {
            localStorage.setItem('civicore_reduced_motion', val ? 'true' : 'false');
        } catch {}
    };

    // ── Synchronize Reading Guide ────────────────────────────────────────
    const setReadingGuide = (val) => {
        setReadingGuideState(val);
        try {
            localStorage.setItem('civicore_reading_guide', val ? 'true' : 'false');
        } catch {}
    };

    // ── Synchronize Language ─────────────────────────────────────────────
    const setLang = (newLang) => {
        setLangState(newLang);
        try {
            localStorage.setItem('civicore_lang', newLang);
            window.dispatchEvent(new Event('civicore_lang_changed'));
        } catch {}
    };

    // ── Reset all accessibility settings ─────────────────────────────────
    const resetAll = () => {
        setTheme('system');
        setFontScale('normal');
        setHighContrast(false);
        setDyslexiaFont(false);
        setReducedMotion(false);
        setReadingGuide(false);
    };

    return (
        <AccessibilityContext.Provider
            value={{
                theme,
                setTheme,
                toggleTheme,
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
                openSettings,
                closeSettings,
            }}
        >
            {children}
            {readingGuide && <ReadingGuideOverlay />}
        </AccessibilityContext.Provider>
    );
};

/** Reading guide ruler overlay tracking vertical cursor position. */
const ReadingGuideOverlay = () => {
    const [mouseY, setMouseY] = useState(-100);

    useEffect(() => {
        const handleMove = (e) => setMouseY(e.clientY);
        window.addEventListener('mousemove', handleMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    if (mouseY < 0) return null;

    return (
        <div
            className="pointer-events-none fixed left-0 right-0 z-[999999] h-10 -translate-y-1/2 border-y-2 border-[#d4a574] bg-[#d4a574]/15 shadow-[0_0_20px_rgba(212,165,116,0.3)] transition-[top] duration-75"
            style={{ top: `${mouseY}px` }}
        />
    );
};

/** Hook to access accessibility and theme settings. */
export const useAccessibility = () => {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
};

export default AccessibilityContext;

