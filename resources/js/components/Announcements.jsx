import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MegaphoneIcon, PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

/** Displays published civic announcements for the current audience. */
export default function Announcements() {
    const [activeTab, setActiveTab] = useState('broadcasts'); // 'broadcasts' or 'settings'
    
    // Announcements state
    const [announcements, setAnnouncements] = useState([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [togglingId, setTogglingId] = useState(null);

    // Settings state
    const [settings, setSettings] = useState({ opening_hours: '' });
    const [savingSettings, setSavingSettings] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'success' or 'error'

    const fetchAnnouncements = async () => {
        try {
            const res = await fetch('/api/announcements');
            if (!res.ok) throw new Error(`Announcements fetch failed: ${res.status}`);
            const data = await res.json();
            setAnnouncements(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAnnouncements(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/public/config');
            if (!res.ok) throw new Error(`Settings fetch failed: ${res.status}`);
            const data = await res.json();
            setSettings({ opening_hours: data.opening_hours });
        } catch (e) {
            console.error("Could not load settings:", e);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
        fetchSettings();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message, is_active: true })
            });
            if (res.ok) {
                setMessage('');
                fetchAnnouncements();
            }
        } catch (e) {
            console.error(e);
        }
        setIsSubmitting(false);
    };

    const toggleStatus = async (id, currentStatus) => {
        setTogglingId(id);
        try {
            const res = await fetch(`/api/announcements/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: !currentStatus })
            });
            if (res.ok) {
                await fetchAnnouncements();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTogglingId(null);
        }
    };

    const deleteAnnouncement = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this announcement?")) return;
        try {
            await fetch(`/api/announcements/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            fetchAnnouncements();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        setSaveStatus(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (data.success) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus(null), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (err) {
            console.error("Error updating settings:", err);
            setSaveStatus('error');
        }
        setSavingSettings(false);
    };

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6 max-w-7xl mx-auto pb-12">
            <motion.div variants={itemVariants} className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <MegaphoneIcon className="w-8 h-8 text-indigo-500" />
                        System Announcements
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">
                        Manage active alerts broadcasting to the public portal and adjust system operations.
                    </p>
                </div>
            </motion.div>

            {/* Navigation Tabs */}
            <motion.div variants={itemVariants} className="flex gap-4 border-b border-slate-200 mb-8">
                <button
                    onClick={() => setActiveTab('broadcasts')}
                    className={`pb-4 px-2 font-bold text-sm tracking-wide transition-colors relative ${activeTab === 'broadcasts' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <span className="flex items-center gap-2">
                        <MegaphoneIcon className="w-4 h-4" /> Broadcasts Feed
                    </span>
                    {activeTab === 'broadcasts' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`pb-4 px-2 font-bold text-sm tracking-wide transition-colors relative ${activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <span className="flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4" /> Operating Hours
                    </span>
                    {activeTab === 'settings' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                </button>
            </motion.div>

            <AnimatePresence mode="wait">
                {activeTab === 'broadcasts' && (
                    <motion.div key="broadcasts" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Publish New Announcement</label>
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="e.g., The system will undergo maintenance at 10:00 PM."
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 transition-colors"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !message}
                                    className="px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Broadcast
                                </button>
                            </form>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-2">Broadcast History</h3>
                            {loadingAnnouncements ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-6 flex justify-between items-center gap-6">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-3 w-12 bg-slate-200 rounded-full" />
                                                    <div className="h-2.5 w-24 bg-slate-200 rounded-full" />
                                                </div>
                                                <div className={`h-4 bg-slate-200 rounded-full ${i === 0 ? 'w-3/4' : i === 1 ? 'w-5/6' : 'w-2/3'}`} />
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="h-8 w-16 bg-slate-200 rounded-lg" />
                                                <div className="h-8 w-8 bg-slate-200 rounded-lg" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : announcements.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 font-medium">
                                    No announcements broadcasted yet.
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {announcements.map((ann) => (
                                        <motion.div key={ann.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`p-6 rounded-2xl border ${ann.is_active ? 'bg-indigo-50/50 border-indigo-100 shadow-sm' : 'bg-white border-slate-200 opacity-60'} flex justify-between items-center gap-6 group`}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-xs font-bold mb-2">
                                                    {ann.is_active ? <span className="text-emerald-500 flex items-center gap-1"><CheckCircleIcon className="w-4 h-4" /> LIVE</span> : <span className="text-slate-400 flex items-center gap-1"><XCircleIcon className="w-4 h-4" /> HIDDEN</span>}
                                                    <span className="text-slate-300">•</span>
                                                    <span className="text-slate-400">{new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' })}</span>
                                                </div>
                                                <p className={`text-lg font-medium tracking-tight ${ann.is_active ? 'text-indigo-950' : 'text-slate-600'}`}>{ann.message}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    disabled={togglingId === ann.id}
                                                    onClick={() => toggleStatus(ann.id, ann.is_active)} 
                                                    className={`px-4 py-2 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2 min-w-[100px] ${ann.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} disabled:opacity-70 disabled:cursor-not-allowed`}
                                                >
                                                    {togglingId === ann.id ? (
                                                        <>
                                                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                            <span>Updating...</span>
                                                        </>
                                                    ) : (
                                                        ann.is_active ? 'Hide' : 'Set Live'
                                                    )}
                                                </button>
                                                <button onClick={() => deleteAnnouncement(ann.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'settings' && (
                    <motion.div key="settings" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-300 shadow-sm flex flex-col relative">
                            <div className="mb-8">
                                <h3 className="font-black text-slate-950 text-2xl tracking-tight leading-none mb-2 text-indigo-600 flex items-center gap-3">
                                    <ShieldCheckIcon className="w-8 h-8 text-indigo-500" />
                                    Operating Hours Setting
                                </h3>
                                <p className="text-[12px] text-slate-600 font-bold uppercase tracking-widest mt-3">Configure standard operational variables.</p>
                            </div>

                            <form onSubmit={handleSaveSettings} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Detailed Operating Hours</label>
                                    <input 
                                        type="text" 
                                        value={settings.opening_hours} 
                                        onChange={e => setSettings({...settings, opening_hours: e.target.value})}
                                        placeholder="e.g. Monday — Friday: 8:00 AM - 5:00 PM"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">This displays directly on the public Homeland and Contact Directories.</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button 
                                        type="submit" 
                                        disabled={savingSettings}
                                        className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                                    >
                                        {savingSettings ? 'Saving...' : 'Publish Configuration'}
                                    </button>

                                    <AnimatePresence>
                                        {saveStatus === 'success' && (
                                            <motion.span 
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="text-emerald-600 font-bold text-sm flex items-center gap-2"
                                            >
                                                <CheckCircleIcon className="w-5 h-5" />
                                                Saved Successfully!
                                            </motion.span>
                                        )}
                                        {saveStatus === 'error' && (
                                            <motion.span 
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="text-rose-600 font-bold text-sm flex items-center gap-2"
                                            >
                                                <XCircleIcon className="w-5 h-5" />
                                                Save Failed.
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
