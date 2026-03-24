import React from 'react';
import { motion } from 'framer-motion';

export default function AboutPortal() {
    return (
        <section className="py-24 px-6 md:px-24 min-h-[70vh] flex items-center">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
                <div className="flex-1">
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <span className="text-[#d4a574] font-black text-xs uppercase tracking-[0.3em]">The Vision</span>
                        <h2 className="text-5xl md:text-6xl font-black text-white leading-tight">Empowering Naic through Digital Governance</h2>
                        <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
                            CiviCORE is a state-of-the-art registry management system designed to modernize the way the Municipality of Naic handles essential civic records. By transitioning from paper-based archives to a centralized digital hub, we ensure that every Birth, Marriage, and Death certificate is secured, searchable, and instantly accessible.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                                    <span className="text-[#d4a574]">⚡</span> Instant Retrieval
                                </div>
                                <div className="text-slate-500 text-sm">Find any vital record in seconds using our advanced lightning-fast indexing system.</div>
                            </div>
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                                    <span className="text-[#d4a574]">🛡️</span> Data Security
                                </div>
                                <div className="text-slate-500 text-sm">Industrial-grade encryption and secure access controls protect every municipal record.</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
                <div className="flex-1 relative hidden lg:block">
                    <div className="w-full aspect-square bg-gradient-to-br from-[#d4a574]/10 to-transparent rounded-[3rem] border border-white/5 relative overflow-hidden group">
                       <div className="absolute inset-0 flex items-center justify-center">
                            <motion.span 
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                className="text-[12rem] filter grayscale opacity-20 group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-700"
                            >
                                📜
                            </motion.span>
                       </div>
                       <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                            className="absolute -top-40 -right-40 w-96 h-96 bg-[#d4a574]/5 rounded-full blur-[100px]"
                       />
                    </div>
                </div>
            </div>
        </section>
    );
}
