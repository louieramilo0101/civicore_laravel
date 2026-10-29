import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import SkeletonLoader from './SkeletonLoader';

function FacebookIcon({ className }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
        </svg>
    );
}

/** Renders contact information and support channels for portal users. */
export default function ContactDirectory() {
    const [openingHours, setOpeningHours] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/public/config')
            .then(res => {
                setOpeningHours(res.data?.opening_hours || '');
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Config load error:", err);
                setIsLoading(false);
            });
    }, []);

    return (
        <section className="py-24 px-6 md:px-12 lg:px-20">
            <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-16">
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
                        className="text-4xl sm:text-5xl font-black text-white"
                    >
                        Get in Touch
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 text-base sm:text-lg max-w-2xl"
                    >
                        Our dedicated team at the Municipal Civil Registrar's Office is here to assist you with all your vital record inquiries and document certifications.
                    </motion.p>
                </div>

                {/* Contact Channels Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-6 w-full pt-4">
                    
                    {/* Location / Physical Address Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="p-8 sm:p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-[#d4a574]/50 transition-all flex flex-col items-center gap-6 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] -z-0" />
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-white group-hover:text-[#d4a574]">
                            <MapPinIcon className="w-8 h-8" />
                        </div>
                        <div className="z-10 text-center">
                            <div className="text-[12px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Office Address</div>
                            <div className="text-white font-bold text-sm sm:text-base tracking-tight leading-relaxed">
                                Naic Municipal Hall, Antero Soriano Highway, Naic, 4110, Cavite
                            </div>
                        </div>
                    </motion.div>
                    
                    {/* Email Card */}
                    <motion.a 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        href="mailto:naicmcr@gmail.com"
                        className="p-8 sm:p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-[#d4a574]/50 transition-all flex flex-col items-center gap-6 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] -z-0" />
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-white group-hover:text-indigo-400">
                            <EnvelopeIcon className="w-8 h-8" />
                        </div>
                        <div className="z-10 text-center">
                            <div className="text-[12px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Email Address</div>
                            <div className="text-white font-black text-lg sm:text-xl tracking-tight group-hover:text-[#d4a574] transition-colors underline decoration-[#d4a574]/30 underline-offset-8 break-all">
                                naicmcr@gmail.com
                            </div>
                        </div>
                    </motion.a>
                    
                    {/* Phone & Mobile Support Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-8 sm:p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-[#d4a574]/50 transition-all flex flex-col items-center gap-5 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-32 h-32 bg-[#d4a574]/5 blur-[50px] -z-0" />
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-white group-hover:text-[#d4a574]">
                            <PhoneIcon className="w-8 h-8" />
                        </div>
                        <div className="z-10 text-center w-full">
                            <div className="text-[12px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-3">Phone & Mobile Support</div>
                            <div className="space-y-2">
                                <a 
                                    href="tel:+63464231721" 
                                    className="block text-white font-bold text-base hover:text-[#d4a574] transition-colors"
                                >
                                    +63 46 423 1721 <span className="text-xs text-slate-400 font-normal ml-1">(Landline)</span>
                                </a>
                                <a 
                                    href="tel:09656582302" 
                                    className="block text-white font-bold text-base hover:text-[#d4a574] transition-colors"
                                >
                                    0965-658-2302 <span className="text-xs text-slate-400 font-normal ml-1">(Mobile)</span>
                                </a>
                                <a 
                                    href="tel:09128274508" 
                                    className="block text-white font-bold text-base hover:text-[#d4a574] transition-colors"
                                >
                                    0912-827-4508 <span className="text-xs text-slate-400 font-normal ml-1">(Mobile)</span>
                                </a>
                            </div>
                        </div>
                    </motion.div>

                    {/* Official Facebook Page Card */}
                    <motion.a 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        href="https://www.facebook.com/gloria.bago.184"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-8 sm:p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-[#d4a574]/50 transition-all flex flex-col items-center gap-6 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] -z-0" />
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-white group-hover:text-blue-400">
                            <FacebookIcon className="w-8 h-8" />
                        </div>
                        <div className="z-10 text-center">
                            <div className="text-[12px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Facebook Page</div>
                            <div className="text-white font-black text-lg sm:text-xl tracking-tight group-hover:text-[#d4a574] transition-colors underline decoration-[#d4a574]/30 underline-offset-8">
                                Official Page
                            </div>
                            <div className="text-slate-400 text-xs mt-1.5">
                                Municipal Civil Registrar
                            </div>
                        </div>
                    </motion.a>

                </div>

                <div className="pt-12 text-slate-500 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.5em]">
                        <span className="w-10 h-[1px] bg-white/10"></span>
                        Operating Hours
                        <span className="w-10 h-[1px] bg-white/10"></span>
                    </div>
                    <div className="font-semibold text-sm">
                        {isLoading ? <div className="w-48 h-4 bg-white/10 rounded animate-pulse inline-block"></div> : openingHours}
                    </div>
                    <p className="text-xs opacity-60">Unless specified due to Public Holidays</p>
                </div>
            </div>
        </section>
    );
}
