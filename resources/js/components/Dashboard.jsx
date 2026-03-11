import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { AnimatedStatCard } from './AnimatedCounter';
import SkeletonLoader from './SkeletonLoader';
import { 
    DocumentTextIcon, 
    ClipboardDocumentCheckIcon, 
    ClockIcon, 
    UsersIcon, 
    ArrowUpTrayIcon 
} from '@heroicons/react/24/outline';

const API_BASE = 'http://localhost:8000';

function Dashboard() {
    const [stats, setStats] = useState({
        totalDocs: 0,
        processedDocs: 0,
        pendingDocs: 0,
        totalUsers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [docsRes, usersRes] = await Promise.all([
                    fetch(`${API_BASE}/api/documents`, { credentials: 'include' }),
                    fetch(`${API_BASE}/api/users`, { credentials: 'include' })
                ]);
                
                const docs = await docsRes.json();
                const users = await usersRes.json();
                
                setStats({
                    totalDocs: docs.length || 0,
                    processedDocs: (docs.filter(d => d.status === 'processed') || []).length,
                    pendingDocs: (docs.filter(d => d.status === 'pending') || []).length,
                    totalUsers: users.length || 0
                });
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchStats();
    }, []);

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            {loading && (
                <div className="flex items-center justify-center min-h-[400px]">
                    <LoadingSpinner size="lg" message="Loading dashboard..." />
                </div>
            )}
            
            {!loading && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Stats Grid - Responsive: 1 col mobile, 2 col tablet, 4 col desktop */}
                    <motion.div 
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8"
                        variants={itemVariants}
                    >
                        <AnimatedStatCard 
                            label="Total Documents" 
                            value={stats.totalDocs}
                            icon={DocumentTextIcon}
                            color="#d4a574"
                            delay={0}
                        />
                        <AnimatedStatCard 
                            label="Processed" 
                            value={stats.processedDocs}
                            icon={ClipboardDocumentCheckIcon}
                            color="#27ae60"
                            delay={0.1}
                        />
                        <AnimatedStatCard 
                            label="Pending" 
                            value={stats.pendingDocs}
                            icon={ClockIcon}
                            color="#f39c12"
                            delay={0.2}
                        />
                        <AnimatedStatCard 
                            label="Users" 
                            value={stats.totalUsers}
                            icon={UsersIcon}
                            color="#9b59b6"
                            delay={0.3}
                        />
                    </motion.div>

                    {/* Quick Actions & Welcome - Responsive: 1 col mobile, 2 col desktop */}
                    <motion.div 
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
                        variants={itemVariants}
                    >
                        {/* Quick Actions Card */}
                        <motion.div 
                            className="bg-white rounded-xl shadow-md p-4 md:p-6"
                            whileHover={{ 
                                y: -5,
                                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                                transition: { duration: 0.2 }
                            }}
                        >
                            <h3 className="text-lg font-bold text-[#1a2f4a] mb-4">Quick Actions</h3>
                            <div className="flex flex-col gap-3">
                                {[
                                    { to: "/documents", icon: ArrowUpTrayIcon, text: "Upload Document" },
                                    { to: "/issuances", icon: ClipboardDocumentCheckIcon, text: "Issue Certificate" },
                                    { to: "/users", icon: UsersIcon, text: "Manage Users" }
                                ].map((action) => {
                                    const ActionIcon = action.icon;
                                    return (
                                    <motion.div
                                        key={action.to}
                                        whileHover={{ scale: 1.02, x: 5 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Link 
                                            to={action.to} 
                                            className="block w-full py-3 px-4 bg-[#d4a574] hover:bg-[#c49a67] text-white font-semibold rounded-lg text-center transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ActionIcon className="w-5 h-5" />
                                            {action.text}
                                        </Link>
                                    </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                        
                        {/* Welcome Card */}
                        <motion.div 
                            className="bg-white rounded-xl shadow-md p-4 md:p-6"
                            whileHover={{ 
                                y: -5,
                                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                                transition: { duration: 0.2 }
                            }}
                        >
                            <motion.h3
                                className="text-lg font-bold text-[#1a2f4a]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                Welcome, {user.name || 'User'}! 👋
                            </motion.h3>
                            <motion.p 
                                className="text-gray-500 mt-3 text-sm md:text-base"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                You are logged in as <strong>{user.role || 'User'}</strong>.
                            </motion.p>
                            <motion.div
                                className="mt-4 p-3 bg-gray-100 rounded-lg"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <p className="text-sm text-gray-500">
                                    📅 {new Date().toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </p>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default Dashboard;

