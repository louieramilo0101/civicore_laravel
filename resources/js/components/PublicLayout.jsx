import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bars3Icon,
    XMarkIcon,
    SunIcon,
    MoonIcon,
    AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { useAccessibility } from './AccessibilityContext.jsx';

/** Provides the shared shell for unauthenticated portal pages. */
export default function PublicLayout({ children }) {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { isDark, toggleTheme, openSettings } = useAccessibility();

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'About', path: '/about' },
        { name: 'Digital Services', path: '/services' },
        { name: 'Contact Directory', path: '/contact' }
    ];

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen flex flex-col bg-[#0f172a] relative overflow-hidden font-sans">
            {/* Accessible Skip Link for Keyboard / Screen Reader Users */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999999] focus:px-4 focus:py-2.5 focus:bg-[#d4a574] focus:text-slate-950 focus:font-black focus:text-xs focus:rounded-xl focus:shadow-2xl focus:outline-none"
            >
                Skip to main content / Lumaktaw sa nilalaman
            </a>

            {/* Background Effects */}
            <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23d4a574' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`
                }}
            />

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-5 sm:px-6 md:px-12 pt-4 pb-2 sm:pt-6 sm:pb-3 flex justify-between items-center z-50 relative"
            >
                <Link to="/" className="flex items-center gap-3 sm:gap-4 group cursor-pointer">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#d4a574]/10 to-transparent rounded-2xl flex items-center justify-center border border-[#d4a574]/20 shadow-lg shadow-[#d4a574]/5 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                        <img src="/logo.png" alt="CiviCORE Logo" className="w-full h-full object-contain p-2" />
                    </div>
                    <div>
                        <div className="font-extrabold text-white text-xl sm:text-2xl tracking-tight leading-none uppercase drop-shadow-sm">
                            Civi<span className="text-[#d4a574]">CORE</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#d4a574] inline-block shadow-[0_0_8px_rgba(212,165,116,0.8)]"></span>
                            Naic, Cavite
                        </div>
                    </div>
                </Link>

                <div className="flex items-center gap-2.5 sm:gap-6 lg:gap-8">
                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6 lg:gap-10 text-sm font-semibold text-slate-300">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`transition-colors relative after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:bg-[#d4a574] after:transition-all after:duration-300 
                                    ${location.pathname === link.path ? 'text-white after:w-full' : 'hover:text-white after:w-0 hover:after:w-full'}
                                `}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>



                    {/* Mobile Menu Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        className="md:hidden p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                        aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    >
                        {mobileMenuOpen ? (
                            <XMarkIcon className="w-5 h-5 text-[#d4a574]" />
                        ) : (
                            <Bars3Icon className="w-5 h-5 text-slate-200" />
                        )}
                    </button>
                </div>
            </motion.header>

            {/* Mobile Navigation Drawer */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="md:hidden border-b border-white/10 bg-[#0a0f1d]/95 backdrop-blur-2xl px-5 py-4 relative z-40 overflow-hidden shadow-2xl"
                    >
                        <nav className="flex flex-col space-y-1.5">
                            {navLinks.map((link) => {
                                const isActive = location.pathname === link.path;
                                return (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive
                                                ? 'bg-[#d4a574]/15 text-[#d4a574] border border-[#d4a574]/30'
                                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <span>{link.name}</span>
                                        {isActive && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] shadow-[0_0_8px_rgba(212,165,116,0.8)]" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="pt-3 mt-2 border-t border-white/10">
                            <Link
                                to="/ticket-request"
                                onClick={() => setMobileMenuOpen(false)}
                                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4a574] to-[#c49a67] text-[#0f172a] text-center font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#d4a574]/20 flex items-center justify-center"
                            >
                                Online Request
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main id="main-content" className="flex-1 relative z-10 focus:outline-none">
                {children}
            </main>

            {/* Fixed Dark Mode + Accessibility Buttons — bottom-right (only shown on /ticket-request and ticket pages) */}
            {(location.pathname.startsWith('/ticket-request') || location.pathname.startsWith('/ticket-status') || location.pathname.startsWith('/ticket/')) && (
                <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/10 bg-[#0f172a]/80 backdrop-blur-md text-slate-200 hover:text-white hover:border-[#d4a574]/50 hover:bg-[#1a2f4a]/80 shadow-lg transition-all"
                    >
                        {isDark
                            ? <SunIcon className="w-5 h-5 text-[#d4a574]" />
                            : <MoonIcon className="w-5 h-5 text-slate-300" />
                        }
                    </button>
                    <button
                        type="button"
                        onClick={openSettings}
                        aria-label="Open accessibility settings"
                        className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/10 bg-[#0f172a]/80 backdrop-blur-md text-slate-200 hover:text-white hover:border-[#d4a574]/50 hover:bg-[#1a2f4a]/80 shadow-lg transition-all"
                    >
                        <AdjustmentsHorizontalIcon className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/5 bg-[#0a0f1d] text-center relative z-20">
                <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain opacity-50" />
                        <span className="text-white font-black tracking-widest uppercase text-sm opacity-50">CiviCORE</span>
                        <span className="text-slate-600">•</span>
                        <a
                            href="https://www.facebook.com/gloria.bago.184"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-slate-400 hover:text-[#d4a574] transition-colors flex items-center gap-1.5"
                        >
                            <span>Facebook</span>
                        </a>
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">
                        &copy; {new Date().getFullYear()} Municipality of Naic. Digital Governance Initiative.
                    </p>
                </div>
            </footer>
        </div>
    );
}
