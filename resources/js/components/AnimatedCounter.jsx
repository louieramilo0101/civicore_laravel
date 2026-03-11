import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

const AnimatedCounter = ({ 
    value = 0, 
    duration = 2, 
    prefix = '', 
    suffix = '',
    className = ''
}) => {
    const springValue = useSpring(0, {
        stiffness: 50,
        damping: 20,
        duration: duration * 1000
    });
    
    const displayValue = useTransform(springValue, (latest) => 
        Math.round(latest).toLocaleString()
    );
    
    const [display, setDisplay] = useState('0');

    useEffect(() => {
        springValue.set(value);
        
        const unsubscribe = displayValue.on('change', (latest) => {
            setDisplay(latest);
        });
        
        return () => unsubscribe();
    }, [value, springValue, displayValue]);

    return (
        <motion.span 
            className={className}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            {prefix}{display}{suffix}
        </motion.span>
    );
};

// Wrapper component for stat cards with animation
export const AnimatedStatCard = ({ 
    label, 
    value, 
    icon, 
    color = '#d4a574',
    prefix = '',
    suffix = '',
    delay = 0 
}) => {
    return (
        <motion.div
            className="bg-white rounded-xl shadow-md p-4 md:p-6 border-l-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                duration: 0.5, 
                delay: delay,
                ease: "easeOut"
            }}
            whileHover={{ 
                y: -8,
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                transition: { duration: 0.2 }
            }}
            style={{
                borderLeftColor: color
            }}
        >
            <motion.div 
                className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.2 }}
            >
                {label}
            </motion.div>
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#1a2f4a]">
                {icon && <span className="mr-2">{icon}</span>}
                <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
            </div>
            <motion.div 
                className="text-xs md:text-sm text-green-600 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.4 }}
            >
                ✓ Updated just now
            </motion.div>
        </motion.div>
    );
};

export default AnimatedCounter;

