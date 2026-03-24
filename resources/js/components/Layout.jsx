import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChartBarIcon,
    ArrowUpTrayIcon,
    ClipboardDocumentCheckIcon,
    UsersIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const menuItems = [
        { path: '/dashboard', icon: ChartBarIcon, label: 'Dashboard' },
        { path: '/documents', icon: ArrowUpTrayIcon, label: 'Upload Document' },
        { path: '/issuances', icon: ClipboardDocumentCheckIcon, label: 'Issuance' },
        { path: '/mapping', icon: MapPinIcon, label: 'Mapping' },
        { path: '/accounts', icon: UsersIcon, label: 'Account Management' },
    ];

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    const handleLogout = async () => {
        try {
            await fetch(`${window.location.origin}/api/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            // Ignore errors
        }
        sessionStorage.clear();
        navigate('/');
    };

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    return (
        <div className="min-h-screen bg-slate-50 flex relative overflow-hidden">
            {/* Ambient Glassmorphism Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
            <div className="fixed top-[20%] right-[10%] w-[25%] h-[25%] bg-[#d4a574]/15 rounded-full blur-[90px] pointer-events-none z-0"></div>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 z-50 flex items-center px-4 gap-3 shadow-lg">
                <button
                    onClick={toggleSidebar}
                    className="cursor-pointer text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sidebarOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
                <span className="text-white font-semibold text-sm">Civil Registry Naic</span>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800
                transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:shrink-0
            `}>
                {/* Header branding */}
                <div className="p-6 text-white border-b border-slate-800/40 bg-[#0f172a]/90 flex items-center gap-4 group">
                    <div className="w-12 h-12 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                        <img src="/logo.png" alt="CiviCORE Icon" className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(212,165,116,0.2)]" />
                    </div>
                    <div>
                        <h2 className="font-black text-[10px] tracking-[0.2em] text-[#d4a574] uppercase leading-none opacity-80 mb-1.5 font-sans">Civil Registry</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-black text-xl tracking-tight font-sans">NAIC</span>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-white/10 text-slate-400 uppercase tracking-widest border border-white/5 font-mono">v1.0</span>
                        </div>
                    </div>
                </div>

                {/* Menu */}
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto w-full custom-scrollbar">
                    {menuItems.filter(item => {
                        // Regular User: Only Upload Document & Accounts
                        if (user.role === 'User') {
                            return ['/documents', '/accounts'].includes(item.path);
                        }
                        // Admin: Everything except managing other users is handled inside Accounts.jsx
                        return true; 
                    }).map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={closeSidebar}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                        ? 'bg-[#d4a574]/10 text-[#d4a574] font-medium shadow-sm ring-1 ring-[#d4a574]/30'
                                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-[#d4a574]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                <span className="text-sm tracking-wide">{item.label}</span>
                            </Link>
                        );
                    })}

                    {/* Integrated Logout Button */}
                    <div className="pt-4 mt-6 border-t border-slate-800/50">
                        <button
                            onClick={handleLogout}
                            className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:ring-1 hover:ring-rose-500/30"
                        >
                            <svg className="w-5 h-5 flex-shrink-0 transition-colors text-slate-500 group-hover:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            <span className="text-sm tracking-wide">Logout</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-transparent min-h-screen pt-14 md:pt-0 relative z-10 w-full">
                {/* Top Bar - Desktop */}
                <header className="hidden md:flex items-center justify-between h-[5rem] px-8 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm/50 backdrop-blur-md bg-white/90">
                    <h1 id="pageTitle" className="text-2xl font-bold text-slate-800 tracking-tight">
                        {menuItems.find(m => m.path === location.pathname)?.label || 'Dashboard'}
                    </h1>

                    {/* Header Profile Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="cursor-pointer flex items-center gap-4 focus:outline-none group group-hover:border-transparent"
                        >
                            <div className="flex flex-col text-right">
                                <span className="text-sm font-semibold text-slate-700 leading-none group-hover:text-slate-900 transition-colors">{user.name || 'User'}</span>
                                <span className="text-xs text-slate-500 mt-1 font-medium">{user.role || 'Admin'}</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0f172a] to-slate-700 text-white flex items-center justify-center font-bold shadow-md ring-2 ring-white group-hover:ring-[#d4a574] transition-all">
                                {(user.name || 'U').charAt(0).toUpperCase()}
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowProfileMenu(false)}
                                ></div>
                                <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg shadow-slate-200/50 ring-1 ring-slate-100 z-50 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
                                    <div className="p-1.5">
                                        <button
                                            onClick={handleLogout}
                                            className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto relative w-full h-[calc(100vh-5rem)]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="h-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default Layout;
