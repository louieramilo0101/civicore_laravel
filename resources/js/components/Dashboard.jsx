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
    ArrowUpTrayIcon 
} from '@heroicons/react/24/outline';

const API_BASE = '/api';  // Laravel API

function Dashboard() {
    const [stats, setStats] = useState({
        totalDocs: 0,
        processedDocs: 0,
        pendingDocs: 0,
        totalUsers: 0,
        totalIssuances: 0,
        pendingIssuances: 0
    });
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const chartRefs = useRef({});

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${API_BASE}/dashboard/stats`, { credentials: 'include' });
                const data = await response.json();
                
                if (data.stats) setStats(data.stats);
                if (data.chartData) setChartData(data.chartData);
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchStats();
    }, []);

    // Initialize Charts
    useEffect(() => {
        if (loading) return;

        // Ensure window.Chart is available from the CDN
        const Chart = window.Chart;
        if (!Chart) {
            console.error('Chart.js is not loaded.');
            return;
        }

        // Setup global font for Chart.js
        Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
        Chart.defaults.color = '#64748b'; // Tailwind slate-500

        // Destroy any existing charts to prevent canvas reuse errors
        Object.values(chartRefs.current).forEach(chart => chart?.destroy());

        const createChart = (id, config) => {
            const ctx = document.getElementById(id);
            if (ctx) {
                chartRefs.current[id] = new Chart(ctx, config);
            }
        };

        // 1. Document Types Distribution (Doughnut)
        createChart('docTypesChart', {
            type: 'doughnut',
            data: {
                labels: chartData?.docTypes?.labels || ['Birth', 'Marriage', 'Death'],
                datasets: [{
                    data: chartData?.docTypes?.data || [45, 25, 30],
                    backgroundColor: ['#d4a574', '#0f172a', '#94a3b8', '#e2e8f0', '#3b82f6', '#10b981'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { 
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } 
                } 
            }
        });

        // 2. Processing Status (Bar)
        createChart('statusChart', {
            type: 'bar',
            data: {
                labels: chartData?.processStatus?.labels || ['Processed', 'Pending OCR', 'Failed'],
                datasets: [{
                    label: 'Documents',
                    data: chartData?.processStatus?.data || [75, 20, 5],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderRadius: 4,
                    barThickness: 30
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { beginAtZero: true, border: { display: false }, grid: { color: '#f1f5f9' } }, 
                    x: { border: { display: false }, grid: { display: false } } 
                }, 
                plugins: { legend: { display: false } } 
            }
        });

        // 3. Monthly Upload Trend (Line)
        createChart('trendChart', {
            type: 'line',
            data: {
                labels: chartData?.trendChart?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Uploads',
                    data: chartData?.trendChart?.data || [0, 0, 0, 0, 0, 0],
                    borderColor: '#d4a574',
                    backgroundColor: 'rgba(212, 165, 116, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#d4a574',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { beginAtZero: true, border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, precision: 0 } }, 
                    x: { border: { display: false }, grid: { display: false } } 
                }, 
                plugins: { legend: { display: false } } 
            }
        });

        // 4. OCR Accuracy Rate (Radar)
        createChart('accuracyChart', {
            type: 'radar',
            data: {
                labels: chartData?.accuracyChart?.labels || ['Text', 'Names', 'Dates', 'Signatures', 'Stamps'],
                datasets: [{
                    label: 'Accuracy %',
                    data: chartData?.accuracyChart?.data || [0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(15, 23, 42, 0.1)',
                    borderColor: '#0f172a',
                    borderWidth: 2,
                    pointBackgroundColor: '#d4a574',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#d4a574'
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: {
                    r: {
                        angleLines: { color: '#f1f5f9' },
                        grid: { color: '#f1f5f9' },
                        pointLabels: { font: { family: "'Inter', sans-serif" } },
                        ticks: { backdropColor: 'transparent', display: false, beginAtZero: true, max: 100 }
                    }
                },
                elements: { line: { tension: 0.3 } },
                plugins: { legend: { display: false } }
            }
        });

        // Cleanup function for when component unmounts or re-renders
        return () => {
            Object.values(chartRefs.current).forEach(chart => chart?.destroy());
        };
    }, [loading, stats]);

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.4, ease: "easeOut" }
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {loading && (
                <div className="space-y-6 w-full animate-pulse">
                    {/* Skeleton Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col h-[155px]">
                                <div className="w-12 h-12 bg-slate-200 rounded-xl mb-4"></div>
                                <div className="w-1/2 h-8 bg-slate-200 rounded-lg mb-2 mt-auto"></div>
                                <div className="w-1/3 h-4 bg-slate-200 rounded-md mt-1"></div>
                            </div>
                        ))}
                    </div>
                    {/* Skeleton Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col h-[400px]">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="w-1/3 h-6 bg-slate-200 rounded-md"></div>
                                    <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                                </div>
                                <div className="flex-1 w-full bg-slate-100 rounded-xl"></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {!loading && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                >
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <DocumentTextIcon className="w-8 h-8 text-blue-500 mb-4 relative z-10" />
                            <div className="text-3xl font-bold text-slate-800 relative z-10">{stats.totalDocs}</div>
                            <div className="text-sm font-medium text-slate-500 mt-1 relative z-10">Total Documents</div>
                            <div className="text-xs font-semibold text-emerald-500 mt-4 flex items-center gap-1 relative z-10">
                                <span>↑</span> Updated today
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <ClipboardDocumentCheckIcon className="w-8 h-8 text-emerald-500 mb-4 relative z-10" />
                            <div className="text-3xl font-bold text-slate-800 relative z-10">{stats.processedDocs}</div>
                            <div className="text-sm font-medium text-slate-500 mt-1 relative z-10">Processed</div>
                            <div className="text-xs font-semibold text-emerald-500 mt-4 flex items-center gap-1 relative z-10">
                                <span>↑</span> This month
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <ClockIcon className="w-8 h-8 text-amber-500 mb-4 relative z-10" />
                            <div className="text-3xl font-bold text-slate-800 relative z-10">{stats.pendingDocs}</div>
                            <div className="text-sm font-medium text-slate-500 mt-1 relative z-10">Pending</div>
                            <div className="text-xs font-semibold text-amber-600 mt-4 flex items-center gap-1 relative z-10">
                                <span>⚠</span> Requires attention
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <UsersIcon className="w-8 h-8 text-indigo-500 mb-4 relative z-10" />
                            <div className="text-3xl font-bold text-slate-800 relative z-10">{stats.totalUsers}</div>
                            <div className="text-sm font-medium text-slate-500 mt-1 relative z-10">Users</div>
                            <div className="text-xs font-semibold text-indigo-500 mt-4 flex items-center gap-1 relative z-10">
                                <span>✓</span> Active accounts
                            </div>
                        </motion.div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 text-lg">Document Types Distribution</h3>
                                <button className="text-slate-400 hover:text-[#d4a574] transition-colors cursor-pointer"><DocumentTextIcon className="w-5 h-5"/></button>
                            </div>
                            <div className="relative h-[300px] w-full flex items-center justify-center">
                                <canvas id="docTypesChart"></canvas>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 text-lg">Processing Status</h3>
                                <button className="text-slate-400 hover:text-[#d4a574] transition-colors cursor-pointer"><ClipboardDocumentCheckIcon className="w-5 h-5"/></button>
                            </div>
                            <div className="relative h-[300px] w-full">
                                <canvas id="statusChart"></canvas>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 text-lg">Monthly Upload Trend</h3>
                                <div className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg">+12.5%</div>
                            </div>
                            <div className="relative h-[300px] w-full">
                                <canvas id="trendChart"></canvas>
                            </div>
                        </motion.div>
                        
                        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 text-lg">OCR Accuracy Rate</h3>
                            </div>
                            <div className="relative h-[300px] w-full flex items-center justify-center">
                                <canvas id="accuracyChart"></canvas>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default Dashboard;

