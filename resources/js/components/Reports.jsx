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

    const [previewRecords, setPreviewRecords] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [typeCounts, setTypeCounts] = useState({ birth: 0, death: 0, marriage: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);

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
                search: searchQuery
            });

            if (effectiveDates.from) params.append('date_from', effectiveDates.from);
            if (effectiveDates.to) params.append('date_to', effectiveDates.to);

            let records = [];

            if (dataSource === 'procured') {
                // Fetch issuances (client procured)
                const res = await fetch(`/api/issuances?${params.toString()}`, { credentials: 'include' });
                const data = await res.json();
                records = (data.data || []).map(r => ({
                    ...r,
                    _source: 'procured',
                    _sourceLabel: 'Client Procured'
                }));
            } else if (dataSource === 'all') {
                // Fetch both
                const [docRes, issRes] = await Promise.all([
                    fetch(`/api/documents?${params.toString()}`, { credentials: 'include' }),
                    fetch(`/api/issuances?${params.toString()}`, { credentials: 'include' })
                ]);
                const docData = await docRes.json();
                const issData = await issRes.json();
                const docs = (docData.data || []).map(r => ({ ...r, _source: 'internal', _sourceLabel: 'Internal Registration' }));
                const issuances = (issData.data || []).map(r => ({ ...r, _source: 'procured', _sourceLabel: 'Client Procured' }));
                records = [...docs, ...issuances];
            } else {
                // Fetch internal master registry documents
                const res = await fetch(`/api/documents?${params.toString()}`, { credentials: 'include' });
                const data = await res.json();
                records = (data.data || []).map(r => ({
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

        } catch (err) {
            console.error("Failed to fetch preview data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [dataSource, selectedDocTypes, effectiveDates, barangay, status, searchQuery]);

    useEffect(() => {
        fetchPreviewData();
    }, [fetchPreviewData]);

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
        <div className="p-4 sm:p-8 space-y-8 max-w-[1400px] mx-auto pb-16">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-1">
                        <TableCellsIcon className="w-4 h-4" /> Data Analytics & Export Center
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Civil Registry Reports & Data Export
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Export official Master Registry records and Client Procured Issuances to CSV or Excel spreadsheets.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={fetchPreviewData}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Preview
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={isExporting || totalCount === 0}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowDownTrayIcon className={`w-4 h-4 ${isExporting && format === 'csv' ? 'animate-bounce' : ''}`} />
                            <span>Export CSV</span>
                        </button>

                        <button
                            onClick={() => handleExport('excel')}
                            disabled={isExporting || totalCount === 0}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowDownTrayIcon className={`w-4 h-4 ${isExporting && format === 'excel' ? 'animate-bounce' : ''}`} />
                            <span>Export Excel (.xls)</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Source Selector Tabs */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 border border-slate-200/80 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 w-full">
                    <button
                        type="button"
                        onClick={() => setDataSource('internal')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            dataSource === 'internal'
                                ? 'bg-[#1a2f4a] text-white shadow-md shadow-slate-900/10'
                                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <ArchiveBoxIcon className="w-4 h-4" />
                        <span>Uploaded Documents</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDataSource('procured')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            dataSource === 'procured'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <TicketIcon className="w-4 h-4" />
                        <span>Client Procured Documents</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDataSource('all')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            dataSource === 'all'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <CircleStackIcon className="w-4 h-4" />
                        <span>All Records (Combined)</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <TableCellsIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{totalCount}</div>
                        <div className="text-xs font-semibold text-slate-500">
                            {dataSource === 'procured' ? 'Procured Documents' : dataSource === 'internal' ? 'Uploaded Documents' : 'Total Records'}
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#d4a574]">
                        <UserIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{typeCounts.birth}</div>
                        <div className="text-xs font-semibold text-slate-500">Birth Certificates</div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{typeCounts.death}</div>
                        <div className="text-xs font-semibold text-slate-500">Death Certificates</div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                        <UsersIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{typeCounts.marriage}</div>
                        <div className="text-xs font-semibold text-slate-500">Marriage Contracts</div>
                    </div>
                </div>
            </div>

            {/* Main Report Configuration Card */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                
                {/* Top Quick Settings: Period Dropdown + Document Types Checklist */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-100">
                    
                    {/* Period Selector (Month / 6 Months / Year / All Time / Custom) */}
                    <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <CalendarIcon className="w-4 h-4 text-indigo-600" /> Export Timeframe
                            </label>
                            {effectiveDates.from && (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
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
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-sm transition-all cursor-pointer"
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
                                className="pt-2 space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80"
                            >
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                    <span>Select Month in {selectedYear}:</span>
                                    <span className="text-[10px] text-slate-400">
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
                                                        ? 'bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-800 font-bold border border-slate-200 shadow-sm cursor-pointer'
                                                        : 'bg-slate-100/60 text-slate-300 border border-slate-200/40 cursor-not-allowed select-none'
                                                }`}
                                                title={hasRecords ? `${m.name} ${selectedYear}: ${count} record(s)` : `${m.name} ${selectedYear}: No records recorded`}
                                            >
                                                <span className="text-[11px] leading-none">{m.short}</span>
                                                <span className={`text-[9px] mt-1 font-semibold leading-none ${
                                                    isSelected && hasRecords 
                                                        ? 'text-indigo-100' 
                                                        : hasRecords 
                                                        ? 'text-indigo-600 font-black' 
                                                        : 'text-slate-300'
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
                                        ? 'bg-amber-50/50 border-[#d4a574] text-slate-900 shadow-sm ring-1 ring-[#d4a574]/20'
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                        selectedDocTypes.includes('birth') ? 'bg-[#d4a574] text-white' : 'bg-slate-100 text-slate-400'
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
                                    className="w-4 h-4 rounded text-[#d4a574] focus:ring-[#d4a574] cursor-pointer"
                                />
                            </div>

                            {/* Death */}
                            <div
                                onClick={() => toggleDocType('death')}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                                    selectedDocTypes.includes('death')
                                        ? 'bg-rose-50/50 border-rose-400 text-slate-900 shadow-sm ring-1 ring-rose-400/20'
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                        selectedDocTypes.includes('death') ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'
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
                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                            </div>

                            {/* Marriage */}
                            <div
                                onClick={() => toggleDocType('marriage')}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                                    selectedDocTypes.includes('marriage')
                                        ? 'bg-indigo-50/50 border-indigo-400 text-slate-900 shadow-sm ring-1 ring-indigo-400/20'
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                        selectedDocTypes.includes('marriage') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
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
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
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
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        <AdjustmentsHorizontalIcon className="w-4 h-4 text-indigo-600" />
                        <span>Advanced Filter Settings</span>
                        {activeAdvancedFilterCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
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
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
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
                            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                                <div className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                    Granular Filters & Search
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    
                                    {/* Search by Name or Registry No */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Search Keyword
                                        </label>
                                        <div className="relative">
                                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Name, registry no..."
                                                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Barangay Filter */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Barangay
                                        </label>
                                        <select
                                            value={barangay}
                                            onChange={(e) => setBarangay(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer"
                                        >
                                            <option value="all">All Barangays (Entire Municipality)</option>
                                            {BARANGAY_LIST.map((b) => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Custom Date From */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> Date Registered From
                                        </label>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => {
                                                setDateFrom(e.target.value);
                                                if (period !== 'custom') setPeriod('custom');
                                            }}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                        />
                                    </div>

                                    {/* Custom Date To */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> Date Registered To
                                        </label>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => {
                                                setDateTo(e.target.value);
                                                if (period !== 'custom') setPeriod('custom');
                                            }}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
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
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Live Data Export Preview</h3>
                        <p className="text-xs text-slate-400">
                            <strong className="text-slate-700">{dataSource === 'procured' ? 'Client Procured Issuances' : dataSource === 'all' ? 'All Records (Combined)' : 'Uploaded Documents'}</strong>
                            {' • '}Categories: ({selectedDocTypes.join(', ')})
                            {effectiveDates.from ? ` • Between ${effectiveDates.from} and ${effectiveDates.to}` : ''}
                        </p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100">
                        Previewing {previewRecords.length} records
                    </span>
                </div>

                {isLoading ? (
                    <div className="p-6"><SkeletonLoader type="table" rows={6} /></div>
                ) : previewRecords.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <TableCellsIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-600">No matching registry records found</p>
                        <p className="text-xs text-slate-400 mt-1">Try selecting other months or adjust your document categories above</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-100">
                                    {dataSource === 'all' && (
                                        <th className="px-4 py-3.5 font-black text-slate-500">Record Scope</th>
                                    )}
                                    <th className="px-6 py-3.5 font-black text-slate-500">ID / Reg No.</th>
                                    <th className="px-4 py-3.5 font-black text-slate-500">Ticket #</th>
                                    <th className="px-4 py-3.5 font-black text-slate-500">Category</th>
                                    <th className="px-6 py-3.5 font-black text-slate-500">Person / Client Name</th>
                                    <th className="px-4 py-3.5 font-black text-slate-500">
                                        {dataSource === 'procured' ? 'Issuance Date' : 'Event Date'}
                                    </th>
                                    <th className="px-4 py-3.5 font-black text-slate-500">Barangay</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                                {previewRecords.map((doc) => {
                                    const ef = typeof doc.extracted_fields === 'string' ? JSON.parse(doc.extracted_fields || '{}') : (doc.extracted_fields || {});
                                    const regNo = doc.certNumber || ef.registry_number || ef.registry_no || doc.id;
                                    const ticketNo = doc.ticket_number || `T-2026-${String(doc.id).padStart(4, '0')}`;
                                    const isProcured = doc._source === 'procured';

                                    return (
                                        <tr key={`${doc._source || 'rec'}-${doc.id}`} className="hover:bg-slate-50/60 transition-colors">
                                            {dataSource === 'all' && (
                                                <td className="px-4 py-4">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                                        isProcured
                                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                            : 'bg-slate-100 text-slate-700 border-slate-200'
                                                    }`}>
                                                        {isProcured ? 'Procured' : 'Uploaded'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 font-mono font-bold text-slate-900">
                                                #{doc.id} <span className="text-[11px] text-slate-400 block font-sans font-normal">{regNo}</span>
                                            </td>
                                            <td className="px-4 py-4 font-mono font-bold text-slate-800 text-xs">
                                                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
                                                    {ticketNo}
                                                </span>
                                            </td>
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
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                {doc.personName || doc.name || 'N/A'}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600">
                                                {doc.issuanceDate || doc.date || 'N/A'}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600">
                                                {doc.barangay || 'N/A'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}

/** Provides the string predicate expected by the report formatter. */
function is_string(val) {
    return typeof val === 'string';
}
