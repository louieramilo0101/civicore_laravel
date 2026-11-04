import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    DocumentMagnifyingGlassIcon,
    ArrowPathIcon,
    LinkIcon,
    PaperClipIcon,
    EyeIcon,
    CheckCircleIcon,
    MinusIcon,
    ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import useDebounce from '../hooks/useDebounce.js';

/** Lets staff attach an existing registry document to a pending request. */
export default function AttachDocumentModal({ isOpen, onClose, ticket, onAttach }) {
    const [ocrQuery, setOcrQuery] = useState('');
    const debouncedQuery = useDebounce(ocrQuery, 50);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchingOcr, setIsSearchingOcr] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [printRemarks, setPrintRemarks] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const abortControllerRef = useRef(null);

    const performSearch = useCallback(async (queryText, purposeType) => {
        const term = queryText !== undefined ? queryText : ocrQuery;
        const type = purposeType || ticket?.purpose;

        // Abort previous in-flight search
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsSearchingOcr(true);
        try {
            const params = {
                per_page: 50,
                for_attach: 1,
                status: 'processed', // only show OCR-processed/extracted docs ready to attach
            };
            if (type) {
                params.type = type === 'marriage' ? 'marriage' : type;
            }
            if (term && term.trim()) {
                params.search = term.trim();
            }

            const res = await axios.get('/api/documents', {
                params,
                signal: controller.signal
            });
            const raw = res.data.data || res.data.documents || (Array.isArray(res.data) ? res.data : []);
            // Client-side safety filter: only include docs that have meaningful person data
            const ready = raw.filter(doc => {
                const s = (doc.status || '').toLowerCase();
                return s === 'processed' || s === 'extracted' || s === 'issued' || s === 'active';
            });
            setSearchResults(ready);
        } catch (err) {
            if (!axios.isCancel(err) && err.name !== 'CanceledError') {
                console.error('OCR record search failed:', err);
            }
        } finally {
            if (abortControllerRef.current === controller) {
                setIsSearchingOcr(false);
            }
        }
    }, [ocrQuery, ticket?.purpose]);

    // Initialize suggested search query from ticket details when modal opens
    useEffect(() => {
        if (isOpen && ticket) {
            let details = ticket.details;
            if (typeof details === 'string') {
                try {
                    details = JSON.parse(details);
                } catch (_) {
                    details = {};
                }
            }
            details = details || {};

            let suggestedQuery = '';
            if (ticket.purpose === 'birth') {
                if (details.last_name || details.first_name) {
                    suggestedQuery = `${details.first_name || ''} ${details.last_name || ''}`.trim();
                }
            } else if (ticket.purpose === 'death') {
                if (details.deceased_last_name || details.deceased_first_name) {
                    suggestedQuery = `${details.deceased_first_name || ''} ${details.deceased_last_name || ''}`.trim();
                }
            } else if (ticket.purpose === 'marriage') {
                if (details.husband_last_name || details.husband_first_name) {
                    suggestedQuery = `${details.husband_first_name || ''} ${details.husband_last_name || ''}`.trim();
                } else if (details.wife_last_name || details.wife_first_name) {
                    suggestedQuery = `${details.wife_first_name || ''} ${details.wife_last_name || ''}`.trim();
                }
            }

            // Fallback to client name if no document registrant name was found
            if (!suggestedQuery && ticket.client_name) {
                suggestedQuery = ticket.client_name.trim();
            }

            setOcrQuery(suggestedQuery);
            setSelectedDoc(null);
            setPrintRemarks('');
            setIsMinimized(false);
            performSearch(suggestedQuery, ticket.purpose);
        }
    }, [isOpen, ticket?.id]);

    // Dynamically search in real-time as the user types
    useEffect(() => {
        if (!isOpen || !ticket) return;
        performSearch(debouncedQuery, ticket.purpose);
    }, [debouncedQuery, isOpen, ticket?.purpose, performSearch]);

    const handleConfirmAttach = async () => {
        if (!ticket || !selectedDoc) return;
        setIsLinking(true);
        try {
            await onAttach(selectedDoc.id, printRemarks.trim());
            onClose();
        } catch (err) {
            console.error('Failed to attach document:', err);
        } finally {
            setIsLinking(false);
        }
    };

    if (!isOpen) return null;

    if (isMinimized) {
        return createPortal(
            <div className="fixed bottom-6 right-6 z-[9999]">
                <motion.button
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: 20 }}
                    onClick={() => setIsMinimized(false)}
                    className="flex items-center gap-3 pl-4 pr-5 py-3 bg-[#1a2f4a] text-white rounded-2xl shadow-2xl shadow-slate-900/30 hover:bg-[#243d5c] transition-all cursor-pointer group border border-white/10"
                >
                    <div className="w-9 h-9 bg-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
                        {isSearchingOcr ? (
                            <ArrowPathIcon className="w-4.5 h-4.5 animate-spin text-indigo-300" />
                        ) : (
                            <LinkIcon className="w-4.5 h-4.5 text-indigo-300" />
                        )}
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 leading-none">
                            {isSearchingOcr ? 'Searching...' : selectedDoc ? 'File Selected' : 'Attach File'}
                        </p>
                        <p className="text-xs font-bold text-white/80 mt-0.5 leading-none">
                            {ticket?.ticket_number}
                            {selectedDoc && <span className="text-emerald-400 ml-1">✓</span>}
                            {searchResults.length > 0 && !selectedDoc && (
                                <span className="text-amber-300 ml-1">· {searchResults.length} found</span>
                            )}
                        </p>
                    </div>
                    <ArrowsPointingOutIcon className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors ml-1" />
                </motion.button>
            </div>,
            document.body
        );
    }

        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 text-slate-900 dark:text-slate-100 leading-normal">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    transition={{ type: 'spring', duration: 0.4 }}
                    className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-2xl w-full p-8 border border-slate-150 dark:border-slate-800 flex flex-col h-[85vh] max-h-[700px] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                                <PaperClipIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg tracking-tight">
                                    Attach File
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Linking ticket <span className="font-bold text-slate-700 dark:text-slate-200">{ticket?.ticket_number}</span> ({ticket?.client_name})
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-200 dark:hover:border-amber-800 text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 transition-all cursor-pointer"
                                title="Minimize — continue working"
                            >
                                <MinusIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                        {/* Modern Real-time Search Area */}
                        <div className="flex flex-col gap-2 mb-4 shrink-0">
                            <div className="flex gap-3 items-center">
                                <div className="relative flex-1 group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                                        {isSearchingOcr || ocrQuery !== debouncedQuery ? (
                                            <ArrowPathIcon className="w-5 h-5 text-indigo-500 animate-spin" />
                                        ) : (
                                            <DocumentMagnifyingGlassIcon className="w-5 h-5 text-indigo-500 group-focus-within:text-indigo-600 transition-colors" />
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Type name, registry number, or barangay to search in real time..."
                                        value={ocrQuery}
                                        onChange={e => setOcrQuery(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                performSearch(ocrQuery, ticket?.purpose);
                                            }
                                        }}
                                        className="w-full pl-11 pr-11 py-3.5 text-sm border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold bg-slate-50/50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all shadow-sm"
                                        autoFocus
                                    />
                                    {ocrQuery && (
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOcrQuery('');
                                                    performSearch('', ticket?.purpose);
                                                }}
                                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                                title="Clear search"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => performSearch(ocrQuery, ticket?.purpose)}
                                    disabled={isSearchingOcr}
                                    className="px-5 py-3.5 bg-slate-900 text-white dark:bg-[#d4a574] dark:hover:bg-[#bc8a59] dark:text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
                                    title="Refresh search"
                                >
                                    {isSearchingOcr ? 'Searching...' : 'Search'}
                                </button>
                            </div>

                            {/* Result Count Bar */}
                            <div className="flex items-center justify-between px-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 min-h-[16px]">
                                <span>
                                    {isSearchingOcr || ocrQuery !== debouncedQuery ? null : ocrQuery.trim() ? (
                                        <span>
                                            Found <strong className="text-slate-700 dark:text-slate-200 font-black">{searchResults.length}</strong> record{searchResults.length === 1 ? '' : 's'} matching "{ocrQuery}"
                                        </span>
                                    ) : (
                                        <span>
                                            Showing <strong className="text-slate-700 dark:text-slate-200 font-black">{searchResults.length}</strong> recent {ticket?.purpose || 'registry'} records
                                        </span>
                                    )}
                                </span>
                                {selectedDoc && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                        <CheckCircleIcon className="w-3.5 h-3.5 inline" /> Selected: {selectedDoc.certNumber || selectedDoc.name}
                                    </span>
                                )}
                            </div>
                        </div>


                        {/* Results Body */}
                        <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar mb-5">
                            {isSearchingOcr && searchResults.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Searching registry records...</p>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="text-center py-20 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 bg-slate-50/20 dark:bg-slate-800/20">
                                    <DocumentMagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 opacity-20 text-indigo-500" />
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-300">No matching records found</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-xs mx-auto">
                                        No files matched "{ocrQuery}". Try typing in a name, date, or registry number.
                                    </p>
                                </div>
                            ) : (
                                <div className={`flex flex-col gap-4 transition-opacity duration-200 ${isSearchingOcr || ocrQuery !== debouncedQuery ? 'opacity-60' : 'opacity-100'}`}>
                                    {searchResults.map(doc => {
                                        const isDocSelected = selectedDoc?.id === doc.id;
                                        return (
                                            <div
                                                key={doc.id}
                                                onClick={() => setSelectedDoc(doc)}
                                                className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 group ${
                                                    isDocSelected
                                                        ? 'border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500/20'
                                                        : 'border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="min-w-0">
                                                        <span className="text-[9px] font-mono font-black text-slate-400 dark:text-slate-500 tracking-wider block">
                                                            {doc.certNumber || 'REGISTRY RECORD'}
                                                        </span>
                                                        <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm tracking-tight truncate mt-1" title={doc.name}>
                                                            {doc.personName || doc.name}
                                                        </h4>
                                                        {(doc.detected_type || doc.type) && (
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                                                {String(doc.detected_type || doc.type).replace(/_/g, ' ').toUpperCase()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-end border-t border-slate-100/60 dark:border-slate-800 pt-3 text-[11px] text-slate-500 dark:text-slate-400">
                                                    <div>
                                                        <p className="font-semibold truncate max-w-[20ch]">
                                                            Barangay: <span className="font-bold text-slate-700 dark:text-slate-200">{doc.barangay || 'Unspecified'}</span>
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={`/api/documents/view/${doc.id}?raw=1`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                                            title="View Document"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </a>

                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Remarks - inside scroll area, below results */}
                            <div className="mt-5 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                                    Remarks
                                </label>
                                <textarea
                                    placeholder="Add notes for the approval queue..."
                                    value={printRemarks}
                                    onChange={e => setPrintRemarks(e.target.value)}
                                    rows="2"
                                    maxLength={1000}
                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-700 dark:text-slate-200 resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                disabled={isLinking}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAttach}
                                disabled={!selectedDoc || isLinking}
                                className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                                    selectedDoc
                                        ? 'bg-[#1a2f4a] dark:bg-[#d4a574] hover:bg-[#112033] dark:hover:bg-[#bc8a59] text-white dark:text-slate-950 shadow-slate-200 dark:shadow-none'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                                }`}
                            >
                                {isLinking ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <PaperClipIcon className="w-4 h-4" />
                                )}
                                Attach File to Ticket
                            </button>
                        </div>
            </motion.div>
            </div>,
            document.body
    );
}
