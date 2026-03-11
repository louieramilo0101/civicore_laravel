import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:8000';

function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                sessionStorage.setItem('user', JSON.stringify(data.user));
                navigate('/');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Connection error. Make sure Laravel server is running on port 8000.');
        } finally {
            setLoading(false);
        }
    };

    const pageVariants = {
        initial: { opacity: 0 },
        animate: { 
            opacity: 1,
            transition: { duration: 0.5 }
        },
        exit: { opacity: 0 }
    };

    return (
        <motion.div 
            className="login-container" 
            style={{ display: 'block' }}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <motion.div 
                className="login-box"
                initial={{ opacity: 0, y: -30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
            >
                <motion.a 
                    href="#" 
                    className="back-to-home" 
                    onClick={(e) => { e.preventDefault(); navigate('/'); }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ x: -3 }}
                >
                    ← Back to Home
                </motion.a>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    Civil Registry of Naic
                </motion.h1>
                <motion.p 
                    className="subtitle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    Document Management System (React)
                </motion.p>
                
                <motion.form 
                    onSubmit={handleLogin}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <motion.div 
                        className="form-group"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <label htmlFor="email">Email</label>
                        <motion.input 
                            type="email" 
                            id="email" 
                            placeholder="Enter your email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            whileFocus={{ 
                                borderColor: '#d4a574',
                                boxShadow: '0 0 0 3px rgba(212, 165, 116, 0.2)'
                            }}
                        />
                    </motion.div>
                    
                    <motion.div 
                        className="form-group"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <label htmlFor="password">Password</label>
                        <motion.input 
                            type="password" 
                            id="password" 
                            placeholder="Enter your password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            whileFocus={{ 
                                borderColor: '#d4a574',
                                boxShadow: '0 0 0 3px rgba(212, 165, 116, 0.2)'
                            }}
                        />
                    </motion.div>
                    
                    <AnimatePresence mode='wait'>
                        {error && (
                            <motion.div 
                                style={{ color: 'red', marginBottom: '15px' }}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <motion.button 
                        type="submit" 
                        className="login-btn" 
                        disabled={loading}
                        whileHover={{ 
                            scale: loading ? 1 : 1.02,
                            backgroundColor: loading ? '#d4a574' : '#e5b887'
                        }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                        transition={{ duration: 0.2 }}
                    >
                        {loading ? (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                Logging in...
                            </motion.span>
                        ) : (
                            'Login'
                        )}
                    </motion.button>
                </motion.form>
            </motion.div>
        </motion.div>
    );
}

export default Login;

