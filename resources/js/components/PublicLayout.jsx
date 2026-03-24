import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function PublicLayout({ children }) {
    const location = useLocation();
    
    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'About Portal', path: '/about' },
        { name: 'Digital Services', path: '/services' },
        { name: 'Contact Directory', path: '/contact' }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-[#0f172a] relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div
                className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-screen"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23d4a574' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`
                }}
            />
            
            {/* Header */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 md:px-12 py-8 flex justify-between items-center z-50 relative"
            >
                <Link to="/" className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#d4a574]/10 to-transparent rounded-2xl flex items-center justify-center border border-[#d4a574]/20 shadow-lg shadow-[#d4a574]/5 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                        <img src="/logo.png" alt="CiviCORE Logo" className="w-full h-full object-contain p-2" />
                    </div>
                    <div>
                        <div className="font-extrabold text-white text-2xl tracking-tight leading-none uppercase drop-shadow-sm">
                            Civi<span className="text-[#d4a574]">CORE</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#d4a574] inline-block shadow-[0_0_8px_rgba(212,165,116,0.8)]"></span>
                            Naic, Cavite
                        </div>
                    </div>
                </Link>
                
                <nav className="hidden lg:flex items-center gap-10 text-sm font-semibold text-slate-300">
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
            </motion.header>

            {/* Main Content */}
            <main className="flex-1 relative z-10">
                {children}
            </main>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/5 bg-[#0a0f1d] text-center relative z-20">
                <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain opacity-50" />
                        <span className="text-white font-black tracking-widest uppercase text-sm opacity-50">CiviCORE</span>
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">
                        &copy; {new Date().getFullYear()} Municipality of Naic. Digital Governance Initiative.
                    </p>
                </div>
            </footer>
        </div>
    );
}
