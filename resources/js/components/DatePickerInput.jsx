import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

const MONTHS = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
];

const DECADES = [
    { label: '2020s', start: 2020 },
    { label: '2010s', start: 2010 },
    { label: '2000s', start: 2000 },
    { label: '1990s', start: 1990 },
    { label: '1980s', start: 1980 },
    { label: '1970s', start: 1970 },
    { label: '1960s', start: 1960 },
    { label: '1950s', start: 1950 },
    { label: '1940s', start: 1940 },
    { label: '1930s', start: 1930 },
];

/** Provides segmented date entry with calendar and quick-date actions. */
export default function DatePickerInput({
    value = '',
    onChange,
    label,
    required = false,
    disabled = false,
    placeholder = 'Select Date',
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);

    // Parse value (format YYYY-MM-DD)
    /** Parses the component’s ISO date value into calendar segments. */
    const parseDate = (val) => {
        if (!val || typeof val !== 'string') return { year: '', month: '', day: '' };
        const parts = val.split('-');
        if (parts.length === 3) {
            return {
                year: parts[0] || '',
                month: parts[1] || '',
                day: parts[2] || ''
            };
        }
        return { year: '', month: '', day: '' };
    };

    const { year, month, day } = parseDate(value);

    // Calendar view state
    const currentYearNum = new Date().getFullYear();
    const [viewYear, setViewYear] = useState(parseInt(year, 10) || currentYearNum);
    const [viewMonth, setViewMonth] = useState(parseInt(month, 10) ? parseInt(month, 10) - 1 : new Date().getMonth());

    useEffect(() => {
        if (year) setViewYear(parseInt(year, 10));
        if (month) setViewMonth(parseInt(month, 10) - 1);
    }, [value]);

    // Close popover on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Calculate maximum days in selected month/year
    /** Returns the number of days in a zero-based calendar month. */
    const getDaysInMonth = (y, m) => {
        const yearInt = parseInt(y, 10) || currentYearNum;
        const monthInt = parseInt(m, 10) || 1;
        return new Date(yearInt, monthInt, 0).getDate();
    };

    const maxDays = getDaysInMonth(year, month);

    // Emit helper
    /** Normalizes changed date segments and emits the resulting ISO value. */
    const handleSegmentChange = (newYear, newMonth, newDay) => {
        const y = newYear !== undefined ? newYear : year;
        const m = newMonth !== undefined ? newMonth : month;
        const d = newDay !== undefined ? newDay : day;

        if (y && m && d) {
            const formattedMonth = String(m).padStart(2, '0');
            const formattedDay = String(d).padStart(2, '0');
            onChange(`${y}-${formattedMonth}-${formattedDay}`);
        } else if (y || m || d) {
            const formattedMonth = m ? String(m).padStart(2, '0') : '';
            const formattedDay = d ? String(d).padStart(2, '0') : '';
            if (y && formattedMonth && formattedDay) {
                onChange(`${y}-${formattedMonth}-${formattedDay}`);
            }
        }
    };

    const handleSelectDayFromCalendar = (dayNum) => {
        const formattedMonth = String(viewMonth + 1).padStart(2, '0');
        const formattedDay = String(dayNum).padStart(2, '0');
        onChange(`${viewYear}-${formattedMonth}-${formattedDay}`);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setIsOpen(false);
    };

    const handleToday = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
        setViewYear(y);
        setViewMonth(now.getMonth());
        setIsOpen(false);
    };

    // Calendar grid calculation
    const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

    // Years list for quick dropdown (1920 to 2026)
    const yearsList = [];
    for (let y = currentYearNum; y >= 1920; y--) {
        yearsList.push(y);
    }

    const daysList = [];
    for (let d = 1; d <= (maxDays || 31); d++) {
        daysList.push(String(d).padStart(2, '0'));
    }

    // Format human readable label for display
    const getFormattedDisplayDate = () => {
        if (!value) return null;
        const { year: y, month: m, day: d } = parseDate(value);
        if (!y || !m || !d) return null;
        const monthObj = MONTHS.find(item => item.value === m);
        const monthName = monthObj ? monthObj.label : m;
        return `${monthName} ${parseInt(d, 10)}, ${y}`;
    };

    const displayFormatted = getFormattedDisplayDate();

    return (
        <div className={`w-full relative ${className}`} ref={popoverRef}>
            {label && (
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1 flex items-center justify-between">
                    <span>{label} {required && <span className="text-rose-500">*</span>}</span>
                    {displayFormatted && (
                        <span className="text-[#c49a67] font-extrabold text-[10px] normal-case tracking-normal">
                            📅 {displayFormatted}
                        </span>
                    )}
                </label>
            )}

            {/* Seamless Single-Box Input Bar */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1 flex items-center justify-between shadow-sm focus-within:ring-2 focus-within:ring-[#d4a574]/30 focus-within:border-[#d4a574] transition-all">
                {/* Month Dropdown */}
                <select
                    value={month}
                    onChange={(e) => handleSegmentChange(year, e.target.value, day)}
                    disabled={disabled}
                    className="flex-1 min-w-0 bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer py-1.5 px-2 hover:text-[#c49a67] transition-colors truncate"
                >
                    <option value="">Month</option>
                    {MONTHS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>

                <span className="text-slate-300 font-light select-none px-0.5">|</span>

                {/* Day Dropdown */}
                <select
                    value={day}
                    onChange={(e) => handleSegmentChange(year, month, e.target.value)}
                    disabled={disabled}
                    className="w-16 shrink-0 bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer py-1.5 px-1 text-center hover:text-[#c49a67] transition-colors"
                >
                    <option value="">Day</option>
                    {daysList.map(dStr => (
                        <option key={dStr} value={dStr}>{parseInt(dStr, 10)}</option>
                    ))}
                </select>

                <span className="text-slate-300 font-light select-none px-0.5">|</span>

                {/* Year Dropdown */}
                <select
                    value={year}
                    onChange={(e) => handleSegmentChange(e.target.value, month, day)}
                    disabled={disabled}
                    className="w-20 shrink-0 bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer py-1.5 px-1 text-center hover:text-[#c49a67] transition-colors"
                >
                    <option value="">Year</option>
                    {yearsList.map(yNum => (
                        <option key={yNum} value={String(yNum)}>{yNum}</option>
                    ))}
                </select>

                {/* Calendar Trigger Icon Button */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ml-1 ${
                        isOpen
                            ? 'bg-[#0f172a] text-[#d4a574]'
                            : 'hover:bg-slate-200/60 text-slate-400 hover:text-slate-700'
                    }`}
                    title="Open Interactive Calendar Picker"
                >
                    <CalendarIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Interactive Calendar Popover */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 sm:right-auto sm:left-0 mt-2 z-[9999] w-[320px] sm:w-[350px] bg-[#0f172a] text-white rounded-3xl p-4 shadow-2xl border border-slate-800 text-xs leading-normal"
                    >
                        {/* Header controls */}
                        <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2.5">
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-[#d4a574]" />
                                <span className="text-[11px] font-black uppercase tracking-wider text-[#d4a574]">Interactive Calendar</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleToday}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded-md transition-colors cursor-pointer"
                                >
                                    Today
                                </button>
                                {value && (
                                    <button
                                        type="button"
                                        onClick={handleClear}
                                        className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold text-rose-300 rounded-md transition-colors cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Decade Quick-Jump Selector */}
                        <div className="mb-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Decade Jump:</span>
                            <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                                {DECADES.map(dec => (
                                    <button
                                        key={dec.label}
                                        type="button"
                                        onClick={() => setViewYear(dec.start + 5)}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all shrink-0 cursor-pointer border ${
                                            viewYear >= dec.start && viewYear < dec.start + 10
                                                ? 'bg-[#d4a574] text-[#0f172a] border-[#d4a574]'
                                                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                                        }`}
                                    >
                                        {dec.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Month & Year Navigation */}
                        <div className="flex justify-between items-center mb-3 bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (viewMonth === 0) {
                                            setViewMonth(11);
                                            setViewYear(v => v - 1);
                                        } else {
                                            setViewMonth(v => v - 1);
                                        }
                                    }}
                                    className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                >
                                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-black text-white w-20 text-center">
                                    {MONTHS[viewMonth]?.label}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (viewMonth === 11) {
                                            setViewMonth(0);
                                            setViewYear(v => v + 1);
                                        } else {
                                            setViewMonth(v => v + 1);
                                        }
                                    }}
                                    className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                >
                                    <ChevronRightIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setViewYear(v => v - 1)}
                                    className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer text-xs font-bold"
                                >
                                    ‹
                                </button>
                                <select
                                    value={viewYear}
                                    onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                                    className="bg-slate-900 border border-slate-700 text-white text-xs font-extrabold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
                                >
                                    {yearsList.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setViewYear(v => v + 1)}
                                    className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer text-xs font-bold"
                                >
                                    ›
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid Header */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                        </div>

                        {/* Calendar Days Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center text-xs">
                            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                                <div key={`blank-${idx}`} className="h-8" />
                            ))}

                            {Array.from({ length: daysInViewMonth }).map((_, idx) => {
                                const dayNum = idx + 1;
                                const formattedM = String(viewMonth + 1).padStart(2, '0');
                                const formattedD = String(dayNum).padStart(2, '0');
                                const isSelected = value === `${viewYear}-${formattedM}-${formattedD}`;
                                const isToday = currentYearNum === viewYear && new Date().getMonth() === viewMonth && new Date().getDate() === dayNum;

                                return (
                                    <button
                                        key={`day-${dayNum}`}
                                        type="button"
                                        onClick={() => handleSelectDayFromCalendar(dayNum)}
                                        className={`h-8 rounded-lg font-bold flex items-center justify-center transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-[#d4a574] text-[#0f172a] shadow-md shadow-[#d4a574]/20 font-black scale-105'
                                                : isToday
                                                    ? 'bg-slate-800 text-[#d4a574] ring-1 ring-[#d4a574]/40 font-black'
                                                    : 'hover:bg-slate-800 text-slate-200 hover:text-white'
                                        }`}
                                    >
                                        {dayNum}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
