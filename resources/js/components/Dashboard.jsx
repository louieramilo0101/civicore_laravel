import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { AnimatedStatCard } from './AnimatedCounter';
import SkeletonLoader from './SkeletonLoader';
import {
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    UsersIcon,
    ArrowUpTrayIcon,
    ShieldCheckIcon,
    ArrowPathIcon,
    HeartIcon,
    XCircleIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { useData } from './DataContext';

// Helper Component for the traveling light effect
/** Renders the animated edge accent used by dashboard metric cards. */
const BorderBeam = ({ color = "#4f46e5", duration = 8, delay = 0 }) => (
    <div className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden">
        <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect
                width="100%"
                height="100%"
                fill="none"
                rx="inherit"
                stroke="transparent"
                strokeWidth="2"
            />
            <motion.rect
                width="100%"
                height="100%"
                fill="none"
                rx="inherit"
                stroke={`url(#beam-grad-${delay})`}
                strokeWidth="4"
                strokeDasharray="100 400"
                initial={{ strokeDashoffset: 500 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{
                    duration,
                    repeat: Infinity,
                    ease: "linear",
                    delay
                }}
            />
            <defs>
                <linearGradient id={`beam-grad-${delay}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor={color} />
                    <stop offset="100%" stopColor="transparent" />
                </linearGradient>
            </defs>
        </svg>
    </div>
);

/** Renders staff dashboard metrics, charts, and operational summaries. */
function Dashboard() {
    const { stats, refreshStats, loading: dataLoading } = useData();
    const [chartData, setChartData] = useState(null);
    const loading = dataLoading.stats;
    const chartRefs = useRef({});

    const mottos = [
        "Empowering citizens through digital excellence.",
        "Integrity in every record, service in every action.",
        "Building a more connected and efficient Civil Registry.",
        "Precision, Accountability, and Public Service.",
        "Your work today shapes the digital foundation of tomorrow.",
        "Dedicated to data integrity and community service."
    ];

    const motto = React.useMemo(() => mottos[Math.floor(Math.random() * mottos.length)], []);

    // Real-time synchronization on mount
    useEffect(() => {
        refreshStats(true);
    }, [refreshStats]);

    useEffect(() => {
        const cachedChartData = sessionStorage.getItem('civicore_chart_data');
        if (cachedChartData) {
            setChartData(JSON.parse(cachedChartData));
        }
    }, [stats]);

    // Initialize Charts
    useEffect(() => {
        if (loading || !chartData) return;

        const Chart = window.Chart;
        if (!Chart) return;

        Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
        Chart.defaults.color = '#020617';
        Chart.defaults.font.size = 13;
        Chart.defaults.font.weight = '600';

        Object.values(chartRefs.current).forEach(chart => chart?.destroy());

        /** Creates or replaces a Chart.js instance for a dashboard panel. */
        const createChart = (id, config) => {
            const ctx = document.getElementById(id);
            if (ctx) chartRefs.current[id] = new Chart(ctx, config);
        };

        createChart('docTypesChart', {
            type: 'doughnut',
            data: {
                labels: chartData?.docTypes?.labels || [],
                datasets: [{
                    data: chartData?.docTypes?.data || [],
                    backgroundColor: (chartData?.docTypes?.labels || []).map(label => {
                        const l = label.toLowerCase();
                        if (l === 'birth') return '#d4a574';
                        if (l === 'death') return '#f43f5e';
                        if (l === 'marriage') return '#6366f1';
                        return '#0f172a';
                    }),
                    hoverOffset: 30,
                    hoverBorderWidth: 4,
                    hoverBorderColor: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                animation: {
                    animateRotate: true,
                    animateScale: true
                },
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#0f172a', padding: 25, font: { size: 12, weight: '700' } } },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#0f172a',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        cornerRadius: 10,
                        displayColors: true
                    }
                }
            }
        });

        createChart('statusChart', {
            type: 'bar',
            data: {
                labels: ['Complete', 'In Queue', 'Action Needed'],
                datasets: [{
                    data: chartData?.processStatus?.data || [0, 0, 0],
                    backgroundColor: ['#10b981', '#4f46e5', '#ef4444'],
                    hoverBackgroundColor: ['#34d399', '#6366f1', '#f87171'],
                    borderRadius: 8,
                    barThickness: 50
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#0f172a', font: { weight: '700' } } },
                    x: { grid: { display: false }, ticks: { color: '#0f172a', font: { weight: '700', size: 12 } } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        padding: 12,
                        cornerRadius: 10
                    }
                }
            }
        });

        createChart('trendChart', {
            type: 'line',
            data: {
                labels: chartData?.trendChart?.labels || [],
                datasets: [
                    {
                        label: 'Births',
                        data: chartData?.trendChart?.births || [],
                        borderColor: '#d4a574',
                        backgroundColor: 'rgba(212, 165, 116, 0.05)',
                        borderWidth: 4,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#d4a574',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Deaths',
                        data: chartData?.trendChart?.deaths || [],
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.05)',
                        borderWidth: 4,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#f43f5e',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Marriages',
                        data: chartData?.trendChart?.marriages || [],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.05)',
                        borderWidth: 4,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#0f172a', stepSize: 1 } },
                    x: { grid: { display: false }, ticks: { color: '#0f172a', font: { weight: '700' } } }
                },
                plugins: {
                    legend: { display: true, labels: { font: { weight: '700' } } },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        padding: 12,
                        cornerRadius: 10
                    }
                }
            }
        });

        createChart('accuracyChart', {
            type: 'polarArea',
            data: {
                labels: chartData?.accuracyChart?.labels || [],
                datasets: [{
                    data: chartData?.accuracyChart?.data || [],
                    backgroundColor: ['rgba(79, 70, 229, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(139, 92, 246, 0.8)'],
                    hoverBorderWidth: 5,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { grid: { color: '#f1f5f9' }, ticks: { display: false } } },
                plugins: {
                    legend: { position: 'right', labels: { color: '#0f172a', font: { weight: '700', size: 11 } } },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        padding: 12,
                        cornerRadius: 10
                    }
                }
            }
        });

        return () => Object.values(chartRefs.current).forEach(chart => chart?.destroy());
    }, [loading, chartData]);

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12 max-w-7xl mx-auto font-['Inter'] min-h-screen relative z-10">
            {/* High Contrast Welcome Hero with Aesthetic Background Glow & Hover Interaction */}
            <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="relative p-10 rounded-[2.5rem] bg-slate-900 border-2 border-slate-800 shadow-2xl overflow-hidden group hover:scale-[1.02] hover:border-indigo-500/50 hover:shadow-[0_20px_50px_rgba(79,70,229,0.2)] transition-all duration-500 ease-out"
            >
                {/* Aesthetic Background Glows - Retained for Depth */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-20%] left-[10%] w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>
                    <div className="absolute bottom-[-20%] right-[20%] w-[250px] h-[250px] bg-emerald-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-indigo-200 text-sm font-bold">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
                            {greeting}, <span className="text-indigo-400 capitalize">{user.name?.split(' ')[0]}</span>
                        </h1>
                        <p className="text-slate-400 text-lg font-medium tracking-tight italic">"{motto}"</p>
                    </div>
                    <div className="hidden md:flex items-center gap-4">
                        <a href="/" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl flex items-center gap-2 text-white font-bold text-sm transition-colors backdrop-blur-sm cursor-pointer shadow-lg shadow-black/30 group">
                            <svg className="w-5 h-5 opacity-80 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            Live Website
                        </a>
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-inner shadow-white/5">
                            <ShieldCheckIcon className="w-8 h-8 text-indigo-400 animate-pulse drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]" />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Human-Centric Stats Grid - Clear & Helpful */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'TOTAL RECORD', val: stats.totalDocs, icon: ShieldCheckIcon, color: 'text-white', bg: 'bg-indigo-600', border: 'border-indigo-700', sub: 'Master' },
                    { label: 'UPLOAD PENDING', val: stats.pendingDocs, icon: DocumentTextIcon, color: 'text-slate-950', bg: 'bg-white', border: 'border-slate-300', sub: 'Action Needed' },
                    { label: 'TOTAL ISSUED FILES', val: stats.totalIssuances, icon: ClipboardDocumentCheckIcon, color: 'text-slate-950', bg: 'bg-white', border: 'border-slate-300', sub: 'Finalized' },
                    { label: 'TOTAL Users', val: stats.totalUsers, icon: UsersIcon, color: 'text-slate-950', bg: 'bg-white', border: 'border-slate-300', sub: 'Current' }
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        variants={itemVariants}
                        className={`${s.bg} rounded-[2rem] p-8 border-2 ${s.border} shadow-sm relative group hover:shadow-xl hover:scale-[1.02] hover:border-indigo-500 transition-all duration-300 ease-out`}
                    >
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.bg === 'bg-white' ? 'bg-slate-100' : 'bg-white/20'}`}>
                                <s.icon className={`w-6 h-6 ${s.bg === 'bg-white' ? 'text-indigo-600' : 'text-white'}`} />
                            </div>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <h3 className={`text-5xl font-black tracking-tight ${s.color} tabular-nums leading-none`}>{s.val}</h3>
                            <p className={`text-xs font-bold uppercase tracking-widest mt-2 ${s.bg === 'bg-white' ? 'text-slate-950' : 'text-white'}`}>{s.label}</p>
                        </div>
                        <p className={`text-[10px] font-bold mt-4 uppercase tracking-tighter relative z-10 ${s.bg === 'bg-white' ? 'text-slate-500' : 'text-indigo-100'}`}>{s.sub} Volume</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Certificate Types Stats Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                {[
                    { label: 'Birth Certificates', val: stats.birthsCount || 0, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', sub: 'Total Birth Records' },
                    { label: 'Death Certificates', val: stats.deathsCount || 0, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', sub: 'Total Death Records' },
                    { label: 'Marriage Certificates', val: stats.marriagesCount || 0, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', sub: 'Total Marriage Records' }
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        variants={itemVariants}
                        className={`${s.bg} rounded-[2rem] p-6 border-2 shadow-xs relative group hover:shadow-lg hover:scale-[1.02] transition-all duration-300 ease-out flex flex-col justify-center`}
                    >
                        <div className="space-y-1 relative z-10">
                            <h3 className={`text-4xl font-black tracking-tight text-slate-950 tabular-nums leading-none`}>{s.val}</h3>
                            <p className={`text-xs font-bold uppercase tracking-widest mt-2 ${s.color}`}>{s.label}</p>
                        </div>
                        <p className={`text-[10px] font-black mt-3 uppercase tracking-tighter relative z-10 text-slate-400`}>{s.sub}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Human-Friendly Charts Section - Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                <motion.div variants={itemVariants} className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border-2 border-slate-300 shadow-sm flex flex-col h-[520px] relative group hover:shadow-xl transition-shadow duration-300">
                    <div className="mb-10 text-center relative z-10">
                        <h3 className="font-black text-slate-950 text-xl tracking-tight leading-none mb-2">Document Types</h3>
                        <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest">Breakdown by Type</p>
                    </div>
                    <div className="flex-1 relative flex items-center justify-center z-10">
                        <canvas id="docTypesChart"></canvas>
                        <div className="absolute pointer-events-none flex flex-col items-center justify-center mb-10 bg-white w-24 h-24 rounded-full border-4 border-slate-100 shadow-lg">
                            <span className="text-4xl font-black text-slate-950 tracking-tighter">{stats.totalDocs}</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border-2 border-slate-300 shadow-sm flex flex-col h-[520px] relative group hover:shadow-xl transition-shadow duration-300">
                    <div className="flex justify-between items-center mb-10 relative z-10">
                        <div>
                            <h3 className="font-black text-slate-950 text-2xl tracking-tight leading-none mb-2">Processing Status</h3>
                            <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest">Workflow progress</p>
                        </div>
                    </div>
                    <div className="flex-1 relative z-10">
                        <canvas id="statusChart"></canvas>
                    </div>
                </motion.div>
            </div>

            {/* Human-Friendly Charts Section - Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border-2 border-slate-300 shadow-sm flex flex-col h-[450px] relative group hover:shadow-xl transition-shadow duration-300">
                    <div className="flex justify-between items-center mb-10 relative z-10">
                        <div>
                            <h3 className="font-black text-slate-950 text-2xl tracking-tight leading-none mb-2">Registration Timeline</h3>
                            <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest">New records per month</p>
                        </div>
                    </div>
                    <div className="flex-1 relative z-10">
                        <canvas id="trendChart"></canvas>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="lg:col-span-1 bg-white p-10 rounded-[2.5rem] border-2 border-slate-300 shadow-sm flex flex-col h-[450px] relative group hover:shadow-xl transition-shadow duration-300">
                    <div className="mb-8 relative z-10">
                        <h3 className="font-black text-slate-950 text-xl tracking-tight leading-none mb-2">Records by Area</h3>
                        <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest">Location distribution</p>
                    </div>
                    <div className="flex-1 relative z-10">
                        <canvas id="accuracyChart"></canvas>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}

export default Dashboard;
