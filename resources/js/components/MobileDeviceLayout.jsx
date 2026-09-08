import React, { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChartBarIcon,
    ArrowUpTrayIcon,
    ClipboardDocumentCheckIcon,
    UsersIcon,
    MapPinIcon,
    MegaphoneIcon,
    TableCellsIcon,
    TicketIcon,
    TrashIcon,
    Bars3Icon,
    XMarkIcon,
    ArrowRightOnRectangleIcon,
    QrCodeIcon
} from '@heroicons/react/24/outline';
import { useData } from './DataContext.jsx';
import SaveToasts from './SaveToasts.jsx';
import ActionCenter from './ActionCenter.jsx';
import Avatar from './Avatar.jsx';
import TicketScannerModal from './TicketScannerModal.jsx';

/** Adapts the application shell and controls for small-screen devices. */
const MobileDeviceLayout = ({ children }) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Auto-hiding Navigation Bar & Header State
    const [isNavVisible, setIsNavVisible] = useState(true);
    const lastScrollTopRef = useRef(0);
    const mainScrollRef = useRef(null);
    
    const { backgroundTasks } = useData();
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

    const allMenuItems = [
        { path: '/dashboard', icon: ChartBarIcon, label: 'Dashboard', roles: ['SuperAdmin', 'Admin'] },
        { path: '/tickets', icon: TicketIcon, label: 'Tickets Queue', roles: ['SuperAdmin', 'Admin'] },
        { path: '/documents', icon: ArrowUpTrayIcon, label: 'Upload Document', roles: ['SuperAdmin', 'Admin'] },
        { path: '/reports', icon: TableCellsIcon, label: 'Export Reports', roles: ['SuperAdmin', 'Admin'] },
        { path: '/issuances', icon: ClipboardDocumentCheckIcon, label: 'Issuance', roles: ['SuperAdmin', 'Admin'] },
        { path: '/archive', icon: TrashIcon, label: 'Archive Manager', roles: ['SuperAdmin', 'Admin'] },
        { path: '/mapping', icon: MapPinIcon, label: 'Mapping', roles: ['SuperAdmin'] },
        { path: '/announcements', icon: MegaphoneIcon, label: 'Announcements', roles: ['SuperAdmin', 'Admin'] },
        { path: '/accounts', icon: UsersIcon, label: 'Account Management', roles: ['SuperAdmin', 'Admin'] },
    ];

    const menuItems = allMenuItems.filter(item => item.roles.includes(user.role));
    const activeItem = menuItems.find(m => m.path === location.pathname) || { label: 'Civil Registry' };

    // Bottom Navigation Bar primary 4 shortcuts
    const primaryBottomNav = [
        { path: '/dashboard', icon: ChartBarIcon, label: 'Dashboard' },
        { path: '/tickets', icon: TicketIcon, label: 'Queue' },
        { path: '/documents', icon: ArrowUpTrayIcon, label: 'Upload' },
        { path: '/issuances', icon: ClipboardDocumentCheckIcon, label: 'Issuance' },
    ];

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await fetch(`${window.location.origin}/api/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            await new Promise(r => setTimeout(r, 400));
        } catch (e) {}
        localStorage.removeItem('user');
        sessionStorage.clear();
        navigate('/');
    };

    // Scroll Handler for Auto-hiding Navigation Bar & Top Header
    /** Tracks mobile scroll direction for compact navigation behavior. */
    const handleScroll = (e) => {
        const scrollTop = e.target.scrollTop;
        const delta = scrollTop - lastScrollTopRef.current;

        // Near top of page: always show
        if (scrollTop < 30) {
            setIsNavVisible(true);
        } else if (delta > 8) {
            // Scrolling down: hide nav
            setIsNavVisible(false);
        } else if (delta < -8) {
            // Scrolling up: reveal nav
            setIsNavVisible(true);
        }

        lastScrollTopRef.current = scrollTop;
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-slate-50 overflow-hidden font-sans text-slate-900">
            {/* Ambient Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[40%] bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
            <div className="fixed top-[20%] right-[10%] w-[40%] h-[30%] bg-[#d4a574]/15 rounded-full blur-[90px] pointer-events-none z-0" />

            {/* Animated Mobile / Tablet Header Bar (Sleek Dark Navy) */}
            <motion.header
                initial={false}
                animate={{ y: isNavVisible ? 0 : -72 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="fixed top-0 left-0 right-0 h-16 bg-[#0f172a] border-b border-slate-800 px-4 flex items-center justify-between z-40 shadow-md"
            >
                {/* Left Side: Logo & Title */}
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain filter drop-shadow-[0_0_8px_rgba(212,165,116,0.3)]" />
                    <div>
                        <h1 className="font-black text-sm text-white tracking-tight leading-tight line-clamp-1">{activeItem.label}</h1>
                        <p className="text-[10px] font-bold text-[#d4a574] tracking-widest uppercase font-mono">Naic Civil Registry</p>
                    </div>
                </div>

                {/* Right Side: QR Scanner & Pure Profile Picture Avatar */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowScanner(true)}
                        className="p-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-sm"
                        title="Scan QR Ticket"
                    >
                        <QrCodeIcon className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setShowProfileModal(true)}
                        className="p-0.5 rounded-full active:scale-95 transition-all cursor-pointer focus:outline-none"
                        title="User Profile"
                    >
                        <Avatar name={user.name} src={user.avatar} size={8} className="ring-2 ring-[#d4a574]/80 shadow-md" />
                    </button>
                </div>
            </motion.header>

            {/* Native Scrollable Viewport Area (Smooth Touch-Pan Scrolling) */}
            <main
                ref={mainScrollRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-y-auto overflow-x-hidden pt-16 pb-20 px-3 sm:px-5 custom-scrollbar text-slate-800 bg-slate-50/60 touch-pan-y"
            >
                <div className="min-h-full">
                    {children}
                </div>
            </main>

            {/* Animated Bottom Mobile Navigation Dock (Dark Slate) */}
            <motion.nav
                initial={false}
                animate={{ y: isNavVisible ? 0 : 80 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="fixed bottom-0 left-0 right-0 h-16 bg-[#0f172a] border-t border-slate-800 px-3 flex items-center justify-around z-40 shadow-2xl"
            >
                {primaryBottomNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 ${
                                isActive ? 'text-[#d4a574] font-extrabold' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-[#d4a574]/20 border border-[#d4a574]/40' : ''}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
                        </Link>
                    );
                })}

                {/* More Drawer Trigger Button */}
                <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-400 hover:text-slate-200 active:scale-95 cursor-pointer"
                >
                    <div className="p-1 rounded-xl">
                        <Bars3Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] tracking-tight mt-0.5">More</span>
                </button>
            </motion.nav>

            {/* Right-Side Mobile Navigation Drawer */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDrawerOpen(false)}
                            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 cursor-pointer"
                        />

                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                            className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-[#0f172a] border-l border-slate-800 z-50 flex flex-col shadow-2xl overflow-hidden text-slate-200"
                        >
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                                <div className="flex items-center gap-3">
                                    <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                                    <div>
                                        <h2 className="font-black text-white text-base tracking-tight">Civil Registry</h2>
                                        <p className="text-xs text-[#d4a574] font-bold">Municipality of Naic</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 border border-slate-700/60"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Menu List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-3 mb-2 font-mono">Navigation Menu</p>
                                {menuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setDrawerOpen(false)}
                                            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                                                isActive
                                                    ? 'bg-[#d4a574]/15 text-[#d4a574] border border-[#d4a574]/30 shadow-md'
                                                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                            }`}
                                        >
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-[#d4a574]' : 'text-slate-400'}`} />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Drawer Footer User Profile & Logout */}
                            <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-3">
                                <div className="flex items-center gap-3 px-2">
                                    <Avatar name={user.name} src={user.avatar} size={10} className="ring-2 ring-[#d4a574]" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-white truncate">{user.name || 'User Account'}</p>
                                        <p className="text-xs text-slate-400 font-medium truncate">{user.role || 'Admin'} · Naic, Cavite</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-2xl text-xs font-black transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                                    <span>{isLoggingOut ? 'Logging out...' : 'Sign Out Account'}</span>
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Profile Detail Quick Sheet */}
            <AnimatePresence>
                {showProfileModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl text-slate-200"
                        >
                            <Avatar name={user.name} src={user.avatar} size={16} className="mx-auto ring-4 ring-[#d4a574]/40" />
                            <div>
                                <h3 className="font-black text-lg text-white">{user.name}</h3>
                                <p className="text-xs text-[#d4a574] font-bold uppercase tracking-widest mt-0.5">{user.role}</p>
                                <p className="text-xs text-slate-400 mt-1 font-mono">{user.email}</p>
                            </div>

                            <div className="pt-2 border-t border-slate-800 flex gap-2">
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setShowProfileModal(false);
                                        handleLogout();
                                    }}
                                    className="flex-1 py-2.5 bg-rose-600 text-white font-black text-xs rounded-xl hover:bg-rose-700"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QR Scanner Ticket Modal */}
            <TicketScannerModal
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onTicketSelect={(ticket) => {
                    setShowScanner(false);
                    navigate('/tickets');
                }}
            />

            {/* System Notifications & Background Save Toasts */}
            <SaveToasts tasks={backgroundTasks} />
            <ActionCenter />
        </div>
    );
};

export default MobileDeviceLayout;
