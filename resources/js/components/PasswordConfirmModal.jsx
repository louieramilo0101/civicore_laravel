import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LockClosedIcon, XMarkIcon, ShieldCheckIcon, EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

/** Requests a user password before allowing a protected operation. */
const PasswordConfirmModal = ({ isOpen, onConfirm, onCancel, title, message }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (!user.id) {
            setError('User session not found. Please log in again.');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post('/api/verify-password', {
                userId: user.id,
                password: password
            });

            if (response.data.success) {
                onConfirm();
                setPassword('');
            } else {
                setError(response.data.message || 'Verification failed.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100"
            >
                {/* Header */}
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <LockClosedIcon className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">{title || 'Confirm Security Password'}</h3>
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-white transition-all cursor-pointer group p-1.5 hover:bg-white/5 rounded-full">
                        <XMarkIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                        <ShieldCheckIcon className="w-6 h-6 text-amber-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-amber-900">High-Security Action</p>
                            <p className="text-xs text-amber-700 mt-1">{message || 'Please provide your account password to authorize this action.'}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoFocus
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            {error && <p className="text-xs font-bold text-rose-500 mt-2 flex items-center gap-1.5"><ExclamationTriangleIcon className="w-4 h-4 text-rose-500 shrink-0" /> {error}</p>}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !password}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                            >
                                {loading ? 'Verifying...' : 'Unlock Action'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default PasswordConfirmModal;
