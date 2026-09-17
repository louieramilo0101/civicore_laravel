import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    TableCellsIcon, 
    ArrowDownTrayIcon, 
    FunnelIcon, 
    CalendarIcon, 
    BuildingOfficeIcon, 
    CheckCircleIcon,
    DocumentTextIcon,
    UserIcon,
    UsersIcon,
    ChartBarIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon
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

/** Renders operational reports and export controls. */
export default function Reports() {
    const [format, setFormat] = useState('csv'); // 'csv' or 'excel'
    const [docType, setDocType] = useState('all');
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

    // Fetch live documents for preview
    useEffect(() => {
        fetchPreviewData();
    }, [docType, barangay, status, dateFrom, dateTo, searchQuery]);

    const fetchPreviewData = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                per_page: '1000',
                type: docType === 'all' ? '' : docType,
                search: searchQuery
            });
            const res = await fetch(`/api/documents?${params.toString()}`, { credentials: 'include' });
            const data = await res.json();
            
            if (data.data) {
                let filtered = data.data;
                if (barangay !== 'all') {
                    filtered = filtered.filter(d => d.barangay === barangay);
                }
                setPreviewRecords(filtered);
                setTotalCount(filtered.length);

                // Calculate summary counts from fetched dataset
                const bCount = filtered.filter(d => (d.type || '').toLowerCase() === 'birth').length;
                const dCount = filtered.filter(d => (d.type || '').toLowerCase() === 'death').length;
                const mCount = filtered.filter(d => (d.type || '').toLowerCase() === 'marriage').length;
                setTypeCounts({ birth: bCount, death: dCount, marriage: mCount });
            }
        } catch (err) {
            console.error("Failed to fetch preview data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    /** Exports the current report data in the requested format. */
    const handleExport = (targetFormat = 'csv') => {
        setFormat(targetFormat);
        setIsExporting(true);
        setDownloadSuccess(false);

        const params = new URLSearchParams({
            format: targetFormat,
            type: docType,
            barangay,
            status,
            date_from: dateFrom,
            date_to: dateTo
        });

        const exportUrl = `/api/documents/export?${params.toString()}`;
        
        const link = document.createElement('a');
        link.href = exportUrl;
        link.setAttribute('download', `civil_registry_report_${Date.now()}.${targetFormat === 'excel' ? 'xls' : 'csv'}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            setIsExporting(false);
            setDownloadSuccess(true);
            setTimeout(() => setDownloadSuccess(false), 4000);
        }, 800);
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
                        Export official Master Registry records to CSV or Excel spreadsheets for reporting and auditing.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={fetchPreviewData}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Preview
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={isExporting}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            <ArrowDownTrayIcon className={`w-4 h-4 ${isExporting && format === 'csv' ? 'animate-bounce' : ''}`} />
                            <span>Export CSV</span>
                        </button>

                        <button
                            onClick={() => handleExport('excel')}
                            disabled={isExporting}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            <ArrowDownTrayIcon className={`w-4 h-4 ${isExporting && format === 'excel' ? 'animate-bounce' : ''}`} />
                            <span>Export Excel (.xls)</span>
                        </button>
                    </div>
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
                        <div className="text-xs font-semibold text-slate-500">Matching Records</div>
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

            {/* Filter Configuration Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Report Filter Settings</h2>
                        <p className="text-xs text-slate-400">Configure report categories, date ranges, and barangays</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, registry no..."
                            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Document Type Filter */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                            Document Category
                        </label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        >
                            <option value="all">All Categories (Birth, Death, Marriage)</option>
                            <option value="birth">Certificate of Live Birth</option>
                            <option value="death">Certificate of Death</option>
                            <option value="marriage">Certificate of Marriage</option>
                        </select>
                    </div>

                    {/* Barangay Filter */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                            Barangay
                        </label>
                        <select
                            value={barangay}
                            onChange={(e) => setBarangay(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        >
                            <option value="all">All Barangays (Entire Municipality)</option>
                            {BARANGAY_LIST.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <CalendarIcon className="w-4 h-4 text-slate-400" /> Registration Date From
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <CalendarIcon className="w-4 h-4 text-slate-400" /> Registration Date To
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                    </div>
                </div>

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
                        <p className="text-xs text-slate-400">Previewing matching records to be included in the exported file</p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                        Previewing {previewRecords.length} records
                    </span>
                </div>

                {isLoading ? (
                    <div className="p-6"><SkeletonLoader type="table" rows={6} /></div>
                ) : previewRecords.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <TableCellsIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-600">No matching registry records found</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query above</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-6 py-3.5 font-black text-slate-500">ID / Reg No.</th>
                                    <th className="px-4 py-3.5 font-black text-slate-500">Ticket #</th>
                                    <th className="px-4 py-3.5 font-black text-slate-500">Category</th>
                                    <th className="px-6 py-3.5 font-black text-slate-500">Person / Spouse Name</th>
                                    <th className="px-4 py-3.5 font-black text-slate-500">Event Date</th>
                                    <th className="px-4 py-3.5 font-black text-slate-500">Barangay</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                                {previewRecords.map((doc) => {
                                    const ef = is_string(doc.extracted_fields) ? JSON.parse(doc.extracted_fields || '{}') : (doc.extracted_fields || {});
                                    const regNo = ef.registry_number || ef.registry_no || doc.id;
                                    const ticketNo = doc.ticket_number || `T-2026-${String(doc.id).padStart(4, '0')}`;
                                    return (
                                        <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
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
                                                {doc.personName || 'N/A'}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600">
                                                {doc.date || 'N/A'}
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
