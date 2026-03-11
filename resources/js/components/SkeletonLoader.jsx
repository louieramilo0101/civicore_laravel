import React from 'react';
import { motion } from 'framer-motion';

const SkeletonLoader = ({ type = 'table', rows = 5 }) => {
    // Table skeleton loader
    if (type === 'table') {
        return (
            <div className="w-full">
                {/* Header skeleton */}
                <div className="flex gap-4 mb-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                            key={`header-${i}`}
                            className="h-6 bg-gray-200 rounded"
                            style={{ flex: 1 }}
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.1
                            }}
                        />
                    ))}
                </div>
                {/* Row skeletons */}
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <motion.div
                        key={`row-${rowIndex}`}
                        className="flex gap-4 py-4 border-b border-gray-100"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: rowIndex * 0.05 }}
                    >
                        {[1, 2, 3, 4, 5].map((col) => (
                            <motion.div
                                key={`${rowIndex}-${col}`}
                                className="h-5 bg-gray-100 rounded"
                                style={{ flex: 1 }}
                                initial={{ opacity: 0.3 }}
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: (rowIndex * 0.05) + (col * 0.1)
                                }}
                            />
                        ))}
                    </motion.div>
                ))}
            </div>
        );
    }

    // Card skeleton loader
    if (type === 'cards') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: rows }).map((_, index) => (
                    <motion.div
                        key={`card-${index}`}
                        className="bg-white p-6 rounded-xl shadow-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <motion.div
                            className="h-4 w-24 bg-gray-200 rounded mb-4"
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                        <motion.div
                            className="h-8 w-16 bg-gray-200 rounded"
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.2
                            }}
                        />
                    </motion.div>
                ))}
            </div>
        );
    }

    // List skeleton loader
    if (type === 'list') {
        return (
            <div className="space-y-3">
                {Array.from({ length: rows }).map((_, index) => (
                    <motion.div
                        key={`list-${index}`}
                        className="flex items-center gap-4 p-4 bg-white rounded-lg"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                    >
                        <motion.div
                            className="w-12 h-12 bg-gray-200 rounded-full"
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: index * 0.1
                            }}
                        />
                        <div className="flex-1">
                            <motion.div
                                className="h-4 w-32 bg-gray-200 rounded mb-2"
                                initial={{ opacity: 0.3 }}
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: (index * 0.1) + 0.1
                                }}
                            />
                            <motion.div
                                className="h-3 w-24 bg-gray-100 rounded"
                                initial={{ opacity: 0.3 }}
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: (index * 0.1) + 0.2
                                }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        );
    }

    // Default skeleton
    return (
        <motion.div
            className="w-full h-32 bg-gray-200 rounded-lg"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />
    );
};

export default SkeletonLoader;

