import React from 'react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon
} from '@heroicons/react/24/outline';

/**
 * Reusable, high-aesthetic pagination component.
 * Supports responsive layouts (mobile & desktop), custom page sizes, and smart ellipsis.
 *
 * @param {Object} props
 * @param {number} props.currentPage - Current active page (1-based index)
 * @param {number} props.totalItems - Total number of records across all pages
 * @param {number} props.pageSize - Number of records displayed per page
 * @param {function} props.onPageChange - Callback when page changes (newPage: number)
 * @param {function} [props.onPageSizeChange] - Optional callback when page size changes
 * @param {number[]} [props.pageSizeOptions] - List of available page size options
 * @param {string} [props.className] - Optional custom CSS container classes
 * @param {string} [props.itemLabel] - Label for items (default: 'records')
 */
const Pagination = ({
    currentPage = 1,
    totalItems = 0,
    pageSize = 10,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50],
    className = '',
    itemLabel = 'records'
}) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    if (totalItems <= 0) {
        return null;
    }

    const startItem = (safeCurrentPage - 1) * pageSize + 1;
    const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

    /** Generate list of visible page numbers with ellipsis */
    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages = [];
        if (safeCurrentPage <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (safeCurrentPage >= totalPages - 3) {
            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
        }
        return pages;
    };

    const handlePageClick = (page) => {
        if (typeof page === 'number' && page !== safeCurrentPage && page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white/80 backdrop-blur-sm border-t border-slate-200/80 rounded-b-2xl ${className}`}>
            {/* Left side: Showing X-Y of Z & Page size selector */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start text-xs font-semibold text-slate-500">
                <span>
                    Showing <strong className="text-slate-800 tabular-nums">{startItem}</strong> to{' '}
                    <strong className="text-slate-800 tabular-nums">{endItem}</strong> of{' '}
                    <strong className="text-slate-800 tabular-nums">{totalItems}</strong> {itemLabel}
                </span>

                {onPageSizeChange && (
                    <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-200">
                        <span className="hidden md:inline text-[11px] text-slate-400 font-bold uppercase tracking-wider">Per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 focus:ring-2 focus:ring-[#d4a574]/30 focus:border-[#d4a574] outline-none cursor-pointer"
                        >
                            {pageSizeOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Right side: Navigation buttons */}
            <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
                {/* First Page (Desktop only) */}
                <button
                    type="button"
                    onClick={() => handlePageClick(1)}
                    disabled={safeCurrentPage === 1}
                    className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all"
                    title="First Page"
                >
                    <ChevronDoubleLeftIcon className="w-3.5 h-3.5" />
                </button>

                {/* Previous Page */}
                <button
                    type="button"
                    onClick={() => handlePageClick(safeCurrentPage - 1)}
                    disabled={safeCurrentPage === 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Mobile current indicator (e.g. 2 / 10) */}
                <span className="sm:hidden px-3 text-xs font-bold text-slate-700 tabular-nums">
                    {safeCurrentPage} / {totalPages}
                </span>

                {/* Page Number Pills (Tablet & Desktop) */}
                <div className="hidden sm:flex items-center gap-1">
                    {getPageNumbers().map((p, idx) => (
                        p === '...' ? (
                            <span key={`dots-${idx}`} className="w-8 text-center text-xs text-slate-400 select-none">
                                …
                            </span>
                        ) : (
                            <button
                                key={`page-${p}`}
                                type="button"
                                onClick={() => handlePageClick(p)}
                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                                    p === safeCurrentPage
                                        ? 'bg-[#0f172a] text-[#d4a574] shadow-sm ring-1 ring-[#0f172a]'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                            >
                                {p}
                            </button>
                        )
                    ))}
                </div>

                {/* Next Page */}
                <button
                    type="button"
                    onClick={() => handlePageClick(safeCurrentPage + 1)}
                    disabled={safeCurrentPage === totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all"
                    title="Next Page"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>

                {/* Last Page (Desktop only) */}
                <button
                    type="button"
                    onClick={() => handlePageClick(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all"
                    title="Last Page"
                >
                    <ChevronDoubleRightIcon className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
