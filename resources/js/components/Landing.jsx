import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon, MegaphoneIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const DYNAMIC_WORDS = [
    'PRESERVING.',
    'PROTECTING.',
    'ARCHIVING.',
    'HONORING.',
    'SAFEGUARDING.',
    'AUTHENTICATING.'
];

/** Renders the public portal landing page and service entry points. */
export default function Landing() {
    const navigate = useNavigate();

    const [config, setConfig] = useState(null);
    const [wordIndex, setWordIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setWordIndex((prev) => (prev + 1) % DYNAMIC_WORDS.length);
        }, 2800);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetch('/api/public/config', { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
                return res.json();
            })
            .then(data => setConfig(data))
            .catch(err => console.error(err));
    }, []);

    // Animation Variants for staggered, smooth entrance
    const containerVars = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.25 }
        }
    };

    const itemVars = {
        hidden: { opacity: 0, y: 25 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }
    };

    return (
        <div className="relative overflow-visible pb-12 sm:pb-16">
            {/* Ambient Background Lighting FX */}
            <div className="absolute top-0 right-[-5%] w-[55%] h-[65%] bg-[#d4a574]/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute top-[20%] right-[10%] w-[35%] h-[40%] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

            {/* Hero Section */}
            <main className="min-h-[70vh] flex items-center pt-2 sm:pt-4 md:pt-6 pb-8 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20 z-10 relative">
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-12 items-center">
                    
                    {/* Left Column: Hero Title, Subtitle, and CTAs */}
                    <motion.div
                        variants={containerVars}
                        initial="hidden"
                        animate="visible"
                        className="lg:col-span-7 xl:col-span-7 w-full"
                    >
                        {/* Status Badge */}
                        <motion.div variants={itemVars} className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="px-3 py-1 rounded-full bg-[#d4a574]/10 border border-[#d4a574]/20 text-[#d4a574] text-xs font-bold uppercase tracking-widest">
                                Office of the Civil Registrar
                            </span>
                            <span className="text-slate-400 text-xs sm:text-sm font-medium">
                                Official Registry Platform
                            </span>
                        </motion.div>

                        {/* Main Headline with Dynamic Flip Animated Word */}
                        <motion.h1
                            variants={itemVars}
                            className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black text-white leading-[1.05] tracking-tight mb-4 sm:mb-6"
                        >
                            RECORDING.<br />
                            <div className="relative block overflow-hidden h-[1.1em] my-0.5 leading-none drop-shadow-md">
                                <AnimatePresence initial={false}>
                                    <motion.div
                                        key={DYNAMIC_WORDS[wordIndex]}
                                        initial={{ y: '100%', opacity: 0, rotateX: -60 }}
                                        animate={{ y: '0%', opacity: 1, rotateX: 0 }}
                                        exit={{ y: '-100%', opacity: 0, rotateX: 60 }}
                                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                        className="absolute inset-0 flex items-center text-transparent bg-clip-text bg-gradient-to-r from-[#d4a574] via-[#f3d0a2] to-[#d4a574] font-black whitespace-nowrap origin-bottom"
                                    >
                                        {DYNAMIC_WORDS[wordIndex]}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                            SERVING.
                        </motion.h1>

                        <motion.div variants={itemVars} className="space-y-4 sm:space-y-6">
                            <p className="text-slate-300 text-base md:text-lg max-w-2xl leading-relaxed font-light border-l-2 border-[#d4a574]/30 pl-4 sm:pl-5">
                                The centralized hub for authenticating and managing civil events—Births, Marriages, and Deaths—for the Municipality of Naic.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1 sm:pt-2">
                                <motion.button
                                    whileHover={{ scale: 1.02, translateY: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/ticket-request')}
                                    className="bg-gradient-to-r from-[#d4a574] to-[#c49a67] hover:from-[#dfb17e] hover:to-[#ce9f6b] text-[#0f172a] px-8 py-4 rounded-2xl font-black shadow-xl shadow-[#d4a574]/20 transition-all uppercase tracking-[0.15em] text-xs sm:text-sm flex items-center justify-center gap-2.5 group cursor-pointer"
                                >
                                    <span className="leading-none">Online Request</span>
                                    <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform stroke-[2.5] shrink-0" />
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Right Column: Dynamic Ambient Colors + Operating Hours & Announcements */}
                    <motion.div
                        variants={containerVars}
                        initial="hidden"
                        animate="visible"
                        className="lg:col-span-5 xl:col-span-5 w-full flex flex-col justify-center relative mt-8 lg:mt-0"
                    >
                        {/* Dynamic Ambient Color Orbs complimenting the dark theme */}
                        <div className="absolute -top-16 -right-8 w-72 h-72 bg-[#d4a574]/20 rounded-full blur-[100px] pointer-events-none" />
                        <div className="absolute top-1/2 -left-12 w-64 h-64 bg-indigo-500/15 rounded-full blur-[110px] pointer-events-none" />
                        <div className="absolute -bottom-10 right-10 w-60 h-60 bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />

                        {/* Content Container */}
                        <div className="relative z-10 space-y-4 max-w-md w-full ml-auto lg:mr-0 mr-auto">
                            
                            {/* Announcements & Alerts (Top) - Translucent Rose Glass */}
                            {config === null ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl">
                                        <div className="h-2.5 w-28 bg-white/10 rounded-full mb-2.5" />
                                        <div className="h-3.5 w-full bg-white/10 rounded-full" />
                                    </div>
                                </div>
                            ) : config?.announcements && config.announcements.length > 0 ? (
                                <motion.div variants={itemVars} className="space-y-3">
                                    {config.announcements.slice(0, 3).map((ann) => (
                                        <div
                                            key={ann.id}
                                            className="bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 hover:border-rose-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-xl shadow-xl shadow-rose-950/20 transition-all group"
                                        >
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-400 to-rose-600"></div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <MegaphoneIcon className="w-4 h-4 text-rose-400 shrink-0" />
                                                <span className="text-[10px] text-rose-300 font-bold uppercase tracking-widest">
                                                    Active Announcement • {ann.created_at ? new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Notice'}
                                                </span>
                                            </div>
                                            <p className="text-white font-medium text-sm sm:text-base leading-relaxed break-words">{ann.message}</p>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : null}

                            {/* Operating Hours Card (Below) - Translucent Gold Glass */}
                            {config === null ? (
                                <div className="animate-pulse">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 backdrop-blur-xl">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-2.5 w-24 bg-white/10 rounded-full" />
                                            <div className="h-4 w-48 bg-white/10 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            ) : config?.opening_hours ? (
                                <motion.div
                                    variants={itemVars}
                                    whileHover={{ y: -2, borderColor: 'rgba(212,165,116,0.3)' }}
                                    className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-black/20 transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-28 h-28 bg-[#d4a574]/10 rounded-full blur-2xl pointer-events-none" />
                                    <div className="flex items-start gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-[#d4a574]/10 border border-[#d4a574]/25 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                            <ClockIcon className="w-5 h-5 text-[#d4a574]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] text-[#d4a574] font-black uppercase tracking-[0.2em] leading-none mb-1.5">
                                                Operating Hours
                                            </div>
                                            <div className="text-white font-semibold text-sm sm:text-base leading-snug">
                                                {config.opening_hours}
                                            </div>
                                            <div className="text-slate-400 text-xs mt-1 font-normal">
                                                Municipal Civil Registrar • Naic Hall
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : null}

                        </div>
                    </motion.div>

                </div>
            </main>
        </div>
    );
}