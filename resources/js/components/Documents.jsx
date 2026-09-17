import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CloudArrowUpIcon, DocumentIcon, TrashIcon, CheckCircleIcon,
    ExclamationTriangleIcon, MagnifyingGlassIcon, XMarkIcon,
    PencilSquareIcon, ShieldExclamationIcon, ShieldCheckIcon, DocumentCheckIcon,
    EyeIcon, CameraIcon, BoltIcon, ArrowPathIcon, StopIcon, PlayIcon,
    UserIcon, DocumentTextIcon, UsersIcon
} from '@heroicons/react/24/outline';
import OcrFormPanel from './OcrFormPanel.jsx';
import SkeletonLoader from './SkeletonLoader.jsx';
import { useModal } from './ModalContext.jsx';
import { useData } from './DataContext.jsx';
import CameraModal from './CameraModal.jsx';
import ActionConfirmModal from './ActionConfirmModal.jsx';
import { preprocessUploadFile } from '../utils/uploadPreprocess.js';


// ── Document Preview Modal (via Portal) ──────────────────────────────────────
/** Previews an uploaded or registered document without leaving the list. */
const DocumentPreviewModal = ({ file, onClose }) => {
    const viewUrl = `/api/documents/view/${file.id}`;
    const downloadUrl = `/api/documents/download/${file.id}`;
    const isPdf = file.name?.toLowerCase().endsWith('.pdf');

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/80 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <DocumentIcon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{file.detected_type || file.type} certificate</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {file.ocr_text && (
                        <a
                            href={`/api/documents/download-txt/${file.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-900/50 hover:bg-emerald-800 rounded-lg transition-colors border border-emerald-700/50"
                        >
                            <DocumentIcon className="w-3.5 h-3.5" />
                            Download TXT
                        </a>
                    )}
                    <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                    >
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        Download PDF
                    </a>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all group"
                    >
                        <XMarkIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-hidden flex gap-4 p-4">
                {/* Visual Document (Left/Main) */}
                <div className={`flex-1 flex items-center justify-center ${file.ocr_text ? 'w-2/3' : 'w-full'}`}>
                    {isPdf ? (
                        <iframe
                            src={viewUrl}
                            title={file.name}
                            className="w-full h-full rounded-xl border border-slate-700 bg-white shadow-2xl"
                        />
                    ) : (
                        <img
                            src={viewUrl}
                            alt={file.name}
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-700"
                            onError={e => { e.target.src = 'https://placehold.co/600x800?text=Preview+Error'; }}
                        />
                    )}
                </div>

                {/* Extracted Text (Right/Side) - Only if it exists */}
                {file.ocr_text && (
                    <div className="w-1/3 h-full bg-slate-900/50 rounded-xl border border-slate-700 p-6 overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extracted Content</span>
                            <BoltIcon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {file.ocr_text}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

// ── Main Documents Component ──────────────────────────────────────────────────
/** Manages document uploads, OCR review, registration, and archival actions. */
const Documents = () => {
    const { showAlert } = useModal();
    const {
        documents: globalFiles,
        history: historyLogs,
        loading: dataLoading,
        backgroundTasks,
        runBackgroundTask,
        refreshDocuments,
        refreshHistory,
        refreshStats,
        refreshAll
    } = useData();
    const isLoadingData = dataLoading.documents;
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const canPurge = ['SuperAdmin', 'Admin'].includes(user.role);

    const [files, setFiles] = useState([]);
    const [archivedIds, setArchivedIds] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        setFiles(prev => {
            // Keep files that are currently uploading
            const uploading = prev.filter(f => f.status === 'uploading');

            // Filter fetched files
            const fetched = globalFiles.filter(f => !archivedIds.includes(f.id));

            // Remove uploading files that have appeared in fetched files (by base name comparison)
            /** Removes the extension from a stored filename for display. */
            const getBaseName = (filename) => {
                if (!filename) return '';
                const base = filename.replace(/\.[^/.]+$/, '');
                return base.replace(/-preprocessed$/, '').trim();
            };
            const uploadingFiltered = uploading.filter(u => {
                const uTime = new Date(u.created_at).getTime();
                return !fetched.some(f => {
                    const fTime = new Date(f.created_at).getTime();
                    return getBaseName(f.name) === getBaseName(u.name) && fTime >= (uTime - 120000);
                });
            });

            // Make sure the local files status updates duplicate indicators instantly
            const nextFiles = [...uploadingFiltered, ...fetched];
            return nextFiles.map(f => {
                const existing = prev.find(p => p.id === f.id);
                // If local state or backend state flags duplicate, treat as duplicate.
                const hasDuplicateVal = (existing && existing.has_duplicate) || f.has_duplicate;
                return { ...f, has_duplicate: !!hasDuplicateVal };
            });
        });
    }, [globalFiles, archivedIds]);

    const [selectedDocType, setSelectedDocType] = useState('birth');
    const [activePrefill, setActivePrefill] = useState(null);

    const checkPrefill = useCallback(() => {
        try {
            const str = sessionStorage.getItem('civicore_ticket_prefill');
            if (str) {
                const parsed = JSON.parse(str);
                setActivePrefill(parsed);
                if (parsed.purpose) {
                    setSelectedDocType(parsed.purpose);
                }
            } else {
                setActivePrefill(null);
            }
        } catch (e) {
            setActivePrefill(null);
        }
    }, []);

    useEffect(() => {
        checkPrefill();
        window.addEventListener('storage', checkPrefill);
        return () => window.removeEventListener('storage', checkPrefill);
    }, [checkPrefill]);

    const [dragging, setDragging] = useState(false);
    const [activeOcr, setActiveOcr] = useState(null); // { file, ocrResult }
    const [isOcrSaving, setIsOcrSaving] = useState(false);
    const savingRecordRef = useRef(false);

    useEffect(() => {
        if (!activeOcr) {
            setIsOcrSaving(false);
            savingRecordRef.current = false;
        }
    }, [activeOcr]);

    const [activeTab, setActiveTab] = useState('queue');
    const [queueSearch, setQueueSearch] = useState('');
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilters, setHistoryFilters] = useState({
        type: 'all',
        staff: 'all',
        barangay: 'all',
        dateRange: 'all' // all, today, yesterday, week, month
    });



    const [previewFile, setPreviewFile] = useState(null); // file to preview
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '', type: 'info' });

    /** Toggles one document in the bulk-selection set. */
    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    /** Selects or clears all documents currently visible in the list. */
    const toggleSelectAll = (filteredFiles) => {
        if (selectedIds.length === filteredFiles.length && filteredFiles.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredFiles.map(f => f.id));
        }
    };

    useEffect(() => {
        const hasProcessing = files.some(f => f.status === 'processing' || f.status === 'uploading' || f.status === 'checking' || f.status === 'pending');
        if (!hasProcessing) return;

        const interval = setInterval(() => {
            refreshDocuments(true);
        }, 2000);

        return () => clearInterval(interval);
    }, [files, refreshDocuments]);

    const onDrop = useCallback(async (acceptedFiles) => {
        setDragging(false);
        if (!acceptedFiles.length) return;

        // Optimistically add files to queue
        const optimisticFiles = acceptedFiles.map((item, index) => {
            const f = item.file || item;
            return {
                id: `uploading-${Date.now()}-${index}`,
                name: f.name || 'Document',
                size: (f.size ? (f.size / (1024 * 1024)).toFixed(2) + ' MB' : '...'),
                type: selectedDocType,
                status: 'uploading',
                encoded_by: 'Uploading...',
                created_at: new Date().toISOString()
            };
        });

        setFiles(prev => [...optimisticFiles, ...prev]);

        const isBulk = acceptedFiles.length > 1;
        const firstFile = acceptedFiles[0]?.file || acceptedFiles[0];
        const taskName = isBulk ? `Uploading ${acceptedFiles.length} files` : `Uploading ${firstFile?.name || 'file'}`;

        runBackgroundTask(taskName, async () => {
            let successCount = 0;
            let lastId = null;
            let lastError = null;

            for (const uploadItem of acceptedFiles) {
                const sourceFile = uploadItem?.file || uploadItem;
                if (!(sourceFile instanceof File)) {
                    console.error('Upload item is not a File object', uploadItem);
                    throw new Error('Invalid upload payload; expected a File object.');
                }
                let file = sourceFile;
                let qualityMetadata = null;

                try {
                    const preprocessed = await preprocessUploadFile(sourceFile, {
                        corners: uploadItem?.corners || null,
                        edgeStability: uploadItem?.edgeStability,
                        deviceType: uploadItem?.deviceType
                    });
                    file = preprocessed.file;
                    qualityMetadata = preprocessed.qualityMetadata;
                } catch (preprocessError) {
                    console.warn(`Preprocessing failed for ${sourceFile?.name || 'file'}`, preprocessError);
                }

                const fd = new FormData();
                fd.append('file', file);
                fd.append('docType', selectedDocType);
                if (qualityMetadata) fd.append('quality_metadata', JSON.stringify(qualityMetadata));

                try {
                    const res = await fetch('/api/documents/upload', { method: 'POST', body: fd, credentials: 'include' });
                    const data = await res.json();
                    if (data.success) {
                        successCount++;
                        lastId = data.id;
                    } else {
                        lastError = data.error || data.message || 'Server rejected the upload';
                    }
                } catch (err) {
                    console.error(`Failed to upload ${sourceFile?.name || 'file'}`, err);
                    lastError = err.message || 'Network error';
                }
            }

            if (successCount > 0) {
                refreshAll();
                const message = isBulk
                    ? `Successfully uploaded ${successCount} of ${acceptedFiles.length} files`
                    : 'Document uploaded successfully';
                return { success: true, message, id: lastId };
            }
            refreshDocuments(true);
            throw new Error(lastError || 'Upload failed');
        }, { silent: true });
    }, [selectedDocType, refreshAll, runBackgroundTask, refreshDocuments]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc'],
            'text/plain': ['.txt']
        },
        multiple: true,
        onDragEnter: () => setDragging(true),
        onDragLeave: () => setDragging(false),
    });

    const toggleOcrStatus = async (fileId, currentStatus) => {
        const isStopping = ['pending', 'processing'].includes(currentStatus?.toLowerCase());
        const tempStatus = isStopping ? 'stopped' : 'pending';

        // Instant local feedback
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: tempStatus } : f));

        try {
            const res = await fetch(`/api/documents/${fileId}/toggle-ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.success) {
                refreshDocuments(true);
            } else {
                setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: data.new_status } : f));
                refreshDocuments(true);
            }
        } catch (e) {
            refreshDocuments(true);
        }
    };

    const bulkProcess = async () => {
        const pending = globalFiles.filter(f => f.status === 'pending' || f.status === 'failed' || f.status === 'uploaded');

        if (!pending.length) {
            showAlert({ title: 'Nothing to process', message: 'No pending or failed documents found.', type: 'info' });
            return;
        }

        const documentIds = pending.map(f => f.id);

        const result = await runBackgroundTask('Queueing Documents', async () => {
            const response = await fetch('/api/documents/bulk-process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ document_ids: documentIds })
            });

            if (!response.ok) {
                throw new Error('Failed to send documents to the queue.');
            }

            const data = await response.json();
            return {
                success: true,
                message: `Sent ${data.queued_count} documents to the OCR queue!`
            };
        });

        if (result && result.success) {
            showAlert({
                title: 'Action Successful',
                message: result.message,
                type: 'success'
            });
            setFiles(prev => prev.map(f => documentIds.includes(f.id) ? { ...f, status: 'processing' } : f));
            refreshDocuments(true);
        }
    };

    /** Opens the manual registration workflow for a document. */
    const handleManualRegistration = () => {
        setActiveOcr({
            file: { id: 'manual', name: 'Manual Entry', status: 'extracted', extracted_fields: {}, type: selectedDocType, file_path: null },
            ocrResult: { text: '', detected_type: selectedDocType }
        });
    };

    const approveRecord = async (fileId) => {
        const file = files.find(f => f.id === fileId);
        // Show immediate local status update
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'uploading' } : f));

        runBackgroundTask(`Approving ${file?.name || 'Record'}`, async () => {
            try {
                const res = await fetch(`/api/documents/${fileId}/quick-approve`, { method: 'POST', credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    // Link active ticket if applicable
                    try {
                        const prefillStr = sessionStorage.getItem('civicore_ticket_prefill');
                        if (prefillStr) {
                            const prefill = JSON.parse(prefillStr);
                            await fetch(`/api/tickets/${prefill.ticket_id}/link-document`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ document_id: fileId })
                            });
                            sessionStorage.removeItem('civicore_ticket_prefill');
                            checkPrefill();
                        }
                    } catch (linkErr) {
                        console.error('Failed to link ticket to document:', linkErr);
                    }

                    refreshAll();
                    return { success: true };
                }

                // Handle duplicate conflict — ask staff to confirm force-override
                if (res.status === 422 && data.duplicate) {
                    return new Promise((resolve, reject) => {
                        // Revert optimistic status while the modal is shown
                        refreshDocuments(true);
                        setConfirmModal({
                            isOpen: true,
                            title: 'Duplicate Detected',
                            message: 'A similar record already exists in the Master Registry. Do you still want to approve and save this record as a duplicate?',
                            type: 'warning',
                            onConfirm: async () => {
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'uploading' } : f));
                                try {
                                    const forceRes = await fetch(`/api/documents/${fileId}/quick-approve`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ force: true }),
                                        credentials: 'include',
                                    });
                                    const forceData = await forceRes.json();
                                    if (forceData.success) {
                                        refreshAll();
                                        resolve({ success: true });
                                    } else {
                                        refreshDocuments(true);
                                        reject(new Error(forceData.error || 'Force approval failed'));
                                    }
                                } catch (forceErr) {
                                    refreshDocuments(true);
                                    reject(forceErr);
                                }
                            },
                            onCancel: () => {
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                refreshDocuments(true);
                                reject(new Error('duplicate_cancelled'));
                            }
                        });
                    });
                }

                throw new Error(data.error || 'Approval failed');
            } catch (err) {
                // Revert status on failure
                refreshDocuments(true);
                throw err;
            }
        });
    };

    const bulkApprove = async () => {
        const extracted = files.filter(f => f.status === 'extracted');
        if (!extracted.length) return;

        setConfirmModal({
            isOpen: true,
            title: 'Mass Approval',
            message: `Approve all ${extracted.length} extracted records and issue them immediately?`,
            type: 'success',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                runBackgroundTask(`Mass Approval: ${extracted.length} Records`, async () => {
                    // Show immediate local status update for all targeted files
                    const idsToUpdate = extracted.map(f => f.id);
                    setFiles(prev => prev.map(f => idsToUpdate.includes(f.id) ? { ...f, status: 'uploading' } : f));

                    let ok = 0;
                    try {
                        for (const f of extracted) {
                            const res = await fetch(`/api/documents/${f.id}/quick-approve`, { method: 'POST', credentials: 'include' });
                            if (res.ok) ok++;
                        }
                        refreshAll();
                        return { success: true, message: `Successfully approved ${ok} records.` };
                    } catch (err) {
                        refreshDocuments(true);
                        throw err;
                    }
                });
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    /** Tracks duplicate-review state returned by the OCR form. */
    const handleDuplicateStatusChange = (fileId, hasDuplicate) => {
        setFiles(prev => prev.map(f => {
            if (f.id === fileId) {
                return { ...f, has_duplicate: hasDuplicate };
            }
            return f;
        }));
        setActiveOcr(prev => {
            if (prev && prev.file.id === fileId) {
                return {
                    ...prev,
                    file: { ...prev.file, has_duplicate: hasDuplicate }
                };
            }
            return prev;
        });
    };

    /** Persists an OCR-reviewed document and its extracted certificate fields. */
    const saveRecord = ({ fields, ocr_text, parentalConsent, detectedType, minimizeRequested = false }) => {
        if (!activeOcr) return Promise.reject(new Error('No active OCR'));
        if (savingRecordRef.current) return Promise.reject(new Error('Save already in progress'));

        const file = activeOcr.file;
        const isDuplicate = file.has_duplicate;

        return new Promise((resolve, reject) => {
            const performActualSave = async () => {
                if (savingRecordRef.current) return;
                savingRecordRef.current = true;
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsOcrSaving(true);
                try {
                    const result = await executeSave({ fields, ocr_text, parentalConsent, detectedType, minimizeRequested });
                    savingRecordRef.current = false;
                    resolve(result);
                } catch (err) {
                    savingRecordRef.current = false;
                    setIsOcrSaving(false);
                    reject(err);
                }
            };

            if (isDuplicate) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Confirm Duplicate Entry',
                    message: 'A potential duplicate of this record exists in the Master Registry. Are you sure you want to save and approve this duplicate?',
                    type: 'warning',
                    onConfirm: performActualSave,
                    onCancel: () => {
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        reject(new Error('duplicate_cancelled'));
                    }
                });
            } else {
                savingRecordRef.current = true;
                setIsOcrSaving(true);
                executeSave({ fields, ocr_text, parentalConsent, detectedType, minimizeRequested })
                    .then((res) => {
                        savingRecordRef.current = false;
                        resolve(res);
                    })
                    .catch((err) => {
                        savingRecordRef.current = false;
                        setIsOcrSaving(false);
                        reject(err);
                    });
            }
        });
    };

    /** Builds the display name appropriate to a certificate type. */
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
        return (nameParts || fields.personName || '').toUpperCase();
    };

    const executeSave = async ({ fields, ocr_text, parentalConsent, detectedType, minimizeRequested = false }) => {
        if (!activeOcr) return;
        const file = activeOcr.file;
        const fileId = file.id;
        const computedName = buildPersonName(fields, detectedType);
        const personName = computedName || file.personName || file.name || 'Document Data';
        const barangay = fields.barangay || file.barangay || '';

        if (minimizeRequested) {
            setActiveOcr(null);
        } else {
            // Keep modal open long enough to see the "Securing" state, then close
            setTimeout(() => setActiveOcr(null), 800);
        }

        // Immediate local status update in the main table
        if (fileId !== 'manual') {
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'uploading' } : f));
        }

        return runBackgroundTask(`Saving: ${personName}`, async () => {
            try {
                const url = fileId === 'manual' ? '/api/documents/manual' : `/api/documents/${fileId}`;
                const method = fileId === 'manual' ? 'POST' : 'PUT';
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        type: detectedType,
                        extracted_fields: fields,
                        ocr_text: ocr_text,
                        personName,
                        barangay,
                        status: 'Processed',
                        parental_consent: parentalConsent,
                        detectedType
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    // Clear the sessionStorage cache for this file
                    try {
                        sessionStorage.removeItem(`civicore_ocr_draft_${fileId}`);
                        sessionStorage.removeItem(`civicore_ocr_draft_type_${fileId}`);
                        sessionStorage.removeItem(`civicore_ocr_draft_text_${fileId}`);
                    } catch (cacheErr) {
                        console.error('Failed to clear draft cache:', cacheErr);
                    }

                    // Link active ticket if applicable
                    try {
                        const prefillStr = sessionStorage.getItem('civicore_ticket_prefill');
                        if (prefillStr) {
                            const prefill = JSON.parse(prefillStr);
                            const finalDocId = fileId === 'manual' ? data.id : fileId;
                            await fetch(`/api/tickets/${prefill.ticket_id}/link-document`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ document_id: finalDocId })
                            });
                            sessionStorage.removeItem('civicore_ticket_prefill');
                            checkPrefill();
                        }
                    } catch (linkErr) {
                        console.error('Failed to link ticket to document:', linkErr);
                    }

                    refreshAll();
                    return { success: true, message: `Data for ${personName} has been secured.` };
                }
                throw new Error(data.message || 'Save failed');
            } catch (err) {
                refreshDocuments(true);
                throw err;
            }
        });
    };

    const removeFile = async (fileId) => {
        const file = files.find(f => f.id === fileId);
        if (!file) return;

        setConfirmModal({
            isOpen: true,
            title: 'Delete Document',
            message: `Archive \"${file.name}\"? This action can be undone from the Activity Center.`,
            type: 'danger',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                // Optimistic UI update: Track this ID to hide it immediately and keep it hidden
                setArchivedIds(prev => [...prev, fileId]);

                runBackgroundTask(`${file.name}`, async () => {
                    const res = await fetch(`/api/documents/${fileId}`, { method: 'DELETE', credentials: 'include' });
                    if (res.ok) {
                        refreshAll();
                        return { success: true, type: 'delete', message: 'Document deleted successfully' };
                    }
                    // Revert on failure
                    refreshAll();
                    throw new Error('Deletion failed');
                }, {
                    type: 'delete',
                    undoFn: () => fetch(`/api/documents/${fileId}/undo`, { method: 'POST', credentials: 'include' })
                });
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    const undoDelete = async (fileId) => {
        await fetch(`/api/documents/${fileId}/undo`, { method: 'POST', credentials: 'include' });
        refreshDocuments(true);
        refreshStats(true);
    };

    const bulkDeleteSelected = async () => {
        if (!selectedIds.length) return;

        setConfirmModal({
            isOpen: true,
            title: 'Delete Selected Documents',
            message: `Are you sure you want to delete all ${selectedIds.length} selected documents?`,
            type: 'danger',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                runBackgroundTask(`Deleting ${selectedIds.length} files`, async () => {
                    let successCount = 0;
                    for (const id of selectedIds) {
                        try {
                            const res = await fetch(`/api/documents/${id}`, { method: 'DELETE', credentials: 'include' });
                            if (res.ok) successCount++;
                        } catch (err) {
                            console.error(`Failed to delete ${id}`, err);
                        }
                    }
                    setSelectedIds([]); // Clear selection after delete
                    refreshAll();
                    return { success: true, message: `Successfully deleted ${successCount} files.` };
                });
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    const handleRequestToPrint = async (file) => {
        setConfirmModal({
            isOpen: true,
            title: 'Request to Print',
            message: `Generate a printing ticket for "${file.personName || file.name}"? This will send it directly to the Waiting queue.`,
            type: 'info',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                runBackgroundTask(`Print Request: ${file.personName || file.name}`, async () => {
                    try {
                        const purpose = file.type || file.detected_type || 'birth';
                        const ticketRes = await fetch('/api/v1/tickets', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                            body: JSON.stringify({
                                client_name: file.personName || file.name || 'Walk-in Client',
                                purpose: purpose,
                                source: 'walk-in'
                            })
                        });
                        const ticketData = await ticketRes.json();
                        if (!ticketRes.ok || !ticketData.success) throw new Error(ticketData.message || 'Failed to create ticket');

                        const attachRes = await fetch(`/api/v1/tickets/${ticketData.ticket.id}/attach`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                            body: JSON.stringify({ document_id: file.id })
                        });
                        const attachData = await attachRes.json();
                        if (!attachRes.ok || !attachData.success) throw new Error(attachData.message || 'Failed to attach document');

                        return { success: true, message: `Ticket ${ticketData.ticket.ticket_number} created in Waiting queue.` };
                    } catch (err) {
                        throw err;
                    }
                });
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };



    const docTypes = [
        { type: 'birth', icon: <UserIcon className="w-5 h-5 text-[#d4a574]" />, name: 'Birth Certificate', desc: 'Live birth records' },
        { type: 'death', icon: <DocumentTextIcon className="w-5 h-5 text-rose-500" />, name: 'Death Certificate', desc: 'Registry of deaths' },
        { type: 'marriage', icon: <UsersIcon className="w-5 h-5 text-indigo-500" />, name: 'Marriage License', desc: 'Marriage contracts' },
    ];

    const statusBadge = (file) => {
        const status = file.status;
        const map = {
            processed: 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-[0_0_12px_-4px_rgba(16,185,129,0.3)]',
            extracted: 'bg-blue-50 text-blue-700 border-blue-100 shadow-[0_0_12px_-4px_rgba(59,130,246,0.3)]',
            processing: 'text-indigo-700',
            uploading: 'text-slate-600',
            failed: 'bg-rose-50 text-rose-700 border-rose-100',
            stopped: 'bg-slate-100 text-slate-500 border-slate-300',
            pending: 'text-amber-700',
        };

        const s = status?.toLowerCase();

        if (s === 'checking') {
            return (
                <span
                    className="relative inline-flex items-center overflow-hidden rounded-full border text-[10px] font-extrabold uppercase tracking-tight bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                    style={{
                        minWidth: '96px',
                        height: '24px',
                        justifyContent: 'center',
                    }}
                >
                    <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin text-indigo-500" />
                    Checking…
                </span>
            );
        }

        // ── Active states: real progress bar pill ───────────────────────────
        if (s === 'processing' || s === 'uploading' || s === 'pending') {
            const isPending = s === 'pending';
            const isProcessing = s === 'processing';

            const label = isPending ? 'In Queue'
                : isProcessing ? (file.batch_total > 1 ? `OCR Working ${file.batch_processed ?? 1}/${file.batch_total}` : 'OCR Working…')
                    : 'Uploading…';

            // Solid fill colors
            const fillGradient = isPending
                ? 'linear-gradient(90deg, #f97316, #fb923c, #fdba74)'  // orange
                : isProcessing
                    ? 'linear-gradient(90deg, #6366f1, #818cf8, #a5b4fc)' // indigo
                    : 'linear-gradient(90deg, #94a3b8, #cbd5e1)';

            const trackBg = isPending ? '#fff7ed'
                : isProcessing ? '#eef2ff'
                    : '#f8fafc';

            const borderColor = isPending ? '#fed7aa'
                : isProcessing ? '#c7d2fe'
                    : '#e2e8f0';

            const textColor = isPending ? '#9a3412'
                : isProcessing ? '#3730a3'
                    : '#475569';

            const animName = isPending ? 'ocr-pending-fill' : 'ocr-active-fill';

            return (
                <span
                    className="relative inline-flex items-center overflow-hidden rounded-full border text-[10px] font-extrabold uppercase tracking-tight"
                    style={{
                        minWidth: '96px',
                        height: '24px',
                        backgroundColor: trackBg,
                        borderColor: borderColor,
                        justifyContent: 'center',
                    }}
                >
                    {/* Solid fill bar that sweeps left → right smoothly */}
                    <span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                            background: fillGradient,
                            animation: `${animName} 1.6s linear infinite`,
                        }}
                    />
                    {/* Label on top */}
                    <span className="relative z-10" style={{ color: textColor }}>{label}</span>
                </span>
            );
        }

        // ── Terminal states: original plain pill ─────────────────────────────
        if (file.has_duplicate && s === 'extracted') {
            return (
                <motion.span
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-tight bg-amber-50 text-amber-700 border-amber-200 shadow-[0_0_12px_-4px_rgba(245,158,11,0.3)] animate-pulse"
                    title="Potential duplicate in Master Registry"
                >
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Duplicate
                </motion.span>
            );
        }

        let labelStr = status;
        if (s === 'processed') labelStr = 'Saved';
        else if (s === 'extracted') labelStr = 'Done';
        else if (s === 'failed') labelStr = 'Failed';
        else if (s === 'stopped') labelStr = 'Stopped';

        const terminalCls = {
            processed: 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-[0_0_12px_-4px_rgba(16,185,129,0.3)]',
            extracted: 'bg-blue-50 text-blue-700 border-blue-100 shadow-[0_0_12px_-4px_rgba(59,130,246,0.3)]',
            failed: 'bg-rose-50 text-rose-700 border-rose-100',
            stopped: 'bg-slate-100 text-slate-500 border-slate-300',
        }[s] || 'bg-slate-100 text-slate-500 border-slate-200';

        return (
            <motion.span
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-tight ${terminalCls}`}
            >
                {labelStr}
            </motion.span>
        );
    };

    // ── Data Splitting & Filtering ──────────────────────────────────────────
    const queueFiles = files.filter(f =>
        f.status?.toLowerCase() !== 'processed' &&
        f.status?.toLowerCase() !== 'issued'
    );

    // Map history logs for the UI (using log fields but keeping logic compatible)
    const historyFiles = historyLogs.map(log => ({
        ...log,
        id: log.id,
        name: log.filename,
        personName: log.person_name,
        type: log.type,
        barangay: log.barangay,
        encoded_by: log.encoded_by,
        created_at: log.created_at,
        status: log.action.toLowerCase(),
        isLog: true // flag to indicate this is a log record
    }));



    const filteredQueue = queueFiles.filter(f =>
        !queueSearch || f.name.toLowerCase().includes(queueSearch.toLowerCase())
    );

    const filteredHistory = historyFiles.filter(f => {
        // Search filter
        const matchesSearch = !historySearch ||
            f.name.toLowerCase().includes(historySearch.toLowerCase()) ||
            f.personName?.toLowerCase().includes(historySearch.toLowerCase());

        if (!matchesSearch) return false;

        // Type filter
        if (historyFilters.type !== 'all' && (f.detected_type || f.type) !== historyFilters.type) return false;

        // Staff filter
        if (historyFilters.staff !== 'all' && f.encoded_by !== historyFilters.staff) return false;

        // Barangay filter
        if (historyFilters.barangay !== 'all' && f.barangay !== historyFilters.barangay) return false;

        // Date filter
        if (historyFilters.dateRange !== 'all') {
            const docDate = new Date(f.created_at);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (historyFilters.dateRange === 'today') {
                if (docDate < today) return false;
            } else if (historyFilters.dateRange === 'yesterday') {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                if (docDate < yesterday || docDate >= today) return false;
            } else if (historyFilters.dateRange === 'week') {
                const lastWeek = new Date(today);
                lastWeek.setDate(lastWeek.getDate() - 7);
                if (docDate < lastWeek) return false;
            } else if (historyFilters.dateRange === 'month') {
                const lastMonth = new Date(today);
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                if (docDate < lastMonth) return false;
            }
        }

        return true;
    });

    // Extract unique staff and barangays for filters
    const staffList = [...new Set(historyFiles.map(f => f.encoded_by).filter(Boolean))];
    const barangayList = [...new Set(historyFiles.map(f => f.barangay).filter(Boolean))];

    return (
        <div className="p-1 sm:p-4">
            {/* View Modal */}
            <AnimatePresence>
                {previewFile && (
                    <DocumentPreviewModal
                        file={previewFile}
                        onClose={() => setPreviewFile(null)}
                    />
                )}
            </AnimatePresence>

            <ActionConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
                onCancel={confirmModal.onCancel}
            />

            {/* OCR Form Panel */}
            <AnimatePresence>
                {activeOcr && (
                    <OcrFormPanel
                        file={activeOcr.file}
                        docType={activeOcr.file?.type || selectedDocType}
                        ocrResult={activeOcr.ocrResult}
                        onSave={saveRecord}
                        onMinimize={() => setActiveOcr(null)}
                        isSaving={isOcrSaving}
                        onClose={async () => {
                            if (activeOcr.file && activeOcr.file.file_path === null && activeOcr.file.name === 'Manual Entry' && activeOcr.file.id !== 'manual') {
                                try {
                                    await fetch(`/api/documents/${activeOcr.file.id}`, { method: 'DELETE', credentials: 'include' });
                                    refreshDocuments(true);
                                } catch (e) {
                                    console.error("Failed to delete manual draft", e);
                                }
                            }
                            setActiveOcr(null);
                        }}
                        onDuplicateStatusChange={handleDuplicateStatusChange}
                    />
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-8 max-w-[1400px] mx-auto pb-12"
            >
                {activePrefill && (
                    <div className="bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-lg shadow-indigo-900/10 flex items-center justify-between animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-bold">Ticket</span>
                            <div>
                                <p className="text-sm font-black">Active Request: Serving {activePrefill.ticket_number}</p>
                                <p className="text-xs text-indigo-200">
                                    Client: {activePrefill.client_name} • Requesting {activePrefill.purpose.toUpperCase()} certificate. Upload a scanned record to auto-merge with their details.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('civicore_ticket_prefill');
                                checkPrefill();
                            }}
                            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Left: Upload Panel ──────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60"
                    >
                        <h2 className="text-xl font-bold text-slate-800 mb-1">Upload Document</h2>
                        <p className="text-xs text-slate-500 mb-5">Select type, then drag & drop or click to upload</p>

                        <div className="space-y-2.5 mb-5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Category</label>
                            {docTypes.map(doc => {
                                const tColors = {
                                    birth: 'border-[#d4a574] bg-[#d4a574]/5 text-[#d4a574] ring-[#d4a574]/30',
                                    death: 'border-rose-500 bg-rose-50 text-rose-500 ring-rose-500/30',
                                    marriage: 'border-indigo-500 bg-indigo-50 text-indigo-500 ring-indigo-500/30'
                                }[doc.type] || 'border-slate-500 bg-slate-50 text-slate-500 ring-slate-500/30';

                                const isSelected = selectedDocType === doc.type;

                                return (
                                    <div key={doc.type} onClick={() => setSelectedDocType(doc.type)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${isSelected
                                            ? `${tColors.split(' ')[0]} ${tColors.split(' ')[1]} shadow-sm`
                                            : 'border-transparent bg-slate-50 hover:bg-slate-100'
                                            }`}>
                                        <div className={`w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm ${isSelected ? `ring-1 ${tColors.split(' ')[3]}` : ''}`}>
                                            {doc.icon}
                                        </div>
                                        <div>
                                            <div className={`font-semibold text-sm ${isSelected ? tColors.split(' ')[2] : 'text-slate-700'}`}>{doc.name}</div>
                                            <div className="text-xs text-slate-400">{doc.desc}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-3">
                            <div {...getRootProps()}
                                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer text-center transition-all ${isDragActive || dragging
                                    ? 'border-[#d4a574] bg-[#d4a574]/5'
                                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                                    }`}>
                                <input {...getInputProps()} />
                                <CloudArrowUpIcon className={`w-10 h-10 mb-2 ${isDragActive ? 'text-[#d4a574]' : 'text-slate-300'}`} />
                                <p className="text-sm font-semibold text-slate-600 mb-0.5">Drop file here or click</p>
                                <p className="text-xs text-slate-400">PDF, JPG, PNG, TIFF, DOCX — max 10 MB</p>
                            </div>

                            <div className="relative mt-5">
                                <button
                                    onClick={() => setIsCameraOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm active:scale-95 transition-all"
                                >
                                    <CameraIcon className="w-5 h-5 text-indigo-500" />
                                    Use Device Camera
                                </button>

                                <CameraModal
                                    isOpen={isCameraOpen}
                                    onClose={() => setIsCameraOpen(false)}
                                    onCapture={(capturePayload) => onDrop([capturePayload])}
                                />
                            </div>

                            <div className="relative mt-3">
                                <button
                                    onClick={handleManualRegistration}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#0f172a] text-[#d4a574] rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm active:scale-95 transition-all"
                                >
                                    Manual Registration
                                </button>
                            </div>
                        </div>


                    </motion.div>

                    {/* ── Right Panel: Tabs & Tables ─────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                        className="lg:col-span-2 bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col overflow-hidden"
                    >
                        {/* Tab Switcher */}
                        <div className="flex items-center bg-slate-100/50 p-1.5 gap-1 border-b border-slate-100">
                            {[
                                { id: 'queue', label: 'Document Queue', count: queueFiles.length, icon: BoltIcon, show: true },
                                { id: 'history', label: 'Submission History', count: historyFiles.length, icon: CheckCircleIcon, show: true }
                            ].filter(t => t.show).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id
                                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                                        }`}
                                >
                                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                                    {tab.label}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}


                        </div>

                        {activeTab === 'queue' ? (
                            <>
                                {/* Queue Header */}
                                <div className="p-5 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Active Queue</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Documents waiting for extraction or approval</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="relative">
                                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <input value={queueSearch} onChange={e => setQueueSearch(e.target.value)}
                                                placeholder="Search Queue…"
                                                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 w-36"
                                            />
                                        </div>
                                        {queueFiles.filter(f => f.status?.toLowerCase() === 'extracted').length > 0 && (
                                            <button onClick={bulkApprove}
                                                className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white px-3 py-2 rounded-lg border border-emerald-100 transition-all flex items-center gap-1.5 shadow-sm">
                                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                                Approve All
                                            </button>
                                        )}
                                        {queueFiles.some(f => ['pending', 'failed', 'uploaded'].includes(f.status?.toLowerCase())) && (
                                            <button onClick={bulkProcess}
                                                className="text-xs font-bold text-[#d4a574] bg-[#d4a574]/10 hover:bg-[#d4a574] hover:text-[#0f172a] px-3 py-2 rounded-lg border border-[#d4a574]/20 transition-all flex items-center gap-1.5 disabled:opacity-50">
                                                <CloudArrowUpIcon className="w-3.5 h-3.5" />
                                                Process All
                                            </button>
                                        )}
                                        {selectedIds.length > 0 && (
                                            <button onClick={bulkDeleteSelected}
                                                className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white px-3 py-2 rounded-lg border border-rose-100 transition-all flex items-center gap-1.5 shadow-sm">
                                                <TrashIcon className="w-3.5 h-3.5" />
                                                Delete Selected ({selectedIds.length})
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isLoadingData ? (
                                    <div className="p-4"><SkeletonLoader type="table" rows={5} /></div>
                                ) : filteredQueue.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 p-12 text-slate-400 text-center">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                            <BoltIcon className="w-8 h-8 opacity-20" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-600">{queueSearch ? 'No matching queue items' : 'Queue is currently empty'}</p>
                                        <p className="text-xs mt-1 max-w-[200px]">{queueSearch ? 'Adjust your search query' : 'Upload documents to begin processing'}</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto custom-scrollbar flex-1 w-full">
                                        <table className="w-full text-left border-collapse table-auto">
                                            <thead>
                                                <tr className="bg-slate-50/50 text-slate-400 text-[9px] uppercase tracking-widest border-b border-slate-100">
                                                    <th className="px-3 py-2.5 font-black text-slate-500 w-10">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-slate-300 text-[#d4a574] focus:ring-[#d4a574]/30"
                                                            checked={selectedIds.length === filteredQueue.length && filteredQueue.length > 0}
                                                            onChange={() => toggleSelectAll(filteredQueue)}
                                                        />
                                                    </th>
                                                    <th className="px-3 py-2.5 font-black text-slate-500">Document</th>
                                                    <th className="px-2 py-2.5 font-black text-slate-500 w-16">Type</th>
                                                    <th className="px-2 py-2.5 text-center font-black text-slate-500">Status</th>
                                                    <th className="px-3 py-2.5 text-right font-black text-slate-500 w-28">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredQueue.map(file => (
                                                    <tr key={file.id} className="hover:bg-slate-50/60 transition-colors">
                                                        {file.isDeleted ? (
                                                            <td colSpan="6" className="p-4 text-center">
                                                                <span className="text-sm text-slate-500 mr-3">Document temporarily deleted.</span>
                                                                <button onClick={() => undoDelete(file.id)} className="text-xs font-bold text-[#d4a574] border border-[#d4a574]/30 bg-[#d4a574]/10 hover:bg-[#d4a574] hover:text-[#0f172a] px-3 py-1.5 rounded-lg transition-colors">Undo</button>
                                                            </td>
                                                        ) : (
                                                            <>
                                                                <td className="px-3 py-2.5">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="rounded border-slate-300 text-[#d4a574] focus:ring-[#d4a574]/30"
                                                                        checked={selectedIds.includes(file.id)}
                                                                        onChange={() => toggleSelect(file.id)}
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2.5">
                                                                    <div className="flex items-center">
                                                                        <div className="min-w-0">
                                                                            <p
                                                                                className="text-[11px] font-bold text-slate-800 truncate max-w-[22ch] hover:text-[#d4a574] cursor-pointer transition-colors"
                                                                                title={file.name}
                                                                                onClick={() => setPreviewFile(file)}
                                                                            >
                                                                                {file.name}
                                                                            </p>
                                                                            <p className="text-[9px] text-slate-400 font-medium truncate uppercase tracking-tighter">
                                                                                {file.extracted_fields?.full_name || file.personName || `${file.size || ''} · ${file.encoded_by || 'Unknown'}`}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-2 py-2.5">
                                                                    {(() => {
                                                                        const rawType = ((file.detected_type && file.detected_type.toLowerCase() !== 'unknown') ? file.detected_type : (file.type && file.type.toLowerCase() !== 'unknown' ? file.type : 'birth')).toLowerCase();
                                                                        const colorClass = rawType === 'birth' ? 'text-[#d4a574]' : rawType === 'death' ? 'text-rose-500' : 'text-indigo-500';
                                                                        return (
                                                                            <span className={`text-xs font-black uppercase tracking-wider ${colorClass}`}>
                                                                                {rawType}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td className="px-2 py-2.5 text-center">{statusBadge(file)}</td>
                                                                <td className="px-3 py-2.5 text-right">
                                                                    <div className="flex items-center justify-end gap-1 px-1">
                                                                        {['pending', 'processing'].includes(file.status?.toLowerCase()) && (
                                                                            <button onClick={() => toggleOcrStatus(file.id, file.status)}
                                                                                className="p-2.5 text-amber-600 bg-amber-50/80 hover:bg-amber-600 hover:border-amber-600 hover:text-white rounded-xl transition-all border border-amber-200 cursor-pointer shadow-sm active:scale-90 group/btn"
                                                                                title="Stop Processing">
                                                                                <StopIcon className="w-4 h-4 text-amber-600 group-hover/btn:text-white transition-colors" />
                                                                            </button>
                                                                        )}

                                                                        {['stopped', 'failed', 'uploaded'].includes(file.status?.toLowerCase()) && (
                                                                            <button onClick={() => toggleOcrStatus(file.id, file.status)}
                                                                                className="p-2.5 text-sky-600 bg-sky-50/80 hover:bg-sky-600 hover:border-sky-600 hover:text-white rounded-xl transition-all border border-sky-200 cursor-pointer shadow-sm active:scale-90 group/btn"
                                                                                title="Resume / Retry Processing">
                                                                                <PlayIcon className="w-4 h-4 text-sky-600 group-hover/btn:text-white transition-colors" />
                                                                            </button>
                                                                        )}

                                                                        {['extracted', 'processed'].includes(file.status?.toLowerCase()) && (
                                                                            <button onClick={() => setActiveOcr({ file, ocrResult: { extracted_fields: file.extracted_fields, detected_type: file.detected_type, text: file.ocr_text } })}
                                                                                className="p-2.5 text-indigo-600 bg-indigo-50/80 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white rounded-xl transition-all border border-indigo-200 cursor-pointer shadow-sm active:scale-95 group/btn"
                                                                                title={file.status?.toLowerCase() === 'processed' ? 'View Details' : 'Review & Edit'}>
                                                                                <PencilSquareIcon className="w-4 h-4 text-indigo-600 group-hover/btn:text-white transition-colors" />
                                                                            </button>
                                                                        )}

                                                                        {file.status?.toLowerCase() === 'extracted' && (
                                                                            file.has_duplicate ? (
                                                                                <button onClick={() => showAlert({ title: 'Duplicate Warning', message: 'This document has a potential duplicate in the Master Registry. Direct approval is blocked. Please click the Pencil icon to review side-by-side.', type: 'warning' })}
                                                                                    className="p-2.5 text-slate-400 bg-slate-100 border border-slate-200 rounded-xl cursor-pointer"
                                                                                    title="Direct Approve Blocked (Potential Duplicate)">
                                                                                    <CheckCircleIcon className="w-4 h-4 text-slate-400" />
                                                                                </button>
                                                                            ) : (
                                                                                <button onClick={() => approveRecord(file.id)}
                                                                                    className="p-2.5 text-emerald-600 bg-emerald-50/80 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white rounded-xl transition-all border border-emerald-200 cursor-pointer shadow-sm active:scale-95 group/btn"
                                                                                    title="Direct Approve">
                                                                                    <CheckCircleIcon className="w-4 h-4 text-emerald-600 group-hover/btn:text-white transition-colors" />
                                                                                </button>
                                                                            )
                                                                        )}

                                                                        <button onClick={() => removeFile(file.id)}
                                                                            className="p-2.5 text-rose-600 bg-rose-50/80 hover:bg-rose-600 hover:border-rose-600 hover:text-white rounded-xl transition-all border border-rose-200 cursor-pointer shadow-sm active:scale-90 group/btn"
                                                                            title="Delete Document">
                                                                            <TrashIcon className="w-4 h-4 text-rose-600 group-hover/btn:text-white transition-colors" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        ) : activeTab === 'history' ? (
                            <>
                                {/* History Filters */}
                                <div className="p-4 bg-slate-50/80 border-b border-slate-100 space-y-3">
                                    <div className="flex flex-wrap gap-3 items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    value={historySearch}
                                                    onChange={e => setHistorySearch(e.target.value)}
                                                    placeholder="Search history by name..."
                                                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 shadow-sm"
                                                />
                                            </div>
                                            <div className="h-6 w-px bg-slate-200 mx-1" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filters:</span>
                                        </div>
                                        <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                            Showing {filteredHistory.length} of {historyFiles.length} records
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {/* Date Filter */}
                                        <select
                                            value={historyFilters.dateRange}
                                            onChange={e => setHistoryFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                                            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
                                        >
                                            <option value="all">Any Date</option>
                                            <option value="today">Today</option>
                                            <option value="yesterday">Yesterday</option>
                                            <option value="week">Past 7 Days</option>
                                            <option value="month">Past 30 Days</option>
                                        </select>

                                        {/* Type Filter */}
                                        <select
                                            value={historyFilters.type}
                                            onChange={e => setHistoryFilters(prev => ({ ...prev, type: e.target.value }))}
                                            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm capitalize"
                                        >
                                            <option value="all">All Types</option>
                                            <option value="birth">Birth Certificate</option>
                                            <option value="death">Death Certificate</option>
                                            <option value="marriage">Marriage License</option>
                                        </select>

                                        {/* Staff Filter */}
                                        <select
                                            value={historyFilters.staff}
                                            onChange={e => setHistoryFilters(prev => ({ ...prev, staff: e.target.value }))}
                                            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
                                        >
                                            <option value="all">All Staff</option>
                                            {staffList.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>

                                        {/* Barangay Filter */}
                                        <select
                                            value={historyFilters.barangay}
                                            onChange={e => setHistoryFilters(prev => ({ ...prev, barangay: e.target.value }))}
                                            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
                                        >
                                            <option value="all">All Barangays</option>
                                            {barangayList.map(brgy => (
                                                <option key={brgy} value={brgy}>{brgy}</option>
                                            ))}
                                        </select>

                                        {/* Reset Filters */}
                                        {(historySearch || historyFilters.type !== 'all' || historyFilters.staff !== 'all' || historyFilters.barangay !== 'all' || historyFilters.dateRange !== 'all') && (
                                            <button
                                                onClick={() => {
                                                    setHistorySearch('');
                                                    setHistoryFilters({ type: 'all', staff: 'all', barangay: 'all', dateRange: 'all' });
                                                }}
                                                className="text-[10px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-tighter px-2 flex items-center gap-1 transition-colors group"
                                            >
                                                <XMarkIcon className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isLoadingData ? (
                                    <div className="p-4"><SkeletonLoader type="table" rows={8} /></div>
                                ) : filteredHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 p-16 text-slate-400 text-center">
                                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                            <MagnifyingGlassIcon className="w-10 h-10 opacity-10" />
                                        </div>
                                        <h4 className="text-slate-700 font-bold mb-1">No matching history records</h4>
                                        <p className="text-xs text-slate-400 max-w-xs mx-auto">Try adjusting your search query or filters to find what you're looking for.</p>
                                        {(historySearch || historyFilters.type !== 'all' || historyFilters.staff !== 'all' || historyFilters.barangay !== 'all' || historyFilters.dateRange !== 'all') && (
                                            <button
                                                onClick={() => {
                                                    setHistorySearch('');
                                                    setHistoryFilters({ type: 'all', staff: 'all', barangay: 'all', dateRange: 'all' });
                                                }}
                                                className="mt-6 text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100"
                                            >
                                                Clear all filters
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 text-slate-400 text-[9px] uppercase tracking-widest border-b border-slate-100">
                                                    <th className="px-3 py-2.5 font-black text-slate-500">Person / Document</th>
                                                    <th className="px-2 py-2.5 font-black text-slate-500">Barangay</th>
                                                    <th className="px-2 py-2.5 font-black text-slate-500">Process Date</th>
                                                    <th className="px-2 py-2.5 font-black text-slate-500">Staff / Admin</th>
                                                    <th className="px-3 py-2.5 text-right font-black text-slate-500">Record</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredHistory.map(file => {
                                                    const dateObj = new Date(file.created_at);
                                                    return (
                                                        <tr key={file.id} className="hover:bg-slate-50/60 transition-colors group">
                                                            <td className="px-3 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${file.type === 'birth' ? 'bg-blue-50 text-blue-500' :
                                                                        file.type === 'death' ? 'bg-slate-100 text-slate-600' :
                                                                            'bg-rose-50 text-rose-500'
                                                                        }`}>
                                                                        <DocumentIcon className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-[11px] font-bold text-slate-800 truncate max-w-[20ch]">
                                                                            {(!file.personName || file.personName.toLowerCase().includes('unnamed')) ? file.name : file.personName}
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1.5">
                                                                            <span className="uppercase tracking-tighter">{file.detected_type || file.type}</span>
                                                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                            <span className="truncate max-w-[15ch]">{file.name}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-3">
                                                                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
                                                                    {file.barangay || '—'}
                                                                </span>
                                                            </td>
                                                            <td className="px-2 py-3">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                                                                        {file.created_at ? new Date(file.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 font-medium tabular-nums">
                                                                        {file.created_at ? new Date(file.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                                                        {file.encoded_by ? file.encoded_by.charAt(0).toUpperCase() : '?'}
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-slate-600 truncate max-w-[10ch]">{file.encoded_by || 'Unknown'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3 text-right">
                                                                <div className="flex items-center justify-end">
                                                                    {file.isLog ? (
                                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100/50 italic">
                                                                            Persistent Record
                                                                        </span>
                                                                    ) : (
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() => handleRequestToPrint(file)}
                                                                                className="px-3 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg transition-all"
                                                                            >
                                                                                Request to Print
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setActiveOcr({ file, ocrResult: { extracted_fields: file.extracted_fields, detected_type: file.detected_type, text: file.ocr_text } })}
                                                                                className="px-3 py-1.5 text-[10px] font-bold text-white bg-[#d4a574] hover:bg-[#c29463] rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap flex items-center gap-1.5"
                                                                            >
                                                                                <DocumentCheckIcon className="w-4 h-4" />
                                                                                View Details
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        ) : null}


                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default Documents;
