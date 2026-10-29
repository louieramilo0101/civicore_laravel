import React, { useState, useRef, useId, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Accessible Tooltip Component
 * Follows WAI-ARIA Tooltip pattern:
 * - Links trigger and tooltip via aria-describedby
 * - Triggers on hover (mouse) and focus (keyboard)
 * - Dismisses on Escape key
 * - Configurable positioning (top, bottom, left, right)
 */
export default function Tooltip({
    content,
    text,       // alias for content – used in some call sites
    children,
    position = 'top',
    delay = 200,
    className = '',
    disabled = false
}) {
    const resolvedContent = content ?? text;
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef(null);
    const tooltipId = useId();

    const showTooltip = () => {
        if (disabled || !resolvedContent) return;
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isVisible) {
                hideTooltip();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isVisible]);

    const positionStyles = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    }[position] || 'bottom-full left-1/2 -translate-x-1/2 mb-2';

    const arrowStyles = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent border-[5px]',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent border-[5px]',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent border-[5px]',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent border-[5px]'
    }[position] || 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent border-[5px]';

    return (
        <span
            className={`relative inline-flex items-center ${className}`}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {React.isValidElement(children)
                ? React.cloneElement(children, {
                      'aria-describedby': isVisible ? tooltipId : undefined
                  })
                : children}

            <AnimatePresence>
                {isVisible && resolvedContent && !disabled && (
                    <motion.div
                        id={tooltipId}
                        role="tooltip"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={`absolute z-50 pointer-events-none whitespace-nowrap px-2.5 py-1.5 text-[11px] font-semibold text-slate-100 bg-slate-900/95 border border-slate-700/70 shadow-2xl backdrop-blur-md rounded-xl ${positionStyles}`}
                    >
                        {resolvedContent}
                        <span className={`absolute w-0 h-0 pointer-events-none ${arrowStyles}`} />
                    </motion.div>
                )}
            </AnimatePresence>
        </span>
    );
}

