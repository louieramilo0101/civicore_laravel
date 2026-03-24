import React from 'react';
import { motion } from 'framer-motion';

export default function ContactDirectory() {
    return (
        <section className="py-24 px-6 md:px-24">
            <div className="max-w-5xl mx-auto flex flex-col items-center text-center space-y-16">
                <div className="space-y-4">
                    <motion.span 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[#d4a574] font-black text-xs uppercase tracking-[0.3em]"
                    >
                        Contact Directory
                    </motion.span>
                    <motion.h2 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-black text-white"
                    >
                        Get in Touch
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 text-lg"
                    >
                        Our dedicated team at the Municipal Civil Registrar's Office is here to assist you with all your vital record inquiries and document certifications.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl pt-8">
                    <motion.a 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        href="mailto:naicmcr@gmail.com"
                        className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-[#d4a574]/50 transition-all flex flex-col items-center gap-6 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] -z-0" />
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">📧</div>
                        <div className="z-10 text-center">
                            <div className="text-[12px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Email Address</div>
                            <div className="text-white font-black text-2xl tracking-tight group-hover:text-[#d4a574] transition-colors underline decoration-[#d4a574]/30 underline-offset-8">naicmcr@gmail.com</div>
                        </div>
                    </motion.a>
                    
                    <motion.a 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        href="tel:+0464231721"
                        className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-[#d4a574]/50 transition-all flex flex-col items-center gap-6 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-32 h-32 bg-[#d4a574]/5 blur-[50px] -z-0" />
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">📱</div>
                        <div className="z-10 text-center">
                            <div className="text-[12px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Phone Support</div>
                            <div className="text-white font-black text-2xl tracking-tight group-hover:text-[#d4a574] transition-colors">+(046) 423 1721</div>
                        </div>
                    </motion.a>
                </div>

                <div className="pt-12 text-slate-500 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.5em]">
                        <span className="w-10 h-[1px] bg-white/10"></span>
                        Operating Hours
                        <span className="w-10 h-[1px] bg-white/10"></span>
                    </div>
                    <p className="font-semibold text-sm">Monday — Friday: 8:00 AM - 5:00 PM</p>
                    <p className="text-xs opacity-60">Closed on Weekends and Public Holidays</p>
                </div>
            </div>
        </section>
    );
}
