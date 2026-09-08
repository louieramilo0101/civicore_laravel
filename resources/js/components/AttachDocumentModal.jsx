import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    DocumentMagnifyingGlassIcon,
    ArrowPathIcon,
    LinkIcon,
    PaperClipIcon,
    EyeIcon,
    SparklesIcon,
    CheckCircleIcon,
    MinusIcon,
    ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

/** Lets staff attach an existing registry document to a pending request. */
export default function AttachDocumentModal({ isOpen, onClose, ticket, onAttach }) {
    const [ocrQuery, setOcrQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchingOcr, setIsSearchingOcr] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [printRemarks, setPrintRemarks] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Initialize suggested search query from ticket details
    useEffect(() => {
        if (isOpen && ticket) {
            let suggestedQuery = ticket.client_name;
            if (ticket.purpose === 'birth' && ticket.details?.last_name) {
                suggestedQuery = `${ticket.details.first_name} ${ticket.details.last_name}`;
            } else if (ticket.purpose === 'death' && ticket.details?.deceased_last_name) {
                suggestedQuery = `${ticket.details.deceased_first_name} ${ticket.details.deceased_last_name}`;
            } else if (ticket.purpose === 'marriage' && ticket.details?.husband_last_name) {
                suggestedQuery = `${ticket.details.husband_last_name}`;
            }
            setOcrQuery(suggestedQuery);
            setSelectedDoc(null);
            setPrintRemarks('');
            setSearchResults([]);
            setIsMinimized(false);
            handleOcrSearch(suggestedQuery, ticket.purpose);
        }
    }, [isOpen, ticket]);

    const handleOcrSearch = async (queryText, purposeType) => {
        const term = queryText !== undefined ? queryText : ocrQuery;
        const type = purposeType || ticket?.purpose;
        if (!term.trim()) return;

        setIsSearchingOcr(true);
        try {
            const res = await axios.get('/api/documents', {
                params: {
                    search: term,
                    type: type === 'marriage' ? 'marriage' : type
                }
            });
            setSearchResults(res.data.data || res.data.documents || (Array.isArray(res.data) ? res.data : []));
        } catch (err) {
            console.error('OCR record search failed:', err);
        } finally {
            setIsSearchingOcr(false);
        }
    };

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
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-900 leading-normal">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    transition={{ type: 'spring', duration: 0.4 }}
                    className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full p-8 border border-slate-100 flex flex-col h-[85vh] max-h-[700px] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <SparklesIcon className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg tracking-tight">
                                    Attach File
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Linking ticket <span className="font-bold text-slate-700">{ticket?.ticket_number}</span> ({ticket?.client_name})
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-2 border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-200 text-slate-400 hover:text-amber-600 transition-all cursor-pointer"
                                title="Minimize — continue working"
                            >
                                <MinusIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                        {/* Search Area */}
                        <div className="flex gap-3 mb-6 shrink-0">
                            <div className="relative flex-1">
                                <DocumentMagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                                <input
                                    type="text"
                                    placeholder="Search extracted civil registry records..."
                                    value={ocrQuery}
                                    onChange={e => setOcrQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleOcrSearch()}
                                    className="w-full pl-11 pr-4 py-3.5 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                                />
                            </div>
                            <button
                                onClick={() => handleOcrSearch()}
                                disabled={isSearchingOcr}
                                className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isSearchingOcr ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : 'Search Database'}
                            </button>
                        </div>


                        {/* Results Body */}
                        <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar mb-5">
                            {isSearchingOcr ? (
                                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                    <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                                    <p className="text-xs font-bold text-slate-600">Scanning registry tables...</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Cross-referencing matching names and dates.</p>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-[2rem] p-6 bg-slate-50/20">
                                    <DocumentMagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 opacity-20 text-indigo-500" />
                                    <p className="text-sm font-black text-slate-700">No matching records found</p>
                                    <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
                                        No files matched "{ocrQuery}". Try typing in a birth date or a registry number.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {searchResults.map(doc => {
                                        const isDocSelected = selectedDoc?.id === doc.id;
                                        return (
                                            <div
                                                key={doc.id}
                                                onClick={() => setSelectedDoc(doc)}
                                                className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 group ${
                                                    isDocSelected
                                                        ? 'border-indigo-600 bg-indigo-50/10 shadow-sm ring-1 ring-indigo-500/20'
                                                        : 'border-slate-150 bg-white hover:bg-slate-50 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="min-w-0">
                                                        <span className="text-[9px] font-mono font-black text-slate-400 tracking-wider block">
                                                            {doc.certNumber || 'REGISTRY RECORD'}
                                                        </span>
                                                        <h4 className="font-extrabold text-slate-800 text-sm tracking-tight truncate mt-1" title={doc.name}>
                                                            {doc.personName || doc.name}
                                                        </h4>
                                                        {(doc.detected_type || doc.type) && (
                                                            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                                                {String(doc.detected_type || doc.type).replace(/_/g, ' ').toUpperCase()}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className={`shrink-0 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                                                        doc.status === 'processed' || doc.status === 'issued'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                        {doc.status || 'Active'}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-end border-t border-slate-100/60 pt-3 text-[11px] text-slate-500">
                                                    <div>
                                                        <p className="font-semibold truncate max-w-[20ch]">
                                                            Barangay: <span className="font-bold text-slate-700">{doc.barangay || 'Unspecified'}</span>
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={`/api/documents/view/${doc.id}?raw=1`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                                                            title="View Document"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </a>
                                                        {isDocSelected && (
                                                            <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                                                                <CheckCircleIcon className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Remarks - inside scroll area, below results */}
                            <div className="mt-5 pt-4 border-t border-dashed border-slate-200">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                                    Remarks
                                </label>
                                <textarea
                                    placeholder="Add notes for the approval queue..."
                                    value={printRemarks}
                                    onChange={e => setPrintRemarks(e.target.value)}
                                    rows="2"
                                    maxLength={1000}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-700 resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="border-t border-slate-100 pt-4 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border border-slate-200 text-slate-650 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors cursor-pointer"
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
                                        ? 'bg-[#1a2f4a] hover:bg-[#112033] text-white shadow-slate-200'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
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
