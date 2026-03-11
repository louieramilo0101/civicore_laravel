
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import SkeletonLoader from './SkeletonLoader';

const API_BASE = 'http://localhost:8000';

function Documents() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/documents`, { credentials: 'include' });
            const data = await response.json();
            setDocuments(data || []);
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file || !selectedType) {
            alert('Please select a document type and file');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('docType', selectedType);
        formData.append('personName', 'Unknown');
        formData.append('barangay', 'Unknown');

        try {
            const response = await fetch(`${API_BASE}/api/documents/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const data = await response.json();
            alert(data.message || 'Upload successful');
            fetchDocuments();
            setFile(null);
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const documentTypes = [
        { id: 'birth', name: 'Birth Certificate', icon: '👶', desc: 'Upload and process birth certificates' },
        { id: 'death', name: 'Death Certificate', icon: '⚰️', desc: 'Upload and process death certificates' },
        { id: 'marriage', name: 'Marriage License', icon: '💍', desc: 'Upload and process marriage licenses' }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <motion.div 
                    className="bg-white rounded-xl shadow-md p-4 md:p-6"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <motion.h2
                        className="text-xl font-bold text-[#1a2f4a] mb-4"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        Upload Document
                    </motion.h2>
                    
                    <div className="grid gap-3 mb-4">
                        {documentTypes.map((type, index) => (
                            <motion.div 
                                key={type.id}
                                className={`p-3 md:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                    selectedType === type.id ? 'border-[#d4a574] bg-amber-50' : 'border-gray-200 hover:border-[#d4a574]'
                                }`}
                                onClick={() => setSelectedType(type.id)}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + (index * 0.1) }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="font-semibold text-[#1a2f4a]">{type.icon} {type.name}</div>
                                <div className="text-xs md:text-sm text-gray-500">{type.desc}</div>
                            </motion.div>
                        ))}
                    </div>
                    
                    <motion.div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6 text-center mb-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="mb-3 w-full text-sm" />
                        {file && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={file.name} className="text-sm text-green-600 font-medium">
                                ✓ Selected: {file.name}
                            </motion.p>
                        )}
                    </motion.div>
                    
                    <motion.button 
                        className="w-full py-3 px-4 bg-[#d4a574] hover:bg-[#c49a67] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                        onClick={handleUpload}
                        disabled={uploading}
                        whileHover={{ scale: uploading ? 1 : 1.02 }}
                        whileTap={{ scale: uploading ? 1 : 0.98 }}
                    >
                        {uploading ? 'Uploading...' : 'Process with OCR'}
                    </motion.button>
                </motion.div>

                <motion.div 
                    className="bg-white rounded-xl shadow-md p-4 md:p-6"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    <motion.h3 className="text-lg font-bold text-[#1a2f4a] mb-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        Recent Documents
                    </motion.h3>
                    
                    {loading ? (
                        <div className="flex items-center justify-center py-8"><SkeletonLoader type="list" rows={5} /></div>
                    ) : documents.length === 0 ? (
                        <motion.div className="text-center py-8 text-gray-500" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                            <div className="text-4xl mb-2">📭</div>
                            <p>No documents uploaded yet</p>
                        </motion.div>
                    ) : (
                        <AnimatePresence>
                            {documents.slice(0, 10).map((doc, index) => (
                                <motion.div 
                                    key={doc.id} 
                                    className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)', scale: 1.01 }}
                                >
                                    <div className="text-2xl">{doc.docType === 'birth' ? '👶' : doc.docType === 'death' ? '⚰️' : '💍'}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-[#1a2f4a] truncate">{doc.personName || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500 capitalize">{doc.docType} - {doc.status}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}

export default Documents;

