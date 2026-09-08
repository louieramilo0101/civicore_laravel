import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrashIcon, ArrowPathIcon, ShieldCheckIcon, MagnifyingGlassIcon,
    CheckCircleIcon, XMarkIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useData } from './DataContext.jsx';
import SkeletonLoader from './SkeletonLoader.jsx';
import ActionConfirmModal from './ActionConfirmModal.jsx';

/** Manages archived records and restore or purge operations. */
const ArchiveManager = () => {
    const { backgroundTasks, runBackgroundTask, refreshAll } = useData();

    const [archivedFiles, setArchivedFiles] = useState([]);
    const [archivedTickets, setArchivedTickets] = useState([]);
    const [isLoadingArchived, setIsLoadingArchived] = useState(false);
    const [isLoadingTickets, setIsLoadingTickets] = useState(false);
    const [archiveSearch, setArchiveSearch] = useState('');
    const [archiveTypeFilter, setArchiveTypeFilter] = useState('all');
    const [archiveSubTab, setArchiveSubTab] = useState('scans');
    const [selectedArchiveIds, setSelectedArchiveIds] = useState([]);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        onConfirm: null,
        title: '',
        message: '',
        type: 'info'
    });

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const canPurge = ['SuperAdmin', 'Admin'].includes(user.role);

    const fetchArchivedFiles = useCallback(async () => {
        setIsLoadingArchived(true);
        try {
            const params = new URLSearchParams({
                search: archiveSearch,
                per_page: '100'
            });
            if (archiveTypeFilter && archiveTypeFilter !== 'all') {
                params.append('type', archiveTypeFilter);
            }
            const res = await fetch(`/api/documents/archived?${params.toString()}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setArchivedFiles(data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch archived files:', e);
        } finally {
            setIsLoadingArchived(false);
        }
    }, [archiveSearch, archiveTypeFilter]);

    const fetchArchivedTickets = useCallback(async () => {
        setIsLoadingTickets(true);
        try {
            const res = await fetch('/api/tickets/archived', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setArchivedTickets(data || []);
            }
        } catch (e) {
            console.error('Failed to fetch archived tickets:', e);
        } finally {
            setIsLoadingTickets(false);
        }
    }, []);

    useEffect(() => {
        fetchArchivedFiles();
        fetchArchivedTickets();
    }, [fetchArchivedFiles, fetchArchivedTickets]);

    // Separate archives based on status
    const scansArchive = archivedFiles.filter(f => !['processed', 'issued', 'approved'].includes((f.status || '').toLowerCase()));
    const registryArchive = archivedFiles.filter(f => ['processed', 'issued', 'approved'].includes((f.status || '').toLowerCase()));

    // Filter tickets based on search/type filters locally
    const filteredArchivedTickets = archivedTickets.filter(ticket => {
        const matchesSearch = ticket.client_name.toLowerCase().includes(archiveSearch.toLowerCase()) ||
                              ticket.ticket_number.toLowerCase().includes(archiveSearch.toLowerCase());
        const matchesType = archiveTypeFilter === 'all' || ticket.purpose === archiveTypeFilter;
        return matchesSearch && matchesType;
    });

    const activeArchiveList = archiveSubTab === 'scans'
        ? scansArchive
        : archiveSubTab === 'registry'
            ? registryArchive
            : filteredArchivedTickets;

    /** Toggles one archived record in the bulk-selection set. */
    const toggleSelectArchive = (id) => {
        setSelectedArchiveIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    /** Selects or clears all records currently visible in the archive list. */
    const toggleSelectAllArchive = (filteredArchive) => {
        if (selectedArchiveIds.length === filteredArchive.length && filteredArchive.length > 0) {
            setSelectedArchiveIds([]);
        } else {
            setSelectedArchiveIds(filteredArchive.map(f => f.id));
        }
    };

    const restoreArchived = async (fileId) => {
        const file = archivedFiles.find(f => f.id === fileId);
        setConfirmModal({
            isOpen: true,
            title: 'Restore Record',
            message: `Are you sure you want to restore "${file?.name || 'record'}" to its active state?`,
            type: 'success',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                runBackgroundTask(`Restoring: ${file?.name}`, async () => {
                    const res = await fetch(`/api/documents/${fileId}/undo`, { method: 'POST', credentials: 'include' });
                    if (res.ok) {
                        refreshAll();
                        fetchArchivedFiles();
                        return { success: true, message: 'Record restored successfully' };
                    }
                    throw new Error('Restore failed');
                });
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    const restoreTicket = async (ticketId) => {
        const ticket = archivedTickets.find(t => t.id === ticketId);
        setConfirmModal({
            isOpen: true,
            title: 'Restore Ticket',
            message: `Are you sure you want to restore ticket "${ticket?.ticket_number || 'request'}" to its active state?`,
            type: 'success',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                runBackgroundTask(`Restoring ticket: ${ticket?.ticket_number}`, async () => {
                    const res = await fetch(`/api/tickets/${ticketId}/restore`, { method: 'POST', credentials: 'include' });
                    if (res.ok) {
                        refreshAll();
                        fetchArchivedTickets();
                        return { success: true, message: 'Ticket restored successfully' };
                    }
                    throw new Error('Restore failed');
                });
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    const purgeArchived = async (fileId) => {
        const file = archivedFiles.find(f => f.id === fileId);
        setConfirmModal({
            isOpen: true,
            title: 'PERMANENTLY Delete',
            message: `Are you sure you want to permanently delete "${file?.name || 'record'}"? This action is IRREVERSIBLE and will delete the record and its file from storage.`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                runBackgroundTask(`Purging: ${file?.name}`, async () => {
                    const res = await fetch(`/api/documents/${fileId}/purge`, { method: 'DELETE', credentials: 'include' });
                    if (res.ok) {
                        refreshAll();
                        fetchArchivedFiles();
                        return { success: true, message: 'Record permanently deleted' };
                    }
                    throw new Error('Purge failed');
                });
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    const purgeTicket = async (ticketId) => {
        const ticket = archivedTickets.find(t => t.id === ticketId);
        setConfirmModal({
            isOpen: true,
            title: 'PERMANENTLY Delete Ticket',
            message: `Are you sure you want to permanently delete ticket "${ticket?.ticket_number || 'request'}"? This action is IRREVERSIBLE and will delete it from database.`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                runBackgroundTask(`Purging ticket: ${ticket?.ticket_number}`, async () => {
                    const res = await fetch(`/api/tickets/${ticketId}/purge`, { method: 'DELETE', credentials: 'include' });
                    if (res.ok) {
                        refreshAll();
                        fetchArchivedTickets();
                        return { success: true, message: 'Ticket permanently deleted' };
                    }
                    throw new Error('Purge failed');
                });
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    /** Restores the selected archived records through the shared task queue. */
    const bulkRestoreArchived = () => {
        if (!selectedArchiveIds.length) return;
        setConfirmModal({
            isOpen: true,
            title: 'Restore Selected',
            message: `Are you sure you want to restore all ${selectedArchiveIds.length} selected records to their active state?`,
            type: 'success',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                runBackgroundTask(`Restoring ${selectedArchiveIds.length} records`, async () => {
                    let successCount = 0;
                    for (const id of selectedArchiveIds) {
                        try {
                            const res = await fetch(`/api/documents/${id}/undo`, { method: 'POST', credentials: 'include' });
                            if (res.ok) successCount++;
                        } catch (err) {
                            console.error(`Failed to restore ${id}`, err);
                        }
                    }
                    setSelectedArchiveIds([]);
                    refreshAll();
                    fetchArchivedFiles();
                    return { success: true, message: `Successfully restored ${successCount} records.` };
                });
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    /** Permanently removes the selected archived records after confirmation. */
    const bulkPurgeArchived = () => {
        if (!selectedArchiveIds.length) return;
        setConfirmModal({
            isOpen: true,
            title: 'PERMANENTLY Delete Selected',
            message: `Are you sure you want to permanently delete all ${selectedArchiveIds.length} selected records? This action is IRREVERSIBLE and cannot be undone.`,
            type: 'danger',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                runBackgroundTask(`Purging ${selectedArchiveIds.length} files`, async () => {
                    let successCount = 0;
                    for (const id of selectedArchiveIds) {
                        try {
                            const res = await fetch(`/api/documents/${id}/purge`, { method: 'DELETE', credentials: 'include' });
                            if (res.ok) successCount++;
                        } catch (err) {
                            console.error(`Failed to purge ${id}`, err);
                        }
                    }
                    setSelectedArchiveIds([]);
                    refreshAll();
                    fetchArchivedFiles();
                    return { success: true, message: `Successfully permanently deleted ${successCount} records.` };
                });
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    const showLoading = archiveSubTab === 'tickets' ? isLoadingTickets : isLoadingArchived;

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 custom-scrollbar">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto space-y-6"
            >
                {/* Premium Banner */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="absolute top-[-50%] right-[-10%] w-[35%] h-[150%] bg-[#d4a574]/15 rounded-full blur-[100px] pointer-events-none z-0"></div>

                    <div className="relative z-10 space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">
                            Secure Data Recovery
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">Archive Manager</h2>
                        <p className="text-slate-400 text-xs max-w-xl font-medium">
                            Manage and restore soft-deleted records or permanently delete them from the database. Only authorized accounts are allowed to permanently purge records.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 relative z-10">
                        {archiveSubTab !== 'tickets' && selectedArchiveIds.length > 0 && (
                            <>
                                <button
                                    onClick={bulkRestoreArchived}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10 transition-all cursor-pointer active:scale-95"
                                >
                                    <ArrowPathIcon className="w-4 h-4" />
                                    Restore Selected ({selectedArchiveIds.length})
                                </button>
                                <button
                                    onClick={canPurge ? bulkPurgeArchived : undefined}
                                    disabled={!canPurge}
                                    title={canPurge ? "Purge Selected" : "Only Admins and SuperAdmins can permanently purge records"}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                                        canPurge
                                            ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/10 cursor-pointer active:scale-95"
                                            : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-50"
                                    }`}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    Purge Selected ({selectedArchiveIds.length})
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Info and Policy Warning Alert Box */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 text-xs text-indigo-700 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-200 shrink-0">
                        <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-[13px] text-indigo-900 mb-1">Archive Policy & Audit Trail Compliance</h4>
                        <p className="leading-relaxed text-indigo-700/80">
                            CiviCORE maintains immutable transaction histories to ensure complete accountability for LCR and PSA state audit workflows.
                            While scanned queues and database registry documents can be deleted and subsequently recovered in this panel, <strong>Activity Logs and printed transaction history cannot be deleted or purged</strong> by design.
                        </p>
                    </div>
                </div>

                {/* Main Filter & Table Card */}
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col overflow-hidden">
                    {/* Controls Header */}
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40">
                        {/* Subtabs inside the Archive Manager */}
                        <div className="flex bg-slate-100 p-1.5 gap-1.5 rounded-2xl border border-slate-200/50 self-start">
                            <button
                                onClick={() => {
                                    setArchiveSubTab('scans');
                                    setSelectedArchiveIds([]);
                                }}
                                className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                                    archiveSubTab === 'scans'
                                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                                }`}
                            >
                                Scans & Uploads Archive ({scansArchive.length})
                            </button>
                            <button
                                onClick={() => {
                                    setArchiveSubTab('registry');
                                    setSelectedArchiveIds([]);
                                }}
                                className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                                    archiveSubTab === 'registry'
                                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                                }`}
                            >
                                Master Registry Archive ({registryArchive.length})
                            </button>
                            <button
                                onClick={() => {
                                    setArchiveSubTab('tickets');
                                    setSelectedArchiveIds([]);
                                }}
                                className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                                    archiveSubTab === 'tickets'
                                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                                }`}
                            >
                                Ticket Requests Archive ({filteredArchivedTickets.length})
                            </button>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    value={archiveSearch}
                                    onChange={e => setArchiveSearch(e.target.value)}
                                    placeholder="Search Archived Records…"
                                    className="pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 w-52 font-medium"
                                />
                            </div>
                            <select
                                value={archiveTypeFilter}
                                onChange={e => setArchiveTypeFilter(e.target.value)}
                                className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 cursor-pointer"
                            >
                                <option value="all">All Types</option>
                                <option value="birth">Birth Certificates</option>
                                <option value="death">Death Certificates</option>
                                <option value="marriage">Marriage Licenses</option>
                            </select>
                        </div>
                    </div>

                    {/* Table View */}
                    {showLoading ? (
                        <div className="p-8"><SkeletonLoader type="table" rows={6} /></div>
                    ) : activeArchiveList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-slate-400 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                                <TrashIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-600">
                                {archiveSearch ? 'No matching archived records' : 'This section of the archive is empty'}
                            </p>
                            <p className="text-xs mt-1.5 text-slate-400 max-w-[280px] leading-relaxed mx-auto">
                                {archiveSearch
                                    ? 'Try adjusting your search query or switching category filters.'
                                    : 'When records are deleted from active lists, they will be temporarily held here.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar w-full">
                            <table className="w-full text-left border-collapse table-auto">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                                        <th className="px-6 py-4 w-12">
                                            {archiveSubTab !== 'tickets' && (
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-[#d4a574] focus:ring-[#d4a574]/30 cursor-pointer"
                                                    checked={selectedArchiveIds.length === activeArchiveList.length && activeArchiveList.length > 0}
                                                    onChange={() => toggleSelectAllArchive(activeArchiveList)}
                                                />
                                            )}
                                        </th>
                                        <th className="px-4 py-4">{archiveSubTab === 'tickets' ? 'Citizen Request / ID' : 'Subject / Document'}</th>
                                        <th className="px-4 py-4">Type</th>
                                        <th className="px-4 py-4">{archiveSubTab === 'tickets' ? 'Status' : 'Encoder'}</th>
                                        <th className="px-4 py-4">{archiveSubTab === 'tickets' ? 'Archived At' : 'Deleted At'}</th>
                                        <th className="px-6 py-4 text-right w-36">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {archiveSubTab === 'tickets' ? (
                                        activeArchiveList.map(ticket => {
                                            let ticketDetails = ticket.details || {};
                                            if (typeof ticketDetails === 'string') {
                                                try {
                                                    ticketDetails = JSON.parse(ticketDetails || '{}');
                                                } catch {
                                                    ticketDetails = {};
                                                }
                                            }
                                            const archiveReason = ticketDetails.deletion_reason || ticketDetails.cancellation_reason;

                                            return (
                                            <tr key={ticket.id} className="hover:bg-slate-50/40 transition-colors group">
                                                <td className="px-6 py-4"></td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-bold text-slate-800 truncate max-w-xs">
                                                            {ticket.client_name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                            Ticket: {ticket.ticket_number}
                                                        </span>
                                                        {archiveReason && (
                                                            <span className="text-[11px] text-slate-500 font-semibold mt-1 max-w-sm truncate" title={archiveReason}>
                                                                Reason: {archiveReason}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded-md uppercase tracking-wide">
                                                        {ticket.purpose}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 border rounded-md uppercase tracking-wide ${
                                                        ticket.archive_status === 'deleted'
                                                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                        {ticket.archive_status === 'deleted' ? 'Deleted' : 'Declined'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-xs font-bold font-mono text-slate-500 tabular-nums">
                                                    {ticket.deleted_at
                                                        ? new Date(ticket.deleted_at).toLocaleString()
                                                        : new Date(ticket.updated_at).toLocaleString()
                                                    }
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => restoreTicket(ticket.id)}
                                                            className="p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-600 hover:text-white rounded-xl transition-all cursor-pointer active:scale-90"
                                                            title="Restore Ticket"
                                                        >
                                                            <ArrowPathIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={canPurge ? () => purgeTicket(ticket.id) : undefined}
                                                            disabled={!canPurge}
                                                            title={canPurge ? "Permanently Delete" : "Only Admins and SuperAdmins can permanently purge tickets"}
                                                            className={`p-2 border rounded-xl transition-all ${
                                                                canPurge
                                                                    ? "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-600 hover:text-white cursor-pointer active:scale-90"
                                                                    : "text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed opacity-50"
                                                            }`}
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })
                                    ) : (
                                        activeArchiveList.map(file => (
                                            <tr key={file.id} className="hover:bg-slate-50/40 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-[#d4a574] focus:ring-[#d4a574]/30 cursor-pointer"
                                                        checked={selectedArchiveIds.includes(file.id)}
                                                        onChange={() => toggleSelectArchive(file.id)}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-bold text-slate-800 truncate max-w-xs">
                                                            {file.personName || file.name}
                                                        </span>
                                                        {file.personName && (
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                                File: {file.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded-md uppercase tracking-wide">
                                                        {file.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                                                    {file.encoded_by || 'System'}
                                                </td>
                                                <td className="px-4 py-4 text-xs font-bold font-mono text-slate-500 tabular-nums">
                                                    {new Date(file.deleted_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => restoreArchived(file.id)}
                                                            className="p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-600 hover:text-white rounded-xl transition-all cursor-pointer active:scale-90"
                                                            title="Restore to Active Queue"
                                                        >
                                                            <ArrowPathIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={canPurge ? () => purgeArchived(file.id) : undefined}
                                                            disabled={!canPurge}
                                                            title={canPurge ? "Permanently Delete" : "Only Admins and SuperAdmins can permanently purge records"}
                                                            className={`p-2 border rounded-xl transition-all ${
                                                                canPurge
                                                                    ? "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-600 hover:text-white cursor-pointer active:scale-90"
                                                                    : "text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed opacity-50"
                                                            }`}
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Action Center Confirm Dialog */}
            <ActionConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
                onCancel={confirmModal.onCancel}
            />
        </div>
    );
};

export default ArchiveManager;
