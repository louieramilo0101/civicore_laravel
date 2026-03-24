import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Landing() {
    const navigate = useNavigate();

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
        <div className="relative overflow-visible">
            {/* Ambient Lighting FX */}
            <div className="absolute top-0 right-[-10%] w-[60%] h-[60%] bg-[#d4a574]/10 blur-[150px] rounded-full pointer-events-none" />
            
            {/* Hero Section */}
            <main className="min-h-[85vh] flex items-center px-6 md:px-12 lg:px-24 z-10 relative">
                <motion.div
                    variants={containerVars}
                    initial="hidden"
                    animate="visible"
                    className="max-w-5xl"
                >
                    {/* Status Badge */}
                    <motion.div variants={itemVars} className="mb-6 flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-[#d4a574]/10 border border-[#d4a574]/20 text-[#d4a574] text-xs font-bold uppercase tracking-widest">v2.0 System Online</span>
                        <span className="text-slate-400 text-sm font-medium">Official Registry Platform</span>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h1
                        variants={itemVars}
                        className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-8"
                    >
                        MODERN.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4a574] to-[#f3d0a2] drop-shadow-sm">SECURE.</span><br />
                        EFFICIENT.
                    </motion.h1>

                    <motion.div variants={itemVars} className="space-y-8">
                        <p className="text-slate-300 text-lg md:text-xl max-w-2xl leading-relaxed font-light border-l-2 border-[#d4a574]/30 pl-6">
                            The centralized digital portal for seamless management and issuance of Birth, Death, and Marriage Certificates for the Municipality of Naic.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <motion.button
                                whileHover={{ scale: 1.02, translateY: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/login')}
                                className="bg-gradient-to-r from-[#d4a574] to-[#c49a67] text-[#0f172a] px-10 py-5 rounded-2xl font-black shadow-xl shadow-[#d4a574]/20 transition-all uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 group cursor-pointer"
                            >
                                Enter Portal
                                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/services')}
                                className="bg-transparent border border-slate-600 text-white px-10 py-5 rounded-2xl font-bold hover:border-[#d4a574]/50 hover:text-[#d4a574] transition-all uppercase tracking-[0.15em] text-sm flex items-center justify-center cursor-pointer"
                            >
                                Services Info
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Right Side Abstract Visuals for Desktop */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, delay: 0.4 }}
                    className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 w-[400px] h-[500px] pointer-events-none perspective-normal"
                >
                    {/* Floating decorative cards */}
                    <div className="absolute inset-0 border border-[#d4a574]/20 rounded-3xl rotate-6 transition-transform duration-700" />
                    <div className="absolute inset-4 border border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-3xl -rotate-3 overflow-hidden shadow-2xl flex flex-col justify-end p-8 group/card">
                        <div className="absolute top-10 -right-10 w-32 h-32 bg-[#d4a574]/20 blur-3xl rounded-full" />
                        
                        {/* Dynamic Mini Dashboard Visual */}
                        <div className="flex-1 flex flex-col justify-center gap-6 mb-8 mt-4">
                            <div className="relative group/scan">
                                <div className="flex items-end gap-1 h-12 mb-2">
                                    {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                                        <motion.div 
                                            key={i}
                                            initial={{ height: 0 }}
                                            animate={{ height: `${h}%` }}
                                            transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 + i*0.2 }}
                                            className="w-full bg-gradient-to-t from-[#d4a574]/40 to-[#d4a574] rounded-t-sm"
                                        />
                                    ))}
                                </div>
                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                    <span>OCR Scan Accuracy</span>
                                    <span className="text-[#d4a574]">99.9%</span>
                                </div>
                                <motion.div 
                                    animate={{ top: ['0%', '100%', '0%'] }}
                                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                    className="absolute left-0 right-0 h-[1px] bg-[#d4a574] shadow-[0_0_15px_#d4a574] z-10 opacity-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Processed</div>
                                    <div className="text-white font-black text-xl tracking-tight">12.4K</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Response</div>
                                    <div className="text-white font-black text-xl tracking-tight">0.8s</div>
                                </div>
                            </div>
                        </div>

                        <div className="w-16 h-1 bg-[#d4a574]/50 mb-6 rounded-full" />
                        <h3 className="text-white font-bold text-2xl tracking-tight mb-2">Digital Automation</h3>
                        <p className="text-slate-400 text-sm font-medium">Processing certificates with precision through advanced Registry technology.</p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}