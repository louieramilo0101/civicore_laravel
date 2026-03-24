import React from 'react';
import { motion } from 'framer-motion';

export default function DigitalServices() {
    const services = [
        { title: 'Birth Registry', icon: '👶', desc: 'Secure management of birth records with automated certificate numbering and easy extraction.' },
        { title: 'Marriage Files', icon: '💍', desc: 'Comprehensive digital archiving of marriage contracts, legal documents, and official registrations.' },
        { title: 'Death Records', icon: '🕊️', desc: 'Efficient monitoring, storage, and issuance of municipal death certificates for the local community.' },
        { title: 'Document OCR', icon: '🔍', desc: 'Advanced text extraction from scanned physical documents to enable searchable digital archives.' },
        { title: 'Public Mapping', icon: '🗺️', desc: 'Geospatial visualization of municipal data to support demographic and urban planning.' },
        { title: 'Account Verification', icon: '🔐', desc: 'Multi-level authentication for municipal staff to ensure secure access to sensitive vital records.' }
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
                        Streamlined Digital Solutions
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 max-w-2xl mx-auto"
                    >
                        Modernizing essential civic services through technology. Our suite of digital tools is built for speed, accuracy, and absolute reliability.
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
