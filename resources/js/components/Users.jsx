
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
            className="page" 
            id="accountsPage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div 
                style={{ 
                    background: 'white', 
                    padding: '25px', 
                    borderRadius: '10px', 
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <motion.h2 
                    style={{ marginBottom: '20px', color: 'var(--primary-color)' }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    User Account Management
                </motion.h2>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <SkeletonLoader type="table" rows={5} />
                    </div>
                ) : users.length === 0 ? (
                    <motion.div 
                        className="empty-state"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="icon">👥</div>
                        <p>No users found</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        style={{ overflowX: 'auto' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--light-bg)', borderBottom: '2px solid #ddd' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Role</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {users.map((user, index) => (
                                        <motion.tr 
                                            key={user.id} 
                                            style={{ borderBottom: '1px solid #eee' }}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ 
                                                backgroundColor: 'rgba(0,0,0,0.02)',
                                                scale: 1.01
                                            }}
                                        >
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <motion.div
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            background: user.role === 'admin' ? '#9b59b6' : '#3498db',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontWeight: '600',
                                                            fontSize: '14px'
                                                        }}
                                                        whileHover={{ scale: 1.1 }}
                                                    >
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </motion.div>
                                                    {user.name}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>{user.email}</td>
                                            <td style={{ padding: '12px' }}>
                                                <motion.span 
                                                    style={getRoleBadgeStyle(user.role)}
                                                    whileHover={{ scale: 1.1 }}
                                                >
                                                    {user.role}
                                                </motion.span>
                                            </td>
                                            <td style={{ padding: '12px' }}>{user.created_at}</td>
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

