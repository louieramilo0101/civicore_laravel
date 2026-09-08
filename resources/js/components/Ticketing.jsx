import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import {
    TicketIcon,
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    PlayIcon,
    ArrowPathIcon,
    PlusCircleIcon,
    MegaphoneIcon,
    LinkIcon,
    PrinterIcon,
    ArrowDownTrayIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import { useData } from './DataContext.jsx';
import { useModal } from './ModalContext.jsx';
import axios from 'axios';

// Subcomponents for Operations Hub
import PendingRequests from './PendingRequests.jsx';


const NAIC_BARANGAYS = [
    'Gomez-Zamora (Pob.)', 'Capt. C. Nazareno (Pob.)', 'Ibayo Silangan', 'Ibayo Estacion', 'Kanluran',
    'Makina', 'Sapa', 'Bucana Malaki', 'Bucana Sasahan', 'Bagong Karsada',
    'Balsahan', 'Bancaan', 'Muzon', 'Latoria', 'Labac',
    'Mabolo', 'San Roque', 'Santulan', 'Molino', 'Calubcob',
    'Halang', 'Malainen Bago', 'Malainen Luma', 'Palangue 1', 'Palangue 2 & 3',
    'Humbac', 'Munting Mapino', 'Sabang', 'Timalan Balsahan', 'Timalan Concepcion'
].sort();

/** Runs the public ticket request and staff queue workflows. */
export default function Ticketing({ mode = 'portal' }) {
    const { token } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useModal();
    const { documents: globalDocs, refreshAll } = useData();

    // ── Portal State ──────────────────────────────────────────────────────────
    const [clientName, setClientName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [purpose, setPurpose] = useState('birth');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [details, setDetails] = useState({
        // Birth Certificate details
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        place_of_birth: '',
        father_name: '',
        mother_name: '',

        // Death Certificate details
        deceased_first_name: '',
        deceased_middle_name: '',
        deceased_last_name: '',
        date_of_death: '',
        place_of_death: '',

        // Marriage Certificate details
        husband_first_name: '',
        husband_middle_name: '',
        husband_last_name: '',
        wife_first_name: '',
        wife_middle_name: '',
        wife_last_name: '',
        date_of_marriage: '',
        place_of_marriage: ''
    });

    const sanitizeName = (val) => val ? val.replace(/[^a-zA-Z\s\.\,\'\-\ñ\Ñ\u00C0-\u024F]/g, '') : '';

    /** Updates one certificate-specific ticket detail field. */
    const handleDetailChange = (field, val) => {
        const isNameField = field.includes('name') && !field.includes('place') && !field.includes('date');
        const cleanVal = isNameField ? sanitizeName(val) : val;
        setDetails(prev => ({ ...prev, [field]: cleanVal }));
    };

    const handlePortalSubmit = async (e) => {
        e.preventDefault();
        if (!clientName.trim()) {
            showAlert({ title: 'Validation Error', message: 'Please enter your name.', type: 'danger' });
            return;
        }

        const nameRegex = /^[a-zA-Z\s\.\,\'\-\ñ\Ñ\u00C0-\u024F]+$/;
        if (!nameRegex.test(clientName.trim())) {
            showAlert({ title: 'Validation Error', message: 'Name cannot contain numbers or special symbols (only letters, spaces, and . , - \' are allowed).', type: 'danger' });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/public/tickets', {
                client_name: clientName,
                email,
                phone,
                purpose,
                details
            });
            if (res.data.success) {
                showAlert({ title: 'Ticket Generated', message: 'Your request has been queued.', type: 'success' });
                navigate(`/ticket-status/${res.data.ticket.token}`);
            }
        } catch (err) {
            console.error(err);
            const serverMsg = err.response?.data?.error || err.response?.data?.message || 'Could not create ticket. Please try again.';
            const isLimit = err.response?.status === 429;
            showAlert({
                title: isLimit ? 'Request Limit Reached' : 'Queue Error',
                message: serverMsg,
                type: isLimit ? 'warning' : 'danger'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Ticket Status View State ──────────────────────────────────────────────
    const [ticket, setTicket] = useState(null);
    const [queuePosition, setQueuePosition] = useState(0);
    const [ticketQrUrl, setTicketQrUrl] = useState(null);
    const [isLoadingTicket, setIsLoadingTicket] = useState(false);

    useEffect(() => {
        if (mode === 'status' && token) {
            fetchTicketStatus();
            const interval = setInterval(fetchTicketStatus, 15000); // refresh every 15s
            return () => clearInterval(interval);
        }
    }, [mode, token]);

    const fetchTicketStatus = async () => {
        setIsLoadingTicket(true);
        try {
            const res = await axios.get(`/api/public/tickets/${token}`);
            setTicket(res.data.ticket);
            setQueuePosition(res.data.queue_position);
            if (res.data.qr_code_url) setTicketQrUrl(res.data.qr_code_url);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingTicket(false);
        }
    };

    // ── Staff Dashboard State ──────────────────────────────────────────────────
    const [counter, setCounter] = useState(0);
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [dashboardSearch, setDashboardSearch] = useState('');
    const [dashboardStatus, setDashboardStatus] = useState('all');
    const [dashboardPurpose, setDashboardPurpose] = useState('all');
    const [isLoadingQueue, setIsLoadingQueue] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState('');
    const [activeQueueTab, setActiveQueueTab] = useState('active'); // 'active' or 'history'

    const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
    const [walkInName, setWalkInName] = useState('');
    const [walkInPurpose, setWalkInPurpose] = useState('birth');
    const [walkInPhone, setWalkInPhone] = useState('');
    const [walkInEmail, setWalkInEmail] = useState('');
    // Walk-in QR result shown inline after creation
    const [walkInResult, setWalkInResult] = useState(null); // { ticket_number, qr_base64, ticket_url }

    const handleCreateWalkIn = async (e) => {
        if (e) e.preventDefault();
        if (!walkInName.trim()) {
            showAlert({ title: 'Validation Error', message: 'Please enter client name.', type: 'danger' });
            return;
        }
        try {
            // Use dedicated walk-in endpoint (WI- prefix)
            const res = await axios.post('/api/tickets/walk-in', {
                client_name: walkInName,
                phone: walkInPhone,
                email: walkInEmail,
                purpose: walkInPurpose,
                details: {}
            });
            if (res.data.success) {
                setWalkInResult({
                    ticket_number: res.data.ticket.ticket_number,
                    qr_base64: res.data.qr_base64,
                    ticket_url: res.data.ticket_url,
                });
                setWalkInName('');
                setWalkInPhone('');
                setWalkInEmail('');
                fetchQueue();
            }
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Error', message: 'Could not create walk-in ticket.', type: 'danger' });
        }
    };

    useEffect(() => {
        if (mode === 'staff') {
            fetchQueue();
            const interval = setInterval(fetchQueue, 10000); // refresh every 10s
            return () => clearInterval(interval);
        }
    }, [mode]);

    const fetchQueue = async () => {
        setIsLoadingQueue(true);
        try {
            const res = await axios.get('/api/tickets', {
                params: {
                    search: dashboardSearch,
                    status: dashboardStatus,
                    purpose: dashboardPurpose
                }
            });
            setTickets(res.data);
            // Sync selected ticket
            if (selectedTicket) {
                const updated = res.data.find(t => t.id === selectedTicket.id);
                if (updated) setSelectedTicket(updated);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingQueue(false);
        }
    };

    const updateTicketStatus = async (id, newStatus) => {
        try {
            const res = await axios.put(`/api/tickets/${id}/status`, { status: newStatus });
            if (res.data.success) {
                showAlert({ title: 'Status Updated', message: `Ticket marked as ${newStatus}.`, type: 'success' });
                fetchQueue();
                refreshAll();
            }
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Error', message: 'Could not update ticket status.', type: 'danger' });
        }
    };

    /** Calls the next eligible request in the staff queue. */
    const handleCallNext = () => {
        const pending = tickets.filter(t => t.status === 'Pending');
        if (pending.length === 0) {
            showAlert({ title: 'Queue Empty', message: 'No pending tickets in line.', type: 'info' });
            return;
        }

        const next = pending[0];
        updateTicketStatus(next.id, 'Serving');
        setSelectedTicket(next);

        // Speak ticket call
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const rawPurpose = next.purpose === 'birth' ? 'Birth Certificate' : next.purpose === 'death' ? 'Death Certificate' : 'Marriage Certificate';
            const speakNum = next.ticket_number.replace('T-', 'Ticket ');
            const utterance = new SpeechSynthesisUtterance(`Now serving, ${speakNum}, for ${rawPurpose}. Please proceed to counter.`);
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    };

    /** Prefills the request form from a selected ticket. */
    const handlePrefill = (t) => {
        sessionStorage.setItem('civicore_ticket_prefill', JSON.stringify({
            ticket_id: t.id,
            ticket_number: t.ticket_number,
            purpose: t.purpose,
            client_name: t.client_name,
            details: t.details
        }));
        showAlert({ title: 'Prefill Active', message: `Details of ${t.ticket_number} copied. Redirecting to documents upload.`, type: 'success' });
        navigate('/documents');
    };

    const handleLinkDocument = async () => {
        if (!selectedDocId) return;
        try {
            const res = await axios.post(`/api/tickets/${selectedTicket.id}/link-document`, {
                document_id: selectedDocId
            });
            if (res.data.success) {
                showAlert({ title: 'Document Linked', message: 'Ticket linked to record and completed.', type: 'success' });
                setIsLinkModalOpen(false);
                setSelectedDocId('');
                fetchQueue();
                refreshAll();
            }
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Link Failed', message: 'Could not link ticket to document.', type: 'danger' });
        }
    };

    const handleDownloadTicket = async () => {
        try {
            const node = document.getElementById('ticket-card');
            if (!node) return;

            const dataUrl = await toPng(node, { cacheBust: true });
            const link = document.createElement('a');
            link.download = 'queue-ticket.png';
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to download ticket:', err);
            alert('Could not download the ticket image.');
        }
    };

    // ── RENDER CLIENT PORTAL (PUBLIC REQUEST FORM) ────────────────────────────────
    if (mode === 'portal') {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Back to Home Button */}
                <div className="mb-6">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-[#d4a574] transition-colors bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm"
                    >
                        <span>←</span> Back to Home
                    </Link>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.06)]"
                >
                    <div className="text-center space-y-3 mb-10">
                        <div className="w-16 h-16 bg-[#d4a574]/15 rounded-2xl flex items-center justify-center mx-auto border border-[#d4a574]/30 shadow-sm text-3xl">
                            <TicketIcon className="w-8 h-8 text-[#d4a574]" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Online Document Request</h2>
                        <p className="text-slate-700 text-sm max-w-md mx-auto font-medium">Skip the lines. Queue your document copy request online and get a real-time tracking QR code.</p>
                    </div>

                    <form onSubmit={handlePortalSubmit} className="space-y-8">
                        {/* Phase 1: Contact Details */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#d4a574]/20 text-[#c49a67] text-xs font-black flex items-center justify-center">1</span>
                                Contact Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Your Full Name</label>
                                    <div className="relative">
                                        <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            required
                                            value={clientName}
                                            onChange={e => setClientName(sanitizeName(e.target.value).slice(0, 50))}
                                            maxLength={50}
                                            placeholder="Juan Santos"
                                            className="w-full pl-10 pr-4 py-3.5 border border-slate-300 rounded-2xl bg-white focus:outline-none focus:ring-4 focus:ring-[#d4a574]/10 focus:border-[#d4a574] transition-all text-sm font-semibold text-slate-900 placeholder-slate-400"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Email Address</label>
                                    <div className="relative">
                                        <EnvelopeIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value.slice(0, 100))}
                                            maxLength={100}
                                            placeholder="juan@email.com"
                                            className="w-full pl-10 pr-4 py-3.5 border border-slate-300 rounded-2xl bg-white focus:outline-none focus:ring-4 focus:ring-[#d4a574]/10 focus:border-[#d4a574] transition-all text-sm font-semibold text-slate-900 placeholder-slate-400"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Phone Number</label>
                                    <div className="relative">
                                        <PhoneIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            value={phone}
                                            onChange={e => {
                                                const cleaned = e.target.value.replace(/[^0-9+\-\s()]/g, '').slice(0, 15);
                                                setPhone(cleaned);
                                            }}
                                            maxLength={15}
                                            placeholder="09123456789 (or +639123456789)"
                                            className="w-full pl-10 pr-4 py-3.5 border border-slate-300 rounded-2xl bg-white focus:outline-none focus:ring-4 focus:ring-[#d4a574]/10 focus:border-[#d4a574] transition-all text-sm font-semibold text-slate-900 placeholder-slate-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Phase 2: Purpose */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#d4a574]/20 text-[#c49a67] text-xs font-black flex items-center justify-center">2</span>
                                Document Type & Purpose
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'birth', label: 'Birth Certificate', icon: <UserIcon className="w-8 h-8 text-slate-700" />, desc: 'Copy of Certificate of Live Birth' },
                                    { id: 'death', label: 'Death Certificate', icon: <DocumentTextIcon className="w-8 h-8 text-slate-700" />, desc: 'Copy of Certificate of Death' },
                                    { id: 'marriage', label: 'Marriage Contract', icon: <UsersIcon className="w-8 h-8 text-slate-700" />, desc: 'Copy of Certificate of Marriage' }
                                ].map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => setPurpose(item.id)}
                                        className={`p-5 border-2 rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-36 ${purpose === item.id
                                            ? 'border-[#d4a574] bg-[#d4a574]/10 shadow-sm'
                                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            {item.icon}
                                            {purpose === item.id && <span className="w-5 h-5 rounded-full bg-[#d4a574] flex items-center justify-center text-[#0f172a] text-xs font-black">✓</span>}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">{item.label}</p>
                                            <p className="text-[11px] text-slate-700 font-medium mt-1">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Phase 3: Details */}
                        <div className="space-y-6 bg-slate-100/40 p-6 rounded-3xl border border-slate-200">
                            <h3 className="text-md font-black text-slate-900 flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5 text-[#d4a574]" />
                                Provide Registry Information (To Speed Up Processing)
                            </h3>

                            {purpose === 'birth' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">First Name (on Certificate)</label>
                                        <input type="text" required value={details.first_name} onChange={e => handleDetailChange('first_name', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="First Name" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Middle Name (on Certificate)</label>
                                        <input type="text" required value={details.middle_name} onChange={e => handleDetailChange('middle_name', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Middle Name" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Last Name (on Certificate)</label>
                                        <input type="text" required value={details.last_name} onChange={e => handleDetailChange('last_name', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Last Name" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Date of Birth</label>
                                        <input type="date" required value={details.date_of_birth} onChange={e => handleDetailChange('date_of_birth', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-[#d4a574] focus:outline-none" />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Place of Birth (City/Hospital)</label>
                                        <input type="text" required value={details.place_of_birth} onChange={e => handleDetailChange('place_of_birth', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="e.g. Naic, Cavite" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Father's Full Name</label>
                                        <input type="text" required value={details.father_name} onChange={e => handleDetailChange('father_name', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Father's Full Name" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Mother's Full Maiden Name</label>
                                        <input type="text" required value={details.mother_name} onChange={e => handleDetailChange('mother_name', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Mother's Maiden Name" />
                                    </div>
                                </div>
                            )}

                            {purpose === 'death' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Deceased First Name</label>
                                        <input type="text" required value={details.deceased_first_name} onChange={e => handleDetailChange('deceased_first_name', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Deceased First Name" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Deceased Middle Name</label>
                                        <input type="text" required value={details.deceased_middle_name} onChange={e => handleDetailChange('deceased_middle_name', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Deceased Middle Name" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Deceased Last Name</label>
                                        <input type="text" required value={details.deceased_last_name} onChange={e => handleDetailChange('deceased_last_name', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Deceased Last Name" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Date of Death</label>
                                        <input type="date" required value={details.date_of_death} onChange={e => handleDetailChange('date_of_death', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-[#d4a574] focus:outline-none" />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Place of Death</label>
                                        <input type="text" required value={details.place_of_death} onChange={e => handleDetailChange('place_of_death', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="e.g. Naic, Cavite" />
                                    </div>
                                </div>
                            )}

                            {purpose === 'marriage' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Husband */}
                                    <div className="space-y-3 border-r border-slate-200 pr-4">
                                        <h4 className="text-xs font-black text-slate-800 uppercase">Husband Details</h4>
                                        <input type="text" required value={details.husband_first_name} onChange={e => handleDetailChange('husband_first_name', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm mb-2 text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="First Name" />
                                        <input type="text" required value={details.husband_middle_name} onChange={e => handleDetailChange('husband_middle_name', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm mb-2 text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Middle Name" />
                                        <input type="text" required value={details.husband_last_name} onChange={e => handleDetailChange('husband_last_name', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Last Name" />
                                    </div>
                                    {/* Wife */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-black text-slate-800 uppercase">Wife Details</h4>
                                        <input type="text" required value={details.wife_first_name} onChange={e => handleDetailChange('wife_first_name', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm mb-2 text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="First Name" />
                                        <input type="text" required value={details.wife_middle_name} onChange={e => handleDetailChange('wife_middle_name', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm mb-2 text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Middle Name" />
                                        <input type="text" required value={details.wife_last_name} onChange={e => handleDetailChange('wife_last_name', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="Last Name" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Date of Marriage</label>
                                        <input type="date" required value={details.date_of_marriage} onChange={e => handleDetailChange('date_of_marriage', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-[#d4a574] focus:outline-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Place of Marriage</label>
                                        <input type="text" required value={details.place_of_marriage} onChange={e => handleDetailChange('place_of_marriage', e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-[#d4a574] focus:outline-none" placeholder="e.g. Naic, Cavite" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-gradient-to-r from-[#d4a574] to-[#c49a67] text-[#0f172a] rounded-2xl font-black shadow-xl shadow-[#d4a574]/15 hover:shadow-2xl transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? 'Queueing request...' : 'Get Queue Ticket'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        );
    }

    // ── RENDER TICKET STATUS (CLIENT RECEIPT / LIVE QUEUE POSITION) ───────────────
    if (mode === 'status') {
        const trackingToken = token || ticket?.token || '';
        const trackingUrl = trackingToken
            ? `${window.location.origin}/ticket-status/${trackingToken}`
            : `${window.location.origin}/ticket-status`;
        const purposeLabel = ticket?.purpose === 'birth' ? 'Birth Certificate' : ticket?.purpose === 'death' ? 'Death Certificate' : 'Marriage Certificate';
        const formattedDate = ticket?.created_at ? new Date(ticket.created_at).toLocaleString() : '';

        return (
            <div className="max-w-2xl mx-auto py-12 px-4">
                {isLoadingTicket && !ticket ? (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                        <ArrowPathIcon className="w-10 h-10 animate-spin text-[#d4a574] mb-3" />
                        <p className="text-sm font-semibold">Retrieving your queue position...</p>
                    </div>
                ) : !ticket ? (
                    <div className="text-center py-20 bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-12 border border-slate-200">
                        <XCircleIcon className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">Invalid Token</h3>
                        <p className="text-slate-400 text-sm mt-2">Could not find queue details for this tracking code.</p>
                        <Link to="/ticket-request" className="mt-6 inline-block bg-[#1a2f4a] text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider">Request Ticket</Link>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        {/* Premium downloadable ticket */}
                        <div id="ticket-card" className="bg-[#0f172a] text-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden border border-slate-800 print:bg-white print:text-slate-900 print:shadow-none print:p-6 print:rounded-none">
                            {/* Ambient Light */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4a574]/10 rounded-full blur-[100px] pointer-events-none print:hidden"></div>

                            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6 border-b border-white/10 pb-8 print:border-slate-200">
                                <div>
                                    <div className="font-extrabold text-[#d4a574] text-lg tracking-tight uppercase leading-none mb-2">CIVICORE NAIC</div>
                                    <h2 className="text-2xl font-black text-white tracking-tight print:text-slate-900">Civil Registry Queue Ticket</h2>
                                    <p className="text-slate-400 text-xs mt-1 print:text-slate-500">{formattedDate}</p>
                                </div>
                                <div className="bg-white p-3 rounded-2xl shadow-lg print:shadow-none border border-slate-100 shrink-0 w-[128px] h-[128px] flex items-center justify-center overflow-hidden">
                                    <QRCodeCanvas
                                        value={ticket?.ticket_number || ''}
                                        size={110}
                                        bgColor="#ffffff"
                                        fgColor="#0f172a"
                                        includeMargin={true}
                                        level="M"
                                    />
                                </div>
                            </div>

                            <div className="py-8 grid grid-cols-1 sm:grid-cols-2 gap-8 border-b border-white/10 pb-8 print:border-slate-200 print:py-6">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest print:text-slate-500">Ticket Number</p>
                                        <p className="text-4xl font-black text-white tracking-tighter mt-1 print:text-slate-900">{ticket.ticket_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest print:text-slate-500">Requestor Name</p>
                                        <p className="text-base font-extrabold text-white mt-0.5 print:text-slate-800">{ticket.client_name}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest print:text-slate-500">Requested Document</p>
                                        <p className="text-lg font-black text-[#d4a574] tracking-tight mt-1">{purposeLabel}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest print:text-slate-500">Ticket Status</p>
                                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-1 border ${ticket.status === 'Serving'
                                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                            : ticket.status === 'Completed'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : ticket.status === 'Cancelled'
                                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                    : ticket.status === 'Expired'
                                                        ? 'bg-slate-200/60 text-slate-400 border-slate-300/50'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                </div>
                            </div>


                            {ticket.status === 'Serving' && (
                                <div className="pt-8 text-center space-y-2 bg-indigo-500/5 p-6 rounded-3xl border border-indigo-500/10 print:hidden animate-pulse">
                                    <MegaphoneIcon className="w-8 h-8 text-indigo-400 mx-auto" />
                                    <h4 className="font-black text-lg text-white">Your Ticket is Called!</h4>
                                    <p className="text-xs text-slate-300">Please proceed to the registry counter for document verification.</p>
                                </div>
                            )}

                            {ticket.status === 'Completed' && (
                                <div className="pt-8 text-center space-y-2 bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/10 print:hidden">
                                    <CheckCircleIcon className="w-8 h-8 text-emerald-400 mx-auto" />
                                    <h4 className="font-black text-lg text-white">Request Completed</h4>
                                    <p className="text-xs text-slate-300">Your document copy has been successfully issued. Thank you!</p>
                                </div>
                            )}

                            {ticket.status === 'Expired' && (
                                <div className="pt-8 text-center space-y-2 bg-slate-500/5 p-6 rounded-3xl border border-slate-500/10 print:hidden">
                                    <ClockIcon className="w-8 h-8 text-slate-400 mx-auto" />
                                    <h4 className="font-black text-lg text-slate-300">Ticket Expired</h4>
                                    <p className="text-xs text-slate-400">This ticket was valid until 5:00 PM on the day it was issued. Please request a new ticket.</p>
                                    <a href="/ticket-request" className="inline-block mt-3 px-5 py-2 bg-[#d4a574] text-[#0f172a] rounded-xl text-xs font-black uppercase tracking-widest">New Request</a>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleDownloadTicket}
                                className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                Download Ticket
                            </button>
                            <Link
                                to="/ticket-request"
                                className="flex-1 flex items-center justify-center gap-2 bg-[#1a2f4a] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#112033] transition-all active:scale-95 text-center shadow-lg"
                            >
                                <PlusCircleIcon className="w-4 h-4" />
                                New Request
                            </Link>
                        </div>
                    </motion.div>
                )}
            </div>
        );
    }

    // ── RENDER STAFF QUEUE DASHBOARD (PRIVATE BOARD) ──────────────────────────────
    if (mode === 'staff') {
        /** Notifies the parent shell that ticket counters should refresh. */
        const triggerCounterRefresh = () => {
            setCounter(prev => prev + 1);
        };

        return (
            <div className="p-0 max-w-[1600px] mx-auto flex flex-col h-full">
                {/* Unified Tickets Queue */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="flex-1 min-h-0"
                >
                    <PendingRequests showAlert={showAlert} refreshCounter={triggerCounterRefresh} counter={counter} />
                </motion.div>
            </div>
        );
    }
}
