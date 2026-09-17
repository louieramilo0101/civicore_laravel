import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PrinterIcon, DocumentMinusIcon,
    MagnifyingGlassIcon, PlusCircleIcon,
    AdjustmentsHorizontalIcon, EyeIcon,
    TrashIcon, CheckCircleIcon, ClockIcon, ArrowDownTrayIcon,
    PencilSquareIcon, ShieldCheckIcon, XMarkIcon, ArrowPathIcon,
    ChevronDownIcon, ChevronUpIcon, CameraIcon,
    UserIcon, DocumentTextIcon, UsersIcon,
    ChartBarIcon, PresentationChartLineIcon, TrophyIcon
} from '@heroicons/react/24/outline';
import { useModal } from './ModalContext.jsx';
import SkeletonLoader from './SkeletonLoader.jsx';
import { useData } from './DataContext.jsx';
import OcrFormPanel from './OcrFormPanel.jsx';
import PasswordConfirmModal from './PasswordConfirmModal.jsx';
import ActionConfirmModal from './ActionConfirmModal.jsx';
import CameraModal from './CameraModal.jsx';
import { preprocessUploadFile } from '../utils/uploadPreprocess.js';
import axios from 'axios';

const NAIC_BARANGAYS = [
    'Gomez-Zamora (Pob.)', 'Capt. C. Nazareno (Pob.)', 'Ibayo Silangan', 'Ibayo Estacion', 'Kanluran',
    'Makina', 'Sapa', 'Bucana Malaki', 'Bucana Sasahan', 'Bagong Karsada',
    'Balsahan', 'Bancaan', 'Muzon', 'Latoria', 'Labac',
    'Mabolo', 'San Roque', 'Santulan', 'Molino', 'Calubcob',
    'Halang', 'Malainen Bago', 'Malainen Luma', 'Palangue 1', 'Palangue 2 & 3',
    'Humbac', 'Munting Mapino', 'Sabang', 'Timalan Balsahan', 'Timalan Concepcion'
].sort();

// ── Issuance Preview Modal ──────────────────────────────────────────────────
/** Previews an issued certificate and exposes print/download actions. */
export const IssuancePreviewModal = ({ cert, onClose, onPrint, onDownload, openRequestModal }) => {
    const viewUrl = cert.source === 'issuance'
        ? `/api/issuances/view/${cert.realId}`
        : `/api/documents/view/${cert.realId}`;

    const isPendingApproval = cert.status === 'Pending Approval';
    const isApproved = cert.status === 'Approved';

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
            {/* Premium Header */}
            <div className="flex items-center justify-between px-8 py-5 bg-slate-900/50 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                        <ShieldCheckIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight leading-none uppercase">{cert.name}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                            Official {cert.type} Record • <span className="text-indigo-400/80">REF: {cert.number}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isApproved || cert.status === 'Issued' ? (
                        <button
                            onClick={onPrint}
                            className="flex items-center gap-2.5 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 rounded-xl transition-all border border-emerald-500/30 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/5"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            {cert.status === 'Issued' ? 'Reprint Record' : 'Print Record'}
                        </button>
                    ) : (
                        <button
                            onClick={onPrint}
                            className="flex items-center gap-2.5 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 rounded-xl transition-all border border-emerald-500/30 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/5"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Print Record
                        </button>
                    )}
                    <button
                        onClick={onDownload}
                        className="flex items-center gap-2.5 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 rounded-xl transition-all border border-blue-500/30 active:scale-95 cursor-pointer shadow-lg shadow-blue-500/5"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Download
                    </button>
                    <div className="w-px h-8 bg-white/10 mx-3" />
                    <button
                        onClick={onClose}
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all group cursor-pointer"
                    >
                        <XMarkIcon className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            </div>

            {/* Immersive Preview Content */}
            <div className="flex-1 overflow-hidden p-8 flex justify-center bg-gradient-to-b from-slate-900 to-slate-950">
                <div className="w-full max-w-5xl h-full bg-white rounded-3xl shadow-[0_40px_70px_-15px_rgba(0,0,0,0.6)] overflow-hidden border border-white/5 animate-in zoom-in-95 duration-500 relative group">
                    <iframe
                        src={viewUrl}
                        title={cert.name}
                        className="w-full h-full border-none relative z-10"
                    />
                    {/* Subtle decorative background pulse */}
                    <div className="absolute inset-0 bg-slate-100 animate-pulse opacity-5 z-0" />
                </div>
            </div>
        </div>,
        document.body
    );
};

/** Manages issuance review, approval, printing, and bulk actions. */
const Issuances = () => {
    const { showAlert } = useModal();
    const {
        issuances: rawIssuances,
        documents: rawDocuments,
        loading: dataLoading,
        backgroundTasks,
        runBackgroundTask,
        refreshIssuances,
        refreshDocuments,
        refreshStats,
        refreshAll,
        stats
    } = useData();

    const isLoading = dataLoading.issuances || dataLoading.documents;
    const [selectedType, setSelectedType] = useState('all');
    const [selectedBarangay, setSelectedBarangay] = useState('all');
    const [selectedEncoder, setSelectedEncoder] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('database');
    const [dashboardTab, setDashboardTab] = useState('overview');
    const [isAnalyticsCollapsed, setIsAnalyticsCollapsed] = useState(() => {
        return typeof window !== 'undefined' && window.innerWidth < 768;
    });

    // Unified state
    const [certificates, setCertificates] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // Selection State
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBarMinimized, setIsBarMinimized] = useState(false);

    // Activity History Search/Filter
    const [historySearch, setHistorySearch] = useState('');
    const [historyActionFilter, setHistoryActionFilter] = useState('all');
    const [historyUserFilter, setHistoryUserFilter] = useState('all');
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');

    // Confirmation State
    const [confirmAction, setConfirmAction] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'info'
    });

    /** Toggles one issuance in the bulk-selection set. */
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    /** Selects or clears all issuance identifiers in the current view. */
    const toggleSelectAll = (idsToToggle) => {
        const allSelected = idsToToggle.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !idsToToggle.includes(id)));
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...idsToToggle])]);
        }
    };

    // Helper to wrap actions with confirmation
    /** Routes an issuance action through the confirmation modal. */
    const withConfirmation = (actionData) => {
        setConfirmAction({
            isOpen: true,
            title: actionData.title,
            message: actionData.message,
            type: actionData.type || 'info',
            onConfirm: () => {
                actionData.action();
                setConfirmAction(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // Security Modal State
    const [passwordModal, setPasswordModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });

    // Editing/Viewing State
    const [editingCert, setEditingCert] = useState(null);
    const [viewingCert, setViewingCert] = useState(null);

    // Print Approval workflow state
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const [requestingPrintCert, setRequestingPrintCert] = useState(null);
    const [orNumber, setOrNumber] = useState('');
    const [printRemarks, setPrintRemarks] = useState('');
    const [isSubmittingPrintRequest, setIsSubmittingPrintRequest] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState('');

    // Tickets and approvals
    const [tickets, setTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [approvalsSearch, setApprovalsSearch] = useState('');

    // Scan Search workflow state
    const [isScanSearchOpen, setIsScanSearchOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanSource, setScanSource] = useState('webcam');
    const [cameraStream, setCameraStream] = useState(null);
    const [ocrError, setOcrError] = useState('');
    const [isSearchCameraOpen, setIsSearchCameraOpen] = useState(false);

    const startCamera = async () => {};
    const stopCamera = () => {};
    const capturePhoto = () => {};

    const handleOcrSearchUpload = async (file) => {
        setIsScanning(true);
        setOcrError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            stopCamera();
            const res = await axios.post('/api/issuances/ocr-search', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success && res.data.extracted) {
                const { name, certNumber, barangay, type } = res.data.extracted;

                const searchVal = certNumber || name || '';
                setSearchTerm(searchVal);

                if (type && ['birth', 'death', 'marriage'].includes(type.toLowerCase())) {
                    setSelectedType(type.toLowerCase());
                }

                if (barangay && NAIC_BARANGAYS.includes(barangay)) {
                    setSelectedBarangay(barangay);
                }

                showAlert({
                    title: 'Scan Successful',
                    message: `OCR Extracted:\nName: ${name || '—'}\nCert No: ${certNumber || '—'}\nType: ${type || '—'}\nBarangay: ${barangay || '—'}`,
                    type: 'success'
                });

                setIsScanSearchOpen(false);
            } else {
                setOcrError(res.data.error || 'Failed to extract text from scan.');
            }
        } catch (err) {
            console.error("Scan upload failed:", err);
            setOcrError(err.response?.data?.error || 'An error occurred during OCR search.');
        } finally {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        if (isScanSearchOpen && scanSource === 'webcam') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isScanSearchOpen, scanSource]);

    const fetchTickets = async () => {
        setTicketsLoading(true);
        try {
            const res = await axios.get('/api/tickets', {
                params: {
                    _: Date.now()
                }
            });
            setTickets(res.data || []);
        } catch (e) {
            console.error("Error fetching tickets:", e);
            setTickets([]);
        } finally {
            setTicketsLoading(false);
        }
    };

    useEffect(() => {
        // Create a set of IDs that are already issued to prevent duplicates
        // Use Number() to ensure type consistency across database drivers
        const issuedDocIds = new Set(rawIssuances.map(i => i.document_id ? Number(i.document_id) : null).filter(id => id !== null));

        const combined = [
            // Finalized Issuances (The main records)
            ...rawIssuances.map(i => {
                const linkedDoc = rawDocuments.find(d => Number(d.id) === Number(i.document_id));
                const rawType = (i.type || 'birth').toLowerCase();
                const type = rawType === 'unknown' ? 'birth' : rawType;

                return {
                    id: `iss-${i.id}`,
                    realId: i.id,
                    number: i.certNumber || i.number || ('ISS-' + i.id),
                    type,
                    name: i.name || 'Unnamed Record',
                    barangay: i.barangay || '—',
                    date: i.issuanceDate || i.date,
                    status: i.status || 'Active',
                    encoded_by: i.encoded_by,
                    source: 'issuance',
                    ticket_number: i.ticket_number || null,
                    raw: {
                        ...i,
                        type,
                        // Pull essential data from linked document if missing
                        ocr_text: i.ocr_text || linkedDoc?.ocr_text || '',
                        file_path: i.file_path || linkedDoc?.file_path || '',
                        // Normalize data structure for the edit form panel
                        extracted_fields: i.extracted_data || i.extracted_fields || linkedDoc?.extracted_fields
                    }
                };
            }),
            // Non-issued Documents removed as requested
        ];
        // Sort by date descending, fallback to realId
        combined.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() !== dateB.getTime()) {
                return dateB - dateA;
            }
            return b.realId - a.realId;
        });
        setCertificates(combined);
    }, [rawIssuances, rawDocuments]);

    // Initial Data Fetching
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/users', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                // The API returns paginated data: { data: [...], meta: {...} }
                setAllUsers(res.data.data || []);
            } catch (e) {
                console.error("Error fetching users:", e);
                setAllUsers([]);
            }
        };
        fetchUsers();
        fetchTickets();
    }, []);

    // Fetch Activity Logs when History tab is active, fetch tickets when approvals is active
    useEffect(() => {
        if (activeTab === 'history') {
            fetchActivityLogs();
        } else if (activeTab === 'approvals') {
            fetchTickets();
        }
    }, [activeTab]);

    const fetchActivityLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await axios.get('/api/activity-logs');
            setActivityLogs(res.data);
        } catch (e) {
            console.error("Error fetching logs:", e);
        } finally {
            setLogsLoading(false);
        }
    };

    const logActivity = async (action, cert, details = '') => {
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            await axios.post('/api/activity-logs', {
                user_name: user.name || 'System',
                action,
                record_type: cert.source === 'issuance' ? 'Issuance' : 'Document',
                record_id: cert.realId,
                details: details || `${action} ${cert.type} certificate for ${cert.name}`
            });
            if (activeTab === 'history') fetchActivityLogs();
        } catch (e) {
            console.error("Failed to log activity:", e);
        }
    };


    /** Opens the source request associated with an issuance. */
    const openRequestModal = (cert) => {
        // Pre-generate an automatic OR number: OR-YYYYMMDD-XXXX
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const autoOr = `OR-${dateStr}-${randomNum}`;

        setOrNumber(autoOr);
        setPrintRemarks('');
        setSelectedTicketId('');
        setRequestingPrintCert(cert);
        fetchTickets();
    };

    const submitPrintRequest = async () => {
        if (!requestingPrintCert || !orNumber) return;
        setIsSubmittingPrintRequest(true);
        try {
            const res = await axios.post(`/api/issuances/${requestingPrintCert.realId}/request-print`, {
                or_number: orNumber,
                print_remarks: printRemarks,
                ticket_id: selectedTicketId || undefined
            });
            if (res.data.success) {
                showAlert({ title: 'Request Submitted', message: 'Print request submitted for SuperAdmin approval.', type: 'success' });
                setRequestingPrintCert(null);
                refreshAll();
            }
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Error', message: err.response?.data?.error || 'Failed to submit print request.', type: 'danger' });
        } finally {
            setIsSubmittingPrintRequest(false);
        }
    };

    const handleApprovePrint = (cert) => {
        withConfirmation({
            title: 'Approve Print Request?',
            message: `Authorize printing of ${cert.type} certificate for ${cert.name}?`,
            type: 'success',
            action: async () => {
                await runBackgroundTask(`Approving print for: ${cert.name}`, async () => {
                    const res = await axios.post(`/api/issuances/${cert.realId}/approve-print`);
                    if (res.data.success) {
                        refreshAll();
                        return { success: true, message: 'Print request authorized.' };
                    }
                    throw new Error('Failed to approve print request.');
                });
            }
        });
    };

    const handleRejectPrint = (cert) => {
        withConfirmation({
            title: 'Reject Print Request?',
            message: `Deny print request for ${cert.name}? The record will return to Active status.`,
            type: 'danger',
            action: async () => {
                await runBackgroundTask(`Rejecting print for: ${cert.name}`, async () => {
                    const res = await axios.post(`/api/issuances/${cert.realId}/reject-print`);
                    if (res.data.success) {
                        refreshAll();
                        return { success: true, message: 'Print request denied.' };
                    }
                    throw new Error('Failed to reject print request.');
                });
            }
        });
    };

    const handleEdit = (cert) => {
        setPasswordModal({
            isOpen: true,
            title: 'Authorize Edit',
            message: `Enter password to edit ${cert.type} record for ${cert.name}.`,
            onConfirm: () => {
                setEditingCert(cert);
                setPasswordModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const buildPersonName = (fields, type) => {
        if (!fields) return '';
        if (type === 'marriage') {
            const hLast = (fields.husband_last_name || '').toUpperCase().trim();
            const hFirst = (fields.husband_first_name || '').toUpperCase().trim();
            const hMiddle = (fields.husband_middle_name || '').toUpperCase().trim();
            const hSuffix = (fields.husband_suffix || '').toUpperCase().trim();
            const hName = [hLast ? `${hLast},` : '', hFirst, hMiddle, hSuffix].filter(Boolean).join(' ');

            const wLast = (fields.wife_last_name || '').toUpperCase().trim();
            const wFirst = (fields.wife_first_name || '').toUpperCase().trim();
            const wMiddle = (fields.wife_middle_name || '').toUpperCase().trim();
            const wSuffix = (fields.wife_suffix || '').toUpperCase().trim();
            const wName = [wLast ? `${wLast},` : '', wFirst, wMiddle, wSuffix].filter(Boolean).join(' ');

            const joined = [hName, wName].filter(Boolean).join(' & ');
            return (joined || fields.personName || '').toUpperCase();
        }

        const last = (fields.last_name || fields.deceased_last_name || '').toUpperCase().trim();
        const first = (fields.first_name || fields.deceased_first_name || '').toUpperCase().trim();
        const middle = (fields.middle_name || fields.deceased_middle_name || '').toUpperCase().trim();
        const suffix = (fields.suffix || '').toUpperCase().trim();

        const nameParts = [last ? `${last},` : '', first, middle, suffix].filter(Boolean).join(' ');
        return (nameParts || fields.personName || fields.full_name || fields.deceased_name || '').toUpperCase();
    };

    const saveEdit = async ({ fields, ocr_text, parentalConsent, detectedType }) => {
        if (!editingCert) return;
        const fileId = editingCert.realId;
        const docType = detectedType || editingCert.type || '';
        const personName = buildPersonName(fields, docType) || editingCert.name || '';
        const barangay = fields.barangay || '';

        const certToClear = editingCert;
        setEditingCert(null);

        runBackgroundTask(`Updating: ${personName}`, async () => {
            const endpoint = certToClear.source === 'issuance' ? `/api/issuances/${fileId}` : `/api/documents/${fileId}`;
            const res = await axios.put(endpoint, {
                extracted_fields: fields,
                ocr_text: ocr_text,
                personName,
                barangay,
                parental_consent: parentalConsent,
                detectedType
            });

            if (res.data.success) {
                try {
                    sessionStorage.removeItem(`civicore_ocr_draft_${fileId}`);
                    sessionStorage.removeItem(`civicore_ocr_draft_type_${fileId}`);
                    sessionStorage.removeItem(`civicore_ocr_draft_text_${fileId}`);
                } catch (cacheErr) {
                    console.error('Failed to clear draft cache:', cacheErr);
                }
                logActivity('Edited', certToClear);
                refreshAll();
                return { success: true, message: `Successfully updated record for ${personName}` };
            }
            throw new Error('Update failed');
        });
    };

    const handleDelete = (cert) => {
        setPasswordModal({
            isOpen: true,
            title: 'Authorize Deletion',
            message: `Remove record for ${cert.name}? This can be undone later.`,
            onConfirm: () => {
                setPasswordModal(prev => ({ ...prev, isOpen: false }));
                runBackgroundTask(`${cert.name}`, async () => {
                    const endpoint = cert.source === 'issuance' ? `/api/issuances/${cert.realId}` : `/api/documents/${cert.realId}`;
                    const res = await axios.delete(endpoint);
                    if (res.data.success) {
                        logActivity('Deleted', cert);
                        refreshAll();
                        return { success: true, type: 'delete' };
                    }
                    throw new Error('Delete failed');
                }, {
                    type: 'delete',
                    undoFn: () => axios.post(`/api/documents/${cert.realId}/undo`)
                });
            }
        });
    };

    const handleAction = async (action, cert) => {
        const baseUrl = cert.source === 'issuance' ? '/api/issuances' : '/api/documents';
        const endpoint = action === 'Download' ? 'download' : 'view';
        const url = `${baseUrl}/${endpoint}/${cert.realId}`;

        const perform = async () => {
            if (action === 'Print') {
                const iframeId = 'print-frame-' + cert.id;
                const iframe = document.createElement('iframe');
                iframe.id = iframeId;
                iframe.src = url;
                iframe.style.display = 'none';

                const handlePrintLoad = async () => {
                    try {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                        logActivity(cert.status === 'Issued' ? 'Reprinted' : 'Printed', cert);

                        if (cert.status === 'Approved') {
                            await axios.post(`/api/issuances/${cert.realId}/issue`);
                            refreshAll();
                        }
                    } finally {
                        window.setTimeout(() => {
                            iframe.removeEventListener('load', handlePrintLoad);
                            iframe.remove();
                        }, 2000);
                    }
                };

                iframe.addEventListener('load', handlePrintLoad, { once: true });
                document.body.appendChild(iframe);
            } else {
                window.open(url, '_blank');
                logActivity(action === 'View' ? 'Viewed' : 'Downloaded', cert);
            }
        };

        if (action === 'View') {
            setViewingCert(cert);
        } else {
            withConfirmation({
                title: `${action} Document?`,
                message: `Are you sure you want to ${action.toLowerCase()} the ${cert.type} certificate for ${cert.name}?`,
                action: perform
            });
        }
    };

    // --- Bulk Action Handlers ---
    const handleBulkDelete = () => {
        setPasswordModal({
            isOpen: true,
            title: `Delete ${selectedIds.length} Records?`,
            message: `Remove all ${selectedIds.length} selected records? They can be restored from the Activity Center.`,
            onConfirm: () => {
                setPasswordModal(prev => ({ ...prev, isOpen: false }));
                const idsToDelete = [...selectedIds];
                setSelectedIds([]);

                runBackgroundTask(`Bulk Delete: ${idsToDelete.length} Records`, async () => {
                    let ok = 0;
                    let failed = 0;
                    for (const fullId of idsToDelete) {
                        const cert = certificates.find(c => c.id === fullId);
                        if (!cert) continue;
                        const endpoint = cert.source === 'issuance' ? `/api/issuances/${cert.realId}` : `/api/documents/${cert.realId}`;
                        try {
                            const res = await axios.delete(endpoint);
                            if (res.data.success) {
                                logActivity('Deleted (Bulk)', cert);
                                ok++;
                            } else {
                                failed++;
                            }
                        } catch (err) {
                            console.error(`Failed to delete ${fullId}:`, err);
                            failed++;
                        }
                    }
                    refreshAll();
                    return {
                        success: true,
                        message: `Successfully removed ${ok} records.${failed > 0 ? ` Failed to remove ${failed} records.` : ''}`,
                        type: 'bulk-delete'
                    };
                }, {
                    type: 'bulk-delete',
                    undoFn: async () => {
                        for (const fullId of idsToDelete) {
                            const realId = fullId.split('-')[1];
                            await axios.post(`/api/documents/${realId}/undo`);
                        }
                    }
                });
            }
        });
    };

    const handleBulkDownload = () => {
        withConfirmation({
            title: `Download ${selectedIds.length} Files?`,
            message: `Initiate sequential download for all ${selectedIds.length} selected documents?`,
            type: 'info',
            action: async () => {
                for (const fullId of selectedIds) {
                    const cert = certificates.find(c => c.id === fullId);
                    if (!cert) continue;
                    const url = cert.source === 'issuance' ? `/api/issuances/download/${cert.realId}` : `/api/documents/download/${cert.realId}`;
                    window.open(url, '_blank');
                    logActivity('Downloaded (Bulk)', cert);
                    await new Promise(r => setTimeout(r, 800)); // Stagger to prevent browser block
                }
                setSelectedIds([]);
            }
        });
    };

    const handleBulkIssue = () => {
        const documentsOnly = selectedIds.filter(id => id.startsWith('doc-'));
        if (documentsOnly.length === 0) return;

        withConfirmation({
            title: `Issue ${documentsOnly.length} Certificates?`,
            message: `Finalize and issue for all ${documentsOnly.length} selected ready documents?`,
            type: 'success',
            action: () => {
                const idsToIssue = [...documentsOnly];
                setSelectedIds([]);
                runBackgroundTask(`Mass Issuance: ${idsToIssue.length} Records`, async () => {
                    // Immediate visual feedback locally
                    setCertificates(prev => prev.map(c => idsToIssue.includes(c.id) ? { ...c, status: 'uploading' } : c));

                    let ok = 0;
                    try {
                        for (const fullId of idsToIssue) {
                            const cert = certificates.find(c => c.id === fullId);
                            if (!cert) continue;
                            const res = await axios.post(`/api/documents/${cert.realId}/quick-approve`);
                            if (res.data.success) {
                                logActivity('Issued (Bulk)', cert);
                                ok++;
                            }
                        }
                        refreshAll();
                        return { success: true, message: `Successfully issued ${ok} certificates.` };
                    } catch (err) {
                        refreshAll();
                        throw err;
                    }
                });
            }
        });
    };

    const uniqueBarangays = NAIC_BARANGAYS;
    const uniqueEncoders = Array.isArray(allUsers) ? [...new Set(allUsers.map(u => u.name))].sort() : [];

    const filteredCertificates = certificates.filter(cert => {
        const matchesType = selectedType === 'all' || cert.type.toLowerCase() === selectedType.toLowerCase();
        const matchesBarangay = selectedBarangay === 'all' || cert.barangay === selectedBarangay;
        const matchesEncoder = selectedEncoder === 'all' || cert.encoded_by === selectedEncoder;
        const matchesSearch = cert.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cert.barangay.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesType && matchesBarangay && matchesEncoder && matchesSearch;
    });

    const filteredLogs = activityLogs.filter(log => {
        const matchesSearch = !historySearch ||
            (log.details || '').toLowerCase().includes(historySearch.toLowerCase()) ||
            (log.user_name || '').toLowerCase().includes(historySearch.toLowerCase()) ||
            (log.action || '').toLowerCase().includes(historySearch.toLowerCase());

        const matchesAction = historyActionFilter === 'all' || log.action === historyActionFilter;
        const matchesUser = historyUserFilter === 'all' || log.user_name === historyUserFilter;

        // Date Range filtering
        const logDate = new Date(log.created_at).setHours(0, 0, 0, 0);
        const start = historyStartDate ? new Date(historyStartDate).setHours(0, 0, 0, 0) : null;
        const end = historyEndDate ? new Date(historyEndDate).setHours(0, 0, 0, 0) : null;
        const matchesDate = (!start || logDate >= start) && (!end || logDate <= end);

        return matchesSearch && matchesAction && matchesUser && matchesDate;
    });

    const resetFilters = () => {
        setSelectedType('all');
        setSelectedBarangay('all');
        setSelectedEncoder('all');
        setSearchTerm('');
    };

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 max-w-7xl mx-auto">
            {/* Confirmation Modals */}
            <PasswordConfirmModal
                isOpen={passwordModal.isOpen}
                onConfirm={passwordModal.onConfirm}
                onCancel={() => setPasswordModal(p => ({ ...p, isOpen: false }))}
                title={passwordModal.title}
                message={passwordModal.message}
            />

            <ActionConfirmModal
                isOpen={confirmAction.isOpen}
                onConfirm={confirmAction.onConfirm}
                onCancel={() => setConfirmAction(p => ({ ...p, isOpen: false }))}
                title={confirmAction.title}
                message={confirmAction.message}
                type={confirmAction.type}
            />

            {/* Editor Overlay */}
            <AnimatePresence>
                {editingCert && (
                    <OcrFormPanel
                        file={editingCert.raw}
                        docType={editingCert.type}
                        ocrResult={{
                            extracted_fields: typeof editingCert.raw.extracted_fields === 'string'
                                ? JSON.parse(editingCert.raw.extracted_fields)
                                : (editingCert.raw.extracted_fields || {}),
                            text: editingCert.raw.ocr_text || '',
                            detected_type: editingCert.type
                        }}
                        onSave={saveEdit}
                        onClose={() => setEditingCert(null)}
                    />
                )}
                {viewingCert && (
                    <IssuancePreviewModal
                        cert={viewingCert}
                        onClose={() => setViewingCert(null)}
                        onPrint={() => handleAction('Print', viewingCert)}
                        onDownload={() => handleAction('Download', viewingCert)}
                        openRequestModal={openRequestModal}
                    />
                )}
                {requestingPrintCert && (() => {
                    const activeLinkedTicket = tickets.find(t => 
                        t.document_id && 
                        Number(t.document_id) === Number(requestingPrintCert.raw?.document_id) &&
                        t.request_status !== 'completed' &&
                        t.request_status !== 'cancelled'
                    );
                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden"
                            >
                                <div className="p-8">
                                    {/* Header */}
                                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6 mx-auto border border-amber-100">
                                        <PrinterIcon className="w-8 h-8" />
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-800 text-center tracking-tight mb-2">
                                        {requestingPrintCert.status === 'Issued' ? 'Request Reprint Approval' : 'Request Print Approval'}
                                    </h3>
                                    <p className="text-slate-500 text-center text-sm font-medium leading-relaxed mb-6">
                                        An Official Receipt (OR) Number is required to request print authorization for <strong className="text-slate-800">{requestingPrintCert.name}</strong>.
                                    </p>

                                    {/* Linked Queue Ticket Notification */}
                                    {activeLinkedTicket && (
                                        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-md shadow-indigo-200">
                                                Ticket
                                            </div>
                                            <div>
                                                <p className="text-xs text-indigo-900 font-black leading-none">{activeLinkedTicket.ticket_number}</p>
                                                <p className="text-[10px] text-indigo-500 mt-1 font-bold uppercase tracking-wider">Live Citizen Waiting: {activeLinkedTicket.client_name}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Input Fields */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Official Receipt (OR) Number</label>
                                            <input
                                                type="text"
                                                placeholder="Enter receipt number (e.g. OR-8888)..."
                                                value={orNumber}
                                                onChange={(e) => setOrNumber(e.target.value)}
                                                className="block w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all shadow-sm font-bold text-slate-700"
                                            />
                                        </div>

                                        {!activeLinkedTicket && (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Link Queue Ticket (Optional)</label>
                                                <select
                                                    value={selectedTicketId}
                                                    onChange={(e) => setSelectedTicketId(e.target.value)}
                                                    className="block w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all shadow-sm font-bold text-slate-700 cursor-pointer"
                                                >
                                                    <option value="">-- Select Active Ticket to Link --</option>
                                                    {tickets.filter(t => 
                                                        !t.document_id && 
                                                        t.request_status !== 'completed' && 
                                                        t.request_status !== 'cancelled'
                                                    ).map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.ticket_number} - {t.client_name} ({t.purpose})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Remarks / Purpose (Optional)</label>
                                            <textarea
                                                placeholder="Enter any notes or remarks..."
                                                value={printRemarks}
                                                onChange={(e) => setPrintRemarks(e.target.value)}
                                                rows="3"
                                                className="block w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all shadow-sm font-medium text-slate-600 resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 flex gap-3">
                                    <button
                                        onClick={() => setRequestingPrintCert(null)}
                                        disabled={isSubmittingPrintRequest}
                                        className="flex-1 px-6 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-2xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submitPrintRequest}
                                        disabled={!orNumber || isSubmittingPrintRequest}
                                        className="flex-1 px-6 py-3.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-2xl shadow-lg shadow-amber-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {isSubmittingPrintRequest ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
                {isScanSearchOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#d4a574]/15 text-[#d4a574] rounded-xl flex items-center justify-center">
                                        <CameraIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">Scan to Search</h3>
                                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">OCR Document Search using EasyOCR / Tesseract</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsScanSearchOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Source Toggle */}
                                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                                    <button
                                        onClick={() => setScanSource('webcam')}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${scanSource === 'webcam' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Use Camera
                                    </button>
                                    <button
                                        onClick={() => setScanSource('upload')}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${scanSource === 'upload' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Upload Image
                                    </button>
                                </div>

                                {ocrError && (
                                    <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl leading-relaxed">
                                        {ocrError}
                                    </div>
                                )}

                                {/* Webcam viewport */}
                                {scanSource === 'webcam' && (
                                    <div className="relative aspect-video w-full bg-slate-50 rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-slate-200 shadow-inner">
                                        {isScanning ? (
                                            <div className="absolute inset-0 z-20 bg-slate-900/80 flex flex-col items-center justify-center text-white gap-3 rounded-2xl">
                                                <ArrowPathIcon className="w-8 h-8 animate-spin text-[#d4a574]" />
                                                <span className="text-xs font-bold tracking-widest uppercase">Processing OCR...</span>
                                            </div>
                                        ) : null}
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-3 border border-indigo-100 shadow-sm">
                                            <CameraIcon className="w-6 h-6 animate-pulse" />
                                        </div>
                                        <p className="text-sm font-black text-slate-700">Scan using unified document camera</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Locks edges and crops automatically</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsSearchCameraOpen(true)}
                                            className="mt-5 px-6 py-3 bg-[#0f172a] hover:bg-slate-800 text-[#d4a574] font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                                        >
                                            Launch Scanner Camera
                                        </button>
                                    </div>
                                )}

                                {/* Upload Area */}
                                {scanSource === 'upload' && (
                                    <div className="relative aspect-video w-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#d4a574]/40 flex flex-col items-center justify-center p-6 text-center transition-all group overflow-hidden">
                                        {isScanning ? (
                                            <div className="absolute inset-0 bg-slate-900/80 z-20 flex flex-col items-center justify-center text-white gap-3">
                                                <ArrowPathIcon className="w-8 h-8 animate-spin text-[#d4a574]" />
                                                <span className="text-xs font-bold tracking-widest uppercase">Processing OCR...</span>
                                            </div>
                                        ) : null}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    handleOcrSearchUpload(e.target.files[0]);
                                                }
                                            }}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-[#d4a574] group-hover:bg-[#d4a574]/10 transition-all border border-slate-200 mb-3 shadow-sm">
                                            <ArrowDownTrayIcon className="w-6 h-6 rotate-180" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-700">Drag and drop or click to upload</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-1">Supports PNG, JPG or WEBP up to 10MB</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-3">
                                <button
                                    onClick={() => setIsScanSearchOpen(false)}
                                    className="px-5 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-all cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Issuance Dashboard Panel (Overview / Per Category / Top Issued) ────────────────── */}
            <motion.div variants={itemVariants} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 overflow-hidden">
                {/* Dashboard Tab Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 flex-wrap gap-3 bg-gradient-to-r from-slate-50/80 to-white">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 pr-4 border-r border-slate-200/80 hidden sm:flex">
                            <ChartBarIcon className="w-5 h-5 text-[#d4a574]" />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Analytics & Stats</span>
                        </div>
                        <div className="flex space-x-1 overflow-x-auto">
                            {[
                                { key: 'overview', label: 'Overview', Icon: ChartBarIcon },
                                { key: 'categories', label: 'Per Category', Icon: PresentationChartLineIcon },
                                { key: 'top', label: 'Top Issued', Icon: TrophyIcon },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => {
                                        setDashboardTab(tab.key);
                                        if (isAnalyticsCollapsed) setIsAnalyticsCollapsed(false);
                                    }}
                                    className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                                        dashboardTab === tab.key && !isAnalyticsCollapsed
                                            ? 'bg-slate-900 text-[#d4a574] shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                    }`}
                                >
                                    <tab.Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            type="button"
                            onClick={() => setIsAnalyticsCollapsed(prev => !prev)}
                            className="p-2.5 rounded-xl bg-slate-900/10 hover:bg-slate-900 text-[#d4a574] hover:text-white transition-all cursor-pointer border border-[#d4a574]/30 hover:border-slate-900 shadow-sm active:scale-95 group/retract"
                            title={isAnalyticsCollapsed ? "Expand Overview Analytics" : "Retract Overview Analytics"}
                        >
                            {isAnalyticsCollapsed ? (
                                <ChevronDownIcon className="w-5 h-5 text-[#d4a574] group-hover/retract:text-white transition-colors" />
                            ) : (
                                <ChevronUpIcon className="w-5 h-5 text-[#d4a574] group-hover/retract:text-white transition-colors" />
                            )}
                        </button>
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {isAnalyticsCollapsed && (
                        <div
                            onClick={() => setIsAnalyticsCollapsed(false)}
                            className="px-6 py-3 bg-amber-50/60 border-b border-amber-100 text-amber-800 text-xs font-bold flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <ChartBarIcon className="w-4 h-4 text-amber-600" />
                                Category & Issuance Overview is retracted.
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 underline">Click to Expand Stats & Overview</span>
                        </div>
                    )}
                    {!isAnalyticsCollapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >

                {/* Tab 1: Overview */}
                {dashboardTab === 'overview' && (
                    <div className="p-6">
                        {isLoading ? (
                            <SkeletonLoader type="cards" rows={1} />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Master Database */}
                                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-lg overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                    <div className="absolute right-[-10%] top-[-10%] w-20 h-20 bg-white/5 rounded-full" />
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Master Database</p>
                                    <h3 className="text-4xl font-black text-white tracking-tighter">{certificates.length}</h3>
                                    <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-wider">Total Issuances</p>
                                    <div className="absolute bottom-4 right-4 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                                        <DocumentMinusIcon className="w-5 h-5 text-slate-400" />
                                    </div>
                                </div>
                                {/* Birth Records */}
                                <div className="relative bg-white border border-[#d4a574]/20 p-6 rounded-2xl shadow-sm overflow-hidden group hover:scale-[1.02] hover:shadow-md transition-all duration-300">
                                    <div className="absolute right-[-10%] top-[-10%] w-20 h-20 bg-[#d4a574]/5 rounded-full" />
                                    <p className="text-[#d4a574] text-[10px] font-black uppercase tracking-widest mb-1">Birth Records</p>
                                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{certificates.filter(c => (c.type || '').toLowerCase() === 'birth').length}</h3>
                                    <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-wider">Live Birth Certs</p>
                                    <div className="absolute bottom-4 right-4 text-slate-300">
                                        <UserIcon className="w-10 h-10" />
                                    </div>
                                </div>
                                {/* Death Records */}
                                <div className="relative bg-white border border-rose-100 p-6 rounded-2xl shadow-sm overflow-hidden group hover:scale-[1.02] hover:shadow-md transition-all duration-300">
                                    <div className="absolute right-[-10%] top-[-10%] w-20 h-20 bg-rose-50/50 rounded-full" />
                                    <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mb-1">Death Records</p>
                                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{certificates.filter(c => (c.type || '').toLowerCase() === 'death').length}</h3>
                                    <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-wider">Death Certificates</p>
                                    <div className="absolute bottom-4 right-4 text-slate-300">
                                        <DocumentTextIcon className="w-10 h-10" />
                                    </div>
                                </div>
                                {/* Marriage Records */}
                                <div className="relative bg-white border border-indigo-100 p-6 rounded-2xl shadow-sm overflow-hidden group hover:scale-[1.02] hover:shadow-md transition-all duration-300">
                                    <div className="absolute right-[-10%] top-[-10%] w-20 h-20 bg-indigo-50/50 rounded-full" />
                                    <p className="text-indigo-500 text-[10px] font-black uppercase tracking-widest mb-1">Marriage Records</p>
                                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{certificates.filter(c => (c.type || '').toLowerCase().includes('marriage')).length}</h3>
                                    <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-wider">Marriage Certificates</p>
                                    <div className="absolute bottom-4 right-4 text-slate-300">
                                        <UsersIcon className="w-10 h-10" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Per Category */}
                {dashboardTab === 'categories' && (() => {
                    const birthCount = certificates.filter(c => (c.type || '').toLowerCase() === 'birth').length;
                    const deathCount = certificates.filter(c => (c.type || '').toLowerCase() === 'death').length;
                    const marriageCount = certificates.filter(c => (c.type || '').toLowerCase().includes('marriage')).length;
                    const total = certificates.length || 1;
                    const issuedCount = certificates.filter(c => c.status === 'Issued').length;
                    const approvedCount = certificates.filter(c => c.status === 'Approved').length;
                    const pendingCount = certificates.filter(c => c.status === 'Active').length;
                    const pendingApprovalCount = certificates.filter(c => c.status === 'Pending Approval').length;

                    const categories = [
                        { label: 'Birth Certificates', count: birthCount, color: '#d4a574', bg: 'bg-[#d4a574]/10', bar: 'bg-[#d4a574]', emoji: 'BR' },
                        { label: 'Death Certificates', count: deathCount, color: '#f43f5e', bg: 'bg-rose-50', bar: 'bg-rose-500', emoji: 'DC' },
                        { label: 'Marriage Certificates', count: marriageCount, color: '#6366f1', bg: 'bg-indigo-50', bar: 'bg-indigo-500', emoji: 'MC' },
                    ];

                    // SVG Donut Chart calculations
                    const radius = 50;
                    const circumference = 2 * Math.PI * radius;
                    let offset = 0;
                    const donutSegments = categories.map(cat => {
                        const pct = cat.count / total;
                        const dash = pct * circumference;
                        const seg = { ...cat, dash, gap: circumference - dash, offset };
                        offset += dash;
                        return seg;
                    });

                    return (
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Progress bars */}
                            <div className="space-y-5">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Certificate Type Breakdown</h4>
                                {categories.map(cat => (
                                    <div key={cat.label}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{cat.emoji}</span>
                                                <span className="text-sm font-bold text-slate-700">{cat.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-black text-slate-800">{cat.count}</span>
                                                <span className="text-[10px] text-slate-400 font-bold">{total > 0 ? Math.round((cat.count / total) * 100) : 0}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${cat.bar} rounded-full transition-all duration-700`}
                                                style={{ width: `${total > 0 ? (cat.count / total) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-4 border-t border-slate-100 mt-4">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Issuance Status Breakdown</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Issued', count: issuedCount, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
                                            { label: 'Approved', count: approvedCount, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                                            { label: 'Active', count: pendingCount, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-100' },
                                            { label: 'Pending Approval', count: pendingApprovalCount, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
                                        ].map(s => (
                                            <div key={s.label} className={`p-3 rounded-xl border ${s.bg} flex items-center justify-between`}>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.label}</span>
                                                <span className={`text-lg font-black ${s.color}`}>{s.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: SVG Donut Chart */}
                            <div className="flex flex-col items-center justify-center">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Distribution</h4>
                                <div className="relative w-48 h-48">
                                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                                        {total === 0 ? (
                                            <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="16" />
                                        ) : (
                                            donutSegments.map((seg, i) => (
                                                <circle
                                                    key={i}
                                                    cx="60" cy="60" r={radius}
                                                    fill="none"
                                                    stroke={seg.color}
                                                    strokeWidth="16"
                                                    strokeDasharray={`${seg.dash} ${seg.gap}`}
                                                    strokeDashoffset={-seg.offset}
                                                    className="transition-all duration-700"
                                                />
                                            ))
                                        )}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-slate-800">{total - 1}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 mt-4">
                                    {categories.map(cat => (
                                        <div key={cat.label} className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                                            <span className="text-[10px] font-bold text-slate-600">{cat.label.replace(' Certificates', '')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Tab 3: Top Issued */}
                {dashboardTab === 'top' && (() => {
                    // Compute barangay rankings
                    const brgyCounts = {};
                    certificates.forEach(cert => {
                        const brgy = cert.barangay && cert.barangay !== '—' ? cert.barangay : null;
                        if (!brgy) return;
                        if (!brgyCounts[brgy]) brgyCounts[brgy] = { births: 0, deaths: 0, marriages: 0, total: 0 };
                        const t = (cert.type || '').toLowerCase();
                        if (t === 'birth') brgyCounts[brgy].births++;
                        else if (t === 'death') brgyCounts[brgy].deaths++;
                        else if (t.includes('marriage')) brgyCounts[brgy].marriages++;
                        brgyCounts[brgy].total++;
                    });
                    const rankList = Object.entries(brgyCounts)
                        .map(([name, d]) => ({ name, ...d }))
                        .sort((a, b) => b.total - a.total);
                    const top5 = rankList.slice(0, 5);
                    const maxBrgyTotal = top5[0]?.total || 1;

                    // Most active type
                    const birthCount = certificates.filter(c => (c.type || '').toLowerCase() === 'birth').length;
                    const deathCount = certificates.filter(c => (c.type || '').toLowerCase() === 'death').length;
                    const marriageCount = certificates.filter(c => (c.type || '').toLowerCase().includes('marriage')).length;
                    const mostActiveType = birthCount >= deathCount && birthCount >= marriageCount ? 'Birth'
                        : deathCount >= marriageCount ? 'Death' : 'Marriage';
                    const mostActiveTypeColor = mostActiveType === 'Birth' ? 'text-[#d4a574] bg-[#d4a574]/10 border-[#d4a574]/20'
                        : mostActiveType === 'Death' ? 'text-rose-500 bg-rose-50 border-rose-100'
                        : 'text-indigo-500 bg-indigo-50 border-indigo-100';
                    const mostActiveTypeEmoji = mostActiveType === 'Birth' ? 'BR' : mostActiveType === 'Death' ? 'DC' : 'MC';

                    // Most recently issued
                    const recentIssued = [...certificates]
                        .filter(c => c.status === 'Issued')
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .slice(0, 3);

                    return (
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Top 5 Barangays */}
                            <div>
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Top 5 Barangays by Issuances</h4>
                                {top5.length === 0 ? (
                                    <div className="text-center text-slate-400 py-8">
                                        <p className="text-sm font-semibold">No barangay data available</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {top5.map((brgy, idx) => (
                                            <div key={brgy.name} className="flex items-center gap-3 group">
                                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                                    idx === 0 ? 'bg-amber-400 text-white shadow-md shadow-amber-200'
                                                    : idx === 1 ? 'bg-slate-300 text-slate-700'
                                                    : idx === 2 ? 'bg-orange-300 text-white'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-bold text-slate-700 truncate pr-2">{brgy.name}</span>
                                                        <span className="text-sm font-black text-slate-800 shrink-0">{brgy.total}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-[#d4a574] to-[#c49060] rounded-full transition-all duration-700"
                                                            style={{ width: `${(brgy.total / maxBrgyTotal) * 100}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] text-[#d4a574] font-bold">{brgy.births}B</span>
                                                        <span className="text-[9px] text-rose-400 font-bold">{brgy.deaths}D</span>
                                                        <span className="text-[9px] text-indigo-400 font-bold">{brgy.marriages}M</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right: Most Active Type + Recent Issued */}
                            <div className="space-y-5">
                                <div>
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Most Active Document Type</h4>
                                    <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border font-black text-sm ${mostActiveTypeColor}`}>
                                        <span className="text-2xl">{mostActiveTypeEmoji}</span>
                                        {mostActiveType} Certificates
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Recently Issued</h4>
                                    {recentIssued.length === 0 ? (
                                        <p className="text-sm text-slate-400 font-medium">No issued records yet.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {recentIssued.map(cert => (
                                                <div key={cert.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                                                        (cert.type || '').toLowerCase() === 'birth' ? 'bg-[#d4a574]/10 text-[#d4a574]'
                                                        : (cert.type || '').toLowerCase() === 'death' ? 'bg-rose-50 text-rose-500'
                                                        : 'bg-indigo-50 text-indigo-500'
                                                    }`}>
                                                        {(cert.type || '').toLowerCase() === 'birth' ? 'BR' : (cert.type || '').toLowerCase() === 'death' ? 'DC' : 'MC'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 truncate">{cert.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{cert.number} · {cert.barangay}</p>
                                                    </div>
                                                    <span className="ml-auto text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">Issued</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Coverage</h4>
                                    <p className="text-sm text-slate-600 font-medium">
                                        <span className="font-black text-slate-800">{rankList.length}</span> of <span className="font-black text-slate-800">30</span> barangays have records
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ── Main Section Tab Bar ──────────────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="flex space-x-1 bg-slate-100 p-1.5 rounded-xl w-fit">
                <button onClick={() => setActiveTab('database')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'database' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Master Database</button>
                <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Activity Log History</button>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden min-h-[500px]">
                {activeTab === 'database' ? (
                    <>
                        <div className="p-6 border-b border-slate-100 bg-slate-50/30 space-y-4">
                            <div className="flex flex-col lg:flex-row justify-between gap-4">
                                <div className="relative max-w-md w-full flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input type="text" placeholder="Search by Cert No, Name or Barangay..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 focus:border-[#d4a574] sm:text-sm transition-all shadow-sm" />
                                    </div>
                                    <button
                                        onClick={() => {
                                            setOcrError('');
                                            setIsScanSearchOpen(true);
                                        }}
                                        title="Scan Document to Search (Camera/OCR)"
                                        className="p-2.5 bg-slate-100 hover:bg-[#d4a574]/20 text-slate-600 hover:text-[#d4a574] border border-slate-200 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                                    >
                                        <CameraIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    {(selectedType !== 'all' || selectedBarangay !== 'all' || selectedEncoder !== 'all' || searchTerm !== '') && (
                                        <button
                                            onClick={resetFilters}
                                            className="px-4 py-2 text-xs font-bold text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 border border-rose-100 rounded-xl transition-all cursor-pointer flex items-center gap-2 group"
                                        >
                                            <XMarkIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                                            Reset Filters
                                        </button>
                                    )}
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        {['all', 'birth', 'death', 'marriage'].map(type => (
                                            <button key={type} onClick={() => setSelectedType(type)} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${selectedType === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{type}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100/50">
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Barangay</label>
                                    <select
                                        value={selectedBarangay}
                                        onChange={(e) => setSelectedBarangay(e.target.value)}
                                        className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2 cursor-pointer transition-all outline-none"
                                    >
                                        <option value="all">All Barangays</option>
                                        {uniqueBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Barangay</label>
                                    <select
                                        value={selectedBarangay}
                                        onChange={(e) => setSelectedBarangay(e.target.value)}
                                        className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2 cursor-pointer transition-all outline-none"
                                    >
                                        <option value="all">All Barangays</option>
                                        {uniqueBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>

                                <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Showing {filteredCertificates.length} of {certificates.length} Records
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-200">
                                        <th className="p-4 pl-6 w-10">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                                checked={filteredCertificates.length > 0 && filteredCertificates.every(c => selectedIds.includes(c.id))}
                                                onChange={() => toggleSelectAll(filteredCertificates.map(c => c.id))}
                                            />
                                        </th>
                                        <th className="p-4">Ref/Cert No.</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Recipient Name</th>
                                        <th className="p-4">Barangay</th>
                                        <th className="p-4 pr-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                        <tr><td colSpan="6"><SkeletonLoader type="table" rows={8} /></td></tr>
                                    ) : filteredCertificates.length === 0 ? (
                                        <tr><td colSpan="6" className="p-12 text-center text-slate-400"><DocumentMinusIcon className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="font-semibold">No records found in database</p></td></tr>
                                    ) : (
                                        filteredCertificates.map((cert) => (
                                            <tr key={cert.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(cert.id) ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="p-4 pl-6">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                                        checked={selectedIds.includes(cert.id)}
                                                        onChange={() => toggleSelect(cert.id)}
                                                    />
                                                </td>
                                                <td className="p-4"><span className="font-bold text-slate-800 text-sm tracking-tight">{cert.number}</span></td>
                                                <td className="p-4">
                                                    {(() => {
                                                        const t = (cert.type || '').toLowerCase();
                                                        const colorClass = t === 'birth' ? 'text-[#d4a574]' : t === 'death' ? 'text-rose-500' : 'text-indigo-500';
                                                        return (
                                                            <span className={`text-xs font-black uppercase tracking-wider ${colorClass}`}>
                                                                {cert.type}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4 font-semibold text-slate-700 text-sm">{cert.name}</td>
                                                <td className="p-4 text-slate-500 text-xs font-medium">{cert.barangay}</td>
                                                <td className="p-4 pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleAction('View', cert)}
                                                            title="View Document"
                                                            className="p-2 text-indigo-600 bg-indigo-50/80 hover:bg-indigo-600 hover:text-white rounded-xl transition-all border border-indigo-200 hover:border-indigo-600 cursor-pointer shadow-sm active:scale-95 group/btn"
                                                        >
                                                            <EyeIcon className="w-4 h-4 text-indigo-600 group-hover/btn:text-white transition-colors" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(cert)}
                                                            title="Delete Record"
                                                            className="p-2 text-rose-600 bg-rose-50/80 hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-rose-200 hover:border-rose-600 cursor-pointer shadow-sm active:scale-95 group/btn"
                                                        >
                                                            <TrashIcon className="w-4 h-4 text-rose-600 group-hover/btn:text-white transition-colors" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="p-0">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/10">
                            {/* Top Row: Title & Action */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm">
                                            <ClockIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">Activity & Audit Trail</h3>
                                            <p className="text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Tracking all system events and modifications</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest tabular-nums italic">
                                            {filteredLogs.length} of {activityLogs.length} Entries
                                        </span>
                                    </div>
                                    <button
                                        onClick={fetchActivityLogs}
                                        disabled={logsLoading}
                                        className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 px-4 py-2 bg-white hover:bg-indigo-50 rounded-xl border border-slate-200 hover:border-indigo-100 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap group"
                                    >
                                        <ArrowPathIcon className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${logsLoading ? 'animate-spin' : ''}`} />
                                        Refresh Log
                                    </button>
                                </div>
                            </div>

                            {/* Filter Row: Search & Dropdowns */}
                            <div className="space-y-4 pt-6 border-t border-slate-200/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                                    {/* Search Field */}
                                    <div className="lg:col-span-4 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Search Details</label>
                                        <div className="relative">
                                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Recipient name, action, or comment..."
                                                value={historySearch}
                                                onChange={(e) => setHistorySearch(e.target.value)}
                                                className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Type */}
                                    <div className="lg:col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Action Type</label>
                                        <select
                                            value={historyActionFilter}
                                            onChange={(e) => setHistoryActionFilter(e.target.value)}
                                            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block p-2.5 cursor-pointer transition-all outline-none"
                                        >
                                            <option value="all">Any Action</option>
                                            <option value="Printed">Printed</option>
                                            <option value="Downloaded">Downloaded</option>
                                            <option value="Edited">Edited</option>
                                            <option value="Viewed">Viewed</option>
                                            <option value="Issued">Issued</option>
                                            <option value="Deleted">Deleted</option>
                                            <option value="Deleted (Bulk)">Deleted (Bulk)</option>
                                            <option value="Issued (Bulk)">Issued (Bulk)</option>
                                        </select>
                                    </div>

                                    {/* Staff Selection */}
                                    <div className="lg:col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Encoder / Staff</label>
                                        <select
                                            value={historyUserFilter}
                                            onChange={(e) => setHistoryUserFilter(e.target.value)}
                                            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block p-2.5 cursor-pointer transition-all outline-none"
                                        >
                                            <option value="all">Any Staff member</option>
                                            {uniqueEncoders.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>

                                    {/* Date Range Fields */}
                                    <div className="lg:col-span-4 grid grid-cols-2 gap-2 space-y-0">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">From Date</label>
                                            <input
                                                type="date"
                                                value={historyStartDate}
                                                onChange={(e) => setHistoryStartDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl p-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">To Date</label>
                                            <input
                                                type="date"
                                                value={historyEndDate}
                                                onChange={(e) => setHistoryEndDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl p-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Active Filters & Clear */}
                                {(historySearch || historyActionFilter !== 'all' || historyUserFilter !== 'all' || historyStartDate || historyEndDate) && (
                                    <div className="flex items-center justify-between bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50 animate-in fade-in slide-in-from-top-1">
                                        <p className="text-[10px] font-bold text-indigo-600 pl-2">Filtering results...</p>
                                        <button
                                            onClick={() => {
                                                setHistorySearch('');
                                                setHistoryActionFilter('all');
                                                setHistoryUserFilter('all');
                                                setHistoryStartDate('');
                                                setHistoryEndDate('');
                                            }}
                                            className="text-[10px] font-black text-rose-500 hover:text-white hover:bg-rose-500 px-3 py-1.5 rounded-lg border border-rose-200 hover:border-rose-500 uppercase tracking-widest transition-all glass-effect cursor-pointer"
                                        >
                                            Clear All Filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {logsLoading ? (
                            <div className="p-6"><SkeletonLoader type="table" rows={10} /></div>
                        ) : activityLogs.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 border-2 border-dashed border-slate-100 m-6 rounded-3xl">
                                <ShieldCheckIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                <p className="font-bold text-slate-600">No activity logged yet</p>
                                <p className="text-xs mt-1">Actions like Print, Download, and Edit will appear here.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                                            <th className="p-4 pl-8">Timestamp</th>
                                            <th className="p-4">Encoder</th>
                                            <th className="p-4">Action</th>
                                            <th className="p-4">Record Info</th>
                                            <th className="p-4 pr-8">Log Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="p-4 pl-8 font-bold text-slate-400 text-[10px] tabular-nums tracking-tighter">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight bg-slate-100 px-2 py-0.5 rounded">
                                                        {log.user_name}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${log.action?.includes('Edit') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        log.action?.includes('Delete') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            log.action?.includes('Print') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${log.action?.includes('Edit') ? 'bg-amber-500' :
                                                            log.action?.includes('Delete') ? 'bg-rose-500' :
                                                                log.action?.includes('Print') ? 'bg-emerald-500' : 'bg-indigo-500'
                                                            }`}></span>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                                                        {log.record_type} #{log.record_id}
                                                    </span>
                                                </td>
                                                <td className="p-4 pr-8 text-xs font-medium text-slate-600 italic">
                                                    {log.details}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{
                            y: isBarMinimized ? 80 : 0,
                            opacity: 1,
                            scale: isBarMinimized ? 0.95 : 1
                        }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'tween', duration: 0.1, ease: 'circOut' }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
                    >
                        <div className={`bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-4 flex items-center justify-between relative transition-all ${isBarMinimized ? 'opacity-50 hover:opacity-100' : ''}`}>
                            {/* Toggle Button */}
                            <button
                                onClick={() => setIsBarMinimized(!isBarMinimized)}
                                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white p-1.5 rounded-full shadow-lg transition-all cursor-pointer z-10"
                                title={isBarMinimized ? "Expand Toolbar" : "Minimize Toolbar"}
                            >
                                {isBarMinimized ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                            </button>

                            <div className="flex items-center gap-4 pl-4">
                                <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-black transition-all ${isBarMinimized ? 'scale-75' : ''}`}>
                                    {selectedIds.length}
                                </span>
                                {!isBarMinimized && (
                                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                        <p className="text-white text-sm font-bold leading-none tracking-tight">Records Selected</p>
                                        <button onClick={() => setSelectedIds([])} className="text-[10px] text-slate-400 hover:text-white font-bold uppercase tracking-widest mt-1 transition-colors">Clear Selection</button>
                                    </motion.div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pr-2">
                                {isBarMinimized ? (
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">Selection active</span>
                                ) : (
                                    <>
                                        <button onClick={handleBulkIssue} className="flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 cursor-pointer">
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Mass Issue
                                        </button>
                                        <button onClick={handleBulkDownload} className="flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 cursor-pointer">
                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                            Download
                                        </button>
                                        <button onClick={handleBulkDelete} className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl transition-all shadow-lg shadow-rose-900/20 active:scale-95 cursor-pointer">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CameraModal for Scan to Search */}
            <CameraModal
                isOpen={isSearchCameraOpen}
                onClose={() => setIsSearchCameraOpen(false)}
                onCapture={async (capturePayload) => {
                    let file = capturePayload.file;
                    try {
                        const preprocessed = await preprocessUploadFile(capturePayload, {
                            corners: capturePayload.corners,
                            edgeStability: capturePayload.edgeStability,
                            deviceType: capturePayload.deviceType
                        });
                        file = preprocessed.file;
                    } catch (err) {
                        console.warn("Preprocessing failed for Scan to Search:", err);
                    }
                    handleOcrSearchUpload(file);
                }}
            />
        </motion.div>
    );
};

export default Issuances;
