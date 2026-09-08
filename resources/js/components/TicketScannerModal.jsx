import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    XMarkIcon,
    QrCodeIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    CameraIcon,
    PencilSquareIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

/** Scans a ticket QR code and returns the selected request to the caller. */
export default function TicketScannerModal({ isOpen, onClose, onTicketSelect }) {
    const fileInputRef = useRef(null);
    const nativeCameraInputRef = useRef(null);

    const [activeTab, setActiveTab] = useState('camera'); // 'camera' or 'manual'
    const [manualInput, setManualInput] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scannedTicket, setScannedTicket] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [recentTickets, setRecentTickets] = useState([]);
    const [fetchingRecent, setFetchingRecent] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setScannedTicket(null);
            setErrorMsg('');
            setManualInput('');
            return;
        }

        if (activeTab === 'manual') {
            fetchRecentTickets();
        }
    }, [isOpen, activeTab]);

    const fetchRecentTickets = async () => {
        setFetchingRecent(true);
        try {
            const res = await axios.get('/api/tickets');
            if (Array.isArray(res.data)) {
                setRecentTickets(res.data.slice(0, 5));
            }
        } catch (e) {
            console.warn('Failed to fetch recent tickets:', e);
        } finally {
            setFetchingRecent(false);
        }
    };

    // Handle Native Camera / Gallery Photo QR Upload
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setErrorMsg('');

        try {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            if ('BarcodeDetector' in window) {
                try {
                    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                    const barcodes = await detector.detect(img);
                    if (barcodes.length > 0) {
                        await handleTicketLookup(barcodes[0].rawValue);
                        return;
                    }
                } catch (e) {
                    console.warn('BarcodeDetector error:', e);
                }
            }

            // Fallback lookup by filename regex (e.g. T-2026-0001) or regex pattern
            const filenameNoExt = file.name.split('.')[0];
            const matched = filenameNoExt.match(/(?:T|WI)-\d{4}-\d+/i);
            if (matched) {
                await handleTicketLookup(matched[0]);
            } else {
                setErrorMsg('Could not detect a clear QR code in this photo. Please type the ticket number manually below.');
                setActiveTab('manual');
            }
        } catch (err) {
            console.error('Photo scan error:', err);
            setErrorMsg('Failed to process image file. Please try typing the ticket number.');
            setActiveTab('manual');
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
        }
    };

    const handleTicketLookup = async (rawInput) => {
        if (!rawInput) return;

        let cleanNumber = rawInput.trim();
        // Extract token if raw URL was scanned (e.g. https://.../ticket-status/xyz)
        if (cleanNumber.includes('/ticket-status/')) {
            cleanNumber = cleanNumber.split('/ticket-status/')[1];
        } else if (cleanNumber.includes('/ticket/')) {
            cleanNumber = cleanNumber.split('/ticket/')[1];
        }

        // Auto format raw digit input (e.g. "33" -> "T-2026-0033")
        if (/^\d{1,4}$/.test(cleanNumber)) {
            const padded = cleanNumber.padStart(4, '0');
            const year = new Date().getFullYear();
            cleanNumber = `T-${year}-${padded}`;
        }

        setIsScanning(true);
        setErrorMsg('');
        try {
            // Attempt ticket lookup by search term
            const res = await axios.get('/api/tickets', {
                params: { search: cleanNumber }
            });
            const matches = res.data;
            let ticket = null;

            if (Array.isArray(matches) && matches.length > 0) {
                ticket = matches.find(t =>
                    t.ticket_number.toLowerCase() === cleanNumber.toLowerCase() ||
                    t.token === cleanNumber ||
                    t.qr_code_token === cleanNumber
                ) || matches[0];
            }

            if (!ticket) {
                // Try public token endpoint
                try {
                    const publicRes = await axios.get(`/api/public/tickets/${cleanNumber}`);
                    if (publicRes.data?.ticket) {
                        ticket = publicRes.data.ticket;
                    }
                } catch (e) {}
            }

            if (ticket) {
                setScannedTicket(ticket);
                if (onTicketSelect) {
                    onTicketSelect(ticket);
                }
            } else {
                setErrorMsg(`No ticket found matching "${cleanNumber}".`);
            }
        } catch (err) {
            console.error('Failed to lookup ticket:', err);
            setErrorMsg('Could not find a ticket with that number.');
        } finally {
            setIsScanning(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-900">
            {/* Native device camera trigger (works offline without WebRTC/HTTPS) */}
            <input
                type="file"
                ref={nativeCameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
            />
            {/* Gallery photo uploader fallback */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 flex flex-col relative overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                            <QrCodeIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-base tracking-tight">Ticket Verification</h3>
                            <p className="text-xs text-slate-500 font-medium">Choose camera scan or type ticket number</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* 2-Option Tabs */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-5">
                    <button
                        type="button"
                        onClick={() => setActiveTab('camera')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            activeTab === 'camera'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <CameraIcon className="w-4 h-4" />
                        <span>Native Camera</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            activeTab === 'manual'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <PencilSquareIcon className="w-4 h-4" />
                        <span>Type Ticket #</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="space-y-4">
                    {/* OPTION 1: Open Native Device Camera */}
                    {activeTab === 'camera' && (
                        <div className="space-y-4 py-2">
                            <div className="p-6 bg-indigo-50/60 border-2 border-dashed border-indigo-200 rounded-2xl text-center flex flex-col items-center justify-center">
                                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-3 shadow-md shadow-indigo-600/20">
                                    <CameraIcon className="w-7 h-7" />
                                </div>
                                <h4 className="text-sm font-black text-indigo-950 mb-1">Open Device Camera App</h4>
                                <p className="text-xs text-indigo-700/80 mb-5 max-w-xs leading-relaxed font-medium">
                                    Launches your phone or tablet's default camera app to snap the ticket QR code instantly (works offline).
                                </p>

                                <button
                                    type="button"
                                    onClick={() => nativeCameraInputRef.current?.click()}
                                    disabled={isScanning}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    {isScanning ? (
                                        <>
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                            <span>Processing Snapshot...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CameraIcon className="w-4 h-4" />
                                            <span>Open Camera & Snap Ticket</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Secondary Gallery Upload option */}
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                    <PhotoIcon className="w-3.5 h-3.5" />
                                    <span>Or select a ticket image from photo gallery</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* OPTION 2: Type Code / Active Ticket Pick */}
                    {activeTab === 'manual' && (
                        <div className="space-y-4 py-2">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleTicketLookup(manualInput);
                                }}
                                className="space-y-3"
                            >
                                <label className="text-xs font-black text-slate-700 uppercase tracking-widest block">
                                    Enter Ticket Number or Client Name
                                </label>
                                <div className="relative">
                                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={manualInput}
                                        onChange={(e) => setManualInput(e.target.value)}
                                        placeholder="e.g. T-2026-0001 or type 33"
                                        className="w-full pl-9 pr-4 py-3 text-sm font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!manualInput.trim() || isScanning}
                                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    {isScanning ? (
                                        <>
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                            <span>Searching Ticket...</span>
                                        </>
                                    ) : 'Find & Select Ticket'}
                                </button>
                            </form>

                            {/* Quick Select from Active Tickets */}
                            {recentTickets.length > 0 && (
                                <div className="pt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Or select active waiting ticket:</p>
                                        {fetchingRecent && <ArrowPathIcon className="w-3 h-3 text-slate-400 animate-spin" />}
                                    </div>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {recentTickets.map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    setManualInput(t.ticket_number);
                                                    handleTicketLookup(t.ticket_number);
                                                }}
                                                className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 rounded-xl flex items-center justify-between text-left transition-all group cursor-pointer"
                                            >
                                                <div>
                                                    <span className="text-xs font-black text-slate-800 group-hover:text-indigo-900">{t.ticket_number}</span>
                                                    <span className="text-[11px] text-slate-500 ml-2 font-medium">{t.client_name}</span>
                                                </div>
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                                                    {t.purpose}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Feedback Alerts */}
                    {scannedTicket && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-emerald-950 truncate">{scannedTicket.ticket_number}</p>
                                    <p className="text-[11px] text-emerald-700 font-bold truncate">{scannedTicket.client_name} · {scannedTicket.purpose?.toUpperCase()}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    onClose();
                                }}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-colors cursor-pointer shrink-0 ml-2"
                            >
                                Select Ticket
                            </button>
                        </motion.div>
                    )}

                    {errorMsg && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800">
                            <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

