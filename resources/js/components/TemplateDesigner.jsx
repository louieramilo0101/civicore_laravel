
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    XMarkIcon, 
    PlusCircleIcon, 
    ArrowPathIcon,
    MagnifyingGlassPlusIcon,
    MagnifyingGlassMinusIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useData } from './DataContext.jsx';
import axios from 'axios';

/** Provides drag-and-position editing for template overlay fields. */
const TemplateDesigner = ({ template, onClose, onSave }) => {
    const { refreshTemplates } = useData();
    const [fields, setFields] = useState(template.config?.fields || []);
    const [zoom, setZoom] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const containerRef = useRef(null);

    const availableFields = [
        { key: 'full_name', label: 'Full Name' },
        { key: 'date_of_birth', label: 'Date of Birth' },
        { key: 'place_of_birth', label: 'Place of Birth' },
        { key: 'registry_number', label: 'Registry Number' },
        { key: 'barangay', label: 'Barangay' },
        { key: 'sex', label: 'Sex' },
        { key: 'father_name', label: 'Father Name' },
        { key: 'mother_name', label: 'Mother Name' },
        { key: 'date_of_death', label: 'Date of Death' },
        { key: 'cause_of_death', label: 'Cause of Death' },
        { key: 'husbands_name', label: 'Husband Name' },
        { key: 'wifes_name', label: 'Wife Name' },
        { key: 'date_of_marriage', label: 'Date of Marriage' },
    ];

    /** Adds a configured field to the editable overlay list. */
    const addField = (field) => {
        if (fields.find(f => f.key === field.key)) return;
        setFields([...fields, { ...field, x: 0.1, y: 0.1, w: 0.25, h: 0.04 }]);
    };

    /** Removes one field from the editable overlay list. */
    const removeField = (key) => {
        setFields(fields.filter(f => f.key !== key));
    };

    /** Applies a bounded position delta to one overlay field. */
    const updateFieldPos = (key, delta) => {
        setFields(fields.map(f => {
            if (f.key === key) {
                return { ...f, ...delta };
            }
            return f;
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.post('/api/templates/config', {
                file_path: template.file_path,
                name: template.name,
                type: template.type,
                config: { fields }
            });
            refreshTemplates(true);
            onSave();
        } catch (err) {
            console.error("Save failed", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-slate-800/50 backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <div>
                        <h2 className="text-white font-black text-xl tracking-tight leading-none">{template.name}</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                            Designer Mode Active
                        </p>
                    </div>
                    
                    <div className="h-8 w-px bg-white/10"></div>

                    <div className="flex bg-slate-900/50 border border-white/5 rounded-xl p-1 gap-1">
                        <button onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"><MagnifyingGlassMinusIcon className="w-5 h-5" /></button>
                        <span className="text-[10px] text-slate-300 font-black w-14 text-center flex items-center justify-center tabular-nums">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(prev => Math.min(3, prev + 0.1))} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"><MagnifyingGlassPlusIcon className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                        Commit Changes
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-400 transition-colors bg-white/5 rounded-xl hover:bg-rose-400/10 border border-white/5 group">
                        <XMarkIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Field Picker */}
                <div className="w-80 border-r border-white/10 bg-slate-800/30 overflow-y-auto p-6 space-y-8">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-1">Library of Fields</h3>
                        <div className="grid grid-cols-1 gap-2.5">
                            {availableFields.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => addField(f)}
                                    disabled={fields.find(ef => ef.key === f.key)}
                                    className="text-left px-4 py-3 rounded-2xl text-xs font-bold bg-white/5 border border-white/5 text-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-400 transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-between group"
                                >
                                    {f.label}
                                    <PlusCircleIcon className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-1">Active Layers</h3>
                        {fields.length === 0 ? (
                            <div className="py-8 text-center text-slate-600 border-2 border-dashed border-white/5 rounded-3xl px-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider">No fields placed yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {fields.map(f => (
                                    <div key={f.key} className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between group animate-in slide-in-from-left-2 duration-300">
                                        <div>
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">{f.label}</span>
                                            <span className="text-[9px] text-slate-500 font-mono">X: {Math.round(f.x*100)}% Y: {Math.round(f.y*100)}%</span>
                                        </div>
                                        <button onClick={() => removeField(f.key)} className="p-2 text-rose-500/50 hover:text-rose-500 transition-colors bg-white/5 rounded-xl hover:bg-rose-500/10 border border-white/5">
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 bg-slate-950 overflow-auto p-16 flex justify-center items-start custom-scrollbar">
                    <div 
                        ref={containerRef}
                        className="relative bg-white shadow-[0_30px_60px_rgba(0,0,0,0.5)] transition-all duration-300 origin-top"
                        style={{ width: `${800 * zoom}px`, height: `${1132 * zoom}px` }}
                    >
                        <img 
                            src={`/api/templates/preview?file=${template.file_path}`} 
                            className="w-full h-full pointer-events-none select-none opacity-90"
                            alt="Template"
                        />
                        
                        <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none">
                            {Array.from({length: 144}).map((_, i) => (
                                <div key={i} className="border-[0.5px] border-indigo-500/5"></div>
                            ))}
                        </div>
                        
                        {fields.map(f => (
                            <motion.div
                                key={f.key}
                                drag
                                dragMomentum={false}
                                onDragEnd={(e, info) => {
                                    const rect = containerRef.current.getBoundingClientRect();
                                    const x = (info.point.x - rect.left) / rect.width;
                                    const y = (info.point.y - rect.top) / rect.height;
                                    updateFieldPos(f.key, { 
                                        x: Math.max(0, Math.min(x, 1 - f.w)), 
                                        y: Math.max(0, Math.min(y, 1 - f.h)) 
                                    });
                                }}
                                className="absolute border-2 border-indigo-500 bg-indigo-500/30 backdrop-blur-[2px] flex flex-col p-2 cursor-move group z-10 hover:z-20 transition-colors shadow-lg hover:bg-indigo-500/40"
                                style={{
                                    left: `${f.x * 100}%`,
                                    top: `${f.y * 100}%`,
                                    width: `${f.w * 100}%`,
                                    height: `${f.h * 100}%`,
                                }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-tighter text-white bg-indigo-600 px-1.5 py-0.5 rounded leading-none truncate max-w-[80%] shadow-sm">{f.label}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_white]"></div>
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="h-px w-full bg-white/20"></div>
                                </div>
                                
                                {/* Resize handle mockup (Future: implement actual resize) */}
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-indigo-500 rounded-lg opacity-0 group-hover:opacity-100 cursor-nwse-resize border border-white shadow-md"></div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; border: 3px solid #020617; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}} />
        </div>
    );
};

export default TemplateDesigner;
