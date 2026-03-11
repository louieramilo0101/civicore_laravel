import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Fade animation
export const FadeIn = ({ children, delay = 0, duration = 0.4 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ 
                duration: duration, 
                delay: delay,
                ease: "easeOut"
            }}
        >
            {children}
        </motion.div>
    );
};

// Slide from right animation
export const SlideInRight = ({ children, delay = 0, duration = 0.5 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ 
                duration: duration, 
                delay: delay,
                ease: "easeOut"
            }}
        >
            {children}
        </motion.div>
    );
};

// Slide from bottom animation
export const SlideInUp = ({ children, delay = 0, duration = 0.5 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ 
                duration: duration, 
                delay: delay,
                ease: "easeOut"
            }}
        >
            {children}
        </motion.div>
    );
};

// Scale animation
export const ScaleIn = ({ children, delay = 0, duration = 0.4 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
                duration: duration, 
                delay: delay,
                ease: "easeOut"
            }}
        >
            {children}
        </motion.div>
    );
};

// Page transition wrapper with multiple animation variants
const pageVariants = {
    initial: {
        opacity: 0,
        x: -20
    },
    animate: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.4,
            ease: "easeOut",
            when: "beforeChildren",
            staggerChildren: 0.1
        }
    },
    exit: {
        opacity: 0,
        x: 20,
        transition: {
            duration: 0.3,
            ease: "easeIn"
        }
    }
};

const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
        opacity: 1, 
        y: 0,
        transition: {
            duration: 0.4,
            ease: "easeOut"
        }
    },
    exit: { opacity: 0, y: -20 }
};

// Page transition component
const PageTransition = ({ children, className = '' }) => {
    return (
        <motion.div
            className={className}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {React.Children.map(children, (child) => (
                <motion.div variants={itemVariants}>
                    {child}
                </motion.div>
            ))}
        </motion.div>
    );
};

// Animated list item for lists
export const AnimatedListItem = ({ children, index = 0 }) => {
    return (
        <motion.div
            variants={itemVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ delay: index * 0.05 }}
        >
            {children}
        </motion.div>
    );
};

// Staggered children wrapper
export const StaggerContainer = ({ children, className = '', staggerDelay = 0.05 }) => {
    const containerVariants = {
        initial: {},
        animate: {
            transition: {
                staggerChildren: staggerDelay
            }
        }
    };

    const childVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.3, ease: "easeOut" }
        }
    };

    return (
        <motion.div
            className={className}
            variants={containerVariants}
            initial="initial"
            animate="animate"
        >
            {React.Children.map(children, (child, index) => (
                <motion.div key={index} variants={childVariants}>
                    {child}
                </motion.div>
            ))}
        </motion.div>
    );
};

export default PageTransition;

