import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ChartBarIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    InformationCircleIcon,
    BoltIcon,
    HandRaisedIcon,
    SparklesIcon,
    ServerIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import SkeletonLoader from './SkeletonLoader.jsx';

/** Renders system health and user experience metrics in plain, non-technical language. */
export default function RumDashboard() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [periodDays, setPeriodDays] = useState(30);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/rum/stats?days=${periodDays}`, { credentials: 'include' });
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error('Failed to load performance metrics:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [periodDays]);

    // Plain-language translations for technical Web Vitals
    const vitalsInfo = {
        lcp: {
            title: 'Content Loading Speed',
            subtitle: 'Main Content Load',
            desc: 'How long citizens wait before the main page text and images fully appear.',
            unit: 'seconds',
            goodThreshold: 2.5,
            warnThreshold: 4.0,
            icon: BoltIcon,
            format: (v) => (v / 1000).toFixed(2)
        },
        inp: {
            title: 'Click Responsiveness',
            subtitle: 'Input Response Time',
            desc: 'How quickly buttons and inputs respond when a user taps or clicks.',
            unit: 'milliseconds',
            goodThreshold: 200,
            warnThreshold: 500,
            icon: HandRaisedIcon,
            format: (v) => v.toFixed(0)
        },
        cls: {
            title: 'Visual Page Stability',
            subtitle: 'Layout Shift',
            desc: 'Whether elements jump around on screen while loading.',
            unit: 'shift score',
            goodThreshold: 0.1,
            warnThreshold: 0.25,
            icon: SparklesIcon,
            format: (v) => v.toFixed(3)
        },
        fcp: {
            title: 'Initial Display Time',
            subtitle: 'First Content Render',
            desc: 'How quickly the screen starts showing content after clicking a link.',
            unit: 'seconds',
            goodThreshold: 1.8,
            warnThreshold: 3.0,
            icon: EyeIcon,
            format: (v) => (v / 1000).toFixed(2)
        },
        ttfb: {
            title: 'Server Response Time',
            subtitle: 'Backend Speed',
            desc: 'How fast the municipal server responds to page requests.',
            unit: 'milliseconds',
            goodThreshold: 800,
            warnThreshold: 1800,
            icon: ServerIcon,
            format: (v) => v.toFixed(0)
        },
    };

    // Computes plain-English status rating: Good, Needs Improvement, or Poor
    const getStatus = (val, good, warn) => {
        if (val <= good) return { label: 'Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50', icon: CheckCircleIcon };
        if (val <= warn) return { label: 'Needs Attention', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50', icon: ExclamationTriangleIcon };
        return { label: 'Slow', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50', icon: XCircleIcon };
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Portal Performance & Health</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Real-time speed and stability experienced by citizens and staff</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={periodDays}
                        onChange={(e) => setPeriodDays(Number(e.target.value))}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>

                    <button
                        onClick={fetchStats}
                        className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Refresh metrics"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {isLoading ? (
                <SkeletonLoader type="documents" rows={6} />
            ) : !stats || !Object.keys(stats.summary || {}).length ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                    <InformationCircleIcon className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Performance Data Collecting</h3>
                    <p className="text-xs max-w-sm mx-auto mt-1">Real-time portal speed monitoring is active. Metrics will populate automatically as citizens and staff access the site.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(vitalsInfo).map(([key, info]) => {
                            const data = stats.summary[key];
                            const rawVal = data ? Number(data.avg_value) : null;
                            const formattedVal = rawVal !== null ? info.format(rawVal) : '—';
                            const status = rawVal !== null ? getStatus(rawVal, info.goodThreshold, info.warnThreshold) : null;
                            const IconComponent = info.icon;

                            return (
                                <motion.div
                                    key={key}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <IconComponent className="w-4 h-4 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{info.title}</span>
                                        </div>
                                        {status && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
                                                <status.icon className="w-3 h-3" />
                                                {status.label}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">{formattedVal}</span>
                                            <span className="text-xs font-bold text-slate-400">{info.unit}</span>
                                        </div>
                                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-1">{info.subtitle}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{info.desc}</p>
                                    </div>

                                    {data && (
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                                            <span>Recorded across {data.total_samples} page visits</span>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Page Speed Breakdown */}
                    {stats.by_page && Object.keys(stats.by_page).length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">Page Speed Breakdown</h3>
                                <p className="text-xs text-slate-400">Average load times across key areas of the portal</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                            <th className="px-5 py-3 font-black">Portal Area</th>
                                            <th className="px-4 py-3 font-black">Load Speed</th>
                                            <th className="px-4 py-3 font-black">Click Delay</th>
                                            <th className="px-4 py-3 font-black">Server Response</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                        {Object.entries(stats.by_page).map(([path, metrics]) => {
                                            const metricMap = {};
                                            metrics.forEach(m => { metricMap[m.metric_name] = m.avg_value; });

                                            const lcpVal = metricMap.lcp ? (Number(metricMap.lcp) / 1000).toFixed(2) + 's' : '—';
                                            const inpVal = metricMap.inp ? Number(metricMap.inp).toFixed(0) + 'ms' : '—';
                                            const ttfbVal = metricMap.ttfb ? Number(metricMap.ttfb).toFixed(0) + 'ms' : '—';

                                            // Humanize routes
                                            const routeName = {
                                                '/': 'Public Landing Page',
                                                '/dashboard': 'Staff Dashboard',
                                                '/documents': 'Document Upload',
                                                '/reports': 'Export Reports',
                                                '/issuances': 'Registry Database',
                                                '/archive': 'Archive Manager',
                                                '/tickets': 'Tickets Queue',
                                                '/mapping': 'GIS Demographics Map',
                                                '/accounts': 'Account Management',
                                                '/backups': 'System Backups',
                                                '/rum': 'Performance Dashboard',
                                                '/login': 'Login Page',
                                                '/about': 'About Portal Page',
                                                '/services': 'Digital Services Page',
                                                '/contact': 'Contact Directory',
                                                '/ticket-request': 'Public Request Form',
                                            }[path] || path;

                                            return (
                                                <tr key={path} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">
                                                        {routeName}
                                                        <span className="block text-[10px] text-slate-400 font-mono font-normal">{path}</span>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{lcpVal}</td>
                                                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{inpVal}</td>
                                                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{ttfbVal}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}