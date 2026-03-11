import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const menuItems = [
        { path: '/', icon: '📊', label: 'Dashboard' },
        { path: '/documents', icon: '📄', label: 'Documents' },
        { path: '/issuances', icon: '✅', label: 'Issuances' },
        { path: '/users', icon: '👥', label: 'Users' },
        { path: '/barangays', icon: '🗺️', label: 'Barangays' },
        { path: '/templates', icon: '📝', label: 'Templates' },
    ];

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Mobile Header - Hidden on desktop */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#1a2f4a] z-50 flex items-center px-4 gap-3">
                <button 
                    onClick={toggleSidebar}
                    className="text-white p-2 hover:bg-white/10 rounded"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sidebarOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
                <span className="text-white font-semibold text-sm">Civil Registry</span>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div 
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-full bg-[#1a2f4a] text-white z-50
                w-64 transform transition-transform duration-300 ease-in-out
                md:translate-x-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:w-64 lg:w-64
            `}>
                {/* Header */}
                <div className="p-4 border-b border-white/10 text-center">
                    <h2 className="text-lg font-bold">Civil Registry</h2>
                    <p className="text-xs text-white/60">v1.0</p>
                </div>

                {/* Menu */}
                <nav className="p-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={closeSidebar}
                            className={`
                                flex items-center gap-3 px-4 py-3 rounded-lg mb-1
                                transition-colors duration-200
                                ${location.pathname === item.path 
                                    ? 'bg-[#d4a574] text-white' 
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }
                            `}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <button 
                        onClick={() => {
                            sessionStorage.clear();
                            window.location.href = '/login';
                        }}
                        className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="
                md:ml-64 lg:ml-64 
                pt-14 md:pt-0 
                min-h-screen
            ">
                {/* Top Bar - Desktop only */}
                <div className="hidden md:flex items-center justify-between bg-white px-6 py-4 shadow-sm">
                    <h1 className="text-xl font-bold text-[#1a2f4a]">
                        {menuItems.find(m => m.path === location.pathname)?.label || 'Dashboard'}
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-[#1a2f4a]">{user.name || 'User'}</p>
                            <p className="text-xs text-gray-500">{user.role || 'User'}</p>
                        </div>
                        <div className="w-10 h-10 bg-[#d4a574] rounded-full flex items-center justify-center text-white font-semibold">
                            {(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-4 md:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;

