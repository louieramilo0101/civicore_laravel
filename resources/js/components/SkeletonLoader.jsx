import React from 'react';
import { motion } from 'framer-motion';

// Common Framer Motion pulse animation props
const pulseAnimation = {
    initial: { opacity: 0.4 },
    animate: { opacity: [0.4, 0.75, 0.4] },
    transition: {
        duration: 1.4,
        repeat: Infinity,
        ease: 'easeInOut'
    }
};

/** Skeleton placeholder bar */
export const SkeletonBar = ({ className = '', style = {} }) => (
    <motion.div
        className={`bg-slate-200 dark:bg-slate-800/80 rounded ${className}`}
        style={style}
        {...pulseAnimation}
    />
);

/** 1. DASHBOARD SKELETON: Exact DOM replica of Dashboard metrics, counts, and 4 chart cards */
export const DashboardSkeleton = () => (
    <div className="space-y-3 sm:space-y-5 pb-10 max-w-7xl mx-auto font-['Inter']">
        {/* Metric Stats Cards (4-up) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className="bg-white dark:bg-slate-900/90 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden"
                >
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <SkeletonBar className="w-8 h-8 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                        <SkeletonBar className="h-6 sm:h-8 w-20 sm:w-28 rounded-md" />
                        <SkeletonBar className="h-3 w-24 sm:w-32 rounded" />
                    </div>
                    <SkeletonBar className="h-2.5 w-16 sm:w-20 rounded mt-2" />
                </div>
            ))}
        </div>

        {/* Certificate Types Grid (3-up) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="bg-slate-50/70 dark:bg-slate-900/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-center"
                >
                    <SkeletonBar className="h-5 sm:h-7 w-12 sm:w-20 rounded-md mb-2" />
                    <SkeletonBar className="h-3 w-16 sm:w-28 rounded mb-1" />
                    <SkeletonBar className="h-2 w-12 sm:w-16 rounded" />
                </div>
            ))}
        </div>

        {/* Charts Section - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Document Types Doughnut Skeleton */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[280px] sm:h-[320px] justify-between">
                <div className="flex flex-col items-center">
                    <SkeletonBar className="h-4 w-32 rounded mb-1.5" />
                    <SkeletonBar className="h-2.5 w-24 rounded" />
                </div>
                <div className="flex-1 flex items-center justify-center relative">
                    <motion.div
                        className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-[14px] border-slate-200 dark:border-slate-800 flex items-center justify-center"
                        {...pulseAnimation}
                    >
                        <SkeletonBar className="w-12 h-12 rounded-full" />
                    </motion.div>
                </div>
                <div className="flex justify-center gap-4">
                    <SkeletonBar className="h-3 w-12 rounded" />
                    <SkeletonBar className="h-3 w-12 rounded" />
                    <SkeletonBar className="h-3 w-12 rounded" />
                </div>
            </div>

            {/* Processing Status Bar Chart Skeleton */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[280px] sm:h-[320px] justify-between">
                <div>
                    <SkeletonBar className="h-4 w-36 rounded mb-1.5" />
                    <SkeletonBar className="h-2.5 w-24 rounded" />
                </div>
                <div className="flex-1 flex items-end justify-around gap-6 px-8 pb-4 pt-6">
                    <SkeletonBar className="w-12 sm:w-16 h-[75%] rounded-t-lg" />
                    <SkeletonBar className="w-12 sm:w-16 h-[45%] rounded-t-lg" />
                    <SkeletonBar className="w-12 sm:w-16 h-[25%] rounded-t-lg" />
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-around">
                    <SkeletonBar className="h-3 w-16 rounded" />
                    <SkeletonBar className="h-3 w-16 rounded" />
                    <SkeletonBar className="h-3 w-16 rounded" />
                </div>
            </div>
        </div>

        {/* Charts Section - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Timeline Line Chart Skeleton */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[270px] sm:h-[300px] justify-between">
                <div>
                    <SkeletonBar className="h-4 w-40 rounded mb-1.5" />
                    <SkeletonBar className="h-2.5 w-28 rounded" />
                </div>
                <div className="flex-1 flex items-end gap-3 px-4 pt-6 pb-2">
                    {[40, 65, 30, 85, 50, 90, 70, 60, 95, 45, 80, 75].map((h, idx) => (
                        <SkeletonBar key={idx} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>

            {/* Records by Area Skeleton */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[270px] sm:h-[300px] justify-between">
                <div>
                    <SkeletonBar className="h-4 w-32 rounded mb-1.5" />
                    <SkeletonBar className="h-2.5 w-24 rounded" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <SkeletonBar className="w-36 h-36 rounded-full" />
                </div>
            </div>
        </div>
    </div>
);

/** 2. USERS TABLE SKELETON: Exact DOM replica of Users.jsx management table */
export const UsersSkeleton = ({ rows = 5 }) => (
    <div className="overflow-x-auto w-full">
        <table className="w-full min-w-[500px]">
            <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 text-left"><SkeletonBar className="h-3 w-16" /></th>
                    <th className="p-3 text-left"><SkeletonBar className="h-3 w-20" /></th>
                    <th className="p-3 text-left"><SkeletonBar className="h-3 w-12" /></th>
                    <th className="p-3 text-left"><SkeletonBar className="h-3 w-20" /></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {Array.from({ length: rows }).map((_, i) => (
                    <tr key={i}>
                        <td className="p-3">
                            <div className="flex items-center gap-3">
                                <SkeletonBar className="w-8 h-8 rounded-full shrink-0" />
                                <SkeletonBar className="h-4 w-32 rounded" />
                            </div>
                        </td>
                        <td className="p-3"><SkeletonBar className="h-4 w-44 rounded" /></td>
                        <td className="p-3"><SkeletonBar className="h-5 w-16 rounded-md" /></td>
                        <td className="p-3"><SkeletonBar className="h-4 w-28 rounded" /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** 3. REPORTS TABLE SKELETON: Exact DOM replica of Reports.jsx live preview table */
export const ReportsSkeleton = ({ rows = 6 }) => (
    <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-4 py-3.5"><SkeletonBar className="h-3 w-20" /></th>
                    <th className="px-6 py-3.5"><SkeletonBar className="h-3 w-24" /></th>
                    <th className="px-4 py-3.5"><SkeletonBar className="h-3 w-16" /></th>
                    <th className="px-4 py-3.5"><SkeletonBar className="h-3 w-20" /></th>
                    <th className="px-6 py-3.5"><SkeletonBar className="h-3 w-36" /></th>
                    <th className="px-4 py-3.5"><SkeletonBar className="h-3 w-24" /></th>
                    <th className="px-4 py-3.5"><SkeletonBar className="h-3 w-24" /></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {Array.from({ length: rows }).map((_, i) => (
                    <tr key={i} className="py-3">
                        <td className="px-4 py-3.5"><SkeletonBar className="h-4 w-16 rounded-full" /></td>
                        <td className="px-6 py-3.5"><SkeletonBar className="h-4 w-28 rounded" /></td>
                        <td className="px-4 py-3.5"><SkeletonBar className="h-4 w-14 rounded" /></td>
                        <td className="px-4 py-3.5"><SkeletonBar className="h-5 w-20 rounded-md" /></td>
                        <td className="px-6 py-3.5"><SkeletonBar className="h-4 w-40 rounded" /></td>
                        <td className="px-4 py-3.5"><SkeletonBar className="h-4 w-24 rounded" /></td>
                        <td className="px-4 py-3.5"><SkeletonBar className="h-4 w-24 rounded" /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** 4. BARANGAYS GRID SKELETON: Exact DOM replica of Barangays.jsx card grid */
export const BarangaysSkeleton = ({ count = 8 }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 w-full">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="p-4 md:p-5 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center">
                <SkeletonBar className="w-10 h-10 rounded-lg mb-3" />
                <SkeletonBar className="h-4 w-28 rounded mb-1.5" />
                <SkeletonBar className="h-3 w-16 rounded" />
            </div>
        ))}
    </div>
);

/** 5. TEMPLATES GRID SKELETON: Exact DOM replica of Templates.jsx card grid */
export const TemplatesSkeleton = ({ count = 3 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] p-8 flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <SkeletonBar className="w-14 h-14 rounded-2xl" />
                        <SkeletonBar className="h-6 w-24 rounded-full" />
                    </div>
                    <SkeletonBar className="h-5 w-36 rounded mb-2" />
                    <SkeletonBar className="h-3 w-48 rounded mb-8" />
                </div>
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <SkeletonBar className="h-11 flex-1 rounded-2xl" />
                    <SkeletonBar className="w-11 h-11 rounded-2xl" />
                </div>
            </div>
        ))}
    </div>
);

/** 6. BACKUPS SKELETON: Exact DOM replica of Backups.jsx list/table */
export const BackupsSkeleton = ({ rows = 5 }) => (
    <div className="space-y-4 w-full">
        {/* Table layout for desktop */}
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                        <th className="py-3 px-5"><SkeletonBar className="h-3 w-20" /></th>
                        <th className="py-3 px-5"><SkeletonBar className="h-3 w-36" /></th>
                        <th className="py-3 px-5"><SkeletonBar className="h-3 w-14" /></th>
                        <th className="py-3 px-5"><SkeletonBar className="h-3 w-28" /></th>
                        <th className="py-3 px-5 text-right"><SkeletonBar className="h-3 w-24 ml-auto" /></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from({ length: rows }).map((_, i) => (
                        <tr key={i}>
                            <td className="py-3.5 px-5"><SkeletonBar className="h-5 w-20 rounded-md" /></td>
                            <td className="py-3.5 px-5"><SkeletonBar className="h-4 w-48 rounded" /></td>
                            <td className="py-3.5 px-5"><SkeletonBar className="h-4 w-16 rounded" /></td>
                            <td className="py-3.5 px-5"><SkeletonBar className="h-4 w-32 rounded" /></td>
                            <td className="py-3.5 px-5 text-right"><SkeletonBar className="h-8 w-28 rounded-xl ml-auto" /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {/* Mobile card layout */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <SkeletonBar className="h-5 w-20 rounded-md" />
                        <SkeletonBar className="h-4 w-12 rounded" />
                    </div>
                    <SkeletonBar className="h-4 w-full rounded" />
                    <SkeletonBar className="h-9 w-full rounded-xl" />
                </div>
            ))}
        </div>
    </div>
);

/** 7. DOCUMENTS TABLE SKELETON: Exact DOM replica of Documents.jsx list view */
export const DocumentsSkeleton = ({ rows = 6 }) => (
    <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-3 py-2.5 w-10"><SkeletonBar className="h-4 w-4 rounded" /></th>
                    <th className="px-3 py-2.5"><SkeletonBar className="h-3 w-28" /></th>
                    <th className="px-2 py-2.5 w-16"><SkeletonBar className="h-3 w-12" /></th>
                    <th className="px-2 py-2.5 text-center"><SkeletonBar className="h-3 w-16 mx-auto" /></th>
                    <th className="px-3 py-2.5 text-right w-28"><SkeletonBar className="h-3 w-20 ml-auto" /></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: rows }).map((_, i) => (
                    <tr key={i} className="py-3">
                        <td className="px-3 py-3"><SkeletonBar className="h-4 w-4 rounded" /></td>
                        <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                                <SkeletonBar className="w-8 h-8 rounded-lg shrink-0" />
                                <div className="space-y-1">
                                    <SkeletonBar className="h-3.5 w-44 rounded" />
                                    <SkeletonBar className="h-2.5 w-24 rounded" />
                                </div>
                            </div>
                        </td>
                        <td className="px-2 py-3"><SkeletonBar className="h-5 w-14 rounded-md" /></td>
                        <td className="px-2 py-3"><SkeletonBar className="h-5 w-20 rounded-full mx-auto" /></td>
                        <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                                <SkeletonBar className="w-7 h-7 rounded-lg" />
                                <SkeletonBar className="w-7 h-7 rounded-lg" />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** 8. ISSUANCES TABLE SKELETON: Exact DOM replica of Issuances.jsx list */
export const IssuancesSkeleton = ({ rows = 6 }) => (
    <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase">
                    <th className="p-4 pl-6 w-10"><SkeletonBar className="h-4 w-4 rounded" /></th>
                    <th className="p-4"><SkeletonBar className="h-3 w-24" /></th>
                    <th className="p-4"><SkeletonBar className="h-3 w-16" /></th>
                    <th className="p-4"><SkeletonBar className="h-3 w-32" /></th>
                    <th className="p-4"><SkeletonBar className="h-3 w-24" /></th>
                    <th className="p-4 pr-6 text-right"><SkeletonBar className="h-3 w-20 ml-auto" /></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: rows }).map((_, i) => (
                    <tr key={i}>
                        <td className="p-4 pl-6"><SkeletonBar className="h-4 w-4 rounded" /></td>
                        <td className="p-4"><SkeletonBar className="h-4 w-28 rounded" /></td>
                        <td className="p-4"><SkeletonBar className="h-5 w-16 rounded-md" /></td>
                        <td className="p-4"><SkeletonBar className="h-4 w-40 rounded" /></td>
                        <td className="p-4"><SkeletonBar className="h-4 w-28 rounded" /></td>
                        <td className="p-4 pr-6 text-right"><SkeletonBar className="h-8 w-24 rounded-xl ml-auto" /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** 9. ARCHIVE MANAGER SKELETON: Exact DOM replica of ArchiveManager.jsx list */
export const ArchiveManagerSkeleton = ({ rows = 6 }) => (
    <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase">
                    <th className="p-4 pl-6"><SkeletonBar className="h-3 w-28" /></th>
                    <th className="p-4"><SkeletonBar className="h-3 w-16" /></th>
                    <th className="p-4"><SkeletonBar className="h-3 w-28" /></th>
                    <th className="p-4 pr-6 text-right"><SkeletonBar className="h-3 w-24 ml-auto" /></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: rows }).map((_, i) => (
                    <tr key={i}>
                        <td className="p-4 pl-6">
                            <div className="space-y-1">
                                <SkeletonBar className="h-4 w-40 rounded" />
                                <SkeletonBar className="h-3 w-24 rounded" />
                            </div>
                        </td>
                        <td className="p-4"><SkeletonBar className="h-5 w-16 rounded-md" /></td>
                        <td className="p-4"><SkeletonBar className="h-4 w-28 rounded" /></td>
                        <td className="p-4 pr-6 text-right">
                            <div className="flex justify-end gap-2">
                                <SkeletonBar className="h-8 w-20 rounded-xl" />
                                <SkeletonBar className="h-8 w-20 rounded-xl" />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** 10. CONTACT DIRECTORY SKELETON: Exact DOM replica of ContactDirectory 4 cards */
export const ContactDirectorySkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col items-center gap-6">
                <SkeletonBar className="w-16 h-16 rounded-2xl" />
                <div className="text-center w-full space-y-2 flex flex-col items-center">
                    <SkeletonBar className="h-3 w-24 rounded" />
                    <SkeletonBar className="h-5 w-36 rounded" />
                </div>
            </div>
        ))}
    </div>
);

/** 11. MAPPING TABLE SKELETON: Exact DOM replica of Mapping.jsx table rows */
export const MappingSkeleton = ({ rows = 4 }) => (
    <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase">
                    <th className="p-4 pl-6"><SkeletonBar className="h-3 w-28" /></th>
                    <th className="p-4"><SkeletonBar className="h-3 w-16" /></th>
                    <th className="p-4"><SkeletonBar className="h-3 w-28" /></th>
                    <th className="p-4"><SkeletonBar className="h-3 w-20" /></th>
                    <th className="p-4"><SkeletonBar className="h-3 w-24" /></th>
                    <th className="p-4 text-right pr-6"><SkeletonBar className="h-3 w-20 ml-auto" /></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: rows }).map((_, i) => (
                    <tr key={i}>
                        <td className="p-4 pl-6"><SkeletonBar className="h-4 w-28 rounded" /></td>
                        <td className="p-4"><SkeletonBar className="h-5 w-16 rounded-md" /></td>
                        <td className="p-4"><SkeletonBar className="h-4 w-36 rounded" /></td>
                        <td className="p-4"><SkeletonBar className="h-4 w-24 rounded" /></td>
                        <td className="p-4"><SkeletonBar className="h-4 w-28 rounded" /></td>
                        <td className="p-4 text-right pr-6">
                            <div className="flex justify-end gap-2">
                                <SkeletonBar className="h-8 w-20 rounded-xl" />
                                <SkeletonBar className="h-8 w-20 rounded-xl" />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** 12. ACCOUNTS LIST SKELETON: Exact DOM replica of Accounts.jsx user list rows */
export const AccountsSkeleton = ({ rows = 8 }) => (
    <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                <SkeletonBar className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                    <SkeletonBar className="h-4 w-36 rounded" />
                    <SkeletonBar className="h-3 w-48 rounded" />
                </div>
                <SkeletonBar className="h-5 w-16 rounded-md shrink-0" />
            </div>
        ))}
    </div>
);

/** 13. ACCOUNTS DETAILS SKELETON: Exact DOM replica of Accounts.jsx detail panel */
export const AccountDetailsSkeleton = () => (
    <div className="px-4 sm:px-8 pb-6 sm:pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-8 sm:-mt-10 mb-6 gap-4 relative z-10">
            <SkeletonBar className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-slate-900" />
            <div className="flex gap-2">
                <SkeletonBar className="h-9 w-28 rounded-xl" />
                <SkeletonBar className="h-9 w-28 rounded-xl" />
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-2">
                <SkeletonBar className="h-3 w-20 rounded" />
                <SkeletonBar className="h-4 w-40 rounded" />
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-2">
                <SkeletonBar className="h-3 w-20 rounded" />
                <SkeletonBar className="h-4 w-40 rounded" />
            </div>
        </div>
    </div>
);

/** Main SkeletonLoader component router for backward compatibility */
const SkeletonLoader = ({ type = 'table', rows = 5 }) => {
    switch (type) {
        case 'dashboard':
            return <DashboardSkeleton />;
        case 'users':
            return <UsersSkeleton rows={rows} />;
        case 'reports':
            return <ReportsSkeleton rows={rows} />;
        case 'barangays':
        case 'cards':
            return <BarangaysSkeleton count={rows * 2} />;
        case 'templates':
            return <TemplatesSkeleton count={rows} />;
        case 'backups':
            return <BackupsSkeleton rows={rows} />;
        case 'documents':
            return <DocumentsSkeleton rows={rows} />;
        case 'issuances':
            return <IssuancesSkeleton rows={rows} />;
        case 'archive':
            return <ArchiveManagerSkeleton rows={rows} />;
        case 'contact':
            return <ContactDirectorySkeleton />;
        case 'mapping':
            return <MappingSkeleton rows={rows} />;
        case 'accounts':
            return <AccountsSkeleton rows={rows} />;
        case 'accounts-detail':
            return <AccountDetailsSkeleton />;
        case 'table':
        case 'list':
        default:
            return <UsersSkeleton rows={rows} />;
    }
};

export default SkeletonLoader;
