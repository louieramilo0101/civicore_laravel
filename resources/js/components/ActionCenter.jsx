import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ClockIcon, ArrowPathIcon, TrashIcon, 
    XMarkIcon, CheckCircleIcon, ArrowUturnLeftIcon,
    ChevronDownIcon, TrashIcon as TrashSolid
} from '@heroicons/react/24/outline';
import { useData } from './DataContext.jsx';

/** Presents the staff action queue and its selection controls. */
const ActionCenter = () => {
    const { undoableTasks, clearUndoableTask, refreshAll } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    /** Toggles one action item in the bulk-selection set. */
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleRestore = async (task) => {
        if (!task.undoFn) return;
        try {
            await task.undoFn();
            clearUndoableTask(task.id);
            refreshAll();
        } catch (err) {
            console.error("Undo failed:", err);
        }
    };

    const handleRestoreSelected = async () => {
        const tasksToRestore = undoableTasks.filter(t => selectedIds.includes(t.id));
        for (const task of tasksToRestore) {
            await handleRestore(task);
        }
        setSelectedIds([]);
    };

    const handleRestoreAll = async () => {
        for (const task of undoableTasks) {
            await handleRestore(task);
        }
        setSelectedIds([]);
    };

    if (undoableTasks.length === 0 && !isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[99999]">
            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 p-3 rounded-2xl shadow-2xl transition-all border-2 ${
                    isOpen 
                    ? 'bg-slate-900 border-slate-800 text-white' 
                    : 'bg-white border-slate-100 text-slate-600'
                }`}
            >
                <div className="relative">
                    <ClockIcon className="w-6 h-6" />
                    {undoableTasks.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-black text-white">
                            {undoableTasks.length}
                        </span>
                    )}
                </div>
                {isOpen ? <ChevronDownIcon className="w-4 h-4" /> : <span className="text-xs font-bold px-1 uppercase tracking-tighter">Activity</span>}
            </motion.button>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-16 right-0 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Recent Actions</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Undo & Recovery</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors group">
                                <XMarkIcon className="w-4 h-4 text-slate-400 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* Bulk Controls */}
                        {undoableTasks.length > 0 && (
                            <div className="px-4 py-2 bg-slate-900/5 flex items-center justify-between border-b border-slate-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={undoableTasks.length > 0 && selectedIds.length === undoableTasks.length}
                                        onChange={() => {
                                            if (selectedIds.length === undoableTasks.length) setSelectedIds([]);
                                            else setSelectedIds(undoableTasks.map(t => t.id));
                                        }}
                                    />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Select All</span>
                                </label>
                                <div className="flex gap-2">
                                    {selectedIds.length > 0 && (
                                        <button 
                                            onClick={handleRestoreSelected}
                                            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter flex items-center gap-1"
                                        >
                                            <ArrowUturnLeftIcon className="w-3 h-3" />
                                            Restore ({selectedIds.length})
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleRestoreAll}
                                        className="text-[10px] font-black text-rose-600 hover:text-rose-800 uppercase tracking-tighter"
                                    >
                                        Undo All
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* List */}
                        <div className="flex-1 max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {undoableTasks.length === 0 ? (
                                <div className="py-12 text-center text-slate-400">
                                    <CheckCircleIcon className="w-10 h-10 mx-auto mb-2 opacity-10" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Clean Slate</p>
                                </div>
                            ) : (
                                undoableTasks.map((task) => (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                                            selectedIds.includes(task.id) ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-50'
                                        }`}
                                    >
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            checked={selectedIds.includes(task.id)}
                                            onChange={() => toggleSelect(task.id)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Archived</span>
                                                <span className="text-[9px] text-slate-300">•</span>
                                                <span className="text-[9px] text-slate-400 font-bold tabular-nums">
                                                    {task.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 truncate">{task.name || 'Batch Action'}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRestore(task)}
                                            className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg transition-colors group"
                                            title="Restore Now"
                                        >
                                            <ArrowUturnLeftIcon className="w-4 h-4 group-hover:-rotate-45 transition-transform" />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ActionCenter;
