import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useModal } from './ModalContext.jsx';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function Login() {
    const navigate = useNavigate();
    const { showAlert } = useModal();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json' 
                },
                credentials: 'include', // Sends/receives session cookies
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Store user data for the auth guard
                sessionStorage.setItem('user', JSON.stringify(data.user)); 
                console.log("Authenticated successfully");
                navigate('/dashboard', { replace: true });
            } else {
                showAlert({
                    title: 'Authentication Failed',
                    message: data.message || "Invalid credentials. Please try again.",
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Login failed:', error);
            showAlert({
                title: 'Network Error',
                message: "Network error. Please check your connection to the server.",
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0f172a] relative overflow-hidden">
            {/* Background Decorative Element */}
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#d4a574]/5 blur-[120px] rounded-full pointer-events-none" />

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-sm bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
            >
                <div className="h-1.5 w-full bg-[#d4a574]/80" />

                <div className="p-10">
                    <button 
                        type="button"
                        onClick={() => navigate('/')} 
                        className="cursor-pointer text-[#d4a574]/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-10 hover:text-[#d4a574] transition-colors flex items-center gap-2 group"
                    >
                        <span>←</span> BACK TO PORTAL
                    </button>
                    
                    <div className="mb-10">
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2 italic uppercase">CiviCORE</h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em]">Naic Civil Registry System</p>
                    </div>
                    
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account Email</label>
                            <input 
                                name="email"
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@naic.gov.ph" 
                                required
                                className="w-full p-4 bg-black/20 border border-white/5 rounded-2xl text-white text-sm outline-none focus:border-[#d4a574]/50 focus:ring-4 focus:ring-[#d4a574]/5 transition-all placeholder:text-slate-600" 
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                                <input 
                                    name="password"
                                    type={showPassword ? "text" : "password"} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••" 
                                    required
                                    className="w-full p-4 bg-black/20 border border-white/5 rounded-2xl text-white text-sm outline-none focus:border-[#d4a574]/50 focus:ring-4 focus:ring-[#d4a574]/5 transition-all placeholder:text-slate-600 pr-12" 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#d4a574] transition-colors focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        <motion.button 
                            type="submit"
                            disabled={isLoading}
                            whileHover={!isLoading ? { scale: 1.02 } : {}}
                            whileTap={!isLoading ? { scale: 0.96 } : {}}
                            className={`w-full bg-gradient-to-r from-[#d4a574] to-[#b88c5d] text-[#0f172a] font-black py-5 rounded-2xl transition-all duration-300 uppercase tracking-[0.2em] text-[11px] shadow-[0_0_20px_rgba(212,165,116,0.15)] hover:shadow-[0_10px_30px_rgba(212,165,116,0.4)] mt-4 relative overflow-hidden group ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-[#0f172a]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <circle cx="12" cy="12" r="10" strokeWidth="4" strokeDasharray="32" strokeLinecap="round" className="opacity-25"></circle>
                                            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                        </svg>
                                        VERIFYING...
                                    </>
                                ) : 'SIGN INTO SYSTEM'}
                            </span>
                            <div className="absolute inset-0 bg-white/20 translate-y-[110%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
                        </motion.button>
                    </form>
                </div>
            </motion.div>

            <footer className="mt-12 text-center opacity-30">
                <p className="text-white text-[9px] font-bold uppercase tracking-[0.4em]">Authorized Personnel Only • Naic Civil Registry © 2024</p>
            </footer>
        </div>
    );
}