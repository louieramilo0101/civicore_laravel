
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import SkeletonLoader from './SkeletonLoader';

const API_BASE = 'http://localhost:8000';

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/users`, { credentials: 'include' });
            const data = await response.json();
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'admin';

    const getRoleBadgeStyle = (role) => {
        return { 
            padding: '4px 8px', 
            borderRadius: '4px',
            background: role === 'admin' ? '#9b59b6' : '#3498db',
            color: 'white',
            fontSize: '12px'
        };
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div 
                className="bg-white rounded-xl shadow-md p-4 md:p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <motion.h2 className="text-lg md:text-xl font-bold text-[#1a2f4a] mb-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    User Account Management
                </motion.h2>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8"><SkeletonLoader type="table" rows={5} /></div>
                ) : users.length === 0 ? (
                    <motion.div className="text-center py-8 text-gray-500" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <div className="text-4xl mb-2">👥</div>
                        <p>No users found</p>
                    </motion.div>
                ) : (
                    <motion.div className="overflow-x-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        <table className="w-full min-w-[500px]">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-200">
                                    <th className="p-3 text-left font-semibold text-sm">Name</th>
                                    <th className="p-3 text-left font-semibold text-sm">Email</th>
                                    <th className="p-3 text-left font-semibold text-sm">Role</th>
                                    <th className="p-3 text-left font-semibold text-sm">Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {users.map((user, index) => (
                                        <motion.tr 
                                            key={user.id} 
                                            className="border-b border-gray-100 hover:bg-gray-50"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                                        >
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <motion.div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: user.role === 'admin' ? '#9b59b6' : '#3498db' }} whileHover={{ scale: 1.1 }}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </motion.div>
                                                    <span className="text-sm">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm">{user.email}</td>
                                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td>
                                            <td className="p-3 text-sm">{user.created_at}</td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
}

export default Users;

