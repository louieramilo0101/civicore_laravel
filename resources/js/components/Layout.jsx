import React, { useState, useEffect } from 'react';
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
    CircleStackIcon,
    UserCircleIcon,
    AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { useAccessibility } from './AccessibilityContext.jsx';
import { useData } from './DataContext.jsx';
import SaveToasts from './SaveToasts.jsx';
import ActionCenter from './ActionCenter.jsx';
import Avatar from './Avatar.jsx';
import MobileDeviceLayout from './MobileDeviceLayout.jsx';

/** Provides the authenticated application shell, sidebar, and navigation. */
const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { openSettings } = useAccessibility();

    // Detect screen width for dedicated Mobile / Tablet device layout
    const [isMobileDevice, setIsMobileDevice] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 1024;
    });

    useEffect(() => {
        /** Keeps the responsive sidebar state synchronized with viewport width. */
        const handleResize = () => {
            setIsMobileDevice(window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { backgroundTasks } = useData();
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

    // If viewport width is inside mobile or tablet range (< 1024px), use dedicated MobileDeviceLayout
    if (isMobileDevice) {
        return <MobileDeviceLayout>{children}</MobileDeviceLayout>;
    }

    // SuperAdmin → all items
    // Admin   → Dashboard, Documents, Issuances, Accounts
    const allMenuItems = [
        { path: '/dashboard', icon: ChartBarIcon, label: 'Dashboard', roles: ['SuperAdmin', 'Admin'] },
        { path: '/tickets', icon: TicketIcon, label: 'Tickets Queue', roles: ['SuperAdmin', 'Admin'] },
        { path: '/documents', icon: ArrowUpTrayIcon, label: 'Upload Document', roles: ['SuperAdmin', 'Admin'] },
        { path: '/reports', icon: TableCellsIcon, label: 'Export Reports', roles: ['SuperAdmin', 'Admin'] },
        { path: '/issuances', icon: ClipboardDocumentCheckIcon, label: 'Registry Database', roles: ['SuperAdmin', 'Admin'] },
        { path: '/archive', icon: TrashIcon, label: 'Archive Manager', roles: ['SuperAdmin', 'Admin'] },
        { path: '/mapping', icon: MapPinIcon, label: 'Mapping', roles: ['SuperAdmin'] },
        { path: '/announcements', icon: MegaphoneIcon, label: 'Announcements', roles: ['SuperAdmin', 'Admin'] },
        { path: '/accounts', icon: UsersIcon, label: 'Account Management', roles: ['SuperAdmin', 'Admin'] },
        { path: '/backups', icon: CircleStackIcon, label: 'Backup & Recovery', roles: ['SuperAdmin'] },
    ];

    const menuItems = allMenuItems.filter(item => item.roles.includes(user.role));

    /** Toggles the mobile navigation drawer. */
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    /** Closes the mobile navigation drawer. */
    const closeSidebar = () => setSidebarOpen(false);

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await fetch(`${window.location.origin}/api/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            await new Promise(r => setTimeout(r, 600));
        } catch (e) {}
        localStorage.removeItem('user');
        sessionStorage.clear();
        navigate('/login', { replace: true });
    };

    return (
        <div className="h-screen w-screen bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex relative overflow-hidden">
            {/* Accessible Skip Link */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999999] focus:px-4 focus:py-2.5 focus:bg-[#d4a574] focus:text-slate-950 focus:font-black focus:text-xs focus:rounded-xl focus:shadow-2xl focus:outline-none"
            >
                Skip to main content / Lumaktaw sa nilalaman
            </a>

            {/* Ambient Background Radial Glows (Zero-CPU/GPU-accelerated) */}
            <div className="fixed top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none z-0"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[35%] h-[45%] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)] pointer-events-none z-0"></div>
            <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-[radial-gradient(ellipse_at_center,rgba(212,165,116,0.08)_0%,transparent_70%)] pointer-events-none z-0"></div>
            
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800 shadow-2xl md:shadow-none translate-x-0 md:static md:shrink-0">
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
                <nav className="flex-1 p-4 flex flex-col overflow-y-auto w-full custom-scrollbar">
                    <div className="space-y-1.5 flex-1">
                        {menuItems.map((item) => {
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
                    </div>

                    {/* Integrated Logout Button */}
                    <div className="mt-auto pt-4 border-t border-slate-800/50">
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isLoggingOut ? 'text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/30 opacity-70 cursor-not-allowed' : 'text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:ring-1 hover:ring-rose-500/30'}`}
                        >
                            {isLoggingOut ? (
                                <svg className="animate-spin w-5 h-5 flex-shrink-0 text-rose-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 flex-shrink-0 transition-colors text-slate-500 group-hover:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            )}
                            <span className="text-sm tracking-wide">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-transparent h-screen relative z-10 w-full overflow-hidden">
                {/* Top Bar - Desktop */}
                <header className="flex items-center justify-between h-[3.75rem] px-6 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs backdrop-blur-md bg-white/90 dark:bg-[#0f172a]/90">
                    <h1 id="pageTitle" className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        {menuItems.find(m => m.path === location.pathname)?.label || 'Dashboard'}
                    </h1>

                    {/* Right Header Action Items */}
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

                        {/* Header Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="cursor-pointer flex items-center gap-4 focus:outline-none group group-hover:border-transparent"
                            >
                                <div className="flex flex-col text-right">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-none group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{user.name || 'User'}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{user.role || 'Admin'}</span>
                                </div>
                                <Avatar name={user.name} src={user.avatar} size={10} className="shadow-md ring-2 ring-white dark:ring-slate-800 group-hover:ring-[#d4a574] transition-all" />
                            </button>

                            {/* Dropdown Menu */}
                            {showProfileMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowProfileMenu(false)}
                                    ></div>
                                    <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/40 ring-1 ring-slate-200 dark:ring-slate-800 z-50 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right border border-slate-100 dark:border-slate-800">
                                        {/* Profile Info Header */}
                                        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                            <p className="text-xs font-black text-slate-900 dark:text-white leading-tight line-clamp-1">{user.name}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono line-clamp-1">{user.email || user.role}</p>
                                        </div>

                                        <div className="p-1.5 space-y-0.5">
                                            <Link
                                                to="/accounts"
                                                onClick={() => setShowProfileMenu(false)}
                                                className="cursor-pointer w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                            >
                                                <UserCircleIcon className="w-4 h-4 text-indigo-500" />
                                                <span>Account Profile</span>
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowProfileMenu(false);
                                                    openSettings();
                                                }}
                                                className="cursor-pointer w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                            >
                                                <AdjustmentsHorizontalIcon className="w-4 h-4 text-[#d4a574]" />
                                                <span>Settings & Accessibility</span>
                                            </button>

                                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                                            <button
                                                onClick={handleLogout}
                                                className="cursor-pointer w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div id="main-content" tabIndex="-1" className="flex-1 p-5 overflow-x-hidden overflow-y-auto relative w-full h-[calc(100vh-3.75rem)] focus:outline-none">
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

            {/* Global Overlays */}
            <SaveToasts tasks={backgroundTasks} />
            <ActionCenter />
        </div>
    );
};

export default Layout;
