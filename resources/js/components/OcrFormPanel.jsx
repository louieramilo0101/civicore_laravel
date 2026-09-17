import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DocumentCheckIcon, XMarkIcon,
    ExclamationTriangleIcon, ShieldExclamationIcon,
    CloudArrowUpIcon, SparklesIcon, ArrowPathIcon,
    PencilSquareIcon, DocumentPlusIcon, DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useData } from './DataContext.jsx';
import SignaturePad from './SignaturePad.jsx';

// ── Helper: compute age from a date string ───────────────────────────────────
/** Computes a person’s completed age from an ISO date string. */
export function computeAge(dobString) {
    if (!dobString) return null;
    const dob = new Date(dobString.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'));
    if (isNaN(dob)) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
}

// ── Parental Consent Modal ────────────────────────────────────────────────────
/** Requests consent details when a certificate requires parental approval. */
export const ParentalConsentModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-900 leading-normal">
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-amber-100"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <ShieldExclamationIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Parental Consent Required</h3>
                    <p className="text-xs text-slate-500">Subject appears to be under 18 years old</p>
                </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 mb-5 border border-amber-100 text-sm text-amber-800">
                This document involves a minor. Please confirm that the necessary parental or guardian consent has been obtained before proceeding.
            </div>

            <div className="space-y-3 mb-5">
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" id="consent-checkbox" className="mt-1 accent-amber-500 w-4 h-4 flex-shrink-0" />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">
                        I confirm that parental/guardian consent has been obtained and is on file.
                    </span>
                </label>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    onClick={() => {
                        const checked = document.getElementById('consent-checkbox')?.checked;
                        if (!checked) {
                            alert('Please confirm the checkbox before proceeding.');
                            return;
                        }
                        onConfirm();
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors cursor-pointer"
                >
                    Confirm & Continue
                </button>
            </div>
        </motion.div>
    </div>
);

import { BirthConfig, BirthTemplateOverlayFields } from './forms/BirthCertificateConfig.js';
import { DeathConfig, DeathTemplateOverlayFields } from './forms/DeathCertificateConfig.js';
import { MarriageConfig, MarriageTemplateOverlayFields } from './forms/MarriageCertificateConfig.js';
import { NAIC_BARANGAYS } from './forms/SharedConfig.js';

/** Normalizes a barangay name before fuzzy matching. */
const normalizeBrgyString = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/^(brgy\.?|barangay)\s+/i, '')
        .replace(/[^a-z0-9]/gi, '')
        .trim();
};

/** Finds the closest configured barangay label for OCR output. */
const findClosestBarangay = (raw) => {
    if (!raw) return '';
    const normalizedRaw = normalizeBrgyString(raw);
    for (const sb of NAIC_BARANGAYS) {
        if (normalizeBrgyString(sb) === normalizedRaw || raw.toLowerCase().includes(normalizeBrgyString(sb))) {
            return sb;
        }
    }
    return '';
};

const FIELD_CONFIG = {
    birth: BirthConfig,
    death: DeathConfig,
    marriage: MarriageConfig
};

/** Merges OCR output and file metadata into editable form state. */
const getInitialFormData = (type, ocrFields, fileObj) => {
    let ef = ocrFields || {};
    if (typeof ef === 'string') {
        try { ef = JSON.parse(ef); } catch (e) { ef = {}; }
    }
    const isManualEntry = !fileObj?.file_path || fileObj?.name === 'Manual Entry' || fileObj?.id === 'manual';
    const init = {};
    const configSections = FIELD_CONFIG[type] || FIELD_CONFIG.birth;

    configSections.forEach(section => {
        section.fields.forEach(f => {
            let val = ef[f.key] === undefined || ef[f.key] === null ? '' : String(ef[f.key]).trim();
            if (f.type === 'date') {
                if (val && val.toLowerCase() !== 'n/a' && val.toLowerCase() !== 'not applicable') {
                    const d = new Date(val.replace(/[^0-9a-zA-Z/-]/g, ' '));
                    if (!isNaN(d.getTime())) {
                        val = d.toISOString().split('T')[0];
                    } else {
                        val = '';
                    }
                } else {
                    val = '';
                }
            } else if (f.key === 'barangay' && val) {
                // Fuzzy match barangay to the exact options available
                val = findClosestBarangay(val);
            }
            if (!isManualEntry) {
                if (!f.required && val === '' && f.type !== 'date') {
                    val = 'n/a';
                }
                if (f.type === 'signature' && val === '') {
                    val = 'n/a';
                }
            }
            init[f.key] = val;
        });
    });

    // Default province and city/municipality for Naic LCRO records if missing
    if (!init.province || init.province === 'n/a' || init.province === '') {
        init.province = 'Cavite';
    }
    if (!init.city_municipality || init.city_municipality === 'n/a' || init.city_municipality === '') {
        init.city_municipality = 'Naic';
    }

    // Try auto-detecting barangay from raw address fields if barangay is not explicitly set
    if (!init.barangay || init.barangay === 'n/a' || init.barangay === '' || init.barangay === 'Select...') {
        const allText = Object.values(ef).filter(v => typeof v === 'string').join(' ');
        const detectedBrgy = findClosestBarangay(allText);
        if (detectedBrgy) {
            init.barangay = detectedBrgy;
        }
    }

    try {
        const prefillStr = sessionStorage.getItem('civicore_ticket_prefill');
        if (prefillStr) {
            const prefill = JSON.parse(prefillStr);
            if (prefill && prefill.purpose === type && prefill.details) {
                Object.keys(prefill.details).forEach(key => {
                    if (prefill.details[key] !== undefined && prefill.details[key] !== '') {
                        init[key] = prefill.details[key];
                    }
                });
            }
        }
    } catch (err) {
        console.error('Error merging ticket details in getInitialFormData:', err);
    }

    return init;
};

/** Returns the certificate-specific maximum length for a field. */
const getFieldMaxLength = (field) => {
    if (field.maxLength) return field.maxLength;
    const k = (field.key || '').toLowerCase();
    if (k.includes('name') || k.includes('officer') || k.includes('father') || k.includes('mother') || k.includes('informant') || k.includes('person') || k.includes('client')) return 50;
    if (k.includes('place') || k.includes('residence') || k.includes('address') || k.includes('cemetery') || k.includes('hospital')) return 255;
    if (k.includes('no') || k.includes('number') || k.includes('registry') || k.includes('code') || k.includes('permit')) return 30;
    if (k.includes('age') || k.includes('day') || k.includes('month') || k.includes('year') || k.includes('duration') || k.includes('weight') || k.includes('total') || k.includes('living') || k.includes('dead') || k.includes('order')) return 20;
    if (k.includes('phone')) return 15;
    if (k.includes('email')) return 100;
    if (k.includes('remark') || k.includes('note') || k.includes('condition')) return 1000;
    return 100;
};

/** Presents OCR results for correction, validation, and document registration. */
const OcrFormPanel = ({ file, docType, ocrResult, onSave, onClose, onMinimize, onDuplicateStatusChange, isSaving = false, isViewOnly = false, hideBoxes = false }) => {
    const { stats } = useData();

    const detectedType = ocrResult?.detected_type !== 'unknown' ? ocrResult?.detected_type : (docType || file.type || 'unknown');
    
    // Loaded manually or from cache
    const [manualType, setManualType] = useState(() => {
        try {
            const cachedType = sessionStorage.getItem(`civicore_ocr_draft_type_${file.id}`);
            if (cachedType) return cachedType;
        } catch (err) {
            console.error('Error loading manualType draft:', err);
        }
        return detectedType === 'unknown' ? '' : detectedType;
    });
    
    const effectiveType = manualType || detectedType;
    const isManualEntry = !file?.file_path || file?.name === 'Manual Entry' || file?.id === 'manual';
    const isEditMode = !isManualEntry && (file?.status === 'processed' || file?.status === 'extracted' || file?.source === 'issuance' || isViewOnly);

    // Left visual preview tab state: 'picture' (A4 Picture Scan) | 'pdf' (Live Certificate PDF)
    const [leftPreviewTab, setLeftPreviewTab] = useState('picture');

    // Optimized Reference Document Loading (Instant HTTP Browser Caching & Direct PDF rendering)
    const isPdf = useMemo(() => {
        const fn = (file?.name || file?.file_path || file?.original_filename || '').toLowerCase();
        const mime = (file?.mime_type || file?.type || '').toLowerCase();
        return fn.endsWith('.pdf') || mime.includes('pdf');
    }, [file]);

    const targetDocId = file?.realId || file?.document_id || file?.file_id || file?.id;
    const documentPreviewUrl = useMemo(() => {
        if (!targetDocId) return '';
        const stableVersion = file.updated_at ? new Date(file.updated_at).getTime() : (targetDocId || 1);
        return `/api/documents/view/${targetDocId}?raw=1&v=${stableVersion}`;
    }, [file, targetDocId]);

    const [isDocLoading, setIsDocLoading] = useState(true);
    useEffect(() => {
        setIsDocLoading(true);
    }, [documentPreviewUrl]);

    const formatNumber = (num) => {
        if (num === undefined || num === null) return '0';
        return Number(num).toLocaleString();
    };

    const currentCost = file?.metadata?.image_token_cost || ocrResult?.image_token_cost || 0;
    const totalUsed = stats?.tokensUsed || 0;
    const budget = stats?.tokenBudget || 1000000;
    const remaining = Math.max(0, budget - totalUsed);

    const isDirtyRef = useRef(false);

    // Normalize and parse extracted fields
    const [formData, setFormData] = useState(() => {
        try {
            const cachedDraft = sessionStorage.getItem(`civicore_ocr_draft_${file.id}`);
            if (cachedDraft) {
                return JSON.parse(cachedDraft);
            }
        } catch (err) {
            console.error('Error loading draft from sessionStorage:', err);
        }
        const rawFields = ocrResult?.extracted_fields || file.extracted_fields || {};
        return getInitialFormData(effectiveType, rawFields, file);
    });

    const [ocrText, setOcrText] = useState(() => {
        try {
            const cachedText = sessionStorage.getItem(`civicore_ocr_draft_text_${file.id}`);
            if (cachedText) return cachedText;
        } catch (err) {
            console.error('Error loading ocrText draft:', err);
        }
        return file.ocr_text || ocrResult?.text || '';
    });

    // Save draft data to sessionStorage when dirty
    useEffect(() => {
        if (isDirtyRef.current && file && file.id) {
            try {
                sessionStorage.setItem(`civicore_ocr_draft_${file.id}`, JSON.stringify(formData));
            } catch (err) {
                console.error('Error saving draft to sessionStorage:', err);
            }
        }
    }, [formData, file]);

    useEffect(() => {
        if (isDirtyRef.current && file && file.id) {
            try {
                if (manualType) {
                    sessionStorage.setItem(`civicore_ocr_draft_type_${file.id}`, manualType);
                } else {
                    sessionStorage.removeItem(`civicore_ocr_draft_type_${file.id}`);
                }
            } catch (err) {
                console.error('Error saving manualType draft:', err);
            }
        }
    }, [manualType, file]);

    useEffect(() => {
        if (isDirtyRef.current && file && file.id) {
            try {
                sessionStorage.setItem(`civicore_ocr_draft_text_${file.id}`, ocrText);
            } catch (err) {
                console.error('Error saving ocrText draft:', err);
            }
        }
    }, [ocrText, file]);

    const handleSaveAndClearCache = async (saveData) => {
        try {
            await onSave(saveData);
            try {
                sessionStorage.removeItem(`civicore_ocr_draft_${file.id}`);
                sessionStorage.removeItem(`civicore_ocr_draft_type_${file.id}`);
                sessionStorage.removeItem(`civicore_ocr_draft_text_${file.id}`);
            } catch (cacheErr) {
                console.error("Failed to clear draft cache:", cacheErr);
            }
        } catch (err) {
            console.error("Save action failed in panel wrapper:", err);
        }
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to discard your draft and reset fields to the original extracted values?")) {
            try {
                sessionStorage.removeItem(`civicore_ocr_draft_${file.id}`);
                sessionStorage.removeItem(`civicore_ocr_draft_type_${file.id}`);
                sessionStorage.removeItem(`civicore_ocr_draft_text_${file.id}`);
            } catch (err) {
                console.error('Error clearing draft cache on reset:', err);
            }
            isDirtyRef.current = false;
            const origType = detectedType === 'unknown' ? '' : detectedType;
            setManualType(origType);
            const rawFields = ocrResult?.extracted_fields || file.extracted_fields || {};
            const targetType = origType || 'birth';
            const resetData = getInitialFormData(targetType, rawFields, file);
            setFormData(resetData);
            setOcrText(file.ocr_text || ocrResult?.text || '');
            setErrors({});
        }
    };

    const [viewMode, setViewMode] = useState('fields');
    const [showDiagnosticBoxes, setShowDiagnosticBoxes] = useState(hideBoxes); // Toggle state for green grid
    const [showConsent, setShowConsent] = useState(false);
    const [consentGiven, setConsentGiven] = useState(false);
    const [savePending, setSavePending] = useState(false);
    const fieldConfidence = ocrResult?.field_confidence || {};

    const [duplicateData, setDuplicateData] = useState(null);
    const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

    useEffect(() => {
        const docId = file.id || file.file_id || file.document_id || file.realId;
        if (!docId) return;

        const checkDuplicateRecord = async () => {
            if (file.source === 'issuance') {
                return; // Do not check duplicates for existing registry records
            }

            setIsCheckingDuplicate(true);
            try {
                const res = await fetch(`/api/documents/${docId}/check-duplicate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        type: effectiveType,
                        fields: formData
                    })
                });
                const data = await res.json();
                const isDup = !!(data.success && data.duplicate);
                if (isDup) {
                    setDuplicateData(data.candidate);
                } else {
                    setDuplicateData(null);
                }
                if (onDuplicateStatusChange) {
                    onDuplicateStatusChange(docId, isDup);
                }
            } catch (err) {
                console.error("Error checking duplicate:", err);
            } finally {
                setIsCheckingDuplicate(false);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            checkDuplicateRecord();
        }, 1000);

    }, [
        formData.first_name, formData.last_name, 
        formData.husband_first_name, formData.husband_last_name, 
        formData.wife_first_name, formData.wife_last_name, 
        formData.deceased_first_name, formData.deceased_last_name, 
        formData.registry_number, formData.registry_no,
        effectiveType, manualType
    ]);

    /**
     * Returns Tailwind classes for field confidence:
     * - Low confidence  (<0.65) → amber border + faint yellow bg
     * - Medium          (<0.85) → slate border (default)
     * - High            (>=0.85) → emerald ring flash (only on first load)
     */
    /** Maps OCR confidence and validation state to a visual class. */
    const getConfidenceClass = (fieldKey, hasError) => {
        if (hasError) return 'border-rose-500 bg-rose-50/40 focus:ring-rose-200 focus:border-rose-600 ring-2 ring-rose-300 shadow-sm';
        const meta = fieldConfidence[fieldKey];
        if (!meta) return 'border-slate-200 focus:ring-slate-100 focus:border-slate-400 shadow-sm';
        if (meta.low_confidence || meta.confidence < 0.65) {
            return 'border-amber-300 bg-amber-50/30 focus:ring-amber-100 focus:border-amber-400 shadow-sm';
        }
        return 'border-slate-200 focus:ring-slate-100 focus:border-slate-400 shadow-sm';
    };

    /** Indicates whether a field needs manual review. */
    const isLowConf = (fieldKey) => {
        const meta = fieldConfidence[fieldKey];
        return meta && (meta.low_confidence || meta.confidence < 0.65);
    };

    const meta = useMemo(() => {
        try { return typeof file.metadata === 'string' ? JSON.parse(file.metadata) : (file.metadata || {}); }
        catch (e) { return {}; }
    }, [file.metadata]);

    const quickFillUsed = !!(ocrResult?.quick_fill_used || meta.quick_fill_used);
    const templateFamilyDetected = ocrResult?.template_family_detected || meta.template_family_detected || 'Not Detected';
    const templateOverlay = ocrResult?.template_overlay || null;

    const { templates } = useData();

    // Find a matching professional template for this document type
    const matchedTemplate = templates.find(t => {
        const tType = (t.type || '').toLowerCase();
        const eType = (effectiveType || '').toLowerCase();
        return (tType === eType || tType.includes(eType) || eType.includes(tType)) && t.config;
    }) || templates.find(t => {
        const tType = (t.type || '').toLowerCase();
        const eType = (effectiveType || '').toLowerCase();
        return tType === eType || tType.includes(eType) || eType.includes(tType);
    });

    const activeDocId = file?.realId || file?.document_id || file?.file_id || file?.id;

    // Sync form data if file changes or background extraction finishes
    useEffect(() => {
        isDirtyRef.current = false;
        const rawFields = ocrResult?.extracted_fields || file?.extracted_fields;
        if (rawFields) {
            let parsed = rawFields;
            if (typeof rawFields === 'string') {
                try { parsed = JSON.parse(rawFields); } catch (e) { console.error("Parse error", e); }
            }

            if (parsed && typeof parsed === 'object') {
                setFormData(getInitialFormData(effectiveType, parsed, file));
            }
        } else {
            setFormData(getInitialFormData(effectiveType, {}, file));
        }

        const newText = ocrResult?.text || file?.ocr_text || '';
        setOcrText(newText);
    }, [activeDocId, file?.id, file?.updated_at, ocrResult, effectiveType]);

    const typeMismatch = ocrResult?.type_mismatch;
    const mismatchMessage = ocrResult?.mismatch_message;

    const sourceDocumentId = file?.document_id || file?.source_document_id;
    const originalDocumentUrl = sourceDocumentId
        ? `/api/documents/view/${sourceDocumentId}?raw=1`
        : file?.file_url || null;

    const age = effectiveType === 'birth' ? computeAge(formData.date_of_birth) : null;
    const isMinor = age !== null && age < 18;

    const [errors, setErrors] = useState({});
    const fieldLabelMap = {};
    (FIELD_CONFIG[effectiveType] || FIELD_CONFIG.birth).forEach(section => {
        section.fields.forEach(f => {
            fieldLabelMap[f.key] = f.label;
        });
    });

    /** Validates and submits the edited OCR data to the parent workflow. */
    const handleSubmit = (e, minimize = false) => {
        if (e) e.preventDefault();

        // --- Block save if document type is unknown / not a valid document ---
        if (!effectiveType || effectiveType === 'unknown' || !['birth', 'death', 'marriage'].includes(effectiveType)) {
            setErrors({ _type: true });
            return;
        }

        // --- Strict Validation ---
        const configSections = FIELD_CONFIG[effectiveType] || FIELD_CONFIG.birth;
        const newErrors = {};
        let firstErrorField = null;

        configSections.forEach(section => {
            section.fields.forEach(f => {
                const rawVal = formData[f.key];
                const strVal = rawVal === undefined || rawVal === null ? '' : String(rawVal).trim();
                if (f.required && (strVal === '' || strVal === 'Select...')) {
                    newErrors[f.key] = true;
                    if (!firstErrorField) firstErrorField = f.label;
                }
            });
        });

        // Mandatory Barangay Check for Geospatial Analytics Mapping
        const brgyVal = formData.barangay ? String(formData.barangay).trim() : '';
        if (!brgyVal || brgyVal === 'Select...' || brgyVal === 'n/a') {
            newErrors.barangay = true;
            if (!firstErrorField) firstErrorField = 'Barangay (For analytics)';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            // Focus and scroll to the first error field automatically
            setTimeout(() => {
                const firstError = document.querySelector('.border-rose-500, select.border-rose-500, input.border-rose-500');
                if (firstError) {
                    firstError.focus();
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return;
        }

        // Sanitize: ALL empty/null/undefined optional fields → 'n/a' before saving
        const sanitizedFields = { ...formData };
        configSections.forEach(section => {
            section.fields.forEach(f => {
                const val = sanitizedFields[f.key];
                const strVal = val === undefined || val === null ? '' : String(val).trim();
                if (!f.required && f.key !== 'barangay') {
                    if (strVal === '' || strVal === 'n/a') {
                        sanitizedFields[f.key] = 'n/a';
                    }
                }
                // Signature fields always sanitize to 'n/a' if empty
                if (f.type === 'signature' && (strVal === '' || strVal === undefined || strVal === null)) {
                    sanitizedFields[f.key] = 'n/a';
                }
            });
        });

        if (isMinor && !consentGiven) {
            setShowConsent(true);
            return;
        }
        handleSaveAndClearCache({
            fields: sanitizedFields,
            ocr_text: ocrText,
            parentalConsent: consentGiven,
            detectedType: effectiveType,
            minimizeRequested: minimize
        });
    };

    useEffect(() => {
        if (savePending && consentGiven) {
            setSavePending(false);
            const configSections = FIELD_CONFIG[effectiveType] || FIELD_CONFIG.birth;
            const sanitizedFields = { ...formData };
            configSections.forEach(section => {
                section.fields.forEach(f => {
                    const val = sanitizedFields[f.key];
                    const strVal = val === undefined || val === null ? '' : String(val).trim();
                    if (!f.required && f.key !== 'barangay') {
                        if (strVal === '' || strVal === 'n/a') {
                            sanitizedFields[f.key] = 'n/a';
                        }
                    }
                    if (f.type === 'signature' && (strVal === '' || strVal === undefined || strVal === null)) {
                        sanitizedFields[f.key] = 'n/a';
                    }
                });
            });

            handleSaveAndClearCache({
                fields: sanitizedFields,
                ocr_text: ocrText,
                parentalConsent: true,
                detectedType: effectiveType,
                minimizeRequested: false
            });
        }
    }, [savePending, consentGiven]);

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <AnimatePresence>
                {showConsent && (
                    <ParentalConsentModal
                        onConfirm={() => { setConsentGiven(true); setShowConsent(false); setSavePending(true); }}
                        onCancel={() => setShowConsent(false)}
                    />
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
            >
                {/* Saving Overlay */}
                <AnimatePresence>
                    {isSaving && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center"
                        >
                            <div className="relative">
                                <div className="w-24 h-24 border-4 border-indigo-100 rounded-full animate-spin border-t-indigo-500" />
                                <CloudArrowUpIcon className="w-10 h-10 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
                            </div>
                            <h3 className="mt-6 text-xl font-black text-slate-900 tracking-tight">Securing Data to Registry...</h3>
                            <p className="text-sm text-slate-400 mt-2">Almost there! We're syncing your changes now.</p>

                            {!isViewOnly && (
                                <button
                                    onClick={onMinimize || onClose}
                                    className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                                >
                                    Minimize & Continue Working
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/90 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                            isManualEntry 
                                ? 'bg-[#d4a574]/15 border border-[#d4a574]/30 text-[#d4a574]'
                                : isEditMode
                                    ? 'bg-indigo-50 border border-indigo-100 text-indigo-600'
                                    : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                        }`}>
                            {isManualEntry || isEditMode ? (
                                <PencilSquareIcon className="w-6 h-6" />
                            ) : (
                                <DocumentCheckIcon className="w-6 h-6" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                                {isManualEntry 
                                    ? 'Manual Civil Registry Encoding' 
                                    : isEditMode 
                                        ? 'Modify Civil Registry Record' 
                                        : 'Extracted Document Data'}
                            </h3>
                            <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center gap-1.5 backdrop-blur-sm flex-wrap">
                                {isManualEntry ? (
                                    <span>Direct manual entry for Birth, Death, or Marriage certificate registration</span>
                                ) : isEditMode ? (
                                    <>
                                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                                            Doc #{file?.id}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span className="font-bold text-slate-700">{file?.personName || file?.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span className="truncate max-w-[250px]">{file?.name}</span>
                                        {(file?.metadata?.image_token_cost || ocrResult?.image_token_cost) && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-600 uppercase tracking-wide">
                                                    Token Cost: {formatNumber(currentCost)} tokens
                                                </span>
                                            </>
                                        )}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {(isManualEntry || isEditMode) && !isViewOnly && (
                            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
                                {['birth', 'death', 'marriage'].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                            isDirtyRef.current = true;
                                            setManualType(t);
                                            setFormData(getInitialFormData(t, {}, file));
                                            if (errors._type) setErrors(p => ({ ...p, _type: false }));
                                        }}
                                        className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                            effectiveType === t
                                                ? 'bg-[#0f172a] text-[#d4a574] shadow-md'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!isViewOnly && !isManualEntry && (
                            <button
                                onClick={handleReset}
                                title="Reset to Original"
                                className="text-slate-400 hover:text-amber-600 p-2 rounded-xl hover:bg-amber-50 transition-all cursor-pointer"
                            >
                                <ArrowPathIcon className="w-6 h-6" />
                            </button>
                        )}
                        <button onClick={onClose} className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-all cursor-pointer group">
                            <XMarkIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                {/* Unknown Type Warning Banner */}
                {(detectedType === 'unknown' || !manualType) && !isViewOnly && !isManualEntry && (
                    <div className={`px-8 py-4 border-b flex items-center gap-4 ${errors._type ? 'bg-rose-50 border-rose-200 animate-pulse' : 'bg-amber-50 border-amber-200'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${errors._type ? 'bg-rose-100' : 'bg-amber-100'}`}>
                            <ExclamationTriangleIcon className={`w-5 h-5 ${errors._type ? 'text-rose-600' : 'text-amber-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-black ${errors._type ? 'text-rose-700' : 'text-amber-800'}`}>
                                {errors._type ? 'Document type required before saving' : 'Document type could not be auto-detected'}
                            </p>
                            <p className={`text-xs font-medium mt-0.5 ${errors._type ? 'text-rose-500' : 'text-amber-600'}`}>
                                Please select if this picture is a Birth, Death, or Marriage certificate.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {['birth', 'death', 'marriage'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => {
                                        isDirtyRef.current = true;
                                        setManualType(t);
                                        setFormData(getInitialFormData(t, {}, file));
                                        setErrors(p => ({ ...p, _type: false }));
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all cursor-pointer ${
                                        manualType === t
                                            ? t === 'birth' ? 'bg-[#d4a574] text-white border-[#d4a574] shadow-md'
                                              : t === 'death' ? 'bg-rose-500 text-white border-rose-500 shadow-md'
                                              : 'bg-indigo-500 text-white border-indigo-500 shadow-md'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex-1 flex overflow-hidden">
                    {originalDocumentUrl && viewMode !== 'compare' && (
                        <div className="w-[45%] border-r border-slate-100 bg-slate-50 p-4 flex flex-col shrink-0">
                            <div className="flex items-center justify-between mb-3 shrink-0 flex-wrap gap-2">
                                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setLeftPreviewTab('picture')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                            leftPreviewTab === 'picture' 
                                                ? 'bg-white text-slate-900 shadow-sm font-black' 
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        📷 Uploaded Picture (A4)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLeftPreviewTab('pdf')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                            leftPreviewTab === 'pdf' 
                                                ? 'bg-indigo-600 text-white shadow-sm font-black' 
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        📄 Live Certificate (PDF)
                                    </button>
                                </div>
                                <a
                                    href={leftPreviewTab === 'picture' ? `/api/documents/view-image/${activeDocId}` : `/api/documents/view/${activeDocId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg font-bold uppercase transition-colors shrink-0"
                                >
                                    Open Fullscreen ↗
                                </a>
                            </div>

                            <div className="flex-1 rounded-xl bg-white border border-slate-200 overflow-hidden relative flex items-center justify-center p-1 shadow-sm">
                                {leftPreviewTab === 'picture' ? (
                                    <img
                                        src={`/api/documents/view-image/${activeDocId}?v=${file?.updated_at ? new Date(file.updated_at).getTime() : 1}`}
                                        className="w-full h-full object-contain rounded-lg"
                                        alt="Uploaded A4 Picture Scan"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            const iframe = document.createElement('iframe');
                                            iframe.src = `/api/documents/view/${activeDocId}`;
                                            iframe.className = "w-full h-full border-0 rounded-lg";
                                            e.target.parentNode.appendChild(iframe);
                                        }}
                                    />
                                ) : (
                                    <iframe
                                        src={`/api/documents/view/${activeDocId}?v=${file?.updated_at ? new Date(file.updated_at).getTime() : 1}`}
                                        title="Live Certificate PDF Preview"
                                        className="w-full h-full border-0 rounded-lg bg-white"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        <div className="flex p-1 bg-slate-100 rounded-xl w-fit gap-1 flex-wrap">
                            {!isManualEntry && (
                                <button
                                    onClick={() => setViewMode('text')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewMode === 'text' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Full Extracted Text
                                </button>
                            )}
                            <button
                                onClick={() => setViewMode('fields')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewMode === 'fields' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {isManualEntry ? 'Structured Form Entry' : isEditMode ? 'Edit Form Fields' : 'Structured Fields'}
                            </button>
                            <button
                                onClick={() => setViewMode('template')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewMode === 'template' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {isManualEntry || isEditMode ? 'Live Certificate Preview' : 'Template Preview'}
                            </button>
                            {duplicateData && (
                                <button
                                    onClick={() => setViewMode('compare')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewMode === 'compare' ? 'bg-amber-600 text-white shadow-sm font-black' : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse flex items-center gap-1.5'}`}
                                >
                                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-700 shrink-0" />
                                    Compare Side-by-Side
                                </button>
                            )}
                        </div>

                        {duplicateData && viewMode !== 'compare' && (
                            <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 animate-pulse" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-amber-800">Potential Duplicate Detected</p>
                                    <p className="text-xs text-amber-600 mt-1">
                                        A similar record exists in the Master Registry under Certificate #<strong>{duplicateData.certNumber}</strong> ({duplicateData.name}).
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('compare')}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-sm shrink-0"
                                >
                                    Compare Side-by-Side
                                </button>
                            </div>
                        )}

                        {viewMode === 'text' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        OCR Result (Editable)
                                    </label>
                                    <span className="text-[10px] text-slate-400 italic">Changes are saved to the database</span>
                                </div>
                                <textarea
                                    value={ocrText}
                                    onChange={(e) => {
                                        isDirtyRef.current = true;
                                        setOcrText(e.target.value);
                                    }}
                                    className="w-full h-[400px] p-4 text-sm font-mono border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40 focus:border-[#d4a574] transition-all"
                                    placeholder="Edit the extracted text here..."
                                />
                            </div>
                        )}

                        <div className={viewMode === 'fields' ? 'block space-y-5' : 'hidden'}>
                            {Object.keys(errors).length > 0 && !errors._type && (
                                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-bold shadow-sm">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-black text-rose-900">Cannot Save: Required Fields Missing</p>
                                        <p className="text-xs font-semibold text-rose-700 mt-0.5">
                                            {errors.barangay
                                                ? "Barangay (For Analytics) is mandatory to ensure geospatial mapping accuracy. Please select or enter the Barangay before saving."
                                                : "Please complete all mandatory fields highlighted in red below."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {typeMismatch && (
                                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-rose-700">Document Type Mismatch</p>
                                        <p className="text-sm text-rose-600 mt-0.5">{mismatchMessage}</p>
                                    </div>
                                </div>
                            )}

                            {isMinor && (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                    <p className="text-sm font-bold text-amber-700">Minor Person (Age: {age})</p>
                                </div>
                            )}

                            <div className="space-y-12">
                                {(FIELD_CONFIG[effectiveType] || FIELD_CONFIG.birth).map((section, sIdx) => (
                                    <div key={sIdx} className="space-y-4">
                                        {section.section && (
                                            <div className="flex items-center gap-3 mb-6">
                                                <h4 className="text-base font-black text-slate-900 uppercase tracking-wider">{section.section}</h4>
                                                <div className="flex-1 h-px bg-slate-100"></div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                                            {section.fields.map(field => (
                                                <div key={field.key} className={field.width || 'sm:col-span-1'}>
                                                    <label className={`block text-[11px] font-black uppercase tracking-widest mb-2.5 transition-colors ${errors[field.key] ? 'text-rose-500' : 'text-slate-500'}`}>
                                                        {field.label} {field.required && <span className="text-rose-400">*</span>}
                                                    </label>
                                                    {field.type === 'select' ? (
                                                        <select
                                                            value={formData[field.key] || ''}
                                                            onChange={e => {
                                                                isDirtyRef.current = true;
                                                                setFormData(p => ({ ...p, [field.key]: e.target.value }));
                                                                if (errors[field.key]) setErrors(p => ({ ...p, [field.key]: false }));
                                                            }}
                                                            className={`w-full px-4 py-3.5 text-[15px] font-medium border rounded-2xl bg-white focus:outline-none focus:ring-4 transition-all ${getConfidenceClass(field.key, errors[field.key])}`}
                                                        >
                                                            <option value="">Select…</option>
                                                            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                                                        </select>
                                                    ) : field.type === 'signature' ? (
                                                        <SignaturePad
                                                            fieldKey={field.key}
                                                            value={formData[field.key] || 'n/a'}
                                                            onChange={val => {
                                                                isDirtyRef.current = true;
                                                                setFormData(p => ({ ...p, [field.key]: val }));
                                                            }}
                                                            disabled={isViewOnly}
                                                        />
                                                    ) : field.type === 'textarea' ? (
                                                        <textarea
                                                            value={formData[field.key] || ''}
                                                            maxLength={getFieldMaxLength(field)}
                                                            onChange={e => {
                                                                isDirtyRef.current = true;
                                                                setFormData(p => ({ ...p, [field.key]: e.target.value.slice(0, getFieldMaxLength(field)) }));
                                                                if (errors[field.key]) setErrors(p => ({ ...p, [field.key]: false }));
                                                            }}
                                                            rows={3}
                                                            placeholder={`…`}
                                                            className={`w-full px-4 py-3.5 text-[15px] font-medium border rounded-2xl bg-white focus:outline-none focus:ring-4 transition-all placeholder-slate-300 ${getConfidenceClass(field.key, errors[field.key])}`}
                                                        />
                                                    ) : (
                                                        <div className="relative">
                                                            <input
                                                                type={field.type === 'date' ? 'date' : 'text'}
                                                                value={formData[field.key] || ''}
                                                                maxLength={field.type === 'date' ? undefined : getFieldMaxLength(field)}
                                                                onChange={e => {
                                                                    isDirtyRef.current = true;
                                                                    const maxLen = getFieldMaxLength(field);
                                                                    let val = field.type === 'date' ? e.target.value : e.target.value.slice(0, maxLen);
                                                                    const isNameField = field.key.includes('name') && !field.key.includes('place') && !field.key.includes('date') && !field.key.includes('no') && !field.key.includes('file');
                                                                    if (isNameField && field.type !== 'date') {
                                                                        val = val.replace(/[^a-zA-Z\s\.\,\'\-\ñ\Ñ\u00C0-\u024F]/g, '');
                                                                    }
                                                                    setFormData(p => ({ ...p, [field.key]: val }));
                                                                    if (errors[field.key]) setErrors(p => ({ ...p, [field.key]: false }));
                                                                }}
                                                                required={field.required}
                                                                placeholder={`…`}
                                                                className={`w-full px-4 py-3.5 text-[15px] font-medium border rounded-2xl bg-white focus:outline-none focus:ring-4 transition-all placeholder-slate-300 ${getConfidenceClass(field.key, errors[field.key])}`}
                                                            />
                                                            {isLowConf(field.key) && (
                                                                <span
                                                                    title="Low OCR confidence — please verify this value"
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400"
                                                                >
                                                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={viewMode === 'template' ? 'block space-y-4' : 'hidden'}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                                        Template Overlay Preview
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Professional layout using calibrated clean templates.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setShowDiagnosticBoxes(false)}
                                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!showDiagnosticBoxes ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Clean View
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDiagnosticBoxes(true)}
                                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${showDiagnosticBoxes ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Diagnostic Grid
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-inner">
                                <div className="relative w-full overflow-hidden" style={{ minHeight: '600px' }}>
                                    <img
                                        src={`/api/templates/preview?file=${matchedTemplate?.file_path || effectiveType}&type=${effectiveType}`}
                                        className="w-full h-auto block"
                                        alt="Professional Template Background"
                                        onError={(e) => {
                                            // Fallback to type background preview if direct file fails
                                            if (!e.target.dataset.triedFallback) {
                                                e.target.dataset.triedFallback = "true";
                                                e.target.src = `/api/templates/preview?type=${effectiveType}`;
                                            }
                                        }}
                                    />

                                    {(matchedTemplate?.config?.fields && matchedTemplate.config.fields.length > 0 
                                        ? matchedTemplate.config.fields 
                                        : effectiveType === 'marriage' 
                                            ? MarriageTemplateOverlayFields 
                                            : effectiveType === 'death' 
                                                ? DeathTemplateOverlayFields 
                                                : BirthTemplateOverlayFields
                                    )?.map((item) => {
                                        const value = formData[item.key] || '';
                                        const label = item.label || item.key;
                                        return (
                                            <div
                                                key={item.key}
                                                className={`absolute flex flex-col justify-center px-0.5 rounded-px shadow-sm transition-all ${!showDiagnosticBoxes ? '' : 'border border-emerald-400/50 bg-emerald-50/30 shadow-sm backdrop-blur-[0.5px]'}`}
                                                style={{
                                                    left: `${(item.x || 0) * 100}%`,
                                                    top: `${(item.y || 0) * 100}%`,
                                                    width: `${(item.w || 0) * 100}%`,
                                                    height: `${(item.h || 0) * 80}%`,
                                                }}
                                                title={`${label}`}
                                            >
                                                {showDiagnosticBoxes && (
                                                    <div className="text-[4px] font-black text-emerald-800/80 uppercase tracking-tighter absolute -top-1 left-0 whitespace-nowrap bg-white/90 px-0.5 rounded-px shadow-xs z-10 leading-none py-0.2">
                                                        {label}
                                                    </div>
                                                )}
                                                <div className={`font-black text-slate-950 tracking-tight truncate px-0.5 leading-none ${!showDiagnosticBoxes ? 'text-[8px] md:text-[10px]' : 'text-[6px] md:text-[7px]'}`}>
                                                    {value || (!showDiagnosticBoxes ? '' : '—')}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {ocrResult?.field_confidence && (
                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="text-xs font-bold text-slate-700 mb-2">Extraction Confidence</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.entries(ocrResult.field_confidence).map(([key, meta]) => (
                                            <div key={key} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs flex items-center justify-between gap-2">
                                                <span className="font-semibold text-slate-700">{fieldLabelMap[key] || key}</span>
                                                <span className={`font-bold ${meta?.validation_passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {Math.round(Number(meta?.confidence || 0) * 100)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {viewMode === 'compare' && duplicateData && (
                            <div className="space-y-6">
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-amber-800 uppercase tracking-wide">Duplicate Registry Comparison</h4>
                                        <p className="text-xs text-amber-700 mt-0.5">Please review side-by-side details carefully. Fields with differences are highlighted in amber.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left side: Uploaded/Current Record */}
                                    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4">
                                        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
                                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                            <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Current Extracted Data (Incoming)</h5>
                                        </div>
                                        <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                            {Object.keys(formData).map(key => {
                                                const existingVal = duplicateData.extracted_fields[key] || 'n/a';
                                                const currentVal = formData[key] || 'n/a';
                                                const isDifferent = String(currentVal).toLowerCase().trim() !== String(existingVal).toLowerCase().trim();

                                                return (
                                                    <div key={key} className={`p-3 rounded-xl border transition-all ${isDifferent ? 'bg-amber-50/70 border-amber-300/60 shadow-sm' : 'bg-white border-slate-100'}`}>
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{fieldLabelMap[key] || key}</span>
                                                        <span className={`block text-sm font-bold mt-1.5 ${isDifferent ? 'text-amber-900' : 'text-slate-800'}`}>
                                                            {currentVal}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right side: Existing Master Entry */}
                                    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4">
                                        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                            <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Master Registry Entry (Existing)</h5>
                                        </div>
                                        <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                            {Object.keys(formData).map(key => {
                                                const existingVal = duplicateData.extracted_fields[key] || 'n/a';
                                                const currentVal = formData[key] || 'n/a';
                                                const isDifferent = String(currentVal).toLowerCase().trim() !== String(existingVal).toLowerCase().trim();

                                                return (
                                                    <div key={key} className={`p-3 rounded-xl border transition-all ${isDifferent ? 'bg-amber-50/70 border-amber-300/60 shadow-sm' : 'bg-white border-slate-100'}`}>
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{fieldLabelMap[key] || key}</span>
                                                        <span className={`block text-sm font-bold mt-1.5 ${isDifferent ? 'text-amber-900' : 'text-slate-800'}`}>
                                                            {existingVal}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-100">
                            {isViewOnly ? (
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 rounded-xl font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                    Close Professional Preview
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSaving}
                                    className={`w-full py-4 rounded-xl font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#0f172a] hover:bg-slate-800 text-white shadow-slate-200'}`}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            {isManualEntry ? 'Saving & Registering...' : isEditMode ? 'Saving Record Modifications...' : 'Uploading...'}
                                        </>
                                    ) : (
                                        <>
                                            {isManualEntry ? (
                                                <CloudArrowUpIcon className="w-6 h-6 text-[#d4a574]" />
                                            ) : isEditMode ? (
                                                <PencilSquareIcon className="w-6 h-6 text-emerald-400" />
                                            ) : (
                                                <DocumentCheckIcon className="w-6 h-6 text-emerald-400" />
                                            )}
                                            {isManualEntry ? 'Save & Register Record' : isEditMode ? 'Save Record Modifications' : 'Save & Sync Changes'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default OcrFormPanel;
