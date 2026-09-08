import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon, MegaphoneIcon, ArrowRightIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

/** Renders the public portal landing page and service entry points. */
export default function Landing() {
    const navigate = useNavigate();

    const [config, setConfig] = useState(null);
    const [stats, setStats] = useState({ processed: '...', response_s: '...' });

    useEffect(() => {
        fetch('/api/public/config')
            .then(res => {
                if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
                return res.json();
            })
            .then(data => setConfig(data))
            .catch(err => console.error(err));

        fetch('/api/public/stats')
            .then(res => {
                if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
                return res.json();
            })
            .then(data => setStats(data))
            .catch(err => console.error(err));
    }, []);

    // Animation Variants for staggered, smooth entrance
    const containerVars = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.3 }
        }
    };

    const itemVars = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }
    };

    return (
        <div className="relative overflow-visible pb-16 sm:pb-24">
            {/* Ambient Lighting FX */}
            <div className="absolute top-0 right-[-10%] w-[60%] h-[60%] bg-[#d4a574]/10 blur-[150px] rounded-full pointer-events-none" />

            {/* Hero Section - Shifted upward for mobile screens without reducing element scale */}
            <main className="min-h-[70vh] sm:min-h-[80vh] md:min-h-[85vh] flex items-start sm:items-center pt-0 sm:pt-4 md:pt-12 pb-8 px-5 sm:px-8 md:px-12 lg:px-24 z-10 relative">
                <motion.div
                    variants={containerVars}
                    initial="hidden"
                    animate="visible"
                    className="max-w-5xl w-full"
                >
                    {/* Status Badge */}
                    <motion.div variants={itemVars} className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="px-3 py-1 rounded-full bg-[#d4a574]/10 border border-[#d4a574]/20 text-[#d4a574] text-xs font-bold uppercase tracking-widest">Office of the Civil Registrar</span>
                        <span className="text-slate-400 text-xs sm:text-sm font-medium">Official Registry Platform</span>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h1
                        variants={itemVars}
                        className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-6 sm:mb-8"
                    >
                        RECORDING.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4a574] to-[#f3d0a2] drop-shadow-sm">PRESERVING.</span><br />
                        SERVING.
                    </motion.h1>

                    <motion.div variants={itemVars} className="space-y-6 sm:space-y-8">
                        <p className="text-slate-300 text-lg md:text-xl max-w-2xl leading-relaxed font-light border-l-2 border-[#d4a574]/30 pl-5 sm:pl-6">
                            The centralized hub for authenticating and managing civil events—Births, Marriages, and Deaths—for the Municipality of Naic.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 pt-2 sm:pt-4">
                            <motion.button
                                whileHover={{ scale: 1.02, translateY: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/login')}
                                className="bg-gradient-to-r from-[#d4a574] to-[#c49a67] text-[#0f172a] px-10 py-5 rounded-2xl font-black shadow-xl shadow-[#d4a574]/20 transition-all uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 group cursor-pointer"
                            >
                                <span className="leading-none">Enter Portal</span>
                                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform stroke-[2.5] shrink-0" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/ticket-request')}
                                className="bg-transparent border border-slate-600 text-white px-10 py-5 rounded-2xl font-bold hover:border-[#d4a574]/50 hover:text-[#d4a574] transition-all uppercase tracking-[0.15em] text-sm flex items-center justify-center cursor-pointer"
                            >
                                <span className="leading-none">Online Request</span>
                            </motion.button>
                        </div>

                        {/* Operating Hours — skeleton while loading */}
                        {config === null ? (
                            <div className="mt-8 max-w-sm animate-pulse">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-white/10" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-2.5 w-24 bg-white/10 rounded-full" />
                                        <div className="h-3.5 w-48 bg-white/10 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        ) : config?.opening_hours ? (
                            <motion.div variants={itemVars} className="mt-8 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 max-w-sm">
                                <ClockIcon className="w-5 h-5 text-[#d4a574]" />
                                <div>
                                    <div className="text-[10px] text-[#d4a574] font-bold uppercase tracking-widest leading-none mb-1">Operating Hours</div>
                                    <div className="text-white font-medium text-sm">{config.opening_hours}</div>
                                </div>
                            </motion.div>
                        ) : null}

                        {/* Announcements — skeleton while loading */}
                        {config === null ? (
                            <div className="mt-4 space-y-3 max-w-md animate-pulse">
                                {[...Array(2)].map((_, i) => (
                                    <div key={i} className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4">
                                        <div className="h-2 w-28 bg-white/10 rounded-full mb-2" />
                                        <div className="h-3.5 w-full bg-white/10 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : config?.announcements && config.announcements.length > 0 ? (
                            <motion.div variants={itemVars} className="mt-4 flex flex-col gap-3 max-w-md">
                                {config.announcements.slice(0, 2).map((ann) => (
                                    <div key={ann.id} className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 opacity-80"></div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <MegaphoneIcon className="w-4 h-4 text-rose-400" />
                                            <span className="text-[10px] text-rose-300 font-bold uppercase tracking-widest">
                                                Active Alert • {new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="text-white font-medium text-sm leading-snug">{ann.message}</p>
                                    </div>
                                ))}
                            </motion.div>
                        ) : null}
                    </motion.div>
                </motion.div>

                {/* Right Side Digital Seal Emblem (PC / XL screens only - hidden on mobile/tablet) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="hidden xl:flex absolute right-16 top-1/2 -translate-y-1/2 flex-col items-center justify-center pointer-events-none z-10"
                >
                    {/* Ambient Radial Glow */}
                    <div className="absolute w-[360px] h-[360px] bg-[#d4a574]/15 blur-[100px] rounded-full" />

                    {/* Concentric Glass Emblem Container */}
                    <div className="relative w-80 h-80 rounded-full border border-[#d4a574]/25 bg-gradient-to-b from-[#d4a574]/10 via-[#0f172a]/80 to-[#0f172a]/95 backdrop-blur-2xl p-8 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(212,165,116,0.15)] group">
                        
                        {/* Orbiting Tech Ring Accent */}
                        <div className="absolute inset-2 rounded-full border border-dashed border-[#d4a574]/20 animate-[spin_40s_linear_infinite]" />
                        <div className="absolute inset-5 rounded-full border border-white/5" />

                        {/* Central Logo Emblem */}
                        <div className="w-24 h-24 rounded-2xl bg-[#d4a574]/10 border border-[#d4a574]/30 flex items-center justify-center p-4 shadow-inner mb-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#d4a574]/20 to-transparent opacity-50" />
                            <img src="/logo.png" alt="CiviCORE Emblem" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(212,165,116,0.6)]" />
                        </div>

                        {/* Seal Metadata */}
                        <div className="flex items-center gap-1.5 mb-1 text-[#d4a574]">
                            <ShieldCheckIcon className="w-4 h-4" />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Official Registry</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                            Municipality of Naic
                        </p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}