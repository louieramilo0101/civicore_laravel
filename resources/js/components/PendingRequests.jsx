import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner } from "html5-qrcode";
import {
    InboxIcon,
    MagnifyingGlassIcon,
    LinkIcon,
    PaperClipIcon,
    SparklesIcon,
    UserIcon,
    CalendarIcon,
    ArrowPathIcon,
    MapPinIcon,
    CheckCircleIcon,
    PrinterIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    DocumentTextIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import AttachDocumentModal from './AttachDocumentModal';

/**
 * @typedef {Object} TicketDetails
 * @property {string} [first_name] Birth certificate first name.
 * @property {string} [middle_name] Birth certificate middle name.
 * @property {string} [last_name] Birth certificate last name.
 * @property {string} [date_of_birth] Birth date in HTML date-input format.
 * @property {string} [place_of_birth] Birth place.
 * @property {string} [father_name] Father's name.
 * @property {string} [mother_name] Mother's maiden name.
 * @property {string} [deceased_first_name] Deceased person's first name.
 * @property {string} [deceased_middle_name] Deceased person's middle name.
 * @property {string} [deceased_last_name] Deceased person's last name.
 * @property {string} [date_of_death] Death date in HTML date-input format.
 * @property {string} [place_of_death] Death place.
 * @property {string} [husband_first_name] Husband's first name.
 * @property {string} [husband_middle_name] Husband's middle name.
 * @property {string} [husband_last_name] Husband's last name.
 * @property {string} [wife_first_name] Wife's first name.
 * @property {string} [wife_middle_name] Wife's middle name.
 * @property {string} [wife_last_name] Wife's last name.
 * @property {string} [date_of_marriage] Marriage date in HTML date-input format.
 * @property {string} [place_of_marriage] Marriage place.
 */

/**
 * @typedef {Object} Ticket
 * @property {number|string} id Unique ticket identifier.
 * @property {string} ticket_number Human-readable ticket number.
 * @property {string} client_name Requester's name.
 * @property {string} [email] Requester's email address.
 * @property {string} [phone] Requester's phone number.
 * @property {'birth'|'death'|'marriage'} purpose Requested certificate type.
 * @property {TicketDetails} [details] Certificate-specific request fields.
 * @property {string} request_status Current processing status.
 * @property {string} [queue_status] Current lobby queue status.
 * @property {number|string} [document_id] Linked registry document identifier.
 * @property {Object} [document] Linked registry document summary.
 */

/**
 * @typedef {Object} PendingRequestsProps
 * @property {(options: Object) => void} [showAlert] Displays a global alert.
 * @property {() => void} [refreshCounter] Notifies the parent to refresh counts.
 * @property {import('react').ReactNode} [viewSelectors] Optional parent view controls.
 * @property {number} [counter=0] Parent refresh counter.
 */

/**
 * Displays the digital request inbox and provides staff workflows for scanning,
 * reviewing, attaching, declining, and issuing civil registry requests.
 *
 * @param {PendingRequestsProps} props Component properties supplied by the parent view.
 * @returns {JSX.Element} The pending-request management interface.
 */
export default function PendingRequests({ showAlert, refreshCounter, viewSelectors, counter }) {
    /** @type {[Ticket[], import('react').Dispatch<import('react').SetStateAction<Ticket[]>>]} */
    const [tickets, setTickets] = useState([]);
    /** @type {[Object, import('react').Dispatch<import('react').SetStateAction<Object>>]} */
    const [stats, setStats] = useState({ pending_inbox: 0, attached_today: 0, completed_today: 0 });
    /** @type {[Ticket|null, import('react').Dispatch<import('react').SetStateAction<Ticket|null>>]} */
    const [selectedTicket, setSelectedTicket] = useState(null);
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [searchQuery, setSearchQuery] = useState('');
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [purposeFilter, setPurposeFilter] = useState('all');
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [statusFilter, setStatusFilter] = useState('pending');
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isLoading, setIsLoading] = useState(false);

    /** Tracks the previous result count so new-request notifications are not emitted on first load. */
    const prevCountRef = React.useRef(0);

    /** Plays a short, non-blocking notification tone for newly received requests. */
    const playNotificationSound = () => {
        try {
            /** Browser audio context used to synthesize the notification tone. */
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            /** Oscillator that produces the tone's pitch. */
            const osc = ctx.createOscillator();
            /** Gain node that controls the tone's volume envelope. */
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {}
    };

    // Modal and workflow state. Each flag controls one staff-facing overlay or action.
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isAttachOpen, setIsAttachOpen] = useState(false);
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isDeclineOpen, setIsDeclineOpen] = useState(false);
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [declineReason, setDeclineReason] = useState('');
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [declinePreset, setDeclinePreset] = useState('');
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [scannerError, setScannerError] = useState('');

    /** Stores the identifier of the ticket currently being declined. */
    /** @type {[number|string|null, import('react').Dispatch<import('react').SetStateAction<number|string|null>>]} */
    const [deletingId, setDeletingId] = useState(null);

    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isVerifyOpen, setIsVerifyOpen] = useState(false);
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isIssuing, setIsIssuing] = useState(false);

    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isWalkinModalOpen, setIsWalkinModalOpen] = useState(false);
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    /** @type {[Ticket|null, import('react').Dispatch<import('react').SetStateAction<Ticket|null>>]} */
    const [scannedData, setScannedData] = useState(null);
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [walkinName, setWalkinName] = useState('');
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [walkinPurpose, setWalkinPurpose] = useState('birth');
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isCreatingWalkin, setIsCreatingWalkin] = useState(false);
    /** @type {[TicketDetails, import('react').Dispatch<import('react').SetStateAction<TicketDetails>>]} */
    const [walkinDetails, setWalkinDetails] = useState({
        first_name: '', middle_name: '', last_name: '', date_of_birth: '', place_of_birth: '', father_name: '', mother_name: '',
        deceased_first_name: '', deceased_middle_name: '', deceased_last_name: '', date_of_death: '', place_of_death: '',
        husband_first_name: '', husband_middle_name: '', husband_last_name: '',
        wife_first_name: '', wife_middle_name: '', wife_last_name: '', date_of_marriage: '', place_of_marriage: ''
    });

    /**
     * Starts the original live QR scanner when its modal opens and guarantees
     * that the scanner and camera are released when the modal closes.
     */
    useEffect(() => {
        if (!isScannerOpen) return;

        /** Active html5-qrcode scanner instance for this effect lifecycle. */
        let scanner = null;
        /** Animation-frame handle used to wait for the portal reader element. */
        let frameId = null;
        setScannerError('');

        /**
         * Handles a decoded QR value by checking the ticket into the queue.
         * @param {string} decodedText Raw text returned by html5-qrcode.
         * @returns {Promise<void>} Resolves after the lookup attempt completes.
         */
        const onScanSuccess = async (decodedText) => {
            await scanner?.clear().catch(() => {});
            scanner = null;
            setIsScannerOpen(false);

            try {
                /** Extract the final token when the QR value is a full URL. */
                const ticketToken = decodedText.includes('/')
                    ? decodedText.split('/').filter(Boolean).pop()
                    : decodedText;
                /** Ask Laravel to validate and check in the scanned ticket. */
                /** Response returned by the ticket check-in endpoint. */
                const response = await axios.post('/api/v1/tickets/scan', {
                    qr_code_token: ticketToken,
                });
                /** Normalize both wrapped and legacy API response formats. */
                const ticketRecord = response.data.ticket || response.data;
                setScannedData(ticketRecord);
                setSelectedTicket(ticketRecord);
                setIsPopupOpen(true);
                fetchPendingTickets(false);
            } catch (error) {
                console.error('Ticket scan failed:', error);
                alert(error.response?.data?.error || 'Ticket scan failed.');
            }
        };

        /** Creates the scanner after the portal has mounted its reader element. */
        const initializeScanner = () => {
            /** Portal-mounted DOM node consumed by html5-qrcode. */
            const reader = document.getElementById('reader');
            if (!reader) {
                setScannerError('The scanner could not initialize. Please close this window and try again.');
                return;
            }

            try {
                scanner = new Html5QrcodeScanner('reader', {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                });
                scanner.render(onScanSuccess, () => {});
            } catch (error) {
                console.error('QR scanner initialization failed:', error);
                setScannerError('The QR scanner could not start. Check browser camera permission and try again.');
            }
        };

        frameId = requestAnimationFrame(initializeScanner);

        return () => {
            if (frameId) cancelAnimationFrame(frameId);
            scanner?.clear().catch(() => {});
            scanner = null;
        };
    }, [isScannerOpen]);

    /**
     * Removes unsupported characters from staff-entered names.
     * @param {string} val Candidate name value.
     * @returns {string} Sanitized name.
     */
    const sanitizeName = (val) => val ? val.replace(/[^a-zA-Z\s\.\,\'\-ñ\Ñ\u00C0-\u024F]/g, '') : '';

    /**
     * Updates one walk-in detail and sanitizes name-like fields.
     * @param {string} field Detail key to update.
     * @param {string} val New field value.
     * @returns {void}
     */
    const handleWalkinDetailChange = (field, val) => {
        /** Whether the selected field represents a person's name. */
        const isName = field.includes('name') && !field.includes('place') && !field.includes('date');
        /** Value after applying name validation where appropriate. */
        let cleanVal = isName ? sanitizeName(val) : val;

        if (field.includes('date') && cleanVal) {
            const parts = cleanVal.split('-');
            if (parts[0] && parts[0].length > 4) {
                parts[0] = parts[0].slice(0, 4);
                cleanVal = parts.join('-');
            }
        }

        setWalkinDetails(prev => ({ ...prev, [field]: cleanVal }));
    };

    /**
     * Loads cached inbox data immediately, then refreshes it from the API when
     * the selected purpose or request-status filter changes.
     */
    useEffect(() => {
        /** Cache key scoped to the active purpose and status filters. */
        const cacheKey = `civicore_pending_tickets_${purposeFilter}_${statusFilter}`;
        /** Previously cached ticket list, if one exists. */
        const cachedTickets = sessionStorage.getItem(cacheKey);
        /** Previously cached summary statistics, if one exists. */
        const cachedStats = sessionStorage.getItem('civicore_pending_stats');

        if (cachedTickets) {
            setTickets(JSON.parse(cachedTickets));
        } else {
            setTickets([]); // Clear old tickets to prevent layout/tab-switch flickering
        }
        if (cachedStats) {
            setStats(JSON.parse(cachedStats));
        }

        fetchPendingTickets(!cachedTickets);
    }, [purposeFilter, statusFilter]);

    /** Refreshes the inbox silently when the parent reports a data change. */
    useEffect(() => {
        if (counter > 0) {
            fetchPendingTickets(false);
        }
    }, [counter]);

    /**
     * Retrieves filtered ticket records and staff statistics, updates the UI
     * cache, and preserves the currently selected ticket when possible.
     * @param {boolean} [showLoading=true] Whether to display the loading state.
     * @returns {Promise<void>} Resolves after both API requests finish.
     */
    const fetchPendingTickets = async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);
            /** Fetch the filtered inbox and its aggregate dashboard statistics together. */
            const [ticketsRes, statsRes] = await Promise.all([
                axios.get('/api/v1/tickets', {
                    params: {
                        request_status: statusFilter,
                        purpose: purposeFilter,
                        _: Date.now() // Cache-busting timestamp parameter
                    }
                }),
                axios.get('/api/v1/staff/tickets/digital-stats', {
                    params: {
                        _: Date.now() // Cache-busting timestamp parameter
                    }
                })
            ]);

            /** Compare the latest result count with the previous refresh for notifications. */
            const prevCount = prevCountRef.current;
            /** Ticket records returned by the filtered inbox endpoint. */
            const newTickets = ticketsRes.data;
            if (prevCount > 0 && newTickets.length > prevCount) {
                /** The API returns newest requests first, so the first item is newest. */
                const latest = newTickets[0];
                playNotificationSound();
                if (showAlert && latest) {
                    showAlert({
                        title: 'New Request Received!',
                        message: `Ticket ${latest.ticket_number} (${latest.client_name}) was added to the digital inbox.`,
                        type: 'info'
                    });
                }
            }
            prevCountRef.current = newTickets.length;

            setTickets(newTickets);
            setStats(statsRes.data);

            sessionStorage.setItem(`civicore_pending_tickets_${purposeFilter}_${statusFilter}`, JSON.stringify(ticketsRes.data));
            sessionStorage.setItem('civicore_pending_stats', JSON.stringify(statsRes.data));

            if (ticketsRes.data.length > 0) {
                if (selectedTicket) {
                    /** Keep the selected record synchronized with refreshed server data. */
                    const matched = ticketsRes.data.find(t => t.id === selectedTicket.id);
                    setSelectedTicket(matched || ticketsRes.data[0]);
                } else {
                    setSelectedTicket(ticketsRes.data[0]);
                }
            } else {
                setSelectedTicket(null);
            }
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Error', message: 'Could not retrieve digital requests.', type: 'danger' });
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Links a registry document to the selected request and moves it to the
     * ready-for-pickup workflow state.
     * @param {number|string} docId Registry document identifier.
     * @param {string} [printRemarks=''] Optional printing instructions.
     * @returns {Promise<void>} Resolves after the attachment is saved.
     */
    const handleAttachAndConfirm = async (docId, printRemarks = '') => {
        if (!selectedTicket || !docId) return;

        try {
            /** Server response for the document-attachment request. */
            const res = await axios.patch(`/api/v1/tickets/${selectedTicket.id}/attach`, {
                document_id: docId,
                print_remarks: printRemarks
            });
            if (res.data.success) {
                /** Apply the server-confirmed workflow state to the local selection. */
                const updatedTicket = {
                    ...selectedTicket,
                    document_id: docId,
                    request_status: 'ready_for_pickup'
                };
                setSelectedTicket(updatedTicket);
                setScannedData(prev => prev ? { ...prev, ...updatedTicket } : prev);
                setIsPopupOpen(true);
                showAlert({
                    title: 'File Attached!',
                    message: `Ticket ${selectedTicket.ticket_number} was sent to the ready for printing queue.`,
                    type: 'success'
                });
                fetchPendingTickets(false);
                if (refreshCounter) refreshCounter();
            }
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Error', message: 'Failed to link document and issue request.', type: 'danger' });
            throw err;
        }
    };

    /** Opens the decline dialog for the currently selected request. */
    const handleDeclineRequest = async () => {
        if (!selectedTicket) return;
        setIsDeclineOpen(true);
    };

    /**
     * Persists the selected decline reason and optionally sends the requester
     * a notification through the backend.
     * @returns {Promise<void>} Resolves after the decline workflow completes.
     */
    const confirmDeclineRequest = async () => {
        if (!selectedTicket || !declineReason.trim()) {
            showAlert({ title: 'Reason Required', message: 'Please provide a reason for declining this request.', type: 'warning' });
            return;
        }
        setDeletingId(selectedTicket.id);
        try {
            /** Server response for the decline request. */
            const res = await axios.patch(`/api/v1/tickets/${selectedTicket.id}/cancel`, {
                reason: declineReason.trim(),
                send_email: true
            });
            if (res.data.success) {
                setTickets(prev => prev.filter(t => t.id !== selectedTicket.id));
                setSelectedTicket(null);
                fetchPendingTickets(false);
                if (refreshCounter) refreshCounter();
                showAlert({ title: 'Request Declined', message: `Ticket ${selectedTicket.ticket_number} has been declined and moved to the archive.`, type: 'success' });
            }
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Error', message: 'Failed to decline request.', type: 'danger' });
        } finally {
            setDeletingId(null);
            setIsDeclineOpen(false);
            setDeclineReason('');
            setDeclinePreset('');
        }
    };

    /** Opens the identity-verification dialog before final issuance. */
    const handleDirectIssue = () => {
        if (!selectedTicket) return;
        setIsVerifyOpen(true);
    };

    /**
     * Marks the selected attached request as issued after staff verification.
     * @returns {Promise<void>} Resolves after the issue request completes.
     */
    const handleFinalIssue = async () => {
        if (!selectedTicket) return;
        setIsIssuing(true);
        try {
            /** Server response for the final issuance request. */
            const res = await axios.post(`/api/v1/tickets/${selectedTicket.id}/issue`);
            if (res.data.success) {
                showAlert({
                    title: 'Document Issued!',
                    message: `Digital ticket ${selectedTicket.ticket_number} has been checked out successfully.`,
                    type: 'success'
                });
                setIsVerifyOpen(false);
                fetchPendingTickets(false);
                if (refreshCounter) refreshCounter();
            }
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Error', message: 'Could not issue document directly.', type: 'danger' });
        } finally {
            setIsIssuing(false);
        }
    };

    /**
     * Opens the linked document in a hidden iframe and invokes the browser print dialog.
     * @param {Ticket} ticket Ticket whose linked document should be printed.
     * @returns {void}
     */
    const handlePrintTicketDocument = (ticket) => {
        if (!ticket?.document_id) return;

        /** Hidden print surface used so the inbox page remains in place. */
        const iframe = document.createElement('iframe');
        iframe.src = `/api/documents/view/${ticket.document_id}?raw=1`;
        iframe.style.position = 'fixed';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';

        /** Prints the loaded document, then removes the temporary iframe. */
        const printWhenReady = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            window.setTimeout(() => iframe.remove(), 2000);
        };

        iframe.addEventListener('load', printWhenReady, { once: true });
        document.body.appendChild(iframe);
    };

    /**
     * Creates a staff-entered walk-in request using the same ticket API as
     * online submissions, then resets the form and refreshes the inbox.
     * @returns {Promise<void>} Resolves after the ticket creation attempt.
     */
    const handleCreateWalkinTicket = async () => {
        if (!walkinName.trim()) {
            showAlert({ title: 'Error', message: 'Client name is required.', type: 'warning' });
            return;
        }
        setIsCreatingWalkin(true);
        try {
            /** Server response containing the newly created walk-in ticket. */
            const res = await axios.post('/api/v1/tickets', {
                client_name: walkinName.trim(),
                purpose: walkinPurpose,
                source: 'walk-in',
                details: walkinDetails
            });
            if (res.data.success) {
                showAlert({ title: 'Success', message: `Walk-in ticket ${res.data.ticket.ticket_number} created.`, type: 'success' });
                setIsWalkinModalOpen(false);
                setWalkinName('');
                setWalkinDetails({
                    first_name: '', middle_name: '', last_name: '', date_of_birth: '', place_of_birth: '', father_name: '', mother_name: '',
                    deceased_first_name: '', deceased_middle_name: '', deceased_last_name: '', date_of_death: '', place_of_death: '',
                    husband_first_name: '', husband_middle_name: '', husband_last_name: '',
                    wife_first_name: '', wife_middle_name: '', wife_last_name: '', date_of_marriage: '', place_of_marriage: ''
                });
                fetchPendingTickets(false);
                if (refreshCounter) refreshCounter();
            }
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Error', message: 'Failed to create walk-in ticket.', type: 'danger' });
        } finally {
            setIsCreatingWalkin(false);
        }
    };

    /** Tickets matching the free-text search currently entered by staff. */
    const filteredTickets = tickets.filter(t =>
        t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.client_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col space-y-4 h-full min-h-0 overflow-hidden">

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
                {viewSelectors && (
                    <div className="hidden xl:block">
                        {viewSelectors}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left: Pending Tickets List */}
                <div className="lg:col-span-1 bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col h-full overflow-hidden">
                    {/* Header Title Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                        <h3 className="text-base font-black text-slate-800 flex items-center gap-2 shrink-0">
                            <InboxIcon className="w-5 h-5 text-[#d4a574] shrink-0" />
                            <span className="whitespace-nowrap">Digital Inbox</span>
                            <span className="bg-[#d4a574]/20 text-[#c49a67] px-2 py-0.5 rounded-full text-xs font-bold leading-none shrink-0">
                                {tickets.length}
                            </span>
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={() => setIsWalkinModalOpen(true)}
                                className="px-3 py-1.5 bg-[#0f172a] text-[#d4a574] rounded-xl text-xs font-bold hover:bg-slate-800 transition-all whitespace-nowrap active:scale-95 cursor-pointer"
                            >
                                Walk In
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsScannerOpen(true)}
                                className="px-3 py-1.5 bg-[#0f172a] text-[#d4a574] rounded-xl text-xs font-bold hover:bg-slate-800 transition-all whitespace-nowrap active:scale-95 cursor-pointer"
                            >
                                Scan QR
                            </button>
                            <button
                                onClick={() => fetchPendingTickets(false)}
                                className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all shrink-0 active:scale-95 cursor-pointer"
                                title="Reload inbox"
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 mb-4">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search inbox..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20"
                            />
                        </div>

                        {/* Filters Row */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-7 py-2 text-xs font-black uppercase tracking-wider border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 cursor-pointer truncate"
                                >
                                    <option value="pending">Inbox</option>
                                    <option value="ready_for_pickup">Waiting</option>
                                    <option value="completed">Completed</option>
                                </select>
                                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>

                            <div className="relative">
                                <select
                                    value={purposeFilter}
                                    onChange={e => setPurposeFilter(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-7 py-2 text-xs font-black uppercase tracking-wider border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 cursor-pointer truncate"
                                >
                                    <option value="all">All Purposes</option>
                                    <option value="birth">Birth</option>
                                    <option value="death">Death</option>
                                    <option value="marriage">Marriage</option>
                                </select>
                                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* List Container */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                        {isLoading && tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <ArrowPathIcon className="w-8 h-8 animate-spin text-[#d4a574] mb-2" />
                                <p className="text-xs font-semibold">Loading requests...</p>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="text-center py-20 text-slate-400">
                                <InboxIcon className="w-10 h-10 mx-auto mb-2 opacity-20 text-slate-600" />
                                <p className="text-xs font-bold">No requests in queue</p>
                                <p className="text-[10px] text-slate-400 mt-1">Pending online requests will appear here.</p>
                            </div>
                        ) : (
                            filteredTickets.map(t => {
                                /** Whether this row is the currently selected request. */
                                const isSelected = selectedTicket?.id === t.id;
                                /** Purpose-specific visual badge classes. */
                                const badgeClass = t.purpose === 'birth'
                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                    : t.purpose === 'death'
                                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-100';

                                return (
                                    <motion.div
                                        key={t.id}
                                        layoutId={`ticket-${t.id}`}
                                        onClick={() => setSelectedTicket(t)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                                            isSelected
                                                ? 'border-[#d4a574] bg-[#d4a574]/5 shadow-sm ring-1 ring-[#d4a574]/30'
                                                : 'border-slate-150 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-[9px] font-mono font-black text-slate-400 tracking-wider">ONLINE SUBMISSION</span>
                                                <h4 className="font-black text-slate-800 text-sm tracking-tight">{t.ticket_number}</h4>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`px-2 py-0.5 border rounded-full text-[8px] font-black uppercase ${badgeClass}`}>
                                                    {t.purpose}
                                                </span>
                                                {t.request_status !== 'completed' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTicket(t);
                                                            setIsDeclineOpen(true);
                                                        }}
                                                        className="p-1 border border-rose-200 rounded hover:bg-rose-600 text-rose-500 hover:text-white transition-all cursor-pointer"
                                                        title="Decline Request"
                                                    >
                                                        <XMarkIcon className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="font-semibold text-slate-600 truncate max-w-[16ch]">
                                                {t.client_name}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Selected Ticket Details (Spacious and Revamped layout) */}
                <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
                    {!selectedTicket ? (
                        <div className="flex-1 bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-12 flex flex-col items-center justify-center text-slate-400 text-center shadow-sm">
                            <SparklesIcon className="w-12 h-12 text-[#d4a574] opacity-20 mb-3" />
                            <h4 className="font-black text-sm text-slate-700">Digital Request Processor</h4>
                            <p className="text-xs max-w-sm mt-1">Select an online submission ticket on the left panel to begin linking registry records.</p>
                        </div>
                    ) : (
                        <div className="flex-1 bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col h-full overflow-y-auto custom-scrollbar">
                            {/* Title Block */}
                            <div className="border-b border-slate-100 pb-3 mb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3 shrink-0">
                                <div>
                                    <span className="text-[10px] font-mono font-black text-[#c49a67] tracking-widest bg-[#d4a574]/10 px-3 py-1 rounded-lg">ONLINE TICKET DETAILS</span>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">{selectedTicket.ticket_number}</h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Submitted: {new Date(selectedTicket.created_at).toLocaleString()}</p>
                                </div>
                                <span className={`px-4 py-1 border rounded-full text-xs font-black uppercase tracking-wider text-center self-start sm:self-auto ${
                                    selectedTicket.purpose === 'birth'
                                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                                        : selectedTicket.purpose === 'death'
                                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                                            : 'bg-rose-50 text-rose-700 border-rose-100'
                                }`}>
                                    {selectedTicket.purpose} Certificate
                                </span>
                            </div>

                            {/* Info Segments */}
                            <div className="space-y-3 flex-1">
                                {selectedTicket.request_status === 'ready_for_pickup' && (
                                    <div className="bg-indigo-50 border border-indigo-150 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-550 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-md shadow-indigo-200 shrink-0">
                                                Doc
                                            </div>
                                            <div>
                                                <p className="text-xs text-indigo-900 font-black leading-none">{selectedTicket.document?.name || 'Linked Record'}</p>
                                                <p className="text-[10px] text-indigo-500 mt-1 font-bold">READY FOR PICKUP · Waiting for Lobby QR Scan Check-in</p>
                                            </div>
                                        </div>
                                        {selectedTicket.document_id && (
                                            <a href={`/api/documents/view/${selectedTicket.document_id}?raw=1`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-150 hover:bg-slate-50 text-indigo-750 rounded-xl text-[10px] font-black uppercase transition-colors shrink-0 cursor-pointer">
                                                View PDF
                                            </a>
                                        )}
                                    </div>
                                )}

                                {selectedTicket.request_status === 'completed' && (
                                    <div className="bg-emerald-50 border border-emerald-150 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-emerald-550 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-md shadow-emerald-200 shrink-0">
                                                ✓
                                            </div>
                                            <div>
                                                <p className="text-xs text-emerald-900 font-black leading-none">{selectedTicket.document?.name || 'Issued Record'}</p>
                                                <p className="text-[10px] text-emerald-500 mt-1 font-bold">COMPLETED & ISSUED · Checked Out</p>
                                            </div>
                                        </div>
                                        {selectedTicket.document_id && (
                                            <a href={`/api/documents/view/${selectedTicket.document_id}?raw=1`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-white border border-emerald-150 hover:bg-slate-50 text-emerald-750 rounded-xl text-[10px] font-black uppercase transition-colors shrink-0 cursor-pointer">
                                                View PDF
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Requester Details */}
                                <div className="space-y-2 bg-slate-50/50 p-4 border border-slate-150 rounded-2xl">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requester Information</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <span className="text-slate-400 block text-[11px] mb-0.5">Client Name</span>
                                            <span className="font-extrabold text-slate-800 text-sm">{selectedTicket.client_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[11px] mb-0.5">Phone Number</span>
                                            <span className="font-extrabold text-slate-800 text-sm">{selectedTicket.phone || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[11px] mb-0.5">Email Address</span>
                                            <span className="font-extrabold text-slate-800 text-sm truncate block" title={selectedTicket.email}>{selectedTicket.email || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-150 rounded-2xl">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry Document Fields</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                                        {selectedTicket.purpose === 'birth' && (
                                            <>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400 flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> Child's Name</span><span className="font-black text-slate-700">{[selectedTicket.details?.first_name, selectedTicket.details?.middle_name, selectedTicket.details?.last_name].filter(Boolean).join(' ')}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Date of Birth</span><span className="font-bold text-slate-700">{selectedTicket.details?.date_of_birth}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400 flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5" /> Place of Birth</span><span className="font-bold text-slate-700">{selectedTicket.details?.place_of_birth}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Father's Name</span><span className="font-bold text-slate-700">{selectedTicket.details?.father_name || '—'}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Mother's Name</span><span className="font-bold text-slate-700">{selectedTicket.details?.mother_name || '—'}</span></div>
                                            </>
                                        )}

                                        {selectedTicket.purpose === 'death' && (
                                            <>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400 flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> Deceased Name</span><span className="font-black text-slate-700">{[selectedTicket.details?.deceased_first_name, selectedTicket.details?.deceased_middle_name, selectedTicket.details?.deceased_last_name].filter(Boolean).join(' ')}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Date of Death</span><span className="font-bold text-slate-700">{selectedTicket.details?.date_of_death}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400 flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5" /> Place of Death</span><span className="font-bold text-slate-700">{selectedTicket.details?.place_of_death}</span></div>
                                            </>
                                        )}

                                        {selectedTicket.purpose === 'marriage' && (
                                            <>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400 flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-indigo-400" /> Husband</span><span className="font-black text-slate-700">{[selectedTicket.details?.husband_first_name, selectedTicket.details?.husband_middle_name, selectedTicket.details?.husband_last_name].filter(Boolean).join(' ')}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400 flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-pink-400" /> Wife</span><span className="font-black text-slate-700">{[selectedTicket.details?.wife_first_name, selectedTicket.details?.wife_middle_name, selectedTicket.details?.wife_last_name].filter(Boolean).join(' ')}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Marriage Date</span><span className="font-bold text-slate-700">{selectedTicket.details?.date_of_marriage}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400 flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5" /> Marriage Place</span><span className="font-bold text-slate-700">{selectedTicket.details?.place_of_marriage}</span></div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Row */}
                            {selectedTicket.request_status === 'completed' ? (
                                <div className="border-t border-slate-150 pt-4 mt-4 text-center text-xs text-slate-450 font-medium">
                                    This request has been verified and the document was officially issued.
                                </div>
                            ) : (
                                <div className="border-t border-slate-150 pt-3 mt-3 flex flex-col sm:flex-row gap-3 shrink-0">
                                    <button
                                        onClick={() => setIsAttachOpen(true)}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <PaperClipIcon className="w-4 h-4" />
                                        {selectedTicket.request_status === 'ready_for_pickup' ? 'Change Attached File' : 'Attach File'}
                                    </button>
                                    {selectedTicket.request_status === 'ready_for_pickup' && (
                                        <button
                                            onClick={handleDirectIssue}
                                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Verify ID & Issue
                                        </button>
                                    )}
                                    <button
                                        onClick={handleDeclineRequest}
                                        disabled={deletingId === selectedTicket.id}
                                        className="px-5 py-3 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {deletingId === selectedTicket.id ? (
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <XMarkIcon className="w-4 h-4" />
                                        )}
                                        {deletingId === selectedTicket.id ? 'Declining...' : 'Decline Request'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Attach File Modal */}
            <AttachDocumentModal
                isOpen={isAttachOpen}
                onClose={() => setIsAttachOpen(false)}
                ticket={selectedTicket}
                onAttach={handleAttachAndConfirm}
            />

            <AnimatePresence>
                {isWalkinModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => !isCreatingWalkin && setIsWalkinModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-2xl border border-slate-100 max-h-[90vh] flex flex-col"
                        >
                            <h3 className="text-xl font-black text-slate-800 mb-1">New Walk-in Request</h3>
                            <p className="text-xs text-slate-500 mb-6 shrink-0">Create a new ticket for a walk-in client.</p>

                            <div className="space-y-4 mb-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Client Name</label>
                                        <input
                                            type="text"
                                            value={walkinName}
                                            onChange={e => setWalkinName(sanitizeName(e.target.value))}
                                            placeholder="e.g. Juan Dela Cruz"
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]/50"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Purpose</label>
                                        <select
                                            value={walkinPurpose}
                                            onChange={e => setWalkinPurpose(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a574]/50 cursor-pointer"
                                        >
                                            <option value="birth">Birth Certificate</option>
                                            <option value="death">Death Certificate</option>
                                            <option value="marriage">Marriage License</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <h4 className="text-sm font-black text-slate-800 mb-3">Registry Information</h4>
                                    
                                    {walkinPurpose === 'birth' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">First Name</label>
                                                <input type="text" value={walkinDetails.first_name} onChange={e => handleWalkinDetailChange('first_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Middle Name</label>
                                                <input type="text" value={walkinDetails.middle_name} onChange={e => handleWalkinDetailChange('middle_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Last Name</label>
                                                <input type="text" value={walkinDetails.last_name} onChange={e => handleWalkinDetailChange('last_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Date of Birth</label>
                                                <input type="date" max="2099-12-31" value={walkinDetails.date_of_birth} onChange={e => handleWalkinDetailChange('date_of_birth', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Place of Birth</label>
                                                <input type="text" value={walkinDetails.place_of_birth} onChange={e => handleWalkinDetailChange('place_of_birth', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Father's Name</label>
                                                <input type="text" value={walkinDetails.father_name} onChange={e => handleWalkinDetailChange('father_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Mother's Maiden Name</label>
                                                <input type="text" value={walkinDetails.mother_name} onChange={e => handleWalkinDetailChange('mother_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                        </div>
                                    )}

                                    {walkinPurpose === 'death' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Deceased First Name</label>
                                                <input type="text" value={walkinDetails.deceased_first_name} onChange={e => handleWalkinDetailChange('deceased_first_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Deceased Middle Name</label>
                                                <input type="text" value={walkinDetails.deceased_middle_name} onChange={e => handleWalkinDetailChange('deceased_middle_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Deceased Last Name</label>
                                                <input type="text" value={walkinDetails.deceased_last_name} onChange={e => handleWalkinDetailChange('deceased_last_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Date of Death</label>
                                                <input type="date" max="2099-12-31" value={walkinDetails.date_of_death} onChange={e => handleWalkinDetailChange('date_of_death', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Place of Death</label>
                                                <input type="text" value={walkinDetails.place_of_death} onChange={e => handleWalkinDetailChange('place_of_death', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                        </div>
                                    )}

                                    {walkinPurpose === 'marriage' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase mt-2 border-b border-slate-100 pb-1">Husband</div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">First Name</label>
                                                <input type="text" value={walkinDetails.husband_first_name} onChange={e => handleWalkinDetailChange('husband_first_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Middle Name</label>
                                                <input type="text" value={walkinDetails.husband_middle_name} onChange={e => handleWalkinDetailChange('husband_middle_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Last Name</label>
                                                <input type="text" value={walkinDetails.husband_last_name} onChange={e => handleWalkinDetailChange('husband_last_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>

                                            <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase mt-4 border-b border-slate-100 pb-1">Wife</div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">First Name</label>
                                                <input type="text" value={walkinDetails.wife_first_name} onChange={e => handleWalkinDetailChange('wife_first_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Middle Name</label>
                                                <input type="text" value={walkinDetails.wife_middle_name} onChange={e => handleWalkinDetailChange('wife_middle_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Last Name</label>
                                                <input type="text" value={walkinDetails.wife_last_name} onChange={e => handleWalkinDetailChange('wife_last_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Date of Marriage</label>
                                                <input type="date" max="2099-12-31" value={walkinDetails.date_of_marriage} onChange={e => handleWalkinDetailChange('date_of_marriage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Place of Marriage</label>
                                                <input type="text" value={walkinDetails.place_of_marriage} onChange={e => handleWalkinDetailChange('place_of_marriage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 shrink-0 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setIsWalkinModalOpen(false)}
                                    disabled={isCreatingWalkin}
                                    className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateWalkinTicket}
                                    disabled={isCreatingWalkin}
                                    className="px-5 py-2.5 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isCreatingWalkin ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : 'Create Ticket'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isDeclineOpen && selectedTicket && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-900 leading-normal">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100"
                        >
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-4">
                                <h3 className="font-extrabold text-rose-600 text-lg flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-5 h-5" /> Decline Request
                                </h3>
                                <button onClick={() => setIsDeclineOpen(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Standard Decline Reason</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-xs font-semibold focus:border-rose-400 focus:ring focus:ring-rose-200 focus:ring-opacity-50 transition-all cursor-pointer"
                                        value={declinePreset}
                                        onChange={(e) => {
                                            /** Selected preset decline reason from the form control. */
                                            const val = e.target.value;
                                            setDeclinePreset(val);
                                            if (val && val !== 'custom') {
                                                setDeclineReason(val);
                                            }
                                        }}
                                        disabled={deletingId === selectedTicket.id}
                                    >
                                        <option value="">-- Select Common Reason --</option>
                                        <option value="Duplicate request already exists in queue">Duplicate request already exists in queue</option>
                                        <option value="Incomplete or invalid details provided">Incomplete or invalid details provided</option>
                                        <option value="No matching registry document record found">No matching registry document record found</option>
                                        <option value="Incorrect certificate type requested">Incorrect certificate type requested</option>
                                        <option value="Physical ID / authorization check failed">Physical ID / authorization check failed</option>
                                        <option value="custom">Other / Custom reason...</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Additional Remarks / Custom Details *</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-sm focus:border-rose-400 focus:ring focus:ring-rose-200 focus:ring-opacity-50 transition-all"
                                        rows="3"
                                        placeholder="Add specific notes or custom message for the requester..."
                                        value={declineReason}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        disabled={deletingId === selectedTicket.id}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                         onClick={() => {
                                             setIsDeclineOpen(false);
                                             setDeclineReason('');
                                             setDeclinePreset('');
                                         }}
                                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-650 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors cursor-pointer"
                                        disabled={deletingId === selectedTicket.id}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                         onClick={confirmDeclineRequest}
                                         disabled={deletingId === selectedTicket.id || !declineReason.trim()}
                                        className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 shadow-md shadow-rose-200 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                         {deletingId === selectedTicket.id ? 'Declining...' : 'Decline Request'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isScannerOpen && (
                createPortal(
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            className="bg-white rounded-3xl shadow-2xl shadow-slate-950/30 w-full max-w-md relative overflow-hidden border border-white/80"
                        >
                            <div className="bg-[#0f172a] px-6 py-5 text-white">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4a574]">CiviCORE Check-in</p>
                                        <h3 className="text-xl font-black tracking-tight mt-1">Scan Ticket QR Code</h3>
                                        <p className="text-xs text-slate-400 mt-1">Point the camera at the citizen's queue ticket.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsScannerOpen(false)}
                                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                        aria-label="Close scanner"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 bg-slate-50">
                                {scannerError ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
                                        <ExclamationTriangleIcon className="w-8 h-8 mx-auto text-rose-500 mb-2" />
                                        <p className="text-xs font-bold text-rose-700">{scannerError}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div id="reader" className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white" />
                                        <p className="text-[11px] text-slate-500 text-center mt-4">A successful scan checks the ticket into the waiting queue.</p>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )
            )}

            <>
                {/* Scanned Ticket Popup Modal */}
                {isPopupOpen && scannedData && (
                    createPortal(
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                                className="bg-white rounded-3xl shadow-2xl shadow-slate-950/30 w-full max-w-lg relative overflow-hidden border border-white/80"
                            >
                                <div className="bg-[#0f172a] px-6 py-5 text-white">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-2xl bg-[#d4a574]/15 border border-[#d4a574]/30 flex items-center justify-center">
                                                <CheckCircleIcon className="w-6 h-6 text-[#d4a574]" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4a574]">Verified Ticket</p>
                                                <h3 className="text-xl font-black tracking-tight">Scanned Ticket Details</h3>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsPopupOpen(false)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                            aria-label="Close ticket details"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 rounded-2xl bg-[#d4a574]/10 border border-[#d4a574]/25 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#9a7449]">Ticket Number</p>
                                            <p className="text-2xl font-black text-slate-900 mt-1">{scannedData.ticket_number}</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client Name</p>
                                            <p className="text-sm font-black text-slate-800 mt-1 break-words">{scannedData.client_name || scannedData.name || '—'}</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Purpose</p>
                                            <p className="text-sm font-black text-slate-800 mt-1 capitalize">{scannedData.purpose || '—'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                                        <span className="text-xs font-bold text-emerald-800">Queue status</span>
                                        <span className="px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                                            {scannedData.queue_status?.replace(/_/g, ' ') || scannedData.status || 'Verified'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 px-6 py-5 bg-slate-50 border-t border-slate-100">
                                    <button
                                        onClick={() => {
                                            setSelectedTicket(scannedData);
                                            setIsPopupOpen(false);
                                            setIsAttachOpen(true);
                                        }}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                        {scannedData.document_id ? 'Change Document' : 'Attach Document'}
                                    </button>
                                    {scannedData.document_id && (
                                        <button
                                            onClick={() => handlePrintTicketDocument(scannedData)}
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
                                        >
                                            <PrinterIcon className="w-4 h-4" />
                                            Print Document
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsPopupOpen(false)}
                                        className="sm:flex-none px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs font-black uppercase tracking-widest transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </motion.div>
                        </div>,
                        document.body
                    )
                )}
            </>

            {/* Verify ID & Checkout Modal */}
            <AnimatePresence>
                {isVerifyOpen && selectedTicket && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-900 leading-normal">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100"
                        >
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-1.5">
                                    <IdentificationIcon className="w-6 h-6 text-[#d4a574]" /> Final Verification
                                </h3>
                                <button onClick={() => setIsVerifyOpen(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Please verify the citizen's physical identification card (e.g. National ID, Driver's License) matches the requester profile before final checkout.
                                </p>

                                <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl text-xs space-y-2">
                                    <div className="flex justify-between"><span className="text-slate-400">Client Name:</span><span className="font-extrabold text-slate-800">{selectedTicket.client_name}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Attached Record:</span><span className="font-bold text-slate-700 truncate max-w-[18ch]">{selectedTicket.document?.name}</span></div>
                                </div>

                                <div className="border border-amber-100 bg-amber-50/40 p-3 rounded-xl flex gap-2 items-start text-[10px] text-amber-700">
                                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <span>Proceeding will complete this ticket request, mark it as completed, and remove it from active queue columns.</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsVerifyOpen(false)}
                                    className="flex-1 py-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-255 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleFinalIssue}
                                    disabled={isIssuing}
                                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isIssuing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : 'Confirm & Issue'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
