import React from 'react';
import { motion } from 'framer-motion';
import { UserIcon, UsersIcon, DocumentTextIcon, ArchiveBoxIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/outline';

/** Lists the digital services available through the public portal. */
export default function DigitalServices() {
    const services = [
        { title: 'Birth Registration', icon: <UserIcon className="w-10 h-10 text-[#d4a574]" />, desc: 'Processing and archiving of birth certificates to establish the fundamental legal identity of every citizen.' },
        { title: 'Marriage Licensing', icon: <UsersIcon className="w-10 h-10 text-indigo-400" />, desc: 'Filing of marriage contracts and issuances of official certifications for legal matrimonial validation.' },
        { title: 'Death Certification', icon: <DocumentTextIcon className="w-10 h-10 text-rose-400" />, desc: 'Secure administration of death records, ensuring proper legal documentation for the deceased.' },
        { title: 'Timely Issuances', icon: <ClockIcon className="w-10 h-10 text-emerald-400" />, desc: 'Providing authenticated copies of civil registry documents to citizens for official and legal purposes.' },
        { title: 'Demographic Archiving', icon: <ArchiveBoxIcon className="w-10 h-10 text-blue-400" />, desc: 'Maintaining the official local database of life events to support municipal planning and statistics.' },
        { title: 'Records Verification', icon: <ShieldCheckIcon className="w-10 h-10 text-amber-400" />, desc: 'Authenticating historical and contemporary vital records to confirm citizen identities and rights.' }
    ];

    return (
        <section className="py-24 px-6 md:px-24">
            <div className="max-w-7xl mx-auto space-y-16">
                <div className="text-center space-y-4">
                    <motion.span 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[#d4a574] font-black text-xs uppercase tracking-[0.3em]"
                    >
                        Services
                    </motion.span>
                    <motion.h2 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-black text-white"
                    >
                        Civil Registry Services
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 max-w-2xl mx-auto text-justify"
                    >
                        Dedicated to serving the public interest, our office facilitates the legal recording of vital events. We ensure every milestone in a citizen's life is properly documented, securely archived, and readily authenticated.
                    </motion.p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -10, backgroundColor: "rgba(255,255,255,0.04)" }}
                            className="p-10 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#d4a574]/30 transition-all group"
                        >
                            <div className="w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:rotate-12 transition-transform shadow-inner shadow-white/5">
                                {service.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">{service.title}</h3>
                            <p className="text-slate-400 leading-relaxed text-sm">{service.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
