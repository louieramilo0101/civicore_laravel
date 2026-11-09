import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from "html5-qrcode";
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
    ChevronDownIcon,
    UserPlusIcon,
    QrCodeIcon,
    ArrowLeftIcon,
    CameraIcon,
    PhotoIcon,
    ShieldCheckIcon,
    EyeIcon,
    IdentificationIcon,
    ArrowUpIcon,
    ArrowDownIcon
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
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [searchQuery, setSearchQuery] = useState('');
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [purposeFilter, setPurposeFilter] = useState('all');
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [statusFilter, setStatusFilter] = useState('waiting');
    /** @type {['asc'|'desc', import('react').Dispatch<import('react').SetStateAction<'asc'|'desc'>>]} */
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = FIFO (oldest first), 'desc' = newest first
    const [isLoading, setIsLoading] = useState(true);
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
        } catch (e) { }
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
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isDecodingPhoto, setIsDecodingPhoto] = useState(false);
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isCameraLive, setIsCameraLive] = useState(false);
    /** @type {[string, import('react').Dispatch<import('react').SetStateAction<string>>]} */
    const [manualTicketInput, setManualTicketInput] = useState('');
    const nativeCameraInputRef = React.useRef(null);
    const galleryInputRef = React.useRef(null);
    const html5QrCodeRef = React.useRef(null);

    /** Stores the identifier of the ticket currently being declined. */
    /** @type {[number|string|null, import('react').Dispatch<import('react').SetStateAction<number|string|null>>]} */
    const [deletingId, setDeletingId] = useState(null);

    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isVerifyOpen, setIsVerifyOpen] = useState(false);
    /** State for confirming issue after printing */
    const [isPostPrintConfirmOpen, setIsPostPrintConfirmOpen] = useState(false);
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isIdPreviewOpen, setIsIdPreviewOpen] = useState(false);
    const [isIdImageLoading, setIsIdImageLoading] = useState(true);
    /** @type {[boolean, import('react').Dispatch<import('react').SetStateAction<boolean>>]} */
    const [isIssuing, setIsIssuing] = useState(false);
    /** Holds ticket data for immediate post-attachment print confirmation prompt */
    const [attachedPrintPromptTicket, setAttachedPrintPromptTicket] = useState(null);

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
    const [walkinAuthFile, setWalkinAuthFile] = useState(null);
    const [walkinErrors, setWalkinErrors] = useState({});
    const [walkinTouched, setWalkinTouched] = useState(false);
    const walkinAuthFileInputRef = React.useRef(null);
    /** @type {[TicketDetails, import('react').Dispatch<import('react').SetStateAction<TicketDetails>>]} */
    const [walkinDetails, setWalkinDetails] = useState({
        first_name: '', middle_name: '', last_name: '', date_of_birth: '', place_of_birth: '', father_name: '', mother_name: '',
        deceased_first_name: '', deceased_middle_name: '', deceased_last_name: '', date_of_death: '', place_of_death: '',
        husband_first_name: '', husband_middle_name: '', husband_last_name: '',
        wife_first_name: '', wife_middle_name: '', wife_last_name: '', date_of_marriage: '', place_of_marriage: ''
    });

    /**
     * Stop the live camera stream if running.
     */
    const stopLiveCamera = async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                await html5QrCodeRef.current.clear();
            } catch (err) {
                console.warn('Error stopping QR scanner:', err);
            } finally {
                html5QrCodeRef.current = null;
                setIsCameraLive(false);
            }
        }
    };

    /**
     * Start real-time continuous camera viewfinder for live QR scanning.
     */
    const startLiveCamera = async () => {
        try {
            setScannerError('');
            await stopLiveCamera();

            const scannerHost = document.getElementById('qr-live-camera-viewport');
            if (!scannerHost) return;

            const qrCode = new Html5Qrcode('qr-live-camera-viewport');
            html5QrCodeRef.current = qrCode;

            const config = {
                fps: 15,
                qrbox: { width: 220, height: 220 },
                aspectRatio: 1.0,
            };

            await qrCode.start(
                { facingMode: 'environment' },
                config,
                async (decodedText) => {
                    if (decodedText) {
                        await stopLiveCamera();
                        handleCheckInToken(decodedText);
                    }
                },
                () => {
                    // Ignore per-frame decode misses
                }
            );

            setIsCameraLive(true);
        } catch (err) {
            console.warn('Live camera start failed:', err);
            setIsCameraLive(false);
            setScannerError('Could not start live camera feed. You can still snap/upload a photo or enter the ticket number.');
        }
    };

    // Manage live camera lifecycle when modal opens/closes
    useEffect(() => {
        if (isScannerOpen) {
            // slight timeout to allow portal and element mounting
            const timer = setTimeout(() => {
                startLiveCamera();
            }, 100);
            return () => {
                clearTimeout(timer);
                stopLiveCamera();
            };
        } else {
            stopLiveCamera();
        }
    }, [isScannerOpen]);

    /**
     * Handles ticket check-in for a scanned token, URL, or ticket number.
     * @param {string} rawInput Scanned QR token or staff-typed ticket number.
     * @returns {Promise<void>}
     */
    const handleCheckInToken = async (rawInput) => {
        if (!rawInput) return;
        try {
            setIsLoading(true);
            setScannerError('');
            await stopLiveCamera();

            let tokenOrNum = rawInput.trim();
            if (tokenOrNum.includes('/')) {
                tokenOrNum = tokenOrNum.split('/').filter(Boolean).pop();
            }
            if (/^\d{1,4}$/.test(tokenOrNum)) {
                const year = new Date().getFullYear();
                tokenOrNum = `T-${year}-${tokenOrNum.padStart(4, '0')}`;
            }

            const response = await axios.post('/api/v1/tickets/scan', {
                qr_code_token: tokenOrNum,
            });

            const ticketRecord = response.data.ticket || response.data;
            setIsScannerOpen(false);
            setManualTicketInput('');
            setScannedData(ticketRecord);
            setSelectedTicket(ticketRecord);
            setIsPopupOpen(true);
            fetchPendingTickets(false);
        } catch (error) {
            console.error('Ticket scan failed:', error);
            setScannerError(error.response?.data?.error || 'Invalid or unrecognized ticket / QR code.');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Decodes a QR code client-side from an image captured by native camera or file upload.
     * @param {React.ChangeEvent<HTMLInputElement>} e
     */
    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsDecodingPhoto(true);
        setScannerError('');

        try {
            let decodedText = null;

            // 1. Try BarcodeDetector if natively supported by browser
            if ('BarcodeDetector' in window) {
                try {
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    await new Promise((res, rej) => {
                        img.onload = res;
                        img.onerror = rej;
                    });
                    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                    const barcodes = await detector.detect(img);
                    if (barcodes.length > 0 && barcodes[0].rawValue) {
                        decodedText = barcodes[0].rawValue;
                    }
                } catch (_) { }
            }

            // 2. Decode using Html5Qrcode client-side scanner engine (offline)
            if (!decodedText) {
                const html5QrCode = new Html5Qrcode('qr-hidden-decoder-host');
                try {
                    decodedText = await html5QrCode.scanFile(file, false);
                } finally {
                    html5QrCode.clear();
                }
            }

            if (decodedText) {
                await handleCheckInToken(decodedText);
            } else {
                setScannerError('Could not detect a clear QR code in this photo. Please retake the photo with good lighting or enter the ticket number below.');
            }
        } catch (err) {
            console.warn('QR decode failed:', err);
            setScannerError('Could not detect a clear QR code in this photo. Please ensure the QR code is centered and in focus, or type the ticket number below.');
        } finally {
            setIsDecodingPhoto(false);
            if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        }
    };

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
        if (walkinErrors[field]) {
            setWalkinErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    /**
     * Resets all walk-in modal fields and error states.
     */
    const resetWalkinForm = () => {
        setWalkinName('');
        setWalkinAuthFile(null);
        setWalkinErrors({});
        setWalkinTouched(false);
        if (walkinAuthFileInputRef.current) walkinAuthFileInputRef.current.value = '';
        setWalkinDetails({
            first_name: '', middle_name: '', last_name: '', date_of_birth: '', place_of_birth: '', father_name: '', mother_name: '',
            deceased_first_name: '', deceased_middle_name: '', deceased_last_name: '', date_of_death: '', place_of_death: '',
            husband_first_name: '', husband_middle_name: '', husband_last_name: '',
            wife_first_name: '', wife_middle_name: '', wife_last_name: '', date_of_marriage: '', place_of_marriage: ''
        });
    };

    /**
     * Closes the walk-in modal safely and clears form fields.
     */
    const closeWalkinModal = () => {
        if (isCreatingWalkin) return;
        setIsWalkinModalOpen(false);
        resetWalkinForm();
    };

    /**
     * Validates required client and registry fields for the walk-in ticket.
     * @returns {Record<string, string>} Validation errors keyed by field name.
     */
    const validateWalkinForm = () => {
        const errors = {};
        if (!walkinName.trim()) {
            errors.client_name = 'Client name is required.';
        }

        if (walkinPurpose === 'birth') {
            if (!walkinDetails.first_name?.trim()) errors.first_name = 'First name is required.';
            if (!walkinDetails.last_name?.trim()) errors.last_name = 'Last name is required.';
            if (!walkinDetails.date_of_birth?.trim()) errors.date_of_birth = 'Date of birth is required.';
        } else if (walkinPurpose === 'death') {
            if (!walkinDetails.deceased_first_name?.trim()) errors.deceased_first_name = 'Deceased first name is required.';
            if (!walkinDetails.deceased_last_name?.trim()) errors.deceased_last_name = 'Deceased last name is required.';
            if (!walkinDetails.date_of_death?.trim()) errors.date_of_death = 'Date of death is required.';
        } else if (walkinPurpose === 'marriage') {
            if (!walkinDetails.husband_first_name?.trim()) errors.husband_first_name = 'Husband first name is required.';
            if (!walkinDetails.husband_last_name?.trim()) errors.husband_last_name = 'Husband last name is required.';
            if (!walkinDetails.wife_first_name?.trim()) errors.wife_first_name = 'Wife first name is required.';
            if (!walkinDetails.wife_last_name?.trim()) errors.wife_last_name = 'Wife last name is required.';
            if (!walkinDetails.date_of_marriage?.trim()) errors.date_of_marriage = 'Date of marriage is required.';
        }

        if (walkinAuthFile) {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!validTypes.includes(walkinAuthFile.type)) {
                errors.auth_file = 'Authorization document must be a PDF, PNG, or JPG file.';
            } else if (walkinAuthFile.size > 10 * 1024 * 1024) {
                errors.auth_file = 'Authorization document file size cannot exceed 10MB.';
            }
        }

        return errors;
    };

    /**
     * Handles file selection for walk-in authorization document / ID scan.
     * @param {React.ChangeEvent<HTMLInputElement>} e
     */
    const handleWalkinFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            showAlert({ title: 'Invalid File Format', message: 'Authorization document must be a PDF, PNG, or JPG file.', type: 'warning' });
            if (walkinAuthFileInputRef.current) walkinAuthFileInputRef.current.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showAlert({ title: 'File Too Large', message: 'Authorization document file size cannot exceed 10MB.', type: 'warning' });
            if (walkinAuthFileInputRef.current) walkinAuthFileInputRef.current.value = '';
            return;
        }

        setWalkinAuthFile(file);
        if (walkinErrors.auth_file) {
            setWalkinErrors(prev => {
                const next = { ...prev };
                delete next.auth_file;
                return next;
            });
        }
    };

    /**
     * Formats bytes into a human-readable size string.
     * @param {number} bytes
     * @returns {string}
     */
    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    /**
     * Loads cached inbox data immediately, then refreshes it from the API when
     * the selected purpose or request-status filter changes.
     */
    useEffect(() => {
        // Clear stale cached data for the newly-selected filter so the
        // previous tab's records never flash into view before the fresh
        // API response arrives (eliminates dropdown flicker).
        const cacheKey = `civicore_pending_tickets_${purposeFilter}_${statusFilter}_${sortOrder}`;
        try { sessionStorage.removeItem(cacheKey); } catch { /* ignore */ }
        try { sessionStorage.removeItem('civicore_pending_stats'); } catch { /* ignore */ }

        // Don't zero stats — let the API response overwrite them.
        // Zeroing causes a brief flash of "0" in the Waiting badge
        // before the fetch completes, which looks like flickering.
        setTickets([]);

        fetchPendingTickets(true);
    }, [purposeFilter, statusFilter, sortOrder]);

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
            /** Fetch the filtered queue and its aggregate dashboard statistics together. */
            const [ticketsRes, statsRes] = await Promise.all([
                axios.get('/api/v1/tickets', {
                    params: {
                        request_status: statusFilter === 'expired' ? 'cancelled' : statusFilter,
                        purpose: purposeFilter,
                        sort_order: sortOrder,
                        show_expired: statusFilter === 'expired' ? true : false,
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
            if (prevCount > 0 && newTickets.length > prevCount && !showLoading) {
                playNotificationSound();
            }
            prevCountRef.current = newTickets.length;

            setTickets(newTickets);
            setStats(statsRes.data);

            sessionStorage.setItem(`civicore_pending_tickets_${purposeFilter}_${statusFilter}_${sortOrder}`, JSON.stringify(ticketsRes.data));
            sessionStorage.setItem('civicore_pending_stats', JSON.stringify(statsRes.data));

            if (ticketsRes.data.length > 0) {
                if (selectedTicket) {
                    /** Keep the selected record synchronized with refreshed server data without deselecting */
                    const matched = ticketsRes.data.find(t => t.id === selectedTicket.id);
                    setSelectedTicket(matched || selectedTicket);
                }
                // Do NOT auto-select first ticket on refresh — user must explicitly click to select
            } else {
                if (!isVerifyOpen && !isIdPreviewOpen) {
                    setSelectedTicket(null);
                }
            }
        } catch (err) {
            console.error(err);
            if (showLoading) {
                showAlert({ title: 'Error', message: 'Could not retrieve tickets queue.', type: 'danger' });
            }
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
                /** Apply the server-confirmed workflow state to the local selection immediately. */
                const updatedTicket = {
                    ...selectedTicket,
                    document_id: docId,
                    request_status: 'ready_for_pickup'
                };
                setSelectedTicket(updatedTicket);
                setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
                setScannedData(prev => prev ? { ...prev, ...updatedTicket } : prev);
                setIsAttachOpen(false);
                // Removed auto-open print prompt; "Verify ID & Issue" button appears naturally
                showAlert({
                    title: 'File Attached!',
                    message: `Ticket ${selectedTicket.ticket_number} was linked and marked ready for release.`,
                    type: 'success'
                });
                fetchPendingTickets(false);
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
                setMobileView('list');
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
     * Prints the document first for physical verification, then opens confirmation.
     */
    const handlePrintAndPromptConfirm = () => {
        if (!selectedTicket) return;
        setIsVerifyOpen(false);
        if (selectedTicket.document_id) {
            handlePrintTicketDocument(selectedTicket);
        }
        setIsPostPrintConfirmOpen(true);
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
                setIsPostPrintConfirmOpen(false);
                setMobileView('list');
                setSelectedTicket(null);
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
        const errors = validateWalkinForm();
        if (Object.keys(errors).length > 0) {
            setWalkinErrors(errors);
            setWalkinTouched(true);
            const firstError = Object.values(errors)[0];
            showAlert({ title: 'Required Fields Missing', message: firstError, type: 'warning' });
            return;
        }

        setIsCreatingWalkin(true);
        try {
            const formData = new FormData();
            formData.append('client_name', walkinName.trim());
            formData.append('purpose', walkinPurpose);
            formData.append('source', 'walk-in');
            if (walkinAuthFile) {
                formData.append('consent_form', walkinAuthFile);
            }
            Object.entries(walkinDetails).forEach(([k, v]) => {
                formData.append(`details[${k}]`, v || '');
            });

            /** Server response containing the newly created walk-in ticket. */
            const res = await axios.post('/api/v1/tickets', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success) {
                showAlert({ title: 'Success', message: `Walk-in ticket ${res.data.ticket.ticket_number} created.`, type: 'success' });
                closeWalkinModal();
                if (res.data.ticket) {
                    setSelectedTicket(res.data.ticket);
                    setMobileView('detail');
                }
                fetchPendingTickets(false);
                if (refreshCounter) refreshCounter();
            }
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to create walk-in ticket.';
            showAlert({ title: 'Error', message: msg, type: 'danger' });
        } finally {
            setIsCreatingWalkin(false);
        }
    };

    /** Tickets matching the free-text search currently entered by staff, with active sort order. */
    const filteredTickets = useMemo(() => {
        const query = (searchQuery || '').toLowerCase().trim();

        const filtered = !query ? tickets : tickets.filter(t => {
            if (t._search) return t._search.includes(query);

            const detailsStr = t.details ? (typeof t.details === 'object' ? Object.values(t.details).join(' ') : String(t.details)) : '';
            const searchIndex = `${t.ticket_number || ''} ${t.client_name || ''} ${t.purpose || ''} ${t.contact_number || ''} ${t.email || ''} ${t.document?.name || ''} ${t.document?.personName || ''} ${detailsStr}`.toLowerCase();
            return searchIndex.includes(query);
        });

        return [...filtered].sort((a, b) => {
            if (a.queue_status === 'serving' && b.queue_status !== 'serving') return -1;
            if (b.queue_status === 'serving' && a.queue_status !== 'serving') return 1;

            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [tickets, searchQuery, sortOrder]);

    // ── Sidebar queue pagination ─────────────────────────────────────────────
    // Only the visible page renders in the DOM so a 100-ticket queue costs the
    // browser ~15 ticket cards instead of 100.
    const [queuePage, setQueuePage] = useState(1);
    const queuePageSize = 15;
    useEffect(() => { setQueuePage(1); }, [searchQuery, statusFilter, purposeFilter]);

    const paginatedTickets = useMemo(() => {
        const start = (queuePage - 1) * queuePageSize;
        return filteredTickets.slice(start, start + queuePageSize);
    }, [filteredTickets, queuePage]);

    const totalQueuePages = Math.max(1, Math.ceil(filteredTickets.length / queuePageSize));

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
                <div className={`lg:col-span-1 bg-white/95 border border-slate-200/80 rounded-3xl p-5 shadow-sm flex-col h-full overflow-hidden dark:bg-slate-900/90 dark:border-slate-800 ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}`}>
                    {/* Header Title Row */}
                    <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-150 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#d4a574]/15 border border-[#d4a574]/30 flex items-center justify-center shrink-0">
                                <ClockIcon className="w-5 h-5 text-[#b88752]" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-black text-slate-800 tracking-tight dark:text-slate-100">Tickets Queue</h3>
                                    <span className="bg-[#d4a574]/20 text-[#a37947] px-2.5 py-0.5 rounded-full text-xs font-black leading-none">
                                        {filteredTickets.length}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    {statusFilter === 'completed' ? 'Completed & officially released tickets' : 'Active requests waiting in queue'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => fetchPendingTickets(false)}
                            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all shrink-0 active:scale-95 cursor-pointer shadow-sm dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                            title="Reload tickets queue"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Full-width Action Buttons Bar */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                            onClick={() => setIsWalkinModalOpen(true)}
                            className="py-2.5 px-3 bg-[#0f172a] text-[#d4a574] hover:bg-slate-800 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <UserPlusIcon className="w-4 h-4 text-[#d4a574]" />
                            <span>Walk In</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsScannerOpen(true)}
                            className="py-2.5 px-3 bg-[#0f172a] text-[#d4a574] hover:bg-slate-800 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <QrCodeIcon className="w-4 h-4 text-[#d4a574]" />
                            <span>Scan QR</span>
                        </button>
                    </div>

                    <div className="space-y-2 mb-4">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by ticket #, client, or document..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20"
                            />
                        </div>

                        {/* Filters Row: Waiting vs Completed, and Purpose */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-7 py-2 text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 cursor-pointer truncate"
                                >
                                    <option value="waiting">Waiting ({stats.waiting || tickets.length})</option>
                                    <option value="completed">Completed ({stats.completed_today || 0})</option>
                                    <option value="expired">Expired</option>
                                </select>
                                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>

                            <div className="relative">
                                <select
                                    value={purposeFilter}
                                    onChange={e => setPurposeFilter(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-7 py-2 text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 cursor-pointer truncate"
                                >
                                    <option value="all">All Purposes</option>
                                    <option value="birth">Birth</option>
                                    <option value="death">Death</option>
                                    <option value="marriage">Marriage</option>
                                </select>
                                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Sort Order Control: Clean Arrow Icon (Ascending vs Descending) */}
                        <div className="flex items-center justify-between gap-2 px-1 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Queue Order:</span>
                            <button
                                type="button"
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#d4a574]/60 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#b88752] transition-all cursor-pointer shadow-xs active:scale-95"
                                title={sortOrder === 'asc' ? 'Queue Order: Ascending / Oldest First (Click for Descending)' : 'Queue Order: Descending / Newest First (Click for Ascending)'}
                                aria-label={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                            >
                                {sortOrder === 'asc' ? (
                                    <ArrowUpIcon className="w-4 h-4 text-[#b88752]" />
                                ) : (
                                    <ArrowDownIcon className="w-4 h-4 text-[#b88752]" />
                                )}
                            </button>
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
                                <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-20 text-slate-600" />
                                <p className="text-xs font-bold">No requests in queue</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    {statusFilter === 'completed' ? 'No completed tickets found.' : 'Requests waiting in queue will appear here.'}
                                </p>
                            </div>
                        ) : (
                            paginatedTickets.map(t => {
                                /** Whether this row is the currently selected request. */
                                const isSelected = selectedTicket?.id === t.id;
                                /** Purpose-specific visual badge classes. Consistent: Birth=Orange, Death=Red, Marriage=Blue. */
                                const badgeClass = t.purpose === 'birth'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50'
                                    : t.purpose === 'death'
                                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';

                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => {
                                            setSelectedTicket(t);
                                            setMobileView('detail');
                                        }}
                                        className={`p-4 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 ${isSelected
                                            ? 'border-[#d4a574] bg-[#d4a574]/5 dark:bg-[#d4a574]/10 shadow-sm ring-1 ring-[#d4a574]/30'
                                            : 'border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <span className="text-[9px] font-mono font-black text-slate-400 dark:text-slate-500 tracking-wider uppercase block">
                                                    {t.source === 'walk_in' ? 'WALK-IN TICKET' : 'ONLINE SUBMISSION'}
                                                </span>
                                                <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight truncate">{t.ticket_number}</h4>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {t.request_status === 'ready_for_pickup' ? (
                                                    <span className="px-2 py-0.5 border rounded-full text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
                                                        Ready
                                                    </span>
                                                ) : t.request_status === 'completed' ? (
                                                    <span className="px-2 py-0.5 border rounded-full text-[8px] font-black uppercase bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50">
                                                        Issued
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 border rounded-full text-[8px] font-black uppercase bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
                                                        In Queue
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 border rounded-full text-[8px] font-black uppercase ${badgeClass} dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200`}>
                                                    {t.purpose}
                                                </span>
                                                {t.request_status !== 'completed' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTicket(t);
                                                            setMobileView('detail');
                                                            setIsDeclineOpen(true);
                                                        }}
                                                        className="p-1.5 text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-600 hover:text-white dark:bg-rose-950/50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-800 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                                                        title="Decline Request"
                                                    >
                                                        <XMarkIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[16ch]">
                                                {t.client_name}
                                            </div>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                                {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Queue List Pagination Footer */}
                    {totalQueuePages > 1 && (
                        <div className="pt-3 mt-2 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
                            <span>Page <strong className="text-slate-700 dark:text-slate-200">{queuePage}</strong> of {totalQueuePages}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setQueuePage(p => Math.max(1, p - 1))}
                                    disabled={queuePage === 1}
                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold disabled:opacity-40 cursor-pointer"
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQueuePage(p => Math.min(totalQueuePages, p + 1))}
                                    disabled={queuePage === totalQueuePages}
                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold disabled:opacity-40 cursor-pointer"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Selected Ticket Details (Spacious and Revamped layout) */}
                <div className={`lg:col-span-2 flex-col h-full overflow-hidden ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
                    {!selectedTicket ? (
                        <div className="flex-1 bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-center shadow-sm">
                            <SparklesIcon className="w-12 h-12 text-[#d4a574] opacity-20 mb-3" />
                            <h4 className="font-black text-sm text-slate-700 dark:text-slate-300">Digital Request Processor</h4>
                            <p className="text-xs max-w-sm mt-1">Select an online submission ticket on the left panel to begin linking registry records.</p>
                        </div>
                    ) : (
                        <div className="flex-1 bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col h-full overflow-y-auto custom-scrollbar">
                            {/* Mobile Back to List Navigation Bar */}
                            <div className="lg:hidden flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setMobileView('list')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer shadow-sm"
                                >
                                    <ArrowLeftIcon className="w-4 h-4" />
                                    <span>Back to Requests</span>
                                </button>
                                <span className="text-[11px] font-mono font-black text-[#c49a67] bg-[#d4a574]/10 px-2.5 py-1 rounded-lg">
                                    {selectedTicket.ticket_number}
                                </span>
                            </div>
                            {/* Title Block */}
                            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3 shrink-0">
                                <div>
                                    <span className="text-[10px] font-mono font-black text-[#c49a67] tracking-widest bg-[#d4a574]/10 px-3 py-1 rounded-lg">ONLINE TICKET DETAILS</span>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">{selectedTicket.ticket_number}</h2>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Submitted: {new Date(selectedTicket.created_at).toLocaleString()}</p>
                                </div>
                                <span className={`px-4 py-1 border rounded-full text-xs font-black uppercase tracking-wider text-center self-start sm:self-auto ${selectedTicket.purpose === 'birth'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50'
                                    : selectedTicket.purpose === 'death'
                                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
                                    }`}>
                                    {selectedTicket.purpose} Certificate
                                </span>
                            </div>

                            {/* Info Segments */}
                            <div className="space-y-3 flex-1">
                                {selectedTicket.request_status === 'ready_for_pickup' && (
                                    <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-800/50 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-550 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-md shadow-indigo-200 shrink-0">
                                                Doc
                                            </div>
                                            <div>
                                                <p className="text-xs text-indigo-900 dark:text-indigo-200 font-black leading-none">{selectedTicket.document?.name || 'Linked Record'}</p>
                                                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1 font-bold">READY FOR PICKUP · Waiting for Lobby QR Scan Check-in</p>
                                            </div>
                                        </div>
                                        {selectedTicket.document_id && (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePrintTicketDocument(selectedTicket)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-[#d4a574] rounded-xl text-[10px] font-black uppercase transition-colors shrink-0 cursor-pointer shadow-xs active:scale-95"
                                                    title="Print attached document"
                                                >
                                                    <PrinterIcon className="w-3.5 h-3.5 text-[#d4a574]" />
                                                    <span>Print</span>
                                                </button>
                                                <a href={`/api/documents/view/${selectedTicket.document_id}?raw=1`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-150 dark:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-750 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase transition-colors shrink-0 cursor-pointer">
                                                    View PDF
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedTicket.request_status === 'completed' && (
                                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-150 dark:border-emerald-800/50 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-emerald-550 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-md shadow-emerald-200 shrink-0">
                                                ✓
                                            </div>
                                            <div>
                                                <p className="text-xs text-emerald-900 dark:text-emerald-200 font-black leading-none">{selectedTicket.document?.name || 'Issued Record'}</p>
                                                <p className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-1 font-bold">COMPLETED & ISSUED · Checked Out</p>
                                            </div>
                                        </div>
                                        {selectedTicket.document_id && (
                                            <a href={`/api/documents/view/${selectedTicket.document_id}?raw=1`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-150 dark:border-emerald-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-emerald-750 dark:text-emerald-300 rounded-xl text-[10px] font-black uppercase transition-colors shrink-0 cursor-pointer">
                                                View PDF
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Requester Details */}
                                <div className="space-y-2 bg-slate-50/50 dark:bg-slate-800/50 p-4 border border-slate-150 dark:border-slate-700 rounded-2xl">
                                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Requester Information</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5">Client Name</span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{selectedTicket.client_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5">Phone Number</span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{selectedTicket.phone || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-0.5">Email Address</span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm truncate block" title={selectedTicket.email}>{selectedTicket.email || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Authorization & Consent Verification */}
                                <div className="space-y-2.5 bg-slate-50/50 dark:bg-slate-800/50 p-4 border border-slate-150 dark:border-slate-700 rounded-2xl">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <ShieldCheckIcon className="w-3.5 h-3.5 text-indigo-500" /> Authorization & Consent Document
                                        </h4>
                                        {selectedTicket.consent_form_path ? (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                Document Attached
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                Self / Direct Parent / Child
                                            </span>
                                        )}
                                    </div>

                                    {selectedTicket.consent_form_path ? (
                                        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-150 dark:border-emerald-800/50 shadow-xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                                    <PaperClipIcon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                                                        Authorization Letter / Valid ID Scan
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                                        {selectedTicket.consent_form_path.split('/').pop()}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsIdImageLoading(true);
                                                    setIsIdPreviewOpen(true);
                                                }}
                                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
                                                title="Inspect Citizen ID or Authorization Letter"
                                            >
                                                <EyeIcon className="w-3.5 h-3.5" />
                                                <span>View / Verify</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                            No authorization letter attached. Requester declared direct relationship (Parent, Child, or Document Owner).
                                        </p>
                                    )}
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/50 p-4 border border-slate-150 dark:border-slate-700 rounded-2xl">
                                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Registry Document Fields</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                                        {selectedTicket.purpose === 'birth' && (
                                            <>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> Child's Name</span><span className="font-black text-slate-700 dark:text-slate-200">{[selectedTicket.details?.first_name, selectedTicket.details?.middle_name, selectedTicket.details?.last_name].filter(Boolean).join(' ')}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Date of Birth</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedTicket.details?.date_of_birth}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5" /> Place of Birth</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedTicket.details?.place_of_birth}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500">Father's Name</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedTicket.details?.father_name || '—'}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500">Mother's Name</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedTicket.details?.mother_name || '—'}</span></div>
                                            </>
                                        )}

                                        {selectedTicket.purpose === 'death' && (
                                            <>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> Deceased Name</span><span className="font-black text-slate-700 dark:text-slate-200">{[selectedTicket.details?.deceased_first_name, selectedTicket.details?.deceased_middle_name, selectedTicket.details?.deceased_last_name].filter(Boolean).join(' ')}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Date of Death</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedTicket.details?.date_of_death}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5" /> Place of Death</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedTicket.details?.place_of_death}</span></div>
                                            </>
                                        )}

                                        {selectedTicket.purpose === 'marriage' && (
                                            <>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-indigo-400" /> Husband</span><span className="font-black text-slate-700 dark:text-slate-200">{[selectedTicket.details?.husband_first_name, selectedTicket.details?.husband_middle_name, selectedTicket.details?.husband_last_name].filter(Boolean).join(' ')}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-pink-400" /> Wife</span><span className="font-black text-slate-700 dark:text-slate-200">{[selectedTicket.details?.wife_first_name, selectedTicket.details?.wife_middle_name, selectedTicket.details?.wife_last_name].filter(Boolean).join(' ')}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Marriage Date</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedTicket.details?.date_of_marriage}</span></div>
                                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"><span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5" /> Marriage Place</span><span className="font-bold text-slate-700 dark:text-slate-200">{selectedTicket.details?.place_of_marriage}</span></div>
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
                                <div className="border-t border-slate-150 dark:border-slate-800 pt-3 mt-3 flex flex-col sm:flex-row gap-3 shrink-0">
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
                                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Verify ID & Issue
                                        </button>
                                    )}
                                    <button
                                        onClick={handleDeclineRequest}
                                        disabled={deletingId === selectedTicket.id}
                                        className="px-5 py-3 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white dark:bg-rose-950/50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-800 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
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
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                            onClick={closeWalkinModal}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-2xl border border-slate-150 dark:border-slate-800 max-h-[90vh] flex flex-col z-10"
                        >
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">New Walk-in Request</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Create a new ticket for a walk-in client. Fields marked with <span className="text-rose-500 font-bold">*</span> are required.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeWalkinModal}
                                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Client Name <span className="text-rose-500 font-bold">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={walkinName}
                                            onChange={e => {
                                                const val = sanitizeName(e.target.value);
                                                setWalkinName(val);
                                                if (walkinErrors.client_name) {
                                                    setWalkinErrors(prev => {
                                                        const next = { ...prev };
                                                        delete next.client_name;
                                                        return next;
                                                    });
                                                }
                                            }}
                                            placeholder="e.g. Juan Dela Cruz"
                                            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-semibold transition-all ${walkinTouched && walkinErrors.client_name
                                                ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/50 focus:border-[#d4a574]'
                                                }`}
                                        />
                                        {walkinTouched && walkinErrors.client_name && (
                                            <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                                                <ExclamationTriangleIcon className="w-3 h-3" />
                                                {walkinErrors.client_name}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Purpose / Certificate Type <span className="text-rose-500 font-bold">*</span>
                                        </label>
                                        <div className="grid grid-cols-3 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setWalkinPurpose('birth')}
                                                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${walkinPurpose === 'birth'
                                                    ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-400 dark:border-orange-500 text-orange-700 dark:text-orange-300 ring-2 ring-orange-500/20 shadow-xs'
                                                    : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${walkinPurpose === 'birth' ? 'bg-orange-500 dark:bg-orange-400' : 'bg-slate-400'}`} />
                                                <span>Birth Certificate</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setWalkinPurpose('death')}
                                                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${walkinPurpose === 'death'
                                                    ? 'bg-red-50 dark:bg-red-950/50 border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 ring-2 ring-red-500/20 shadow-xs'
                                                    : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${walkinPurpose === 'death' ? 'bg-red-500 dark:bg-red-400' : 'bg-slate-400'}`} />
                                                <span>Death Certificate</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setWalkinPurpose('marriage')}
                                                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${walkinPurpose === 'marriage'
                                                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                                                    : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${walkinPurpose === 'marriage' ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-400'}`} />
                                                <span>Marriage License</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                                            {walkinPurpose === 'birth' && 'Birth Registry Information'}
                                            {walkinPurpose === 'death' && 'Death Registry Information'}
                                            {walkinPurpose === 'marriage' && 'Marriage Registry Information'}
                                        </h4>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                            <span className="text-rose-500 font-bold">*</span> Required for search & release
                                        </span>
                                    </div>

                                    {walkinPurpose === 'birth' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    First Name <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={walkinDetails.first_name}
                                                    onChange={e => handleWalkinDetailChange('first_name', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.first_name
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.first_name && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.first_name}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Middle Name</label>
                                                <input type="text" value={walkinDetails.middle_name} onChange={e => handleWalkinDetailChange('middle_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    Last Name <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={walkinDetails.last_name}
                                                    onChange={e => handleWalkinDetailChange('last_name', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.last_name
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.last_name && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.last_name}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    Date of Birth <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    max="2099-12-31"
                                                    value={walkinDetails.date_of_birth}
                                                    onChange={e => handleWalkinDetailChange('date_of_birth', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.date_of_birth
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.date_of_birth && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.date_of_birth}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Place of Birth</label>
                                                <input type="text" value={walkinDetails.place_of_birth} onChange={e => handleWalkinDetailChange('place_of_birth', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Father's Name</label>
                                                <input type="text" value={walkinDetails.father_name} onChange={e => handleWalkinDetailChange('father_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Mother's Maiden Name</label>
                                                <input type="text" value={walkinDetails.mother_name} onChange={e => handleWalkinDetailChange('mother_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40" />
                                            </div>
                                        </div>
                                    )}

                                    {walkinPurpose === 'death' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    Deceased First Name <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={walkinDetails.deceased_first_name}
                                                    onChange={e => handleWalkinDetailChange('deceased_first_name', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.deceased_first_name
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.deceased_first_name && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.deceased_first_name}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Deceased Middle Name</label>
                                                <input type="text" value={walkinDetails.deceased_middle_name} onChange={e => handleWalkinDetailChange('deceased_middle_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40" />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    Deceased Last Name <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={walkinDetails.deceased_last_name}
                                                    onChange={e => handleWalkinDetailChange('deceased_last_name', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.deceased_last_name
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.deceased_last_name && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.deceased_last_name}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    Date of Death <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    max="2099-12-31"
                                                    value={walkinDetails.date_of_death}
                                                    onChange={e => handleWalkinDetailChange('date_of_death', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.date_of_death
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.date_of_death && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.date_of_death}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Place of Death</label>
                                                <input type="text" value={walkinDetails.place_of_death} onChange={e => handleWalkinDetailChange('place_of_death', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40" />
                                            </div>
                                        </div>
                                    )}

                                    {walkinPurpose === 'marriage' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="col-span-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-2 border-b border-slate-100 dark:border-slate-800 pb-1">Husband</div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    First Name <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={walkinDetails.husband_first_name}
                                                    onChange={e => handleWalkinDetailChange('husband_first_name', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.husband_first_name
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.husband_first_name && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.husband_first_name}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Middle Name</label>
                                                <input type="text" value={walkinDetails.husband_middle_name} onChange={e => handleWalkinDetailChange('husband_middle_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40" />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    Last Name <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={walkinDetails.husband_last_name}
                                                    onChange={e => handleWalkinDetailChange('husband_last_name', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.husband_last_name
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.husband_last_name && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.husband_last_name}</p>
                                                )}
                                            </div>

                                            <div className="col-span-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-4 border-b border-slate-100 dark:border-slate-800 pb-1">Wife</div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    First Name <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={walkinDetails.wife_first_name}
                                                    onChange={e => handleWalkinDetailChange('wife_first_name', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.wife_first_name
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.wife_first_name && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.wife_first_name}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Middle Name</label>
                                                <input type="text" value={walkinDetails.wife_middle_name} onChange={e => handleWalkinDetailChange('wife_middle_name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40" />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    Last Name <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={walkinDetails.wife_last_name}
                                                    onChange={e => handleWalkinDetailChange('wife_last_name', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.wife_last_name
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.wife_last_name && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.wife_last_name}</p>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    Date of Marriage <span className="text-rose-500 font-bold">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    max="2099-12-31"
                                                    value={walkinDetails.date_of_marriage}
                                                    onChange={e => handleWalkinDetailChange('date_of_marriage', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 ${walkinTouched && walkinErrors.date_of_marriage
                                                        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#d4a574]/40'
                                                        }`}
                                                />
                                                {walkinTouched && walkinErrors.date_of_marriage && (
                                                    <p className="text-[10px] text-rose-500 font-semibold">{walkinErrors.date_of_marriage}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Place of Marriage</label>
                                                <input type="text" value={walkinDetails.place_of_marriage} onChange={e => handleWalkinDetailChange('place_of_marriage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Authorization & Representative Document Upload */}
                                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                            <IdentificationIcon className="w-4 h-4 text-[#d4a574]" />
                                            <span>Authorization Document / Valid ID</span>
                                        </h4>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                            Optional / Representative
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        If the client is transacting on behalf of the document owner, attach an authorization letter or government-issued ID here.
                                    </p>

                                    <input
                                        ref={walkinAuthFileInputRef}
                                        type="file"
                                        accept=".pdf,image/png,image/jpeg,image/jpg"
                                        onChange={handleWalkinFileChange}
                                        className="hidden"
                                    />

                                    {!walkinAuthFile ? (
                                        <div
                                            onClick={() => walkinAuthFileInputRef.current?.click()}
                                            className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#d4a574] dark:hover:border-[#d4a574] rounded-2xl p-4 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/40 hover:bg-amber-50/20 dark:hover:bg-slate-800/80 group"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/80 group-hover:bg-amber-100 dark:group-hover:bg-[#d4a574]/20 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-[#b88648] dark:group-hover:text-[#d4a574] transition-colors">
                                                    <PaperClipIcon className="w-5 h-5" />
                                                </div>
                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                    Click to attach Authorization Letter or Valid ID
                                                </div>
                                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                                    Accepts PDF, PNG, JPG (up to 10MB)
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                                    <DocumentTextIcon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {walkinAuthFile.name}
                                                    </div>
                                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                                                        <span>{formatFileSize(walkinAuthFile.size)}</span>
                                                        <span>•</span>
                                                        <span>Attached</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setWalkinAuthFile(null);
                                                    if (walkinAuthFileInputRef.current) walkinAuthFileInputRef.current.value = '';
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                title="Remove file"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 shrink-0 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={closeWalkinModal}
                                    disabled={isCreatingWalkin}
                                    className="px-5 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateWalkinTicket}
                                    disabled={isCreatingWalkin}
                                    className="px-5 py-2.5 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 dark:bg-[#d4a574] dark:hover:bg-[#bc8a59] dark:text-slate-950 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-900 dark:text-slate-100 leading-normal">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-800"
                        >
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4">
                                <h3 className="font-extrabold text-rose-600 dark:text-rose-400 text-lg flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-5 h-5" /> Decline Request
                                </h3>
                                <button onClick={() => setIsDeclineOpen(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Standard Decline Reason</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl p-3 text-xs font-semibold focus:border-rose-400 focus:ring focus:ring-rose-200 focus:ring-opacity-50 transition-all cursor-pointer"
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
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Additional Remarks / Custom Details *</label>
                                    <textarea
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl p-3 text-sm focus:border-rose-400 focus:ring focus:ring-rose-200 focus:ring-opacity-50 transition-all placeholder-slate-400 dark:placeholder-slate-500"
                                        rows="3"
                                        placeholder="Add specific notes or custom message for the requester..."
                                        value={declineReason}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        disabled={deletingId === selectedTicket.id}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDeclineOpen(false);
                                            setDeclineReason('');
                                            setDeclinePreset('');
                                        }}
                                        className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                        disabled={deletingId === selectedTicket.id}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDeclineRequest}
                                        disabled={deletingId === selectedTicket.id || !declineReason.trim()}
                                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-rose-200 dark:shadow-none transition-all cursor-pointer disabled:opacity-50"
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
                        {/* Hidden DOM element required by Html5Qrcode file scan engine */}
                        <div id="qr-hidden-decoder-host" className="hidden" />

                        {/* Hidden native camera capture trigger */}
                        <input
                            type="file"
                            ref={nativeCameraInputRef}
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            className="hidden"
                        />
                        {/* Hidden gallery / file upload trigger */}
                        <input
                            type="file"
                            ref={galleryInputRef}
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-950/30 w-full max-w-md relative overflow-hidden border border-white/80 dark:border-slate-800"
                        >
                            <div className="bg-[#0f172a] px-6 py-5 text-white">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-[#d4a574]/20 border border-[#d4a574]/40 flex items-center justify-center text-[#d4a574]">
                                            <QrCodeIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4a574]">CiviCORE Check-in</p>
                                            <h3 className="text-xl font-black tracking-tight">Scan Ticket QR</h3>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            stopLiveCamera();
                                            setIsScannerOpen(false);
                                            setScannerError('');
                                        }}
                                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                        aria-label="Close scanner"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4 bg-slate-50 dark:bg-slate-900/90">
                                {/* Real-time Live Camera Viewfinder */}
                                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square max-w-[280px] mx-auto border-2 border-dashed border-[#d4a574]/40 flex flex-col items-center justify-center shadow-inner">
                                    <div id="qr-live-camera-viewport" className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />

                                    {/* Real-time Aiming Overlay Reticle */}
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                        <div className="w-48 h-48 border-2 border-[#d4a574] rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-0.5 -ml-0.5" />
                                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-0.5 -mr-0.5" />
                                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-0.5 -ml-0.5" />
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-0.5 -mr-0.5" />
                                            <div className="absolute inset-x-2 top-1/2 h-0.5 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse" />
                                        </div>
                                    </div>

                                    {!isCameraLive && (
                                        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 p-4 text-center z-10">
                                            <ArrowPathIcon className="w-6 h-6 text-[#d4a574] animate-spin" />
                                            <span className="text-[11px] font-bold text-slate-300">Starting camera stream...</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-medium">
                                    Point camera directly at the QR code for instant real-time scan.
                                </p>

                                {/* Fallback Photo & File Upload */}
                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                    <button
                                        type="button"
                                        disabled={isDecodingPhoto}
                                        onClick={() => nativeCameraInputRef.current?.click()}
                                        className="py-2.5 px-3 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center gap-2 text-xs transition cursor-pointer disabled:opacity-50"
                                    >
                                        <CameraIcon className="w-4 h-4 text-indigo-500" />
                                        <span>Capture Photo</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isDecodingPhoto}
                                        onClick={() => galleryInputRef.current?.click()}
                                        className="py-2.5 px-3 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center gap-2 text-xs transition cursor-pointer disabled:opacity-50"
                                    >
                                        <PhotoIcon className="w-4 h-4 text-indigo-500" />
                                        <span>Upload File</span>
                                    </button>
                                </div>

                                {/* Decoding Spinner */}
                                {isDecodingPhoto && (
                                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-3 text-indigo-700 dark:text-indigo-300">
                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                        <span className="text-xs font-bold">Scanning image for QR code...</span>
                                    </div>
                                )}

                                {/* Error Alert */}
                                {scannerError && (
                                    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/50 p-4 text-center">
                                        <ExclamationTriangleIcon className="w-6 h-6 mx-auto text-rose-500 mb-1.5" />
                                        <p className="text-xs font-bold text-rose-700 dark:text-rose-300">{scannerError}</p>
                                    </div>
                                )}

                                {/* Divider */}
                                <div className="relative flex items-center justify-center my-1">
                                    <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                                    <span className="bg-slate-50 dark:bg-slate-900 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 absolute">
                                        Or Type / Barcode Gun
                                    </span>
                                </div>

                                {/* USB Scanner or Manual Entry Field */}
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleCheckInToken(manualTicketInput);
                                    }}
                                    className="space-y-2.5"
                                >
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualTicketInput}
                                            onChange={(e) => setManualTicketInput(e.target.value)}
                                            placeholder="e.g. T-2026-0001 or scan barcode gun"
                                            className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!manualTicketInput.trim()}
                                            className="px-4 py-2.5 bg-[#0f172a] text-[#d4a574] hover:bg-slate-800 disabled:opacity-40 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                                        >
                                            Check In
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center font-medium">
                                        Tip: USB barcode scanners automatically input the code and press Enter.
                                    </p>
                                </form>
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )
            )}

            <>
                {/* Immediate Post-Attachment Print Prompt Modal */}
                {attachedPrintPromptTicket && (
                    createPortal(
                        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-150 dark:border-slate-800"
                            >
                                <div className="bg-[#0f172a] px-6 py-5 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-[#d4a574]/15 border border-[#d4a574]/30 flex items-center justify-center">
                                            <PrinterIcon className="w-5 h-5 text-[#d4a574]" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4a574]">File Attached</p>
                                            <h3 className="text-lg font-black tracking-tight">Print Document Now?</h3>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setAttachedPrintPromptTicket(null)}
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                        The registry document has been linked to ticket <strong className="text-slate-900 dark:text-white font-mono">{attachedPrintPromptTicket.ticket_number}</strong> ({attachedPrintPromptTicket.client_name}).
                                    </p>

                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Request Purpose:</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-200 uppercase">{attachedPrintPromptTicket.purpose}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Queue State:</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">Ready For Pickup</span>
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        You can print the certificate now, or do it later from the ticket details pane when the citizen arrives.
                                    </p>
                                </div>

                                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setAttachedPrintPromptTicket(null)}
                                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                                    >
                                        Later
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const ticketToPrint = attachedPrintPromptTicket;
                                            setAttachedPrintPromptTicket(null);
                                            handlePrintTicketDocument(ticketToPrint);
                                        }}
                                        className="px-5 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer border border-[#d4a574]/40"
                                    >
                                        <PrinterIcon className="w-4 h-4 text-[#d4a574]" />
                                        Print Now
                                    </button>
                                </div>
                            </motion.div>
                        </div>,
                        document.body
                    )
                )}

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
                                            setMobileView('detail');
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

            {/* In-page Citizen ID / Authorization Letter Verification Modal */}
            <AnimatePresence>
                {isIdPreviewOpen && selectedTicket?.consent_form_path && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-slate-900">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100"
                        >
                            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                        <IdentificationIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Citizen ID & Authorization Document</h4>
                                        <p className="text-[11px] text-slate-400">Client: {selectedTicket.client_name} • Ticket: {selectedTicket.ticket_number}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsIdPreviewOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[320px] relative">
                                {selectedTicket.consent_form_path.toLowerCase().endsWith('.pdf') ? (
                                    <iframe
                                        src={`/api/v1/tickets/${selectedTicket.id}/consent-form#toolbar=0`}
                                        title="Citizen ID / Authorization Document"
                                        className="w-full h-[65vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                    />
                                ) : (
                                    <div className="relative max-h-[65vh] max-w-full flex items-center justify-center">
                                        {isIdImageLoading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-xl z-10">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                                                    <span className="text-xs text-slate-400 font-medium">Loading document…</span>
                                                </div>
                                            </div>
                                        )}
                                        <img
                                            src={`/api/v1/tickets/${selectedTicket.id}/consent-form`}
                                            alt="Citizen ID or Authorization Document"
                                            onLoad={() => setIsIdImageLoading(false)}
                                            onError={() => setIsIdImageLoading(false)}
                                            className={`max-h-[65vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-500 ease-out ${isIdImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verify that the document matches the certificate applicant.</span>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={`/api/v1/tickets/${selectedTicket.id}/consent-form`}
                                        download
                                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                                    >
                                        Download
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => setIsIdPreviewOpen(false)}
                                        className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
                                    >
                                        Done Reviewing
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Verify ID & Checkout Modal */}
            <AnimatePresence>
                {isVerifyOpen && selectedTicket && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-900 dark:text-slate-100 leading-normal">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-800"
                        >
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-1.5">
                                    <IdentificationIcon className="w-6 h-6 text-[#d4a574]" /> Final Verification
                                </h3>
                                <button onClick={() => setIsVerifyOpen(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Please verify the citizen's physical identification card (e.g. National ID, Driver's License) matches the requester profile before final checkout.
                                </p>

                                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs space-y-2">
                                    <div className="flex justify-between"><span className="text-slate-400 dark:text-slate-400">Client Name:</span><span className="font-extrabold text-slate-800 dark:text-slate-100">{selectedTicket.client_name}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 dark:text-slate-400">Attached Record:</span><span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[18ch]">{selectedTicket.document?.name}</span></div>
                                </div>

                                <div className="border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/30 p-3 rounded-xl flex gap-2 items-start text-[10px] text-amber-700 dark:text-amber-300">
                                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <span>Proceeding will complete this ticket request, mark it as completed, and remove it from active queue columns.</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2.5">
                                <button
                                    onClick={() => setIsVerifyOpen(false)}
                                    className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={selectedTicket.document_id ? handlePrintAndPromptConfirm : handleFinalIssue}
                                    disabled={isIssuing}
                                    className="flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isIssuing ? (
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    ) : (
                                        selectedTicket.document_id ? 'Confirm & Print' : 'Confirm & Issue'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Post-Print Issuance Confirmation Modal */}
            <AnimatePresence>
                {isPostPrintConfirmOpen && selectedTicket && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-900 dark:text-slate-100 leading-normal">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-800"
                        >
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-1.5">
                                    <CheckCircleIcon className="w-6 h-6 text-emerald-500" /> Confirm Document Issued
                                </h3>
                                <button onClick={() => setIsPostPrintConfirmOpen(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Did the document print properly? Click below to finalize issuance and mark this ticket as completed. If there was a printer issue, you can reprint or cancel without losing the ticket.
                                </p>

                                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs space-y-2">
                                    <div className="flex justify-between"><span className="text-slate-400 dark:text-slate-400">Client Name:</span><span className="font-extrabold text-slate-800 dark:text-slate-100">{selectedTicket.client_name}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 dark:text-slate-400">Attached Record:</span><span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[18ch]">{selectedTicket.document?.name}</span></div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2.5">
                                <button
                                    onClick={() => setIsPostPrintConfirmOpen(false)}
                                    className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                >
                                    Cancel (Keep in Queue)
                                </button>
                                <button
                                    onClick={() => handlePrintTicketDocument(selectedTicket)}
                                    className="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                                >
                                    Reprint
                                </button>
                                <button
                                    onClick={handleFinalIssue}
                                    disabled={isIssuing}
                                    className="flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isIssuing ? (
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Mark as Completed'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
