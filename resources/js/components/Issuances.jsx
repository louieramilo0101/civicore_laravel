import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import SkeletonLoader from './SkeletonLoader';
import { 
    HeartIcon, 
    XCircleIcon, 
    ClipboardDocumentListIcon,
    InboxIcon,
    DocumentIcon,
    QueueListIcon
} from '@heroicons/react/24/outline';

const API_BASE = '/api';

function Issuances() {
    const [issuances, setIssuances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchIssuances();
    }, []);

    const fetchIssuances = async () => {
        try {
            const response = await fetch(`${API_BASE}/issuances`, { credentials: 'include' });
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
            case 'birth': return HeartIcon;
            case 'death': return XCircleIcon;
            case 'marriage_license': return ClipboardDocumentListIcon;
            default: return DocumentIcon;
        }
    };

    const getStatusClass = (status) => {
        switch(status) {
            case 'Issued': return 'bg-green-100 text-green-700';
            case 'Pending': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filterButtons = [
        { id: 'all', label: 'All Certificates', icon: QueueListIcon },
        { id: 'birth', label: 'Birth', icon: HeartIcon },
        { id: 'death', label: 'Death', icon: XCircleIcon },
        { id: 'marriage_license', label: 'Marriage', icon: ClipboardDocumentListIcon }
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
                
                <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <label className="block font-semibold mb-3 text-sm md:text-base text-gray-700">Filter Certificates:</label>
                    <div className="flex flex-wrap gap-2">
                        {filterButtons.map((btn, index) => {
                            const BtnIcon = btn.icon;
                            return (
                            <motion.button 
                                key={btn.id}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                                    filter === btn.id 
                                        ? 'bg-[#d4a574] text-white shadow-md' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm border border-gray-200'
                                }`}
                                onClick={() => setFilter(btn.id)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + (index * 0.05) }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <BtnIcon className="w-4 h-4 inline-block mr-1" />
                                {btn.label}
                            </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                <th className="p-4 text-left font-semibold text-sm text-gray-700">Certificate No.</th>
                                <th className="p-4 text-left font-semibold text-sm text-gray-700">Type</th>
                                <th className="p-4 text-left font-semibold text-sm text-gray-700">Recipient</th>
                                <th className="p-4 text-left font-semibold text-sm text-gray-700">Barangay</th>
                                <th className="p-4 text-left font-semibold text-sm text-gray-700">Date</th>
                                <th className="p-4 text-left font-semibold text-sm text-gray-700">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill().map((_, i) => (
                                    <tr key={i}><td colSpan="6"><SkeletonLoader type="table" rows={1} /></td></tr>
                                ))
                            ) : filteredIssuances.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <motion.div className="text-center py-12 text-gray-500" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                                            <InboxIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No issuances found</h3>
                                            <p className="text-sm text-gray-500">Try adjusting your filters above</p>
                                        </motion.div>
                                    </td>
                                </tr>
                            ) : (
                                <AnimatePresence>
                                    {filteredIssuances.map((issuance, index) => {
                                        const TypeIcon = getTypeIcon(issuance.certType);
                                        return (
                                        <motion.tr 
                                            key={issuance.id} 
                                            className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <td className="p-4 text-sm font-medium text-gray-900">{issuance.certNumber || 'N/A'}</td>
                                            <td className="p-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <TypeIcon className="w-5 h-5 text-[#d4a574]" />
                                                    <span className="capitalize">{issuance.certType?.replace('_', ' ') || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-gray-900">{issuance.recipientName || issuance.name || 'N/A'}</td>
                                            <td className="p-4 text-sm text-gray-700">{issuance.barangay || 'N/A'}</td>
                                            <td className="p-4 text-sm text-gray-700">{issuance.issuanceDate ? new Date(issuance.issuanceDate).toLocaleDateString() : 'N/A'}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(issuance.status)}`}>
                                                    {issuance.status || 'Unknown'}
                                                </span>
                                            </td>
                                        </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredIssuances.length > 0 && (
                    <motion.div 
                        className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <p className="text-sm text-blue-800 font-medium">
                            Showing <span className="font-bold">{filteredIssuances.length}</span> {filter === 'all' ? 'certificates' : filter.replace('_', ' ')} 
                            • <span className="font-bold">{issuances.length}</span> total issuances
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
}

export default Issuances;

