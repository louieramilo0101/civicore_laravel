
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import SkeletonLoader from './SkeletonLoader';
import TemplateDesigner from './TemplateDesigner';
import { 
    PaintBrushIcon, 
    DocumentIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    SparklesIcon,
    UserIcon,
    UsersIcon,
    FolderIcon
} from '@heroicons/react/24/outline';
import { useData } from './DataContext.jsx';
import axios from 'axios';

/** Manages certificate template profiles and designer entry points. */
function Templates() {
    const { templates, refreshTemplates, loading: globalLoading } = useData();
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [uploading, setUploading] = useState(false);
    
    const loading = globalLoading.templates || uploading;

    /** Forces a fresh template profile fetch for the current view. */
    const fetchTemplates = () => refreshTemplates(true);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-7xl mx-auto space-y-8"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-[#1a2f4a] tracking-tight">Template Registry</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Manage document overlays and field positioning</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="relative flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all cursor-pointer shadow-xl shadow-indigo-900/20 active:scale-95 group">
                        <DocumentIcon className="w-4 h-4" />
                        Upload Template
                        <input 
                            type="file" 
                            className="hidden" 
                            accept=".pdf" 
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                
                                const type = prompt("Template Category? (birth, death, marriage)", "birth");
                                if (!['birth', 'death', 'marriage'].includes(type)) {
                                    alert("Invalid category. Use birth, death, or marriage.");
                                    return;
                                }

                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('type', type);

                                try {
                                    setUploading(true);
                                    await axios.post('/api/templates/upload', formData);
                                    fetchTemplates();
                                } catch (err) {
                                    console.error('Upload failed:', err);
                                    alert('Failed to upload template.');
                                } finally {
                                    setUploading(false);
                                }
                            }}
                        />
                    </label>
                    <button 
                        onClick={fetchTemplates}
                        className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 group"
                    >
                        <ArrowPathIcon className={`w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <SkeletonLoader key={i} type="cards" rows={1} />)}
                </div>
            ) : templates.length === 0 ? (
                <motion.div className="text-center py-20 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border-2 border-dashed border-slate-200" variants={itemVariants}>
                    <div className="mb-4 flex justify-center opacity-20 text-slate-300">
                        <FolderIcon className="w-16 h-16" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No Templates Found</h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">Add PDF files to the <code>/Templates</code> directory to see them here.</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {templates.map((template, index) => (
                            <motion.div 
                                key={template.file_path}
                                variants={itemVariants}
                                whileHover={{ y: -8, transition: { type: 'spring', stiffness: 300 } }}
                                className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] transition-all relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                                
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100/50">
                                            {template.file_path.includes('birth') ? <UserIcon className="w-6 h-6" /> : 
                                             template.file_path.includes('death') ? <DocumentTextIcon className="w-6 h-6" /> : 
                                             template.file_path.includes('marriage') ? <UsersIcon className="w-6 h-6" /> : <DocumentIcon className="w-6 h-6" />}
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${template.config ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                            {template.config ? 'Configured' : 'Needs Config'}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-black text-[#1a2f4a] tracking-tight mb-2 line-clamp-1">{template.name}</h3>
                                    <p className="text-slate-400 text-xs font-medium mb-8 flex items-center gap-2">
                                        <DocumentTextIcon className="w-4 h-4 opacity-40" />
                                        {template.file_path}
                                    </p>

                                    <div className="mt-auto pt-6 border-t border-slate-100 flex items-center gap-3">
                                        <button 
                                            onClick={() => setSelectedTemplate(template)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-[#1a2f4a] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-xl shadow-indigo-900/10"
                                        >
                                            <PaintBrushIcon className="w-4 h-4" />
                                            Design Overlay
                                        </button>
                                        <button 
                                            className="p-3.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors"
                                            title="View Original"
                                        >
                                            <DocumentIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <AnimatePresence>
                {selectedTemplate && (
                    <TemplateDesigner 
                        template={selectedTemplate}
                        onClose={() => setSelectedTemplate(null)}
                        onSave={() => {
                            setSelectedTemplate(null);
                            fetchTemplates();
                        }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default Templates;


