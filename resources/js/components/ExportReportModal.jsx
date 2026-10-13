import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    XMarkIcon, 
    ArrowDownTrayIcon, 
    TableCellsIcon, 
    DocumentChartBarIcon,
    FunnelIcon,
    CalendarIcon,
    BuildingOfficeIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

const BARANGAY_LIST = [
    'Gomez-Zamora (Pob.)', 'Capt. C. Nazareno (Pob.)', 'Ibayo Silangan', 'Ibayo Estacion', 'Kanluran',
    'Makina', 'Sapa', 'Bucana Malaki', 'Bucana Sasahan', 'Bagong Karsada',
    'Balsahan', 'Bancaan', 'Muzon', 'Latoria', 'Labac',
    'Mabolo', 'San Roque', 'Santulan', 'Molino', 'Calubcob',
    'Halang', 'Malainen Bago', 'Malainen Luma', 'Palangue 1', 'Palangue 2 & 3',
    'Humbac', 'Munting Mapino', 'Sabang', 'Timalan Balsahan', 'Timalan Concepcion'
];

/** Lets staff choose a report format and start an export. */
export default function ExportReportModal({ isOpen, onClose }) {
    const [format, setFormat] = useState('csv'); // 'csv' or 'excel'
    const [docType, setDocType] = useState('all'); // 'all', 'birth', 'death', 'marriage'
    const [barangay, setBarangay] = useState('all');
    const [status, setStatus] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);

    if (!isOpen) return null;

    /** Validates the selected format and requests the report download. */
    const handleExport = () => {
        setIsExporting(true);
        setDownloadSuccess(false);

        const params = new URLSearchParams({
            format,
            type: docType,
            barangay,
            status,
            date_from: dateFrom,
            date_to: dateTo
        });

        const exportUrl = `/api/documents/export?${params.toString()}`;
        
        // Trigger browser file download
        const link = document.createElement('a');
        link.href = exportUrl;
        link.setAttribute('download', `civil_registry_report_${Date.now()}.${format === 'excel' ? 'xls' : 'csv'}`);
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col relative"
            >
                {/* Modal Header */}
                <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center gap-3.5 z-10">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                            <TableCellsIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-white">Export Registry Report</h3>
                            <p className="text-xs text-slate-400">Generate CSV or Excel spreadsheets from civil records</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer z-10"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                    
                    {/* Format Selector (CSV vs Excel) */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                            Select Output Format
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormat('csv')}
                                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                                    format === 'csv'
                                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-sm'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                                    format === 'csv' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    CSV
                                </div>
                                <div>
                                    <div className="text-sm font-bold">CSV File (.csv)</div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">Universal data format</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormat('excel')}
                                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                                    format === 'excel'
                                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 shadow-sm'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                                    format === 'excel' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    XLS
                                </div>
                                <div>
                                    <div className="text-sm font-bold">Excel Sheet (.xls)</div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">Native Excel spreadsheet</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Document Type Selector */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                            Document Category
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { id: 'all', label: 'All Records' },
                                { id: 'birth', label: 'Birth' },
                                { id: 'death', label: 'Death' },
                                { id: 'marriage', label: 'Marriage' }
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setDocType(t.id)}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        docType === t.id
                                            ? 'bg-slate-900 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Barangay Filter */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <BuildingOfficeIcon className="w-4 h-4 text-slate-400" /> Barangay
                            </label>
                            <select
                                value={barangay}
                                onChange={(e) => setBarangay(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            >
                                <option value="all">All Barangays (Entire Municipality)</option>
                                {BARANGAY_LIST.map((b) => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>


                        {/* Date From */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <CalendarIcon className="w-4 h-4 text-slate-400" /> Date From
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <CalendarIcon className="w-4 h-4 text-slate-400" /> Date To
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Included Columns Notice */}
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
                        <DocumentChartBarIcon className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-indigo-900 leading-relaxed">
                            <span className="font-bold">Export Columns Included:</span> Ticket #, Registry No., Document Category, Full Name, Gender, Event Date, Barangay, Municipality, Father/Husband, Mother/Wife, and Registration Date.
                        </div>
                    </div>

                    {downloadSuccess && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>Report downloaded successfully!</span>
                        </motion.div>
                    )}

                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                        <ArrowDownTrayIcon className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                        <span>{isExporting ? 'Generating File...' : `Download ${format.toUpperCase()} Report`}</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
