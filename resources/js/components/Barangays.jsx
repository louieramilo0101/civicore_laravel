
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
                    Barangay Management
                </motion.h2>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8"><SkeletonLoader type="cards" rows={4} /></div>
                ) : barangays.length === 0 ? (
                    <motion.div className="text-center py-8 text-gray-500" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <div className="text-4xl mb-2">🏘️</div>
                        <p>No barangays found</p>
                    </motion.div>
                ) : (
                    <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        <AnimatePresence>
                            {barangays.map((barangay, index) => (
                                <motion.div 
                                    key={barangay.id}
                                    className="p-4 md:p-5 border border-gray-200 rounded-lg text-center hover:border-[#d4a574]"
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ y: -5, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}
                                >
                                    <motion.div className="text-3xl md:text-4xl mb-2" whileHover={{ scale: 1.2, rotate: 5 }} transition={{ type: "spring", stiffness: 300 }}>
                                        🏘️
                                    </motion.div>
                                    <motion.h3 className="font-semibold text-[#1a2f4a] text-sm md:text-base" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 + 0.1 }}>
                                        {barangay.name}
                                    </motion.h3>
                                    <motion.p className="text-gray-500 text-xs md:text-sm mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 + 0.2 }}>
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

