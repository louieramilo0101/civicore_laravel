import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';

/** Displays a registry document with print and download actions. */
const DocumentViewerModal = ({ isOpen, onClose, fileUrl, fileName, onPrint, onDownload }) => {
    if (!isOpen || !fileUrl) return null;

    // Determine if it's a PDF or an Image based on the URL extension
    const isPDF = fileUrl.toLowerCase().endsWith('.pdf');

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                {/* Dark Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm cursor-pointer"
                />

                {/* Modal Container */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-5xl h-[90vh] bg-slate-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-700"
                >
                    {/* Top Toolbar */}
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
                        <div className="truncate pr-4">
                            <h3 className="font-bold text-sm tracking-wide truncate">{fileName || 'Document Viewer'}</h3>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{isPDF ? 'PDF Document' : 'Image File'}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button onClick={onPrint} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Print">
                                <PrinterIcon className="w-5 h-5" />
                            </button>
                            <button onClick={onDownload} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Download">
                                <ArrowDownTrayIcon className="w-5 h-5" />
                            </button>
                            <div className="w-px h-6 bg-slate-700 mx-2"></div>
                            <button onClick={onClose} className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors" title="Close Viewer">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Document Display Area */}
                    <div className="flex-1 w-full bg-slate-200/50 relative overflow-auto flex items-center justify-center p-4">
                        {isPDF ? (
                            <iframe 
                                src={`${fileUrl}#toolbar=0`} // #toolbar=0 hides default browser PDF controls for a cleaner look
                                className="w-full h-full rounded shadow-sm bg-white"
                                title="PDF Viewer"
                            />
                        ) : (
                            <img 
                                src={fileUrl} 
                                alt={fileName} 
                                className="max-w-full max-h-full object-contain shadow-sm rounded bg-white"
                            />
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DocumentViewerModal;