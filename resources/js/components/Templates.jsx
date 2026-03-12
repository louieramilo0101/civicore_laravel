
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import SkeletonLoader from './SkeletonLoader';

const API_BASE = 'http://localhost:8000';

function Templates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/templates`, { credentials: 'include' });
            const data = await response.json();
            setTemplates(data || []);
        } catch (err) {
            console.error('Error fetching templates:', err);
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
                    Template Management
                </motion.h2>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8"><SkeletonLoader type="list" rows={5} /></div>
                ) : templates.length === 0 ? (
                    <motion.div className="text-center py-8 text-gray-500" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <div className="text-4xl mb-2">📝</div>
                        <p>No templates found</p>
                    </motion.div>
                ) : (
                    <motion.div className="grid gap-3 md:gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        <AnimatePresence>
                            {templates.map((template, index) => (
                                <motion.div 
                                    key={template.id}
                                    className="p-4 md:p-5 border border-gray-200 rounded-lg bg-white hover:border-[#d4a574]"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
                                >
                                    <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 + 0.1 }}>
                                        <motion.span className="text-2xl" whileHover={{ scale: 1.2, rotate: 10 }} transition={{ type: "spring", stiffness: 300 }}>
                                            📝
                                        </motion.span>
                                        <div>
                                            <motion.h3 className="font-semibold text-[#1a2f4a] text-sm md:text-base mb-1">
                                                {template.name || template.type}
                                            </motion.h3>
                                            <motion.p className="text-gray-500 text-xs md:text-sm">
                                                {template.description || 'Template for ' + template.type}
                                            </motion.p>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
}

export default Templates;

