import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    TableCellsIcon, 
    ArrowDownTrayIcon, 
    FunnelIcon, 
    CalendarIcon, 
    CheckCircleIcon,
    DocumentTextIcon,
    UserIcon,
    UsersIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    AdjustmentsHorizontalIcon,
    XMarkIcon,
    ArchiveBoxIcon,
    TicketIcon,
    CircleStackIcon
} from '@heroicons/react/24/outline';
import SkeletonLoader from './SkeletonLoader.jsx';
import Pagination from './Pagination.jsx';
import useDebounce from '../hooks/useDebounce.js';

const BARANGAY_LIST = [
    'Gomez-Zamora (Pob.)', 'Capt. C. Nazareno (Pob.)', 'Ibayo Silangan', 'Ibayo Estacion', 'Kanluran',
    'Makina', 'Sapa', 'Bucana Malaki', 'Bucana Sasahan', 'Bagong Karsada',
    'Balsahan', 'Bancaan', 'Muzon', 'Latoria', 'Labac',
    'Mabolo', 'San Roque', 'Santulan', 'Molino', 'Calubcob',
    'Halang', 'Malainen Bago', 'Malainen Luma', 'Palangue 1', 'Palangue 2 & 3',
    'Humbac', 'Munting Mapino', 'Sabang', 'Timalan Balsahan', 'Timalan Concepcion'
];

const MONTH_NAMES = [
    { num: 1, name: 'January', short: 'Jan' },
    { num: 2, name: 'February', short: 'Feb' },
    { num: 3, name: 'March', short: 'Mar' },
    { num: 4, name: 'April', short: 'Apr' },
    { num: 5, name: 'May', short: 'May' },
    { num: 6, name: 'June', short: 'Jun' },
    { num: 7, name: 'July', short: 'Jul' },
    { num: 8, name: 'August', short: 'Aug' },
    { num: 9, name: 'September', short: 'Sep' },
    { num: 10, name: 'October', short: 'Oct' },
    { num: 11, name: 'November', short: 'Nov' },
    { num: 12, name: 'December', short: 'Dec' },
];

/** Renders operational reports and export controls with customizable periods, data sources, and document combinations. */
export default function Reports() {
    const [format, setFormat] = useState('csv'); // 'csv' or 'excel'

    // Data Source: 'internal' (Uploaded Documents) | 'procured' (Client Issued Documents) | 'all' (Combined)
    const [dataSource, setDataSource] = useState('internal');

    // Multi-select Document Categories (checklist: birth, death, marriage)
    const [selectedDocTypes, setSelectedDocTypes] = useState(['birth', 'death', 'marriage']);

    // Period selection: 'month' | '6months' | 'year' | 'all' | 'custom'
    const [period, setPeriod] = useState('all');
    const [selectedYear, setSelectedYear] = useState(2026);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [availableMonths, setAvailableMonths] = useState({});

    // Advanced Filter Settings (hidden by default)
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [barangay, setBarangay] = useState('all');
    const [status, setStatus] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 350);

    const [previewRecords, setPreviewRecords] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [typeCounts, setTypeCounts] = useState({ birth: 0, death: 0, marriage: 0 });
    const [smartMetrics, setSmartMetrics] = useState({
        birthMale: 0,
        birthFemale: 0,
        birthTimely: 0,
        birthDelayed: 0,
        birthHospital: 0,
        birthHome: 0,
        seniorDeaths: 0,
        residentDeaths: 0,
        naturalDeaths: 0,
        deathMale: 0,
        deathFemale: 0,
        civilMarriages: 0,
        churchMarriages: 0,
        totalMales: 0,
        totalFemales: 0,
        distinctBarangays: 0,
        timelyTotal: 0,
        delayedTotal: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);
    const [isStatsCollapsed, setIsStatsCollapsed] = useState(() => {
        return typeof window !== 'undefined' && window.innerWidth < 768;
    });

    // Fetch months that contain records for the selected data source
    useEffect(() => {
        const fetchAvailableMonths = async () => {
            try {
                const res = await fetch(`/api/documents/available-months?source=${dataSource}`, { credentials: 'include' });
                const json = await res.json();
                if (json.success && json.months) {
                    setAvailableMonths(json.months);
                    const monthsWithRecords = Object.keys(json.months);
                    if (monthsWithRecords.length > 0) {
                        setSelectedMonth(monthsWithRecords[0]);
                    } else {
                        setSelectedMonth('');
                    }
                }
            } catch (err) {
                console.error("Failed to load available months:", err);
            }
        };
        fetchAvailableMonths();
    }, [dataSource]);

    // Compute effective date bounds based on period preset
    const effectiveDates = useMemo(() => {
        if (period === 'month') {
            if (!selectedMonth) return { from: '', to: '' };
            const [y, m] = selectedMonth.split('-').map(Number);
            const lastDay = new Date(y, m, 0).getDate();
            const mm = String(m).padStart(2, '0');
            return {
                from: `${y}-${mm}-01`,
                to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`
            };
        } else if (period === '6months') {
            const now = new Date(2026, 9, 5); // Respect current application year
            const past = new Date(now);
            past.setMonth(past.getMonth() - 6);
            const y1 = past.getFullYear();
            const m1 = String(past.getMonth() + 1).padStart(2, '0');
            const d1 = String(past.getDate()).padStart(2, '0');
            const y2 = now.getFullYear();
            const m2 = String(now.getMonth() + 1).padStart(2, '0');
            const d2 = String(now.getDate()).padStart(2, '0');
            return {
                from: `${y1}-${m1}-${d1}`,
                to: `${y2}-${m2}-${d2}`
            };
        } else if (period === 'year') {
            return {
                from: `${selectedYear}-01-01`,
                to: `${selectedYear}-12-31`
            };
        } else if (period === 'custom') {
            return { from: dateFrom, to: dateTo };
        }
        return { from: '', to: '' };
    }, [period, selectedMonth, selectedYear, dateFrom, dateTo]);

    // Fetch live documents or issuances for preview
    const fetchPreviewData = useCallback(async () => {
        setIsLoading(true);
        try {
            const typeParam = selectedDocTypes.length === 3 ? '' : selectedDocTypes.join(',');
            const params = new URLSearchParams({
                per_page: '1000',
                type: typeParam,
                search: debouncedSearchQuery
            });

            if (effectiveDates.from) params.append('date_from', effectiveDates.from);
            if (effectiveDates.to) params.append('date_to', effectiveDates.to);

            let records = [];

            if (dataSource === 'procured') {
                // Fetch issuances (client procured)
                const issParams = new URLSearchParams(params);
                issParams.append('source', 'procured');
                const res = await fetch(`/api/issuances?${issParams.toString()}`, { credentials: 'include' });
                const data = await res.json();
                records = (data.data || [])
                    .filter(r => Boolean(r.or_number || r.requested_by || r.print_remarks || (r.ticket_number && !String(r.ticket_number).startsWith('T-2026-0'))))
                    .map(r => ({
                        ...r,
                        _source: 'procured',
                        _sourceLabel: 'Client Procured'
                    }));
            } else if (dataSource === 'all') {
                // Fetch both internal master records and distinct client procured issuances
                const issParams = new URLSearchParams(params);
                issParams.append('source', 'procured');
                const docParams = new URLSearchParams(params);
                docParams.append('status', 'processed');
                const [docRes, issRes] = await Promise.all([
                    fetch(`/api/documents?${docParams.toString()}`, { credentials: 'include' }),
                    fetch(`/api/issuances?${issParams.toString()}`, { credentials: 'include' })
                ]);
                const docData = await docRes.json();
                const issData = await issRes.json();
                const docs = (docData.data || [])
                    .filter(r => ['processed', 'issued', 'active'].includes((r.status || '').toLowerCase()))
                    .map(r => ({ ...r, _source: 'internal', _sourceLabel: 'Internal Registration' }));
                const issuances = (issData.data || [])
                    .filter(r => Boolean(r.or_number || r.requested_by || r.print_remarks || (r.ticket_number && !String(r.ticket_number).startsWith('T-2026-0'))))
                    .map(r => ({ ...r, _source: 'procured', _sourceLabel: 'Client Procured' }));
                records = [...docs, ...issuances];
            } else {
                // Fetch internal master registry documents (only approved documents uploaded into the registry database)
                const docParams = new URLSearchParams(params);
                docParams.append('status', 'processed');
                const res = await fetch(`/api/documents?${docParams.toString()}`, { credentials: 'include' });
                const data = await res.json();
                records = (data.data || [])
                    .filter(r => ['processed', 'issued', 'active'].includes((r.status || '').toLowerCase()))
                    .map(r => ({
                        ...r,
                        _source: 'internal',
                        _sourceLabel: 'Internal Registration'
                    }));
            }

            let filtered = records;

            // Client-side category filtering safety
            if (selectedDocTypes.length > 0 && selectedDocTypes.length < 3) {
                filtered = filtered.filter(d => selectedDocTypes.includes((d.type || '').toLowerCase()));
            }

            // Filter by effective date bounds if present
            if (effectiveDates.from) {
                filtered = filtered.filter(d => (d.created_at || '').substring(0, 10) >= effectiveDates.from);
            }
            if (effectiveDates.to) {
                filtered = filtered.filter(d => (d.created_at || '').substring(0, 10) <= effectiveDates.to);
            }

            // Barangay filter
            if (barangay !== 'all') {
                filtered = filtered.filter(d => d.barangay === barangay);
            }

            // Status filter
            if (status !== 'all') {
                filtered = filtered.filter(d => (d.status || '').toLowerCase() === status.toLowerCase());
            }

            setPreviewRecords(filtered);
            setTotalCount(filtered.length);

            // Calculate summary counts from fetched dataset
            const bCount = filtered.filter(d => (d.type || '').toLowerCase() === 'birth').length;
            const dCount = filtered.filter(d => (d.type || '').toLowerCase() === 'death').length;
            const mCount = filtered.filter(d => (d.type || '').toLowerCase() === 'marriage').length;
            setTypeCounts({ birth: bCount, death: dCount, marriage: mCount });

            // Calculate Category-Smart Metrics
            let birthMale = 0;
            let birthFemale = 0;
            let birthTimely = 0;
            let birthDelayed = 0;
            let birthHospital = 0;
            let birthHome = 0;

            let seniorDeaths = 0;
            let residentDeaths = 0;
            let naturalDeaths = 0;
            let deathMale = 0;
            let deathFemale = 0;

            let civilMarriages = 0;
            let churchMarriages = 0;

            const brgySet = new Set();
            let totalMales = 0;
            let totalFemales = 0;
            let timelyTotal = 0;
            let delayedTotal = 0;

            filtered.forEach(d => {
                const t = (d.type || '').toLowerCase();
                let ef = d.extracted_fields || d.extracted_data || {};
                if (typeof ef === 'string') {
                    try { ef = JSON.parse(ef); } catch {}
                }

                if (d.barangay && d.barangay !== 'N/A' && d.barangay !== 'Unspecified') {
                    brgySet.add(d.barangay);
                }

                const rawSex = (ef.sex || ef.gender || '').toLowerCase();
                const isMale = rawSex === 'male' || rawSex === 'm';
                const isFemale = rawSex === 'female' || rawSex === 'f';
                if (isMale) totalMales++;
                if (isFemale) totalFemales++;

                const isDelayed = Boolean(
                    ef.delayed_registration === true ||
                    ef.delayed_registration === 'true' ||
                    ef.delayed_registration === 1 ||
                    ef.is_delayed === true ||
                    ef.registration_type === 'delayed' ||
                    ef.remarks?.toLowerCase()?.includes('delayed') ||
                    ef.remarks?.toLowerCase()?.includes('late')
                );
                if (isDelayed) {
                    delayedTotal++;
                } else {
                    timelyTotal++;
                }

                if (t === 'birth') {
                    if (isMale) birthMale++;
                    if (isFemale) birthFemale++;

                    if (isDelayed) birthDelayed++;
                    else birthTimely++;

                    const hospStr = (ef.place_of_birth_hospital || ef.place_of_birth_type || ef.attendant_type || '').toLowerCase();
                    if (hospStr.includes('hosp') || hospStr.includes('clinic') || hospStr.includes('center') || hospStr.includes('physician') || hospStr.includes('midwife')) {
                        birthHospital++;
                    } else {
                        birthHome++;
                    }
                } else if (t === 'death') {
                    if (isMale) deathMale++;
                    if (isFemale) deathFemale++;

                    const age = parseInt(ef.age_completed_years || ef.age || 0, 10);
                    if (age >= 60) seniorDeaths++;

                    const res = (ef.residence || d.barangay || '').toLowerCase();
                    if (res.includes('naic') || (d.barangay && d.barangay !== 'N/A' && d.barangay !== 'Unspecified')) {
                        residentDeaths++;
                    }

                    const manner = (ef.manner_of_death || ef.cause_of_death_immediate || '').toLowerCase();
                    if (manner.includes('natural') || (!manner.includes('accident') && !manner.includes('homicide') && !manner.includes('suicide'))) {
                        naturalDeaths++;
                    }
                } else if (t === 'marriage') {
                    const officer = (ef.solemnizing_officer_name || ef.solemnizing_officer_title || ef.ceremony_type || '').toLowerCase();
                    if (officer.includes('mayor') || officer.includes('judge') || officer.includes('civil')) {
                        civilMarriages++;
                    } else {
                        churchMarriages++;
                    }
                }
            });

            setSmartMetrics({
                birthMale,
                birthFemale,
                birthTimely,
                birthDelayed,
                birthHospital,
                birthHome,
                seniorDeaths,
                residentDeaths,
                naturalDeaths,
                deathMale,
                deathFemale,
                civilMarriages,
                churchMarriages,
                totalMales,
                totalFemales,
                distinctBarangays: brgySet.size,
                timelyTotal,
                delayedTotal
            });

        } catch (err) {
            console.error("Failed to fetch preview data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [dataSource, selectedDocTypes, effectiveDates, barangay, status, debouncedSearchQuery]);

    useEffect(() => {
        fetchPreviewData();
    }, [fetchPreviewData]);

    // Pagination States
    const [reportsPage, setReportsPage] = useState(1);
    const [reportsPageSize, setReportsPageSize] = useState(10);

    // Reset pagination when data source, filters, or date range changes
    useEffect(() => {
        setReportsPage(1);
    }, [dataSource, selectedDocTypes, effectiveDates, barangay, status, debouncedSearchQuery]);

    const totalReportsPages = Math.max(1, Math.ceil(previewRecords.length / reportsPageSize));
    const safeReportsPage = Math.min(reportsPage, totalReportsPages);
    const paginatedReports = previewRecords.slice(
        (safeReportsPage - 1) * reportsPageSize,
        safeReportsPage * reportsPageSize
    );

    // Multi-type checklist toggle
    const toggleDocType = (typeKey) => {
        setSelectedDocTypes(prev => {
            if (prev.includes(typeKey)) {
                if (prev.length === 1) return prev; // Keep at least one selected
                return prev.filter(t => t !== typeKey);
            } else {
                return [...prev, typeKey];
            }
        });
    };

    const selectAllTypes = () => {
        setSelectedDocTypes(['birth', 'death', 'marriage']);
    };

    /** Exports the report with chosen period, source, and document type combinations. */
    const handleExport = (targetFormat = 'csv') => {
        setFormat(targetFormat);
        setIsExporting(true);
        setDownloadSuccess(false);

        const typeParam = selectedDocTypes.length === 3 ? 'all' : selectedDocTypes.join(',');

        const params = new URLSearchParams({
            format: targetFormat,
            source: dataSource,
            type: typeParam,
            barangay,
            status,
            date_from: effectiveDates.from || '',
            date_to: effectiveDates.to || ''
        });

        const exportUrl = `/api/documents/export?${params.toString()}`;
        
        const link = document.createElement('a');
        link.href = exportUrl;
        const sourcePrefix = dataSource === 'procured' ? 'client_issuances' : dataSource === 'all' ? 'all_records' : 'master_registry';
        link.setAttribute('download', `${sourcePrefix}_report_${Date.now()}.${targetFormat === 'excel' ? 'xls' : 'csv'}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            setIsExporting(false);
            setDownloadSuccess(true);
            setTimeout(() => setDownloadSuccess(false), 4000);
        }, 800);
    };

    // Count how many advanced filters are active
    const activeAdvancedFilterCount = useMemo(() => {
        let count = 0;
        if (barangay !== 'all') count++;
        if (status !== 'all') count++;
        if (searchQuery.trim()) count++;
        if (period === 'custom' && (dateFrom || dateTo)) count++;
        return count;
    }, [barangay, status, searchQuery, period, dateFrom, dateTo]);

    const resetAdvancedFilters = () => {
        setBarangay('all');
        setStatus('all');
        setDateFrom('');
        setDateTo('');
        setSearchQuery('');
    };

    return (
        <div className="p-3 sm:p-8 space-y-4 sm:space-y-8 max-w-[1400px] mx-auto pb-16">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-1">
                        <TableCellsIcon className="w-4 h-4" /> Data Analytics & Export Center
                    </div>
                    <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        Civil Registry Reports & Data Export
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Export official Master Registry records and Client Procured Issuances to CSV or Excel spreadsheets.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                        onClick={fetchPreviewData}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95"
                    >
                        <ArrowPathIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh Preview</span>
                        <span className="sm:hidden">Refresh</span>
                    </button>
                    
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={isExporting || totalCount === 0}
                            className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowDownTrayIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isExporting && format === 'csv' ? 'animate-bounce' : ''}`} />
                            <span>Export CSV</span>
                        </button>

                        <button
                            onClick={() => handleExport('excel')}
                            disabled={isExporting || totalCount === 0}
                            className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowDownTrayIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isExporting && format === 'excel' ? 'animate-bounce' : ''}`} />
                            <span>Export Excel</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Source Selector Tabs - 3 column responsive layout */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-1 sm:p-1.5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 w-full">
                    <button
                        type="button"
                        onClick={() => setDataSource('internal')}
                        className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer text-center ${
                            dataSource === 'internal'
                                ? 'bg-[#1a2f4a] dark:bg-slate-800 text-white dark:text-[#d4a574] shadow-md border dark:border-[#d4a574]/30'
                                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <ArchiveBoxIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span className="hidden sm:inline">Registry Database</span>
                        <span className="sm:hidden truncate">Registry</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDataSource('procured')}
                        className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer text-center ${
                            dataSource === 'procured'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <TicketIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span className="hidden sm:inline">Client Procured</span>
                        <span className="sm:hidden truncate">Procured</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDataSource('all')}
                        className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer text-center ${
                            dataSource === 'all'
                                ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-md'
                                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <CircleStackIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span className="hidden sm:inline">All Records (Combined)</span>
                        <span className="sm:hidden truncate">All Combined</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics Bar - Collapsible to preserve mobile space */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all text-slate-800 dark:text-slate-100">
                {/* Header / Toggle Row */}
                <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-slate-50/90 to-white dark:from-slate-900 dark:to-slate-900/90 border-b border-slate-100 dark:border-slate-800 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 shrink-0">
                            <TableCellsIcon className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">
                                Data Summary & Statistics
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                                {totalCount} Records
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsStatsCollapsed(prev => !prev)}
                        className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0 text-xs font-bold"
                        title={isStatsCollapsed ? "Expand Statistics" : "Collapse Statistics"}
                        aria-label={isStatsCollapsed ? "Expand Statistics" : "Collapse Statistics"}
                    >
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                            {isStatsCollapsed ? 'Show Stats' : 'Hide Stats'}
                        </span>
                        {isStatsCollapsed ? (
                            <ChevronDownIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        ) : (
                            <ChevronUpIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        )}
                    </button>
                </div>

                {/* Collapsible Metrics Grid: 2 columns on mobile instead of 1 */}
                <AnimatePresence initial={false}>
                    {!isStatsCollapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <div className="p-3 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 bg-slate-50/30 dark:bg-slate-950/40">
                                {/* Total Card */}
                                <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 sm:p-4 border border-slate-200/70 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 shrink-0">
                                        <TableCellsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{totalCount}</div>
                                        <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                                            {dataSource === 'procured' ? 'Procured' : dataSource === 'internal' ? 'Uploaded' : 'Total'}
                                        </div>
                                    </div>
                                </div>

                                {/* Birth Card */}
                                <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 sm:p-4 border border-slate-200/70 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-[#d4a574] shrink-0">
                                        <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{typeCounts.birth}</div>
                                        <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Birth Certs</div>
                                    </div>
                                </div>

                                {/* Death Card */}
                                <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 sm:p-4 border border-slate-200/70 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-500 shrink-0">
                                        <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{typeCounts.death}</div>
                                        <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Death Certs</div>
                                    </div>
                                </div>

                                {/* Marriage Card */}
                                <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 sm:p-4 border border-slate-200/70 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-500 shrink-0">
                                        <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{typeCounts.marriage}</div>
                                        <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Marriage</div>
                                    </div>
                                </div>

                                {/* Dynamic Smart Category Breakdown */}
                                <div className="col-span-2 lg:col-span-4 bg-white dark:bg-slate-900/90 rounded-xl p-2.5 sm:p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                                    {selectedDocTypes.length === 1 && selectedDocTypes[0] === 'birth' ? (
                                        /* Mode 1: Births Only */
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full">
                                            <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/50 font-bold text-xs sm:text-[13px] transition-all hover:bg-amber-100/80 dark:hover:bg-amber-900/60" title="Timely vs. Delayed registrations">
                                                <span className="font-black text-amber-700 dark:text-amber-400">Registration:</span>
                                                <span className="font-extrabold text-amber-950 dark:text-amber-100 tabular-nums">{smartMetrics.birthTimely} Timely • {smartMetrics.birthDelayed} Delayed</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-900/50 font-bold text-xs sm:text-[13px] transition-all hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60" title="Hospital/Clinic delivery vs Home delivery">
                                                <span className="font-black text-emerald-600 dark:text-emerald-400">Facility:</span>
                                                <span className="font-extrabold text-emerald-950 dark:text-emerald-100 tabular-nums">{smartMetrics.birthHospital} Facility • {smartMetrics.birthHome} Home</span>
                                            </div>
                                        </div>
                                    ) : selectedDocTypes.length === 1 && selectedDocTypes[0] === 'death' ? (
                                        /* Mode 2: Deaths Only */
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full">
                                            <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200/80 dark:border-rose-900/50 font-bold text-xs sm:text-[13px] transition-all hover:bg-rose-100/80 dark:hover:bg-rose-900/60" title="Senior citizen deaths (Age 60 and above)">
                                                <span className="font-black text-rose-600 dark:text-rose-400">Seniors (≥60):</span>
                                                <span className="font-extrabold text-rose-950 dark:text-rose-100 tabular-nums">{smartMetrics.seniorDeaths} of {typeCounts.death}</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-900/50 font-bold text-xs sm:text-[13px] transition-all hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60" title="Deceased whose usual residence was Naic municipality">
                                                <span className="font-black text-indigo-600 dark:text-indigo-400">Resident Deaths:</span>
                                                <span className="font-extrabold text-indigo-950 dark:text-indigo-100 tabular-nums">{smartMetrics.residentDeaths} of {typeCounts.death}</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-900/50 font-bold text-xs sm:text-[13px] transition-all hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60" title="Natural causes vs external causes">
                                                <span className="font-black text-emerald-600 dark:text-emerald-400">Manner of Death:</span>
                                                <span className="font-extrabold text-emerald-950 dark:text-emerald-100 tabular-nums">{smartMetrics.naturalDeaths} Natural • {typeCounts.death - smartMetrics.naturalDeaths} External</span>
                                            </div>
                                        </div>
                                    ) : selectedDocTypes.length === 1 && selectedDocTypes[0] === 'marriage' ? (
                                        /* Mode 3: Marriages Only */
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
                                            <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/50 font-bold text-xs sm:text-[13px] transition-all hover:bg-amber-100/80 dark:hover:bg-amber-900/60" title="Civil ceremonies officiated by Mayor or Judge">
                                                <span className="font-black text-amber-700 dark:text-amber-400">Civil Weddings:</span>
                                                <span className="font-extrabold text-amber-950 dark:text-amber-100 tabular-nums">{smartMetrics.civilMarriages} of {typeCounts.marriage}</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-900/50 font-bold text-xs sm:text-[13px] transition-all hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60" title="Religious ceremonies in churches or chapels">
                                                <span className="font-black text-indigo-600 dark:text-indigo-400">Church Weddings:</span>
                                                <span className="font-extrabold text-indigo-950 dark:text-indigo-100 tabular-nums">{smartMetrics.churchMarriages} of {typeCounts.marriage}</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-900/50 font-bold text-xs sm:text-[13px] transition-all hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60" title="Total marriages registered in Naic">
                                                <span className="font-black text-emerald-600 dark:text-emerald-400">Solemnized in Naic:</span>
                                                <span className="font-extrabold text-emerald-950 dark:text-emerald-100 tabular-nums">{typeCounts.marriage} Weddings</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg bg-sky-50/90 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 border border-sky-200/80 dark:border-sky-900/50 font-bold text-xs sm:text-[13px] transition-all hover:bg-sky-100/80 dark:hover:bg-sky-900/60" title="All marriage records certified">
                                                <span className="font-black text-sky-600 dark:text-sky-400">Certified Status:</span>
                                                <span className="font-extrabold text-sky-950 dark:text-sky-100 tabular-nums">{typeCounts.marriage > 0 ? '100% Registered' : '0 Registered'}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Mode 4: All / Multiple Categories Combined */
                                        <div className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-900/50 font-bold text-xs sm:text-[13px] transition-all hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60" title="Total active records selected">
                                            <span className="font-black text-indigo-600 dark:text-indigo-400">Total Filtered:</span>
                                            <span className="font-extrabold text-indigo-950 dark:text-indigo-100 tabular-nums">{totalCount} Records</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Report Configuration Card */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 sm:space-y-6 text-slate-800 dark:text-slate-100">
                
                {/* Top Quick Settings: Period Dropdown + Document Types Checklist */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-100 dark:border-slate-800">
                    
                    {/* Period Selector (Month / 6 Months / Year / All Time / Custom) */}
                    <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                                <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Export Timeframe
                            </label>
                            {effectiveDates.from && (
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    {effectiveDates.from} to {effectiveDates.to}
                                </span>
                            )}
                        </div>

                        {/* Period Type Dropdown without Emojis */}
                        <div className="relative">
                            <select
                                value={period}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setPeriod(val);
                                    if (val === 'custom') {
                                        setIsAdvancedOpen(true);
                                    }
                                }}
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-sm transition-all cursor-pointer"
                            >
                                <option value="all">All Time (All available records)</option>
                                <option value="month">Specific Month (Only months with records)</option>
                                <option value="6months">Past 6 Months (Rolling 6 months)</option>
                                <option value="year">Annual Report ({selectedYear})</option>
                                <option value="custom">Custom Date Range (Set specific dates)</option>
                            </select>
                        </div>

                        {/* Interactive Month Picker with Greyed-Out Unavailable Months */}
                        {period === 'month' && (
                            <motion.div 
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="pt-2 space-y-2.5 bg-slate-50/80 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800"
                            >
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    <span>Select Month in {selectedYear}:</span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        Grey = No records
                                    </span>
                                </div>

                                {/* 12-Month Grid: Months with 0 records are strictly greyed out and unselectable */}
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                                    {MONTH_NAMES.map((m) => {
                                        const monthKey = `${selectedYear}-${String(m.num).padStart(2, '0')}`;
                                        const count = availableMonths[monthKey] || 0;
                                        const hasRecords = count > 0;
                                        const isSelected = selectedMonth === monthKey;

                                        return (
                                            <button
                                                key={monthKey}
                                                type="button"
                                                disabled={!hasRecords}
                                                onClick={() => setSelectedMonth(monthKey)}
                                                className={`p-2 rounded-xl text-center text-xs transition-all relative flex flex-col items-center justify-center min-h-[52px] ${
                                                    isSelected && hasRecords
                                                        ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/30'
                                                        : hasRecords
                                                        ? 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer'
                                                        : 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border border-slate-200/40 dark:border-slate-800/50 cursor-not-allowed select-none'
                                                }`}
                                                title={hasRecords ? `${m.name} ${selectedYear}: ${count} record(s)` : `${m.name} ${selectedYear}: No records recorded`}
                                            >
                                                <span className="text-[11px] leading-none">{m.short}</span>
                                                <span className={`text-[9px] mt-1 font-semibold leading-none ${
                                                    isSelected && hasRecords 
                                                        ? 'text-indigo-100' 
                                                        : hasRecords 
                                                        ? 'text-indigo-600 dark:text-indigo-400 font-black' 
                                                        : 'text-slate-300 dark:text-slate-600'
                                                }`}>
                                                    {hasRecords ? `${count} rec` : '0'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Document Categories Checklist (Pagsamahin: Birth + Death + Marriage) */}
                    <div className="lg:col-span-7 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <DocumentTextIcon className="w-4 h-4 text-indigo-600" /> Document Types to Include
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    {selectedDocTypes.length} of 3 selected
                                </span>
                                {selectedDocTypes.length < 3 && (
                                    <button
                                        type="button"
                                        onClick={selectAllTypes}
                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
                                    >
                                        Select All
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Interactive Toggle Cards / Checklist without Emojis */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            
                            {/* Birth */}
                            <div
                                onClick={() => toggleDocType('birth')}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                                    selectedDocTypes.includes('birth')
                                        ? 'bg-amber-50/50 dark:bg-amber-950/30 border-[#d4a574] text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-[#d4a574]/20'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                        selectedDocTypes.includes('birth') ? 'bg-[#d4a574] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                        <UserIcon className="w-4 h-4" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-black leading-tight truncate">Birth</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Live Birth</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={selectedDocTypes.includes('birth')}
                                    onChange={() => {}}
                                    className="w-4 h-4 rounded text-[#d4a574] focus:ring-[#d4a574] cursor-pointer dark:bg-slate-950"
                                />
                            </div>

                            {/* Death */}
                            <div
                                onClick={() => toggleDocType('death')}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                                    selectedDocTypes.includes('death')
                                        ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-400 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-rose-400/20'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                        selectedDocTypes.includes('death') ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                        <DocumentTextIcon className="w-4 h-4" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-black leading-tight truncate">Death</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Deceased</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={selectedDocTypes.includes('death')}
                                    onChange={() => {}}
                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer dark:bg-slate-950"
                                />
                            </div>

                            {/* Marriage */}
                            <div
                                onClick={() => toggleDocType('marriage')}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                                    selectedDocTypes.includes('marriage')
                                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-indigo-400/20'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                        selectedDocTypes.includes('marriage') ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                        <UsersIcon className="w-4 h-4" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-black leading-tight truncate">Marriage</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Contract</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={selectedDocTypes.includes('marriage')}
                                    onChange={() => {}}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-950"
                                />
                            </div>

                        </div>
                        <p className="text-[11px] text-slate-400 font-medium pl-1">
                            You can check multiple categories (e.g. Birth and Death together) to export them combined in one report.
                        </p>
                    </div>

                </div>

                {/* Collapsible Advanced Filter Settings Toggle Button */}
                <div className="flex items-center justify-between pt-1">
                    <button
                        type="button"
                        onClick={() => setIsAdvancedOpen(prev => !prev)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
                            isAdvancedOpen || activeAdvancedFilterCount > 0
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        <AdjustmentsHorizontalIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Advanced Filter Settings</span>
                        {activeAdvancedFilterCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center">
                                {activeAdvancedFilterCount}
                            </span>
                        )}
                        {isAdvancedOpen ? (
                            <ChevronUpIcon className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        ) : (
                            <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        )}
                    </button>

                    {activeAdvancedFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={resetAdvancedFilters}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                        >
                            <XMarkIcon className="w-4 h-4" /> Reset Filters
                        </button>
                    )}
                </div>

                {/* Collapsible Content: Barangay, Custom Dates, Search, Status */}
                <AnimatePresence>
                    {isAdvancedOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                            animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                            transition={{ duration: 0.25 }}
                            className="pt-2"
                        >
                            <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                                <div className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                    Granular Filters & Search
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    
                                    {/* Search by Name or Registry No */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Search Keyword
                                        </label>
                                        <div className="relative">
                                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Name, registry no..."
                                                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm placeholder-slate-400 dark:placeholder-slate-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Barangay Filter */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Barangay
                                        </label>
                                        <select
                                            value={barangay}
                                            onChange={(e) => setBarangay(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer"
                                        >
                                            <option value="all">All Barangays (Entire Municipality)</option>
                                            {BARANGAY_LIST.map((b) => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Custom Date From */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> Date Registered From
                                        </label>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => {
                                                setDateFrom(e.target.value);
                                                if (period !== 'custom') setPeriod('custom');
                                            }}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                        />
                                    </div>

                                    {/* Custom Date To */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> Date Registered To
                                        </label>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => {
                                                setDateTo(e.target.value);
                                                if (period !== 'custom') setPeriod('custom');
                                            }}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                        />
                                    </div>

                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {downloadSuccess && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs font-bold text-emerald-800">
                        <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                        <span>Civil Registry report generated and downloaded successfully!</span>
                    </motion.div>
                )}
            </div>

            {/* Live Records Preview Table */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Data Export Preview</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            <strong className="text-slate-700 dark:text-slate-300">{dataSource === 'procured' ? 'Client Procured Issuances' : dataSource === 'all' ? 'All Records (Combined)' : 'Registry Database (Approved Records)'}</strong>
                            {' • '}Categories: ({selectedDocTypes.join(', ')})
                            {effectiveDates.from ? ` • Between ${effectiveDates.from} and ${effectiveDates.to}` : ''}
                        </p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                        Previewing {previewRecords.length} records
                    </span>
                </div>

                {isLoading ? (
                    <div className="p-6"><SkeletonLoader type="table" rows={6} /></div>
                ) : previewRecords.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <TableCellsIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No matching registry records found</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try selecting other months or adjust your document categories above</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 dark:bg-slate-950/70 text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        {dataSource === 'all' && (
                                            <th className="px-4 py-3.5 font-black text-slate-500 dark:text-slate-400">Record Scope</th>
                                        )}
                                        <th className="px-6 py-3.5 font-black text-slate-500 dark:text-slate-400">ID / Reg No.</th>
                                        {dataSource !== 'internal' && (
                                            <th className="px-4 py-3.5 font-black text-slate-500 dark:text-slate-400">Ticket #</th>
                                        )}
                                        <th className="px-4 py-3.5 font-black text-slate-500 dark:text-slate-400">Category</th>
                                        <th className="px-6 py-3.5 font-black text-slate-500 dark:text-slate-400">Person / Client Name</th>
                                        <th className="px-4 py-3.5 font-black text-slate-500 dark:text-slate-400">
                                            {dataSource === 'procured' ? 'Issuance Date' : 'Event Date'}
                                        </th>
                                        <th className="px-4 py-3.5 font-black text-slate-500 dark:text-slate-400">Barangay</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-200 font-medium">
                                    {paginatedReports.map((doc) => {
                                        const ef = typeof doc.extracted_fields === 'string' ? JSON.parse(doc.extracted_fields || '{}') : (doc.extracted_fields || {});
                                        const regNo = doc.certNumber || ef.registry_number || ef.registry_no || doc.id;
                                        const isProcured = doc._source === 'procured';

                                        return (
                                            <tr key={`${doc._source || 'rec'}-${doc.id}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                {dataSource === 'all' && (
                                                    <td className="px-4 py-4">
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                                            isProcured
                                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                        }`}>
                                                            {isProcured ? 'Procured' : 'Registry'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                                                    #{doc.id} <span className="text-[11px] text-slate-400 dark:text-slate-500 block font-sans font-normal">{regNo}</span>
                                                </td>
                                                {dataSource !== 'internal' && (
                                                    <td className="px-4 py-4 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                        {isProcured && doc.ticket_number ? (
                                                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300">
                                                                {doc.ticket_number}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 dark:text-slate-600 font-normal select-none">—</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-4 py-4">
                                                    {(() => {
                                                        const t = (doc.type || '').toLowerCase();
                                                        const colorClass = t === 'birth' ? 'text-[#d4a574]' : t === 'death' ? 'text-rose-500' : 'text-indigo-500';
                                                        return (
                                                            <span className={`text-xs font-black uppercase tracking-wider ${colorClass}`}>
                                                                {doc.type || 'Birth'}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                                                    {doc.personName || doc.name || 'N/A'}
                                                </td>
                                                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                                    {doc.issuanceDate || doc.date || 'N/A'}
                                                </td>
                                                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                                    {doc.barangay || 'N/A'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Report Records Pagination */}
                        <Pagination
                            currentPage={safeReportsPage}
                            totalItems={previewRecords.length}
                            pageSize={reportsPageSize}
                            onPageChange={(p) => setReportsPage(p)}
                            onPageSizeChange={(s) => {
                                setReportsPageSize(s);
                                setReportsPage(1);
                            }}
                            itemLabel="records"
                        />
                    </>
                )}
            </div>

        </div>
    );
}

/** Provides the string predicate expected by the report formatter. */
function is_string(val) {
    return typeof val === 'string';
}
