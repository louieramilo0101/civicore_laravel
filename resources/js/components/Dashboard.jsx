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

        const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#e2e8f0';
        const labelColor = isDarkMode ? '#94a3b8' : '#0f172a';
        const chartBg = isDarkMode ? '#0f172a' : '#ffffff';

        Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
        Chart.defaults.color = labelColor;
        Chart.defaults.font.size = 11;
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
                        return isDarkMode ? '#38bdf8' : '#0f172a';
                    }),
                    hoverOffset: 12,
                    hoverBorderWidth: 3,
                    hoverBorderColor: chartBg,
                    borderWidth: 2,
                    borderColor: chartBg
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                animation: {
                    animateRotate: true,
                    animateScale: true
                },
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            color: labelColor, 
                            padding: typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 14, 
                            font: { size: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 11, weight: '700' } 
                        } 
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#0f172a',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 8,
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
                    backgroundColor: ['#10b981', '#6366f1', '#ef4444'],
                    hoverBackgroundColor: ['#34d399', '#818cf8', '#f87171'],
                    borderRadius: 6,
                    barThickness: typeof window !== 'undefined' && window.innerWidth < 640 ? 20 : 32
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: labelColor, font: { weight: '600', size: 10 } } },
                    x: { grid: { display: false }, ticks: { color: labelColor, font: { weight: '600', size: 10 } } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        padding: 10,
                        cornerRadius: 8
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
                        backgroundColor: 'rgba(212, 165, 116, 0.08)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2.5,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#d4a574',
                        pointBorderColor: chartBg,
                        pointBorderWidth: 1.5
                    },
                    {
                        label: 'Deaths',
                        data: chartData?.trendChart?.deaths || [],
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.08)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2.5,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#f43f5e',
                        pointBorderColor: chartBg,
                        pointBorderWidth: 1.5
                    },
                    {
                        label: 'Marriages',
                        data: chartData?.trendChart?.marriages || [],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2.5,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: chartBg,
                        pointBorderWidth: 1.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: labelColor, stepSize: 1, font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { color: labelColor, font: { weight: '600', size: 10 } } }
                },
                plugins: {
                    legend: { display: true, labels: { color: labelColor, font: { weight: '700', size: typeof window !== 'undefined' && window.innerWidth < 640 ? 9 : 10 } } },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        padding: 10,
                        cornerRadius: 8
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
                    backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(168, 85, 247, 0.8)'],
                    hoverBorderWidth: 3,
                    borderWidth: 2,
                    borderColor: chartBg
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { grid: { color: gridColor }, ticks: { display: false } } },
                plugins: {
                    legend: { 
                        position: typeof window !== 'undefined' && window.innerWidth < 640 ? 'bottom' : 'right', 
                        labels: { color: labelColor, font: { weight: '700', size: 9 } } 
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        padding: 10,
                        cornerRadius: 8
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 sm:space-y-5 pb-10 max-w-7xl mx-auto font-['Inter'] min-h-screen relative z-10 text-slate-800 dark:text-slate-100">
            {/* Compact Welcome Hero Banner */}
            <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="relative p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg overflow-hidden group hover:border-indigo-500/40 transition-all duration-300"
            >
                {/* Subtle Background Glows */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-20%] left-[10%] w-[220px] h-[220px] bg-indigo-500/15 rounded-full blur-[80px]"></div>
                    <div className="absolute bottom-[-20%] right-[20%] w-[180px] h-[180px] bg-emerald-500/10 rounded-full blur-[60px]"></div>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-indigo-300 text-xs font-bold tracking-wide">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                            {greeting}, <span className="text-indigo-400 capitalize">{user.name?.split(' ')[0]}</span>
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm font-medium tracking-tight italic mt-0.5">"{motto}"</p>
                    </div>
                    <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
                        <a href="/" target="_blank" rel="noopener noreferrer" className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl flex items-center gap-2 text-white font-bold text-xs transition-colors backdrop-blur-sm cursor-pointer shadow-md shadow-black/20 group">
                            <svg className="w-4 h-4 opacity-80 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            Live Website
                        </a>
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-inner shadow-white/5">
                            <ShieldCheckIcon className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_12px_rgba(129,140,248,0.4)]" />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Compact Human-Centric Stats Grid */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {[
                    { label: 'TOTAL RECORD', val: stats.totalDocs, icon: ShieldCheckIcon, color: 'text-white', bg: 'bg-indigo-600 dark:bg-indigo-600', border: 'border-indigo-700 dark:border-indigo-500/50', sub: 'Master' },
                    { label: 'UPLOAD PENDING', val: stats.pendingDocs, icon: DocumentTextIcon, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-900/90', border: 'border-slate-200 dark:border-slate-800', sub: 'Action Needed' },
                    { label: 'TOTAL ISSUED FILES', val: stats.totalIssuances, icon: ClipboardDocumentCheckIcon, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-900/90', border: 'border-slate-200 dark:border-slate-800', sub: 'Finalized' },
                    { label: 'TOTAL Users', val: stats.totalUsers, icon: UsersIcon, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-900/90', border: 'border-slate-200 dark:border-slate-800', sub: 'Current' }
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        variants={itemVariants}
                        className={`${s.bg} rounded-xl sm:rounded-2xl p-3 sm:p-5 border ${s.border} shadow-xs relative group hover:shadow-md hover:scale-[1.01] transition-all duration-200 ease-out`}
                    >
                        <div className="flex justify-between items-start mb-2 sm:mb-3 relative z-10">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg.includes('bg-indigo-600') ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                <s.icon className={`w-4 h-4 ${s.bg.includes('bg-indigo-600') ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                            </div>
                        </div>
                        <div className="space-y-0.5 relative z-10">
                            <h3 className={`text-xl sm:text-3xl font-black tracking-tight ${s.color} tabular-nums leading-none`}>{s.val}</h3>
                            <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 truncate ${s.bg.includes('bg-indigo-600') ? 'text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{s.label}</p>
                        </div>
                        <p className={`text-[9px] sm:text-[10px] font-bold mt-1.5 uppercase tracking-tight relative z-10 truncate ${s.bg.includes('bg-indigo-600') ? 'text-indigo-200/80' : 'text-slate-400 dark:text-slate-500'}`}>{s.sub} Volume</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Compact Certificate Types Stats Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-3 gap-2 sm:gap-4"
            >
                {[
                    { label: 'Birth', fullLabel: 'Birth Certificates', val: stats.birthsCount || 0, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40', sub: 'Total Records' },
                    { label: 'Death', fullLabel: 'Death Certificates', val: stats.deathsCount || 0, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/40', sub: 'Total Records' },
                    { label: 'Marriage', fullLabel: 'Marriage Certificates', val: stats.marriagesCount || 0, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-800/40', sub: 'Total Records' }
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        variants={itemVariants}
                        className={`${s.bg} rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border shadow-xs relative group hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-center`}
                    >
                        <div className="space-y-0.5 relative z-10">
                            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums leading-none">{s.val}</h3>
                            <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 truncate ${s.color}`}>
                                <span className="sm:hidden">{s.label}</span>
                                <span className="hidden sm:inline">{s.fullLabel}</span>
                            </p>
                        </div>
                        <p className="text-[8px] sm:text-[10px] font-bold mt-1 uppercase tracking-tight relative z-10 text-slate-400 dark:text-slate-500 truncate">{s.sub}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Compact Human-Friendly Charts Section - Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 relative z-10">
                <motion.div variants={itemVariants} className="lg:col-span-1 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[280px] sm:h-[320px] overflow-hidden relative group hover:shadow-md transition-shadow duration-200">
                    <div className="mb-2 text-center relative z-10">
                        <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tight leading-none mb-1">Document Types</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Breakdown by Type</p>
                    </div>
                    <div className="flex-1 relative flex items-center justify-center z-10 min-h-0 w-full">
                        <canvas id="docTypesChart"></canvas>
                        <div className="absolute pointer-events-none flex flex-col items-center justify-center mb-6 bg-white dark:bg-slate-900 w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-slate-100 dark:border-slate-800 shadow-md">
                            <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.totalDocs}</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[280px] sm:h-[320px] overflow-hidden relative group hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-center mb-3 relative z-10">
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tight leading-none mb-1">Processing Status</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Workflow progress</p>
                        </div>
                    </div>
                    <div className="flex-1 relative z-10 min-h-0 w-full">
                        <canvas id="statusChart"></canvas>
                    </div>
                </motion.div>
            </div>

            {/* Compact Human-Friendly Charts Section - Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 relative z-10">
                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[270px] sm:h-[300px] overflow-hidden relative group hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-center mb-3 relative z-10">
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tight leading-none mb-1">Registration Timeline</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">New records per month</p>
                        </div>
                    </div>
                    <div className="flex-1 relative z-10 min-h-0 w-full">
                        <canvas id="trendChart"></canvas>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="lg:col-span-1 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[270px] sm:h-[300px] overflow-hidden relative group hover:shadow-md transition-shadow duration-200">
                    <div className="mb-2 relative z-10">
                        <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tight leading-none mb-1">Records by Area</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Location distribution</p>
                    </div>
                    <div className="flex-1 relative z-10 min-h-0 w-full">
                        <canvas id="accuracyChart"></canvas>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}

export default Dashboard;
