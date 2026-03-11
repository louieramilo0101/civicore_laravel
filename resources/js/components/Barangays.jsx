
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import SkeletonLoader from './SkeletonLoader';

const API_BASE = 'http://localhost:8000';

function Barangays() {
    const [barangays, setBarangays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBarangays();
    }, []);

    const fetchBarangays = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/barangays`, { credentials: 'include' });
            const data = await response.json();
            setBarangays(data || []);
        } catch (err) {
            console.error('Error fetching barangays:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            className="page" 
            id="barangaysPage"
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
                    Barangay Management
                </motion.h2>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <SkeletonLoader type="cards" rows={4} />
                    </div>
                ) : barangays.length === 0 ? (
                    <motion.div 
                        className="empty-state"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="icon">🏘️</div>
                        <p>No barangays found</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                            gap: '15px' 
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <AnimatePresence>
                            {barangays.map((barangay, index) => (
                                <motion.div 
                                    key={barangay.id}
                                    style={{ 
                                        padding: '20px', 
                                        border: '1px solid #ddd', 
                                        borderRadius: '8px',
                                        textAlign: 'center'
                                    }}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ 
                                        y: -5,
                                        boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                                        borderColor: 'var(--secondary-color)'
                                    }}
                                >
                                    <motion.div 
                                        style={{ fontSize: '40px', marginBottom: '10px' }}
                                        whileHover={{ scale: 1.2, rotate: 5 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                    >
                                        🏘️
                                    </motion.div>
                                    <motion.h3
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 + 0.1 }}
                                    >
                                        {barangay.name}
                                    </motion.h3>
                                    <motion.p 
                                        style={{ color: 'var(--text-light)', marginTop: '5px' }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 + 0.2 }}
                                    >
                                        {barangay.municipality || 'Naic'}
                                    </motion.p>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
}

export default Barangays;

