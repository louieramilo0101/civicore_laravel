import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CloudArrowUpIcon, CheckCircleIcon, 
    ExclamationCircleIcon, ArrowPathIcon 
} from '@heroicons/react/24/outline';

/** Renders transient save and background-task notifications. */
const SaveToasts = ({ tasks }) => {
    // Show active (running) and finished (success/error/deleted) tasks
    const activeTasks = tasks || [];
    
    if (activeTasks.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[999999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {activeTasks.map((task) => {
                    const isRunning = task.status === 'running';
                    const isSuccess = task.status === 'success' || task.status === 'deleted';
                    const isError = task.status === 'error';

                    let bgColor = 'bg-indigo-600/95 border-indigo-400';
                    if (isSuccess) bgColor = 'bg-emerald-500/95 border-emerald-400';
                    if (isError) bgColor = 'bg-rose-500/95 border-rose-400';

                    return (
                        <motion.div
                            key={task.id}
                            initial={{ x: 100, opacity: 0, scale: 0.9 }}
                            animate={{ x: 0, opacity: 1, scale: 1 }}
                            exit={{ x: 100, opacity: 0, scale: 0.8 }}
                            layout
                            className="pointer-events-auto"
                        >
                            <div className={`
                                min-w-[320px] p-4 rounded-2xl border shadow-2xl flex items-center gap-4 backdrop-blur-xl transition-colors duration-500 text-white
                                ${bgColor}
                            `}>
                                {/* Icon Logic */}
                                <div className="flex-shrink-0">
                                    {isRunning ? (
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                            <ArrowPathIcon className="w-6 h-6 text-white animate-spin" />
                                        </div>
                                    ) : isSuccess ? (
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                            <CheckCircleIcon className="w-6 h-6 text-white" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                            <ExclamationCircleIcon className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5">
                                        {isRunning ? 'Action in Progress' : isError ? 'Sync Interrupted' : 'Action Complete'}
                                    </h4>
                                    <p className="text-sm font-black truncate leading-tight">
                                        {task.name || 'Processing...'}
                                    </p>
                                    <p className="text-[10px] font-bold opacity-80">
                                        {isRunning 
                                            ? 'Synchronizing with core system...' 
                                            : isError 
                                                ? (task.message || 'Operation failed') 
                                                : (task.message || 'Successfully secured records')}
                                    </p>
                                </div>

                                {/* Status Mark */}
                                <div className={`flex-shrink-0 h-2.5 w-2.5 rounded-full bg-white ${isRunning ? 'animate-pulse' : ''}`} />
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default SaveToasts;
