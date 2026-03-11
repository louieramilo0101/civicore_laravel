import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 'md', message = 'Loading...' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4',
        xl: 'w-16 h-16 border-4'
    };

    const spinnerSizes = {
        sm: 20,
        md: 32,
        lg: 48,
        xl: 64
    };

    return (
        <motion.div 
            className="flex flex-col items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div 
                className={`${sizeClasses[size]} border-blue-600 border-t-transparent rounded-full`}
                role="status"
                aria-label="Loading"
                animate={{ 
                    rotate: 360 
                }}
                transition={{ 
                    duration: 1, 
                    repeat: Infinity, 
                    ease: "linear" 
                }}
            />
            {message && (
                <motion.p 
                    className="mt-3 text-gray-600 text-sm font-medium"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {message}
                </motion.p>
            )}
        </motion.div>
    );
};

// Enhanced Loading Spinner with overlay option
export const LoadingOverlay = ({ show, message = 'Loading...' }) => {
    if (!show) return null;

    return (
        <motion.div
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                className="flex flex-col items-center gap-4"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, type: "spring" }}
            >
                <motion.div
                    className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <motion.p
                    className="text-gray-700 font-medium text-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    {message}
                </motion.p>
            </motion.div>
        </motion.div>
    );
};

// Pulse Loading Dots
export const LoadingDots = ({ message = 'Loading' }) => {
    return (
        <div className="flex items-center gap-2">
            <motion.span
                className="text-blue-600 text-xl"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
            >
                •
            </motion.span>
            <motion.span
                className="text-blue-600 text-xl"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
            >
                •
            </motion.span>
            <motion.span
                className="text-blue-600 text-xl"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
            >
                •
            </motion.span>
            <span className="text-gray-600 ml-2">{message}</span>
        </div>
    );
};

export default LoadingSpinner;

