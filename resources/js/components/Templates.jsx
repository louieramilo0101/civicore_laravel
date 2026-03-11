
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
            className="page" 
            id="templatesPage"
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
                    Template Management
                </motion.h2>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <SkeletonLoader type="list" rows={5} />
                    </div>
                ) : templates.length === 0 ? (
                    <motion.div 
                        className="empty-state"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="icon">📝</div>
                        <p>No templates found</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        style={{ display: 'grid', gap: '15px' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <AnimatePresence>
                            {templates.map((template, index) => (
                                <motion.div 
                                    key={template.id}
                                    style={{ 
                                        padding: '20px', 
                                        border: '1px solid #ddd', 
                                        borderRadius: '8px',
                                        background: 'white'
                                    }}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ 
                                        y: -3,
                                        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                                        borderColor: 'var(--secondary-color)'
                                    }}
                                >
                                    <motion.div 
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 + 0.1 }}
                                    >
                                        <motion.span 
                                            style={{ fontSize: '24px' }}
                                            whileHover={{ scale: 1.2, rotate: 10 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                        >
                                            📝
                                        </motion.span>
                                        <div>
                                            <motion.h3
                                                style={{ marginBottom: '5px', color: 'var(--primary-color)' }}
                                            >
                                                {template.name || template.type}
                                            </motion.h3>
                                            <motion.p 
                                                style={{ color: 'var(--text-light)', fontSize: '14px' }}
                                            >
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

