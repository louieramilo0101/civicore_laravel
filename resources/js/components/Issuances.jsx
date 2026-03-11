
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
            className="page" 
            id="issuancePage"
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
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)', 
                    marginBottom: '30px' 
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
                    Certificate Issuance Management
                </motion.h2>
                
                <motion.div 
                    style={{ marginBottom: '20px' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <label style={{ fontWeight: '600', marginBottom: '10px', display: 'block' }}>Filter by Type:</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {filterButtons.map((btn, index) => (
                            <motion.button 
                                key={btn.id}
                                className={`btn-primary ${filter === btn.id ? 'active' : ''}`}
                                onClick={() => setFilter(btn.id)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + (index * 0.05) }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                style={{ 
                                    background: filter === btn.id ? 'var(--secondary-color)' : undefined 
                                }}
                            >
                                {btn.icon} {btn.label}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--light-bg)', borderBottom: '2px solid #ddd' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Certificate No.</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Type</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Barangay</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6">
                                        <SkeletonLoader type="table" rows={5} />
                                    </td>
                                </tr>
                            ) : filteredIssuances.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <motion.div 
                                            className="empty-state"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.3 }}
                                        >
                                            <div className="icon">📭</div>
                                            <p>No issuances found</p>
                                        </motion.div>
                                    </td>
                                </tr>
                            ) : (
                                <AnimatePresence>
                                    {filteredIssuances.map((issuance, index) => (
                                        <motion.tr 
                                            key={issuance.id} 
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
                                            <td style={{ padding: '12px' }}>{issuance.certNumber}</td>
                                            <td style={{ padding: '12px' }}>{getTypeIcon(issuance.certType)} {issuance.certType}</td>
                                            <td style={{ padding: '12px' }}>{issuance.recipientName}</td>
                                            <td style={{ padding: '12px' }}>{issuance.barangay}</td>
                                            <td style={{ padding: '12px' }}>{issuance.issuanceDate}</td>
                                            <td style={{ padding: '12px' }}>
                                                <motion.span 
                                                    className={getStatusClass(issuance.status)}
                                                    whileHover={{ scale: 1.1 }}
                                                >
                                                    {issuance.status}
                                                </motion.span>
                                            </td>
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

