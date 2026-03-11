
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import SkeletonLoader from './SkeletonLoader';

const API_BASE = 'http://localhost:8000';

function Issuances() {
    const [issuances, setIssuances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchIssuances();
    }, []);

    const fetchIssuances = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/issuances`, { credentials: 'include' });
            const data = await response.json();
            setIssuances(data || []);
        } catch (err) {
            console.error('Error fetching issuances:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredIssuances = filter === 'all' 
        ? issuances 
        : issuances.filter(i => i.certType === filter);

    const getTypeIcon = (type) => {
        switch(type) {
            case 'birth': return '👶';
            case 'death': return '⚰️';
            case 'marriage_license': return '💍';
            default: return '📄';
        }
    };

    const getStatusClass = (status) => {
        switch(status) {
            case 'Issued': return 'status-issued';
            case 'Pending': return 'status-pending';
            default: return '';
        }
    };

    const filterButtons = [
        { id: 'all', label: 'All', icon: '📋' },
        { id: 'birth', label: 'Birth', icon: '👶' },
        { id: 'death', label: 'Death', icon: '⚰️' },
        { id: 'marriage_license', label: 'Marriage', icon: '💍' }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div 
                className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <motion.h2 className="text-lg md:text-xl font-bold text-[#1a2f4a] mb-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    Certificate Issuance Management
                </motion.h2>
                
                <motion.div className="mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <label className="block font-semibold mb-2 text-sm md:text-base">Filter by Type:</label>
                    <div className="flex flex-wrap gap-2">
                        {filterButtons.map((btn, index) => (
                            <motion.button 
                                key={btn.id}
                                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${filter === btn.id ? 'bg-[#d4a574] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                onClick={() => setFilter(btn.id)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + (index * 0.05) }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {btn.icon} {btn.label}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr className="bg-gray-100 border-b-2 border-gray-200">
                                <th className="p-3 text-left font-semibold text-sm">Certificate No.</th>
                                <th className="p-3 text-left font-semibold text-sm">Type</th>
                                <th className="p-3 text-left font-semibold text-sm">Name</th>
                                <th className="p-3 text-left font-semibold text-sm">Barangay</th>
                                <th className="p-3 text-left font-semibold text-sm">Date</th>
                                <th className="p-3 text-left font-semibold text-sm">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6"><SkeletonLoader type="table" rows={5} /></td></tr>
                            ) : filteredIssuances.length === 0 ? (
                                <tr><td colSpan="6"><motion.div className="text-center py-8 text-gray-500" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}><div className="text-4xl mb-2">📭</div><p>No issuances found</p></motion.div></td></tr>
                            ) : (
                                <AnimatePresence>
                                    {filteredIssuances.map((issuance, index) => (
                                        <motion.tr 
                                            key={issuance.id} 
                                            className="border-b border-gray-100 hover:bg-gray-50"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                                        >
                                            <td className="p-3 text-sm">{issuance.certNumber}</td>
                                            <td className="p-3 text-sm">{getTypeIcon(issuance.certType)} {issuance.certType}</td>
                                            <td className="p-3 text-sm">{issuance.recipientName}</td>
                                            <td className="p-3 text-sm">{issuance.barangay}</td>
                                            <td className="p-3 text-sm">{issuance.issuanceDate}</td>
                                            <td className="p-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-medium ${issuance.status === 'Issued' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{issuance.status}</span></td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default Issuances;

