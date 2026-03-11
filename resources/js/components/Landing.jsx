import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function Landing() {
    const navigate = useNavigate();

    const toLoginPage = () => {
        navigate('/login');
    };

    const pageVariants = {
        initial: { opacity: 0 },
        animate: { 
            opacity: 1,
            transition: { duration: 0.5 }
        },
        exit: { opacity: 0 }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    return (
        <motion.div 
            className="landing-container active"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* Header */}
            <motion.div className="landing-header" variants={itemVariants}>
                <div className="landing-header-left">
                    <div className="logo">🏛️</div>
                    <div className="office-name">
                        CIVIL REGISTRAR'S OFFICE<br />
                        <strong style={{ fontSize: '12px' }}>NAIC, CAVITE</strong>
                    </div>
                </div>
                <div className="landing-header-right">
                    <a href="#" onClick={(e) => { e.preventDefault(); }}>Home</a>
                    <a href="#">About</a>
                    <a href="#">Services</a>
                    <a href="#">Contacts</a>
                    <div className="contact">
                        <span>✉️ naicmcr@gmail.com</span>
                        <span>📱 +(046) 423 1721</span>
                    </div>
                </div>
            </motion.div>

            {/* Hero */}
            <motion.div className="landing-hero" variants={itemVariants}>
                <div className="landing-content">
                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        FAST, RELIABLE,<br />ACCESSIBLE
                    </motion.h1>
                    <motion.h2 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                    >
                        Civil Registry Services
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        (Birth Certificate, Death Certificate, and Marriage Certificate)
                    </motion.p>
                    <motion.div 
                        className="landing-cta"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <motion.button 
                            className="landing-btn primary"
                            onClick={toLoginPage}
                            whileHover={{ scale: 1.05, backgroundColor: '#c49a67' }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Get Started
                        </motion.button>
                        <motion.button 
                            className="landing-btn"
                            onClick={() => alert('Learn more about our services')}
                            whileHover={{ scale: 1.05, backgroundColor: '#f5f5f5' }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Learn More
                        </motion.button>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default Landing;

