import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { CloudArrowUpIcon, DocumentIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useModal } from './ModalContext.jsx';
import SkeletonLoader from './SkeletonLoader.jsx';

const Documents = () => {
    const { showAlert } = useModal();
    const [selectedDocType, setSelectedDocType] = useState('birth');
    const [files, setFiles] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [dragging, setDragging] = useState(false);
    const [isUploading, setIsLoading] = useState(false);

    const fetchDocuments = () => {
        setIsLoadingData(true);
        fetch('/api/documents', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    const loadedFiles = data.data.map(doc => ({
                        id: doc.id,
                        name: doc.name,
                        type: doc.type || 'Uncategorized',
                        size: doc.size,
                        status: doc.status ? doc.status.toLowerCase() : 'pending',
                        date: doc.date || 'Just now'
                    }));
                    setFiles(loadedFiles);
                    sessionStorage.setItem('cache_documents', JSON.stringify(loadedFiles));
                }
            })
            .catch(err => console.error("Error fetching documents:", err))
            .finally(() => setIsLoadingData(false));
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    // Removed sessionStorage cache sync
    useEffect(() => {
        // No-op
    }, [files, isLoadingData]);

    const onDrop = useCallback(async (acceptedFiles) => {
        setDragging(false);
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        const tempId = Math.random().toString(36).substring(7);

        setFiles(prev => [{
            id: tempId,
            name: file.name,
            type: selectedDocType,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            status: 'uploading'
        }, ...prev]);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('docType', selectedDocType);

        try {
            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                setFiles(prev => prev.map(f => f.id === tempId ? {
                    id: data.id,
                    name: data.originalName,
                    type: selectedDocType,
                    size: data.size,
                    status: 'pending' // Ready for OCR
                } : f));
            } else {
                showAlert({
                    title: 'Upload Failed',
                    message: data.error || "There was an error uploading your document. Please try again.",
                    type: 'error'
                });
                setFiles(prev => prev.filter(f => f.id !== tempId));
            }
        } catch (error) {
            console.error("Upload error:", error);
            showAlert({
                title: 'Network Error',
                message: "A network error occurred during upload.",
                type: 'error'
            });
            setFiles(prev => prev.filter(f => f.id !== tempId));
        }
    }, [selectedDocType]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] },
        multiple: true,
        onDragEnter: () => setDragging(true),
        onDragLeave: () => setDragging(false),
    });

    const docTypes = [
        { type: 'birth', icon: '👶', name: 'Birth Certificate', desc: 'Process live birth records' },
        { type: 'death', icon: '⚰️', name: 'Death Certificate', desc: 'Process registry of deaths' },
        { type: 'marriage', icon: '💍', name: 'Marriage License', desc: 'Process marriage contracts' },
    ];

    const processFile = async (fileId) => {
        setIsLoading(true);
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'processing' } : f));

        try {
            const response = await fetch('/api/ocr/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ documentId: fileId })
            });
            const data = await response.json();

            if (data.success || data.ocr_text_saved) {
                setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'processed' } : f));
                showAlert({
                    title: 'OCR Success',
                    message: 'Data has been successfully extracted from the document.',
                    type: 'success'
                });
            } else {
                setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'failed' } : f));
                showAlert({
                    title: 'OCR Extraction Failed',
                    message: data.error || "Could not extract text from the document.",
                    type: 'error'
                });
            }
        } catch (error) {
            console.error("OCR process error:", error);
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'failed' } : f));
            showAlert({
                title: 'Processing Error',
                message: "An unexpected error occurred during OCR processing.",
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const bulkProcessFiles = async () => {
        const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'failed');
        if (pendingFiles.length === 0) {
            showAlert({ title: 'No files to process', message: 'There are no pending documents in the queue.', type: 'info' });
            return;
        }

        setIsLoading(true);
        let successCount = 0;
        let failCount = 0;
        
        for (const file of pendingFiles) {
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'processing' } : f));
            try {
                const response = await fetch('/api/ocr/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ documentId: file.id })
                });
                const data = await response.json();
                if (data.success || data.ocr_text_saved) {
                    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'processed' } : f));
                    successCount++;
                } else {
                    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'failed' } : f));
                    failCount++;
                }
            } catch (error) {
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'failed' } : f));
                failCount++;
            }
        }
        
        setIsLoading(false);
        showAlert({ 
            title: 'Bulk Processing Complete', 
            message: `Batch processing finished. ${successCount} successful, ${failCount} failed.`, 
            type: successCount > 0 ? 'success' : 'error' 
        });
    };

    const removeFile = async (fileId) => {
        if (!window.confirm("Delete this document from database?")) return;

        try {
            await fetch(`/api/documents/${fileId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            setFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    // Render layout immediately, skeletons for data sections
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 max-w-7xl mx-auto"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Section - Takes up 1 column on large screens */}
                <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">Upload Document</h2>

                    {/* Document Types Selector */}
                    <div className="space-y-3 mb-6 font-sans">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Document Category</label>
                        {docTypes.map((doc) => (
                            <div
                                key={doc.type}
                                onClick={() => setSelectedDocType(doc.type)}
                                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border-2 ${selectedDocType === doc.type
                                    ? 'border-[#d4a574] bg-[#d4a574]/5 shadow-sm'
                                    : 'border-transparent bg-slate-50 hover:bg-slate-100'
                                    }`}
                            >
                                <div className={`text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-sm ${selectedDocType === doc.type ? 'ring-1 ring-[#d4a574]/30' : ''}`}>
                                    {doc.icon}
                                </div>
                                <div>
                                    <div className={`font-semibold text-sm ${selectedDocType === doc.type ? 'text-[#d4a574]' : 'text-slate-700'}`}>{doc.name}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{doc.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Drag & Drop Area */}
                    <div
                        {...getRootProps()}
                        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-colors cursor-pointer text-center ${isDragActive || dragging
                            ? 'border-[#d4a574] bg-[#d4a574]/5'
                            : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
                            }`}
                    >
                        <input {...getInputProps()} />
                        <CloudArrowUpIcon className={`w-12 h-12 mb-3 ${isDragActive ? 'text-[#d4a574]' : 'text-slate-400'}`} />
                        <p className="text-sm font-semibold text-slate-700 mb-1">Click or drag files to upload</p>
                        <p className="text-xs text-slate-500">Supported formats: PDF, JPG, PNG (Max 10MB)</p>
                    </div>
                </motion.div>

                {/* Processing Queue & Records Table - Takes up 2 columns */}
                <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6 flex flex-col">
                    <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col flex-1 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Processing Queue</h3>
                                <p className="text-xs text-slate-500 mt-1">Documents pending OCR data extraction</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {files.some(f => f.status === 'pending' || f.status === 'failed') && (
                                    <button
                                        onClick={bulkProcessFiles}
                                        disabled={isUploading}
                                        className="text-xs font-black text-[#d4a574] bg-[#d4a574]/10 hover:bg-[#d4a574] hover:text-[#0f172a] px-4 py-2 rounded-full border border-[#d4a574]/20 transition-all flex items-center gap-2 group disabled:opacity-50"
                                    >
                                        <CloudArrowUpIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        Process All Pending
                                    </button>
                                )}
                                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100 flex items-center">
                                    {files.length} Total Files
                                </span>
                            </div>
                        </div>

                        {files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-400 flex-1">
                                <DocumentIcon className="w-16 h-16 mb-4 opacity-50" />
                                <p className="text-base font-medium text-slate-600">No documents in queue</p>
                                <p className="text-sm mt-1">Upload documents from the left panel to begin</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                                            <th className="p-4 pl-6">Document Name</th>
                                            <th className="p-4">Type</th>
                                            <th className="p-4">Size</th>
                                            <th className="p-4 text-center">Status</th>
                                            <th className="p-4 pr-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoadingData ? (
                                            <tr>
                                                <td colSpan="5" className="p-0">
                                                    <SkeletonLoader type="table" rows={6} />
                                                </td>
                                            </tr>
                                        ) : files.length === 0 ? (
                                             <tr className="border-0">
                                                <td colSpan="5">
                                                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                                                        <DocumentIcon className="w-16 h-16 mb-4 opacity-50" />
                                                        <p className="text-base font-medium text-slate-600">No documents in queue</p>
                                                        <p className="text-sm mt-1">Upload documents from the left panel to begin</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            files.map((file) => (
                                                <tr key={file.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                                                <DocumentIcon className="w-4 h-4" />
                                                            </div>
                                                            <div className="truncate max-w-[200px]">
                                                                <p className="text-sm font-semibold text-slate-800 truncate" title={file.name}>{file.name}</p>
                                                                <p className="text-xs text-slate-500">Just now</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 uppercase tracking-wider">
                                                            {selectedDocType}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-sm text-slate-600">{typeof file.size === 'string' ? file.size : (file.size / 1024 / 1024).toFixed(2) + ' MB'}</span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {file.status === 'processed' ? (
                                                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                                                <CheckCircleIcon className="w-3.5 h-3.5" /> Processed
                                                            </div>
                                                        ) : file.status === 'processing' || file.status === 'uploading' ? (
                                                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                                                                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="4" strokeDasharray="32" strokeLinecap="round" className="opacity-25"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                                                {file.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                                                            </div>
                                                        ) : file.status === 'failed' ? (
                                                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                                                                Failed
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending OCR
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 pr-6">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {file.status === 'pending' || file.status === 'uploaded' || file.status === 'failed' ? (
                                                                <button
                                                                    onClick={() => processFile(file.id)}
                                                                    disabled={isUploading || file.status === 'uploading'}
                                                                    className="text-xs font-bold text-white bg-[#0f172a] hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                                                >
                                                                    {file.status === 'failed' ? 'Retry Extract' : 'Extract Data'}
                                                                </button>
                                                            ) : null}
                                                            <button
                                                                onClick={() => removeFile(file.id)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="Delete file"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Documents;

