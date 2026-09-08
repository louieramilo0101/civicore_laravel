import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon, InformationCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

/** Confirms a potentially destructive staff action before execution. */
const ActionConfirmModal = ({ isOpen, onConfirm, onCancel, title, message, type = 'info' }) => {
    /** Maps the action type to the modal’s semantic color treatment. */
    const getColor = () => {
        switch (type) {
            case 'danger': return 'rose';
            case 'warning': return 'amber';
            case 'success': return 'emerald';
            default: return 'indigo';
        }
    };

    const color = getColor();

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden"
                    >
                        <div className="p-8">
                            <div className={`w-16 h-16 bg-${color}-50 rounded-2xl flex items-center justify-center text-${color}-500 mb-6 mx-auto border border-${color}-100`}>
                                {type === 'danger' ? <ExclamationTriangleIcon className="w-8 h-8" /> : 
                                 type === 'warning' ? <ExclamationTriangleIcon className="w-8 h-8" /> :
                                 <QuestionMarkCircleIcon className="w-8 h-8" />}
                            </div>
                            
                            <h3 className="text-2xl font-black text-slate-800 text-center tracking-tight mb-2">{title}</h3>
                            <p className="text-slate-500 text-center text-sm font-medium leading-relaxed">{message}</p>
                        </div>

                        <div className="p-4 bg-slate-50 flex gap-3">
                            <button 
                                onClick={onCancel}
                                className="flex-1 px-6 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-2xl transition-all active:scale-95 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={onConfirm}
                                className={`flex-1 px-6 py-3.5 text-sm font-bold text-white bg-${color}-600 hover:bg-${color}-700 rounded-2xl shadow-lg shadow-${color}-200 transition-all active:scale-95 cursor-pointer`}
                            >
                                Confirm
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ActionConfirmModal;
