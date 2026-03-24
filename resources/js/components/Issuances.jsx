import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    PrinterIcon, DocumentMinusIcon, 
    MagnifyingGlassIcon, PlusCircleIcon,
    AdjustmentsHorizontalIcon, EyeIcon,
    TrashIcon, CheckCircleIcon, ClockIcon
} from '@heroicons/react/24/outline';
import { useModal } from './ModalContext.jsx';
import SkeletonLoader from './SkeletonLoader.jsx';

const Issuances = () => {
    const { showAlert } = useModal();
    const [isLoading, setIsLoading] = useState(true);
    const [certificates, setCertificates] = useState([]);
    const [selectedType, setSelectedType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectAll, setSelectAll] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    
    const [newCert, setNewCert] = useState({
        number: '',
        type: 'birth',
        name: '',
        barangay: '',
        date: '',
        status: 'Issued'
    });

    const fetchIssuances = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/issuances', { credentials: 'include' });
            const data = await res.json();
            if (data.data) {
                const results = data.data.map(i => ({
                    id: i.id,
                    number: i.certNumber,
                    type: i.type,
                    name: i.name,
                    barangay: i.barangay,
                    date: i.issuanceDate,
                    status: i.status
                }));
                setCertificates(results);
                sessionStorage.setItem('cache_issuances', JSON.stringify(results));
            }
        } catch (e) {
            console.error("Error fetching issuances:", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Load from database initially
    useEffect(() => {
        fetchIssuances();
    }, []);

    // Generate real cert number from database when modal opens or type changes
    useEffect(() => {
        if (showNewModal) {
            fetch(`/api/issuances/next-cert-number/${newCert.type}`, { credentials: 'include' })
                .then(res => res.json())
                .then(data => setNewCert(prev => ({ ...prev, number: data.certNumber })))
                .catch(e => console.error("Error fetching cert num:", e));
        }
    }, [showNewModal, newCert.type]);

    const filteredCertificates = certificates.filter(cert => 
        (selectedType === 'all' || cert.type.toLowerCase().includes(selectedType.toLowerCase())) &&
        (cert.number.toLowerCase().includes(searchTerm.toLowerCase()) || cert.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const selectedCerts = filteredCertificates.filter(cert => cert.selected);

    const toggleSelectAll = () => {
        setCertificates(prev => prev.map(cert => ({ ...cert, selected: !selectAll })));
        setSelectAll(!selectAll);
    };

    const addNewIssuance = async (e) => {
        e.preventDefault();
        if (!newCert.name || !newCert.date || !newCert.number) {
            showAlert({
                title: 'Validation Error',
                message: 'Please fill all required fields before proceeding.',
                type: 'warning'
            });
            return;
        }
        
        try {
            const payload = {
                certNumber: newCert.number,
                type: newCert.type,
                name: newCert.name,
                barangay: newCert.barangay,
                issuanceDate: newCert.date,
                status: newCert.status
            };
            
            const res = await fetch('/api/issuances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.success) {
                fetchIssuances();
                setShowNewModal(false);
                setNewCert({ number: '', type: 'birth', name: '', barangay: '', date: '', status: 'Issued' });
                showAlert({
                    title: 'Success',
                    message: 'New issuance has been saved successfully.',
                    type: 'success'
                });
            } else {
                showAlert({
                    title: 'Error Saving',
                    message: data.error || "Failed to save issuance. Please try again.",
                    type: 'error'
                });
            }
        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Network Error',
                message: "A network error occurred while saving the issuance.",
                type: 'error'
            });
        }
    };

    const handleDelete = async (id) => {
        showAlert({
            title: 'Delete Issuance',
            message: 'Are you sure you want to permanently delete this issuance record? This action cannot be undone.',
            type: 'warning',
            showCancel: true,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/issuances/${id}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    const data = await res.json();
                    if (data.success) {
                        // Update local state
                        const updated = certificates.filter(c => c.id !== id);
                        setCertificates(updated);
                        sessionStorage.setItem('cache_issuances', JSON.stringify(updated));
                        
                        showAlert({
                            title: 'Deleted',
                            message: 'The issuance has been successfully deleted.',
                            type: 'success'
                        });
                    }
                } catch (error) {
                    console.error("Error deleting issuance:", error);
                }
            }
        });
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    // Render layout immediately, skeletons for data sections
    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 max-w-7xl mx-auto"
        >
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-3">
                        <SkeletonLoader type="cards" rows={1} />
                    </div>
                ) : (
                    <>
                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Total Issuances</p>
                                <h3 className="text-3xl font-black text-slate-800">{certificates.length}</h3>
                            </div>
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                                <DocumentMinusIcon className="w-6 h-6" />
                            </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex items-center justify-between">
                            <div>
                                <p className="text-emerald-500 text-sm font-bold uppercase tracking-wider mb-1">Issued Status</p>
                                <h3 className="text-3xl font-black text-slate-800">{certificates.filter(c => c.status === 'Issued').length}</h3>
                            </div>
                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex items-center justify-between">
                            <div>
                                <p className="text-amber-500 text-sm font-bold uppercase tracking-wider mb-1">Pending Review</p>
                                <h3 className="text-3xl font-black text-slate-800">{certificates.filter(c => c.status === 'Pending').length}</h3>
                            </div>
                            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                                <ClockIcon className="w-6 h-6" />
                            </div>
                        </motion.div>
                    </>
                )}
            </div>

            {/* Main Table Container */}
            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden flex flex-col">
                
                {/* Search & Filters */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                        {/* Search */}
                        <div className="relative max-w-md w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name or certificate number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 focus:border-[#d4a574] sm:text-sm transition-all shadow-sm"
                            />
                        </div>

                        {/* Filters & Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {['all', 'birth', 'death', 'marriage'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                            selectedType === type 
                                                ? 'bg-white text-slate-800 shadow-sm' 
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                            <button 
                                onClick={() => setShowNewModal(!showNewModal)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                New Issuance
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedCerts.length > 0 && (
                    <div className="bg-indigo-50/50 px-6 py-3 border-b border-indigo-100 flex items-center justify-between text-sm">
                        <span className="font-semibold text-indigo-800">
                            {selectedCerts.length} items selected
                        </span>
                        <div className="flex gap-2">
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
                                <PrinterIcon className="w-4 h-4" /> Print Selected
                            </button>
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100 font-medium">
                                <TrashIcon className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    </div>
                )}

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                                <th className="p-4 pl-6 w-12">
                                    <input 
                                        type="checkbox" 
                                        checked={selectAll && filteredCertificates.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 text-[#d4a574] border-slate-300 rounded focus:ring-[#d4a574] cursor-pointer accent-[#d4a574]"
                                    />
                                </th>
                                <th className="p-4">Certificate No.</th>
                                <th className="p-4">Reg. Type</th>
                                <th className="p-4">Recipient Name</th>
                                <th className="p-4">Barangay</th>
                                <th className="p-4">Date Added</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="p-0">
                                        <SkeletonLoader type="table" rows={8} />
                                    </td>
                                </tr>
                            ) : filteredCertificates.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500">
                                        No certificates found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredCertificates.map((cert) => (
                                    <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <input 
                                                type="checkbox"
                                                checked={cert.selected || false}
                                                onChange={() => setCertificates(prev => prev.map(c => c.id === cert.id ? {...c, selected: !c.selected} : c))}
                                                className="w-4 h-4 text-[#d4a574] border-slate-300 rounded focus:ring-[#d4a574] cursor-pointer accent-[#d4a574]"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-slate-800">{cert.number}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                                {cert.type}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-semibold text-slate-700">{cert.name}</span>
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm">
                                            {cert.barangay}
                                        </td>
                                        <td className="p-4 text-slate-500 text-sm">
                                            {cert.date}
                                        </td>
                                        <td className="p-4">
                                            {cert.status === 'Issued' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Issued
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View details">
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
                                                <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Print document">
                                                    <PrinterIcon className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(cert.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                                                    title="Delete record"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* New Issuance Modal/Form overlay - Simplified for standard display */}
            {showNewModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">Issue New Certificate</h3>
                            <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-2">✕</button>
                        </div>
                        
                        <form onSubmit={addNewIssuance} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Type</label>
                                    <select 
                                        value={newCert.type} 
                                        onChange={(e) => setNewCert({...newCert, type: e.target.value})}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all font-medium" 
                                    >
                                        <option value="birth">Live Birth</option>
                                        <option value="death">Death</option>
                                        <option value="marriage">Marriage</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Certificate Number</label>
                                    <input 
                                        value={generateCertNumber()} 
                                        readOnly 
                                        className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm font-mono cursor-not-allowed" 
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Recipient Full Name *</label>
                                    <input 
                                        value={newCert.name} 
                                        onChange={(e) => setNewCert({...newCert, name: e.target.value})}
                                        placeholder="e.g. Juan P. Dela Cruz"
                                        required
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Barangay</label>
                                    <select 
                                        value={newCert.barangay} 
                                        onChange={(e) => setNewCert({...newCert, barangay: e.target.value})}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all" 
                                    >
                                        <option value="">Select Barangay...</option>
                                        <option value="Poblacion">Poblacion</option>
                                        <option value="Bagong Bayan">Bagong Bayan</option>
                                        <option value="Halang">Halang</option>
                                        <option value="Sabang">Sabang</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Registration Date *</label>
                                    <input 
                                        type="date" 
                                        value={newCert.date} 
                                        onChange={(e) => setNewCert({...newCert, date: e.target.value})}
                                        required
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all" 
                                    />
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowNewModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#0f172a] hover:bg-slate-800 transition-colors shadow-sm">Save & Issue Certificate</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

        </motion.div>
    );
};

export default Issuances;

