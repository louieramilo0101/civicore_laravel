import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClockIcon, MegaphoneIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

/** 
 * Preserved backup of the Canva-reference Landing page design.
 * Features the large seamless Naic Municipal Hall visual with glowing blue atmosphere,
 * along with the 'SERVING OUR PEOPLE. BUILDING A BETTER NAIC.' branding.
 */
export default function LandingCanvaReference() {
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);

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
            transition: { staggerChildren: 0.15, delayChildren: 0.2 }
        }
    };

    const itemVars = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
        }
    };

    return (
        <div className="relative overflow-visible pb-12 sm:pb-16">
            {/* Ambient Background Lighting FX */}
            <div className="absolute top-[-10%] right-[-5%] w-[55%] h-[75%] bg-sky-500/10 blur-[160px] rounded-full pointer-events-none" />
            <div className="absolute top-[25%] right-[15%] w-[40%] h-[50%] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />

            {/* Hero Section */}
            <main className="min-h-[72vh] flex items-center pt-2 sm:pt-4 md:pt-6 pb-8 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20 z-10 relative">
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
                    
                    {/* Left Column: Hero Title, Subtitle, and CTAs */}
                    <motion.div
                        variants={containerVars}
                        initial="hidden"
                        animate="visible"
                        className="lg:col-span-6 xl:col-span-6 w-full"
                    >
                        {/* Status Badge */}
                        <motion.div variants={itemVars} className="mb-4 sm:mb-6 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-slate-700/60 bg-white/[0.03] backdrop-blur-md">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfb17e]">
                                Municipality of Naic
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                            <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                                Cavite, Philippines
                            </span>
                        </motion.div>

                        {/* Main Headline */}
                        <motion.h1
                            variants={itemVars}
                            className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black text-white leading-[1.06] tracking-tight mb-5 sm:mb-6 uppercase"
                        >
                            SERVING<br />
                            OUR PEOPLE.<br />
                            BUILDING A<br />
                            <span className="text-[#dfb17e]">BETTER NAIC.</span>
                        </motion.h1>

                        {/* Subtitle / Paragraph */}
                        <motion.div variants={itemVars} className="space-y-6">
                            <p className="text-slate-300 text-base md:text-lg max-w-xl leading-relaxed font-light border-l-2 border-[#dfb17e]/40 pl-4 sm:pl-5">
                                A responsive, transparent, and people-centered local government working for a progressive and empowered Naic.
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-4 items-center pt-1">
                                <motion.button
                                    whileHover={{ scale: 1.02, translateY: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/login')}
                                    className="bg-[#dfb17e] hover:bg-[#e8be8d] text-[#091120] px-8 py-4 rounded-xl font-black shadow-[0_10px_25px_-5px_rgba(223,177,126,0.35)] transition-all uppercase tracking-[0.15em] text-xs sm:text-sm flex items-center justify-center gap-2.5 group cursor-pointer"
                                >
                                    <span className="leading-none">Enter Portal</span>
                                    <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] group-hover:translate-x-1 transition-transform shrink-0" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.06)" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/ticket-request')}
                                    className="bg-transparent border border-slate-700/80 hover:border-slate-500 text-white px-8 py-4 rounded-xl font-bold transition-all uppercase tracking-[0.15em] text-xs sm:text-sm flex items-center justify-center cursor-pointer"
                                >
                                    <span className="leading-none">Online Request</span>
                                </motion.button>
                            </div>

                            {/* Active Announcements & Operating Hours Cards */}
                            <div className="space-y-3.5 pt-2 max-w-lg">
                                {/* Announcements & Alerts (Top) - Translucent Rose Glass */}
                                {config?.announcements && config.announcements.length > 0 && (
                                    <motion.div variants={itemVars} className="space-y-3">
                                        {config.announcements.slice(0, 2).map((ann) => (
                                            <div
                                                key={ann.id}
                                                className="bg-rose-500/15 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 rounded-2xl p-4 sm:p-4.5 relative overflow-hidden backdrop-blur-xl shadow-xl shadow-rose-950/20 transition-all group"
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
                                )}

                                {/* Operating Hours Card - Translucent Gold Glass */}
                                {config?.opening_hours && (
                                    <motion.div
                                        variants={itemVars}
                                        whileHover={{ y: -2, borderColor: 'rgba(223,177,126,0.35)' }}
                                        className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 rounded-2xl p-4 sm:p-4.5 backdrop-blur-xl shadow-xl shadow-black/20 transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#dfb17e]/10 rounded-full blur-2xl pointer-events-none" />
                                        <div className="flex items-start gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-[#dfb17e]/10 border border-[#dfb17e]/25 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                                <ClockIcon className="w-5 h-5 text-[#dfb17e]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] text-[#dfb17e] font-black uppercase tracking-[0.2em] leading-none mb-1.5">
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
                                )}
                            </div>

                        </motion.div>
                    </motion.div>

                    {/* Right Column: Grand Naic Municipal Hall Visual with Glowing Blue Atmosphere */}
                    <div className="lg:col-span-6 xl:col-span-6 w-full flex items-center justify-center relative mt-6 lg:mt-0 select-none pointer-events-none">
                        <div className="absolute w-[440px] sm:w-[520px] h-[440px] sm:h-[520px] bg-sky-500/25 blur-[120px] rounded-full pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute w-[300px] h-[300px] bg-blue-600/15 blur-[95px] rounded-full pointer-events-none -top-10 right-10" />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                            className="relative w-full max-w-[620px] xl:max-w-[700px] flex items-center justify-center"
                        >
                            <img
                                src="/images/naic-municipal-hall-perfect.png"
                                alt="Naic Municipal Hall"
                                className="w-full h-auto object-contain filter drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                            />
                        </motion.div>
                    </div>

                </div>
            </main>
        </div>
    );
}
