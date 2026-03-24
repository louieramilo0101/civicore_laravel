import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ExclamationTriangleIcon, 
    CheckCircleIcon, 
    InformationCircleIcon, 
    XCircleIcon 
} from '@heroicons/react/24/outline';

const icons = {
    success: <CheckCircleIcon className="w-12 h-12 text-emerald-400" />,
    error: <XCircleIcon className="w-12 h-12 text-rose-400" />,
    warning: <ExclamationTriangleIcon className="w-12 h-12 text-amber-400" />,
    info: <InformationCircleIcon className="w-12 h-12 text-sky-400" />,
};

const colors = {
    success: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
    error: 'from-rose-500/20 to-rose-500/5 border-rose-500/20',
    warning: 'from-amber-500/20 to-amber-500/5 border-amber-500/20',
    info: 'from-sky-500/20 to-sky-500/5 border-sky-500/20',
};

const buttonColors = {
    success: 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950',
    error: 'bg-rose-500 hover:bg-rose-400 text-rose-950',
    warning: 'bg-amber-500 hover:bg-amber-400 text-amber-950',
    info: 'bg-sky-500 hover:bg-sky-400 text-sky-950',
};

export default function AlertModal({ 
    isOpen, 
    onConfirm,
    onCancel,
    onClose, // Fallback
    title = 'System Notification', 
    message = '', 
    type = 'info', 
    confirmText = 'OK',
    cancelText = 'Cancel',
    showCancel = false
}) {
    const handleConfirm = onConfirm || onClose;
    const handleCancel = onCancel || onClose;
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleCancel}
                        className="absolute inset-0 bg-[#0f172a]/85 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ 
                            type: 'spring', 
                            damping: 25, 
                            stiffness: 350,
                            duration: 0.4
                        }}
                        className={`relative w-full max-w-md overflow-hidden bg-gradient-to-br ${colors[type]} border backdrop-blur-2xl rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]`}
                    >
                        {/* Decorative Top Bar */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${type === 'error' ? 'from-rose-500 to-rose-400' : 'from-[#d4a574] to-[#b88c5d]'}`} />

                        <div className="p-8 flex flex-col items-center text-center">
                            {/* Icon Container */}
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                                className="mb-6"
                            >
                                {icons[type]}
                            </motion.div>

                            {/* Header */}
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic mb-2">
                                    {title}
                                </h3>
                                <p className="text-slate-300 text-sm font-medium leading-relaxed">
                                    {message}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className={`flex w-full gap-3 ${showCancel ? 'flex-row' : 'flex-col'}`}>
                                {showCancel && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleCancel}
                                        className="flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all duration-300 bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-lg"
                                    >
                                        {cancelText}
                                    </motion.button>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleConfirm}
                                    className={`${showCancel ? 'flex-1' : 'w-full'} py-4 px-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all duration-300 shadow-lg ${buttonColors[type] || 'bg-[#d4a574] hover:bg-[#b88c5d] text-[#0f172a]'}`}
                                >
                                    {confirmText}
                                </motion.button>
                            </div>
                        </div>

                        {/* Background Decorative Gradient */}
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
