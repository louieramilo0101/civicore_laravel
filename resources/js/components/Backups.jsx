import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CircleStackIcon, ShieldCheckIcon, ArrowPathIcon,
    ExclamationTriangleIcon, LockClosedIcon, CheckCircleIcon,
    EyeIcon, EyeSlashIcon, CalendarDaysIcon, ClockIcon, ArchiveBoxIcon, PlusIcon
} from '@heroicons/react/24/outline';
import { useModal } from './ModalContext.jsx';
import SkeletonLoader from './SkeletonLoader.jsx';
import Pagination from './Pagination.jsx';

/**
 * SuperAdmin-exclusive system backup and point-in-time disaster recovery interface.
 * Direct file download is omitted to safeguard government records and database privacy.
 */
const Backups = () => {
    const { showAlert } = useModal();
    const [isLoading, setIsLoading] = useState(true);
    const [backups, setBackups] = useState([]);
    const [stats, setStats] = useState({ total_count: 0, total_size: '0 B', latest_at: null });

    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [selectedBackupForRestore, setSelectedBackupForRestore] = useState(null);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [restorePassword, setRestorePassword] = useState('');
    const [showRestorePassword, setShowRestorePassword] = useState(false);
    const [restoreConfirmText, setRestoreConfirmText] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);

    // Pagination States
    const [backupsPage, setBackupsPage] = useState(1);
    const [backupsPageSize, setBackupsPageSize] = useState(10);

    const totalBackupsPages = Math.max(1, Math.ceil(backups.length / backupsPageSize));
    const safeBackupsPage = Math.min(backupsPage, totalBackupsPages);
    const paginatedBackups = backups.slice(
        (safeBackupsPage - 1) * backupsPageSize,
        safeBackupsPage * backupsPageSize
    );

    const fetchBackups = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const res = await fetch('/api/backups', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setBackups(data.backups || []);
                setStats(data.stats || { total_count: 0, total_size: '0 B', latest_at: null });
            } else {
                showAlert({
                    title: 'Access Restricted',
                    message: data.error || 'Only SuperAdmins may access system backups.',
                    type: 'error'
                });
            }
        } catch (e) {
            console.error('Failed to fetch backups:', e);
            showAlert({ title: 'Connection Error', message: 'Unable to reach backup service.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups(true);
    }, []);

    const handleCreateBackup = async () => {
        setIsCreatingBackup(true);
        try {
            const res = await fetch('/api/backups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                showAlert({
                    title: 'Backup Created',
                    message: `Backup ${data.backup?.filename} created successfully (${data.backup?.size_human}).`,
                    type: 'success'
                });
                await fetchBackups(false);
            } else {
                showAlert({
                    title: 'Backup Failed',
                    message: data.error || 'Failed to create backup.',
                    type: 'error'
                });
            }
        } catch (e) {
            showAlert({ title: 'Error', message: 'Failed to create backup.', type: 'error' });
        } finally {
            setIsCreatingBackup(false);
        }
    };

    const handleOpenRestoreModal = (backup) => {
        setSelectedBackupForRestore(backup);
        setRestorePassword('');
        setRestoreConfirmText('');
        setShowRestorePassword(false);
        setIsRestoreModalOpen(true);
    };

    const handleRestoreSubmit = async (e) => {
        e.preventDefault();
        if (restoreConfirmText !== 'RESTORE') {
            showAlert({
                title: 'Confirmation Mismatch',
                message: 'Please type RESTORE in all capital letters to confirm.',
                type: 'warning'
            });
            return;
        }

        setIsRestoring(true);
        try {
            const res = await fetch('/api/backups/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    filename: selectedBackupForRestore.filename,
                    password: restorePassword
                })
            });
            const data = await res.json();

            if (data.success) {
                setIsRestoreModalOpen(false);
                showAlert({
                    title: 'System Restored Successfully',
                    message: `${data.message}\n\nAn automatic safety copy (${data.safety_snapshot}) was saved before applying this restore.`,
                    type: 'success'
                });
                await fetchBackups(false);
            } else {
                showAlert({
                    title: 'Restore Failed',
                    message: data.error || 'Restore could not be completed.',
                    type: 'error'
                });
            }
        } catch (e) {
            showAlert({ title: 'System Error', message: 'A network or server error occurred during restoration.', type: 'error' });
        } finally {
            setIsRestoring(false);
        }
    };

    const getTypeBadge = (type, isSafety) => {
        if (isSafety) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Automatic Safety Copy
                </span>
            );
        }
        switch (type) {
            case 'daily':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Daily Backup
                    </span>
                );
            case 'weekly':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Weekly Backup
                    </span>
                );
            case 'monthly':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Monthly Backup
                    </span>
                );
            case '6month':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        6-Month Backup
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Manual Backup
                    </span>
                );
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 max-w-7xl mx-auto"
        >
            {/* Page Header */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <CircleStackIcon className="w-7 h-7 sm:w-8 sm:h-8 text-[#d4a574]" />
                        System Backup & Recovery
                    </h2>
                    <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
                        Automated data backups, safe archives, and easy system recovery.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={() => fetchBackups(true)}
                        disabled={isLoading}
                        className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
                        title="Refresh List"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin text-[#d4a574]' : ''}`} />
                    </button>
                    <button
                        onClick={handleCreateBackup}
                        disabled={isCreatingBackup}
                        className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2.5 bg-[#0f172a] text-[#d4a574] font-black rounded-xl hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/10 flex items-center gap-2 text-xs sm:text-sm disabled:opacity-60 cursor-pointer"
                    >
                        {isCreatingBackup ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-[#d4a574]" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving Backup...
                            </>
                        ) : (
                            <>
                                <PlusIcon className="w-4 h-4" />
                                Create Backup Now
                            </>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* Privacy & Non-Download Notice Banner */}
            <motion.div variants={itemVariants} className="p-3.5 sm:p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-sm flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-[#d4a574]">
                    <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 text-xs">
                    <span className="font-bold text-white text-xs sm:text-sm block mb-0.5">Encrypted Server-Side Storage (Non-Downloadable)</span>
                    <span className="text-slate-400">All archives are stored in protected server storage. Browser downloading is disabled to keep government records strictly safeguarded on the municipal host.</span>
                </div>
            </motion.div>

            {/* Stat Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white/80 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Backups</span>
                        <ArchiveBoxIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                    </div>
                    <p className="text-lg sm:text-2xl font-black text-slate-800 mt-1.5 sm:mt-2">{stats.total_count}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 sm:mt-1 truncate">Archives on host</p>
                </div>

                <div className="bg-white/80 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Storage</span>
                        <CircleStackIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                    </div>
                    <p className="text-lg sm:text-2xl font-black text-slate-800 mt-1.5 sm:mt-2 truncate">{stats.total_size}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 sm:mt-1 truncate">Database + files</p>
                </div>

                <div className="bg-white/80 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Latest Backup</span>
                        <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    </div>
                    <p className="text-xs sm:text-base font-black text-slate-800 mt-1.5 sm:mt-2 truncate">
                        {stats.latest_at || 'None yet'}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 sm:mt-1 truncate">Ready to restore</p>
                </div>

                <div className="bg-white/80 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Schedule</span>
                        <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#d4a574]" />
                    </div>
                    <p className="text-xs sm:text-base font-black text-emerald-600 mt-1.5 sm:mt-2 flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Daily 2:00 AM
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 sm:mt-1 truncate">Automated tiering</p>
                </div>
            </motion.div>

            {/* Backups List Table */}
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base">Saved Backups</h3>
                        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Chronological record of system data packages.</p>
                    </div>
                </div>

                <div>
                    {isLoading ? (
                        <div className="p-6">
                            <SkeletonLoader type="list" rows={5} />
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center">
                            <CircleStackIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h4 className="font-bold text-slate-700 text-base">No Backups Found</h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                                Create an immediate backup above or wait for the scheduled daily backup at 2:00 AM.
                            </p>
                            <button
                                onClick={handleCreateBackup}
                                className="px-4 py-2 bg-slate-900 text-[#d4a574] text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                Create First Backup
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View (Zero sidescroll on phones) */}
                            <div className="block md:hidden divide-y divide-slate-100">
                                {paginatedBackups.map((b) => (
                                    <div key={b.filename} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center justify-between gap-2">
                                            <div>{getTypeBadge(b.type, b.is_safety)}</div>
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                {b.size_human}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-mono text-xs text-slate-700 break-all leading-snug">
                                                {b.filename}
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                                <ClockIcon className="w-3.5 h-3.5 text-slate-400 inline" />
                                                {b.created_at}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleOpenRestoreModal(b)}
                                            className="w-full py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <ArrowPathIcon className="w-3.5 h-3.5" />
                                            Restore This Backup
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] uppercase tracking-wider font-bold text-slate-400">
                                            <th className="py-3 px-5">Type / Label</th>
                                            <th className="py-3 px-5">Archive File</th>
                                            <th className="py-3 px-5">Size</th>
                                            <th className="py-3 px-5">Timestamp</th>
                                            <th className="py-3 px-5 text-right">Recovery Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                        {paginatedBackups.map((b) => (
                                            <tr key={b.filename} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3.5 px-5">
                                                    {getTypeBadge(b.type, b.is_safety)}
                                                </td>
                                                <td className="py-3.5 px-5 font-mono text-xs text-slate-600">
                                                    {b.filename}
                                                </td>
                                                <td className="py-3.5 px-5 text-xs font-semibold text-slate-500">
                                                    {b.size_human}
                                                </td>
                                                <td className="py-3.5 px-5 text-xs text-slate-500">
                                                    {b.created_at}
                                                </td>
                                                <td className="py-3.5 px-5 text-right">
                                                    <button
                                                        onClick={() => handleOpenRestoreModal(b)}
                                                        className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        Restore This Backup
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Backups Pagination */}
                            <Pagination
                                currentPage={safeBackupsPage}
                                totalItems={backups.length}
                                pageSize={backupsPageSize}
                                onPageChange={(p) => setBackupsPage(p)}
                                onPageSizeChange={(s) => {
                                    setBackupsPageSize(s);
                                    setBackupsPage(1);
                                }}
                                itemLabel="system backups"
                            />
                        </>
                    )}
                </div>
            </motion.div>

            {/* Restore Confirmation Modal */}
            <AnimatePresence>
                {isRestoreModalOpen && selectedBackupForRestore && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative border border-rose-100"
                        >
                            <div className="h-20 bg-gradient-to-r from-rose-900 to-rose-700 p-6 flex items-center justify-between border-b border-rose-800">
                                <h3 className="text-xl font-black text-white flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-300" />
                                    Restore System Archive
                                </h3>
                                <button
                                    onClick={() => !isRestoring && setIsRestoreModalOpen(false)}
                                    className="text-rose-200 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleRestoreSubmit} className="p-6 space-y-4">
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                                    <p className="text-sm font-semibold text-amber-900">
                                        You are about to roll back the system to:
                                    </p>
                                    <p className="font-mono text-xs font-bold text-slate-800 bg-white/80 p-2 rounded-lg border border-amber-200 truncate">
                                        {selectedBackupForRestore.filename} ({selectedBackupForRestore.created_at})
                                    </p>
                                    <div className="pt-1 flex items-start gap-2 text-xs text-amber-800">
                                        <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span>
                                            <strong>Automatic Undo Protection:</strong> The system will immediately create an <em>Automatic Safety Copy</em> of current live data before this backup is restored, allowing you to undo this action at any time.
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                        Type <span className="text-rose-600 font-mono">RESTORE</span> to confirm <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={restoreConfirmText}
                                        onChange={(e) => setRestoreConfirmText(e.target.value)}
                                        placeholder="RESTORE"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        Your SuperAdmin Password <span className="text-rose-500 text-lg leading-none">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            required
                                            type={showRestorePassword ? 'text' : 'password'}
                                            value={restorePassword}
                                            onChange={(e) => setRestorePassword(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white transition-colors pr-10"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRestorePassword(!showRestorePassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showRestorePassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-3 flex gap-3">
                                    <button
                                        type="button"
                                        disabled={isRestoring}
                                        onClick={() => setIsRestoreModalOpen(false)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isRestoring || restoreConfirmText !== 'RESTORE' || !restorePassword}
                                        className="flex-1 py-3 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 transition-colors text-sm shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {isRestoring ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                RESTORING SYSTEM...
                                            </>
                                        ) : (
                                            'Execute Safe Restore'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Backups;
