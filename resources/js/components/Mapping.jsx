import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPinIcon,
    DocumentChartBarIcon,
    ArrowPathIcon,
    ArrowDownTrayIcon,
    TableCellsIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    ArrowsPointingOutIcon,
    FireIcon,
    CalendarDaysIcon,
    UserIcon,
    DocumentTextIcon,
    UsersIcon,
    ChartBarIcon,
    ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import SkeletonLoader from './SkeletonLoader.jsx';
import Avatar from 'boring-avatars';

import { useData } from './DataContext.jsx';

/** Normalizes a transaction type for map and chart grouping. */
const getNormalizedType = (item) => {
    if (!item) return 'birth';
    if (item.certificate_type) return item.certificate_type;
    const type = (item.type || '').toLowerCase();
    if (type.includes('birth') || type.includes('102')) return 'birth';
    if (type.includes('death') || type.includes('103')) return 'death';
    if (type.includes('marriage') || type.includes('97')) return 'marriage';
    return 'birth';
};

/** Normalizes barangay labels for matching and display. */
const normalizeBrgy = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/^(brgy\.?|barangay)\s+/i, '')
        .replace(/[^a-z0-9]/gi, '')
        .trim();
};

const staticBarangays = [
    { coords: [14.320, 120.7652], name: 'Gomez-Zamora (Pob.)' },
    { coords: [14.3179, 120.76559], name: 'Capt. C. Nazareno (Pob.)' },
    { coords: [14.3225, 120.7673], name: 'Ibayo Silangan' },
    { coords: [14.32358, 120.76485], name: 'Ibayo Estacion' },
    { coords: [14.31728, 120.76345], name: 'Kanluran' },
    { coords: [14.31462, 120.7706], name: 'Makina' },
    { coords: [14.32049, 120.75696], name: 'Sapa' },
    { coords: [14.3251, 120.75574], name: 'Bucana Malaki' },
    { coords: [14.3232, 120.7598], name: 'Bucana Sasahan' },
    { coords: [14.3211, 120.7535], name: 'Bagong Karsada' },
    { coords: [14.3198, 120.7627], name: 'Balsahan' },
    { coords: [14.3175, 120.7512], name: 'Bancaan' },
    { coords: [14.29245, 120.75202], name: 'Muzon' },
    { coords: [14.3217999, 120.761], name: 'Latoria' },
    { coords: [14.3126, 120.7373], name: 'Labac' },
    { coords: [14.3148, 120.7476], name: 'Mabolo' },
    { coords: [14.31058, 120.7709], name: 'San Roque' },
    { coords: [14.3145, 120.7685], name: 'Santulan' },
    { coords: [14.2795, 120.78071], name: 'Molino' },
    { coords: [14.2976, 120.7909], name: 'Calubcob' },
    { coords: [14.2939, 120.8007], name: 'Halang' },
    { coords: [14.3078, 120.7683], name: 'Malainen Bago' },
    { coords: [14.3000, 120.7700], name: 'Malainen Luma' },
    { coords: [14.2850, 120.8097], name: 'Palangue 1' },
    { coords: [14.2620, 120.8297], name: 'Palangue 2 & 3' },
    { coords: [14.3166, 120.7689], name: 'Humbac' },
    { coords: [14.3348, 120.7717], name: 'Munting Mapino' },
    { coords: [14.3146, 120.7930], name: 'Sabang' },
    { coords: [14.3438, 120.7808], name: 'Timalan Balsahan' },
    { coords: [14.33699, 120.7790], name: 'Timalan Concepcion' }
];

/** Renders geographic transaction activity and barangay analytics. */
const Mapping = () => {
    const mapRef = useRef(null);
    const chartRef = useRef(null);
    const canvasRef = useRef(null);
    const markersLayerRef = useRef(null);
    const {
        issuances: apiData,
        documents: docsData,
        loading: dataLoading,
        refreshAll,
        stats: backendStats
    } = useData();


    const isLoading = dataLoading.issuances || dataLoading.documents;
    const [activeFilter, setActiveFilter] = useState('all');
    const [hoveredBrgy, setHoveredBrgy] = useState(null);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showRatioMode, setShowRatioMode] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState('charts');
    const [showAllBarangays, setShowAllBarangays] = useState(false);
    const [statsMode, setStatsMode] = useState('records'); // 'records' | 'issued'
    const [stats, setStats] = useState({ birthCount: 0, deathCount: 0, marriageCount: 0, mostActiveBrgy: 'N/A', totalRecords: 0, totalDocs: 0, maxTotal: 0 });
    const [quickFilter, setQuickFilter] = useState('all'); // 'all','today','week','month','year','custom'
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    /** Determines whether a transaction falls within the active date filter. */
    const isWithinTimeframe = (dateStr) => {
        if (!dateStr) return false;
        const recordDate = new Date(dateStr);
        if (isNaN(recordDate.getTime())) return false;
        const now = new Date();

        if (quickFilter === 'today') {
            return recordDate.toDateString() === now.toDateString();
        } else if (quickFilter === 'week') {
            const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
            return recordDate >= weekAgo && recordDate <= now;
        } else if (quickFilter === 'month') {
            return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
        } else if (quickFilter === 'year') {
            return recordDate.getFullYear() === now.getFullYear();
        } else if (quickFilter === 'custom' && dateFrom && dateTo) {
            const from = new Date(dateFrom);
            const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
            return recordDate >= from && recordDate <= to;
        }
        return true; // 'all'
    };

    /** Clears the active map date filter and closes its picker. */
    const clearFilter = () => { setQuickFilter('all'); setDateFrom(''); setDateTo(''); setShowDatePicker(false); };
    const applyCustomRange = () => { if (dateFrom && dateTo) { setQuickFilter('custom'); setShowDatePicker(false); } };

    const filteredApiData = apiData.filter(i => isWithinTimeframe(i.issuanceDate || i.created_at));
    const filteredDocsData = docsData.filter(d => isWithinTimeframe(d.created_at));

    const uniqueIssuances = React.useMemo(() => {
        const seenDocIds = new Set();
        const unique = [];
        filteredApiData.forEach(i => {
            if (i.document_id) {
                const docId = Number(i.document_id);
                if (!seenDocIds.has(docId)) {
                    seenDocIds.add(docId);
                    unique.push(i);
                }
            } else {
                unique.push(i);
            }
        });
        return unique;
    }, [filteredApiData]);

    // Maintain references to markers for interactivity
    const markersRef = useRef({});

    // Fetch API Data
    // Global fetch is handled by DataProvider
    const fetchData = () => refreshAll();

    useEffect(() => {
        // cleanup on unmount
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Initialize Map and Chart after loading
    useEffect(() => {
        if (isLoading) return;

        // --- LEAFLET MAP CONTAINER INITIALIZATION ---
        if (!mapRef.current) {
            // Define Naic Municipality limits (Approximate bounding box)
            const naicBounds = L.latLngBounds(
                [14.26, 120.73], // Southwest boundary
                [14.36, 120.85]  // Northeast boundary
            );

            const map = L.map('mapContainer', {
                zoomControl: false, // Customizing controls
                maxBounds: naicBounds, // Restrict panning out of bounds
                maxBoundsViscosity: 1.0, // Solid bounce-back effect
                minZoom: 12, // Restrict zooming out too far
                maxZoom: 15 // Restrict zooming in too close
            }).setView([14.3150, 120.7700], 13);

            L.control.zoom({ position: 'bottomright' }).addTo(map);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const markersLayer = L.layerGroup().addTo(map);
            markersLayerRef.current = markersLayer;
            mapRef.current = map;
        }

        // --- RENDER DYNAMIC MARKERS & LAYERS ---
        const map = mapRef.current;
        if (!map) return;

        // Clear existing markers/heatmaps
        if (markersLayerRef.current) {
            markersLayerRef.current.clearLayers();
        }
        markersRef.current = {};

        const brgyCounts = {};
        let birthCount = 0;
        let deathCount = 0;
        let marriageCount = 0;
        let mostActiveBrgy = 'N/A';
        let maxTotal = 0;

        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            last6Months.push(d.toLocaleString('default', { month: 'short' }));
        }

        const monthData = {
            births: [0, 0, 0, 0, 0, 0],
            deaths: [0, 0, 0, 0, 0, 0],
            marriages: [0, 0, 0, 0, 0, 0]
        };

        filteredApiData.forEach(issuance => {
            const type = getNormalizedType(issuance);
            const dateStr = issuance.issuanceDate || issuance.created_at;
            const date = new Date(dateStr);
            const month = date.toLocaleString('default', { month: 'short' });
            const monthIdx = last6Months.indexOf(month);

            if (monthIdx !== -1) {
                if (type === 'birth') monthData.births[monthIdx]++;
                else if (type === 'death') monthData.deaths[monthIdx]++;
                else if (type === 'marriage') monthData.marriages[monthIdx]++;
            }
        });

        uniqueIssuances.forEach(item => {
            const rawBrgy = item.barangay || 'Ibayo Silangan';
            const type = getNormalizedType(item);
            
            // Global counts
            if (type === 'birth') birthCount++;
            else if (type === 'death') deathCount++;
            else if (type === 'marriage') marriageCount++;

            if (rawBrgy) {
                const normalizedRaw = normalizeBrgy(rawBrgy);
                // Find the matching static barangay
                let matchedBrgy = null;
                for (const sb of staticBarangays) {
                    if (normalizeBrgy(sb.name) === normalizedRaw || rawBrgy.toLowerCase().includes(normalizeBrgy(sb.name))) {
                        matchedBrgy = sb.name;
                        break;
                    }
                }
                
                const brgy = matchedBrgy || 'Unknown/Unmapped';

                if (!brgyCounts[brgy]) brgyCounts[brgy] = { births: 0, deaths: 0, marriages: 0, total: 0 };
                if (type === 'birth') brgyCounts[brgy].births++;
                else if (type === 'death') brgyCounts[brgy].deaths++;
                else if (type === 'marriage') brgyCounts[brgy].marriages++;
                brgyCounts[brgy].total++;

                if (brgy !== 'Unknown/Unmapped' && brgyCounts[brgy].total > maxTotal) {
                    maxTotal = brgyCounts[brgy].total;
                    mostActiveBrgy = brgy;
                }
            }
        });

        const totalDocs = uniqueIssuances.length;

        const barangaysForMap = staticBarangays.map(b => ({
            ...b,
            births: brgyCounts[b.name]?.births || 0,
            deaths: brgyCounts[b.name]?.deaths || 0,
            marriages: brgyCounts[b.name]?.marriages || 0
        }));

        barangaysForMap.forEach(barangay => {
            const total = barangay.births + barangay.deaths + barangay.marriages;

            if (showHeatmap) {
                // Heatmap mode: Large soft circles
                if (total > 0) {
                    const intensity = Math.min(total / 10, 1); // Scale intensity
                    const circle = L.circle(barangay.coords, {
                        color: '#f43f5e',
                        fillColor: '#f43f5e',
                        fillOpacity: 0.1 + (intensity * 0.4),
                        radius: 300 + (intensity * 500),
                        stroke: false,
                        interactive: false
                    }).addTo(markersLayerRef.current);
                    markersRef.current[barangay.name] = circle;
                }
            } else {
                // Pin mode
                let pinColor = '#0f172a'; // Default dark
                let ratio = 0;
                
                if (showRatioMode) {
                    if (barangay.births === 0 && barangay.deaths === 0) {
                        pinColor = '#0f172a'; // No records
                    } else {
                        ratio = barangay.deaths > 0 ? (barangay.births / barangay.deaths) : barangay.births;
                        if (ratio > 1.2) pinColor = '#10b981'; // High birth-to-death ratio (Emerald)
                        else if (ratio < 0.8) pinColor = '#f43f5e'; // High death-to-birth ratio (Rose)
                        else pinColor = '#6366f1'; // Balanced ratio (Indigo)
                    }
                } else {
                    if (total > 0) {
                        if (barangay.births >= barangay.deaths && barangay.births >= barangay.marriages) pinColor = '#d4a574';
                        else if (barangay.deaths >= barangay.births && barangay.deaths >= barangay.marriages) pinColor = '#f43f5e';
                        else pinColor = '#6366f1';
                    }
                }

                const isHovered = hoveredBrgy === barangay.name;
                const isPinActive = showRatioMode ? (barangay.births > 0 || barangay.deaths > 0) : (total > 0);

                const pinIcon = L.divIcon({
                    className: 'bg-transparent border-none',
                    html: `<div class="relative ${isHovered ? 'scale-125 z-[1000]' : ''} transition-all duration-300">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${pinColor}" stroke="${isPinActive ? '#ffffff' : '#d4a574'}" stroke-width="1.5" class="w-8 h-8 drop-shadow-md hover:scale-110 transition-transform origin-bottom cursor-pointer opacity-${isPinActive ? '100' : '40'}">
                               <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                               <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                             </svg>
                             ${isHovered ? '<div class="absolute inset-0 bg-white/40 rounded-full animate-ping pointer-events-none"></div>' : ''}
                           </div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                });

                const marker = L.marker(barangay.coords, { icon: pinIcon }).addTo(markersLayerRef.current);

                marker.bindTooltip(`
                    <div style="text-align: center; line-height: 1.2;">
                        <span class="font-bold text-slate-800 text-xs block">${barangay.name}</span>
                        <span class="text-[10px] text-slate-500 font-medium">${showRatioMode ? `Ratio: ${ratio.toFixed(2)}` : `Total Issued: ${total}`}</span>
                    </div>
                `, { direction: 'top', offset: [0, -32], opacity: 0.95 });

                const popupContent = showRatioMode ? `
                    <div class="p-3 min-w-[160px]">
                        <h4 class="font-bold text-[#0f172a] text-sm mb-2 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                            ${barangay.name}
                        </h4>
                        <div class="space-y-1.5 text-xs mt-3">
                            <div class="flex justify-between items-center"><span class="text-slate-500 font-medium">Births:</span> <span class="font-bold text-[#d4a574] bg-[#d4a574]/10 px-1.5 rounded">${barangay.births}</span></div>
                            <div class="flex justify-between items-center"><span class="text-slate-500 font-medium">Deaths:</span> <span class="font-bold text-rose-500 bg-rose-50 px-1.5 rounded">${barangay.deaths}</span></div>
                            <div class="flex justify-between items-center border-t border-slate-100 pt-1.5"><span class="text-slate-500 font-medium font-bold">Birth/Death Ratio:</span> <span class="font-black text-slate-800">${ratio.toFixed(2)}</span></div>
                        </div>
                    </div>
                ` : `
                    <div class="p-3 min-w-[160px]">
                        <h4 class="font-bold text-[#0f172a] text-sm mb-2 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                            ${barangay.name}
                        </h4>
                        <div class="space-y-1.5 text-xs mt-3">
                            <div class="flex justify-between items-center"><span class="text-slate-500 font-medium">Births:</span> <span class="font-bold text-[#d4a574] bg-[#d4a574]/10 px-1.5 rounded">${barangay.births}</span></div>
                            <div class="flex justify-between items-center"><span class="text-slate-500 font-medium">Deaths:</span> <span class="font-bold text-rose-500 bg-rose-50 px-1.5 rounded">${barangay.deaths}</span></div>
                            <div class="flex justify-between items-center"><span class="text-slate-500 font-medium">Marriages:</span> <span class="font-bold text-indigo-500 bg-indigo-50 px-1.5 rounded">${barangay.marriages}</span></div>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent, { closeButton: false });

                markersRef.current[barangay.name] = marker;
            }
        });

        // Update Global Stats in UI (using state)
        const totalRecords = birthCount + deathCount + marriageCount;
        setStats({ birthCount, deathCount, marriageCount, mostActiveBrgy, totalRecords, totalDocs, maxTotal });

        // --- CHART.JS ---
        if (canvasRef.current && window.Chart) {
            if (chartRef.current) chartRef.current.destroy();
            const ctx = canvasRef.current.getContext('2d');
            chartRef.current = new window.Chart(ctx, {
                type: 'bar',
                data: {
                    labels: last6Months,
                    datasets: [
                        { label: 'Births', data: monthData.births, backgroundColor: '#d4a574', borderRadius: 4 },
                        { label: 'Deaths', data: monthData.deaths, backgroundColor: '#f43f5e', borderRadius: 4 },
                        { label: 'Marriages', data: monthData.marriages, backgroundColor: '#6366f1', borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false // Disables chart bar re-animation movement on data update/hover
                }
            });
        }
    }, [isLoading, apiData, docsData, showHeatmap, showRatioMode, quickFilter, dateFrom, dateTo]);

    /** Exports the filtered map transactions as a CSV download. */
    const exportToCSV = () => {
        const headers = ["Certificate No.", "Type", "Subject Name", "Barangay", "Print Date", "Status", "Encoded By"];
        const rows = filteredPrints.map(p => [
            p.number,
            p.type,
            p.name,
            p.barangay,
            p.date,
            p.status,
            p.encoded_by || 'System'
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `civicore_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /** Centers the map on a named barangay when coordinates are available. */
    const locateBarangay = (brgyName) => {
        const marker = markersRef.current[brgyName];
        if (marker && mapRef.current) {
            mapRef.current.setView(marker.getLatLng(), 15, { animate: true });
            marker.openPopup();

            // Temporary pulse effect class could be added here if CSS is defined
            setHoveredBrgy(brgyName);
            setTimeout(() => setHoveredBrgy(null), 3000);
        }
    };

    const resetMapView = () => {
        if (mapRef.current) {
            mapRef.current.setView([14.3150, 120.7700], 13, { animate: true });
        }
    };


    const filteredPrints = filteredApiData.filter(print =>
        activeFilter === 'all' || getNormalizedType(print) === activeFilter
    );



    /** Calculates transaction throughput for the selected timeframe. */
    const getTransactionVelocity = () => {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const dailyCount = apiData.filter(i => {
            const date = new Date(i.issuanceDate || i.created_at);
            return date >= oneDayAgo;
        }).length;

        const weeklyCount = apiData.filter(i => {
            const date = new Date(i.issuanceDate || i.created_at);
            return date >= oneWeekAgo;
        }).length;

        return { dailyCount, weeklyCount };
    };

    /** Produces ranked barangay summaries for the analytics panel. */
    const getBarangayRankings = () => {
        const brgyCountsLocal = {};
        
        uniqueIssuances.forEach(i => {
            const brgy = i.barangay || 'Ibayo Silangan';
            if (brgy) {
                if (!brgyCountsLocal[brgy]) brgyCountsLocal[brgy] = { births: 0, deaths: 0, marriages: 0, total: 0 };
                const type = getNormalizedType(i);
                if (type === 'birth') brgyCountsLocal[brgy].births++;
                else if (type === 'death') brgyCountsLocal[brgy].deaths++;
                else if (type === 'marriage') brgyCountsLocal[brgy].marriages++;
                brgyCountsLocal[brgy].total++;
            }
        });

        const list = Object.keys(brgyCountsLocal).map(name => {
            const item = brgyCountsLocal[name];
            const ratio = item.deaths > 0 ? (item.births / item.deaths) : item.births;
            return {
                name,
                births: item.births,
                deaths: item.deaths,
                marriages: item.marriages,
                total: item.total,
                ratio
            };
        }).sort((a, b) => b.total - a.total);

        return list;
    };

    const unmappedCount = uniqueIssuances.filter(i => {
        const rb = i.barangay || 'Ibayo Silangan';
        if (!rb) return true;
        const norm = normalizeBrgy(rb);
        return !staticBarangays.some(sb => normalizeBrgy(sb.name) === norm || rb.toLowerCase().includes(normalizeBrgy(sb.name)));
    }).length;

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
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col gap-4 mb-2">
                {/* Title Row */}
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#d4a574] to-[#c49060] flex items-center justify-center shadow-lg shadow-[#d4a574]/20">
                                <MapPinIcon className="w-5 h-5 text-white" />
                            </span>
                            Geospatial Analytics
                        </h2>
                        <p className="text-slate-500 font-medium text-sm mt-1 ml-[52px]">Live distribution of civil records across Naic barangays.</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={exportToCSV}
                            disabled={isLoading || filteredPrints.length === 0}
                            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4 text-emerald-500" />
                            Export CSV
                        </button>
                        <button
                            onClick={() => fetchData()}
                            className="flex items-center gap-2 bg-[#0f172a] text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-800/20 hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
                        >
                            <ArrowPathIcon className={`w-4 h-4 transition-transform duration-500 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest mr-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5 text-[#d4a574]" />
                        Period
                    </div>

                    {/* Quick Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                            { key: 'all', label: 'All Time' },
                            { key: 'today', label: 'Today' },
                            { key: 'week', label: 'This Week' },
                            { key: 'month', label: 'This Month' },
                            { key: 'year', label: 'This Year' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => { setQuickFilter(key); setShowDatePicker(false); }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                    quickFilter === key
                                        ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-md shadow-slate-800/15'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                            >
                                {label}
                            </button>
                        ))}

                        {/* Divider */}
                        <div className="w-px h-5 bg-slate-200 mx-1" />

                        {/* Custom Range Toggle */}
                        <button
                            onClick={() => { setShowDatePicker(!showDatePicker); }}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                quickFilter === 'custom'
                                    ? 'bg-[#d4a574] text-white border-[#d4a574] shadow-md shadow-[#d4a574]/20'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-[#d4a574]/10 hover:border-[#d4a574]/30 hover:text-[#d4a574]'
                            }`}
                        >
                            <CalendarDaysIcon className="w-3.5 h-3.5" />
                            {quickFilter === 'custom' && dateFrom && dateTo
                                ? `${dateFrom} → ${dateTo}`
                                : 'Custom Range'
                            }
                        </button>
                    </div>

                    {/* Clear button — only when filter is active */}
                    {quickFilter !== 'all' && (
                        <button
                            onClick={clearFilter}
                            className="ml-auto flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                            <span className="w-4 h-4 rounded-full bg-slate-100 hover:bg-rose-50 flex items-center justify-center text-[10px] font-black transition-colors">×</span>
                            Clear
                        </button>
                    )}
                </div>

                {/* Custom Date Range Picker Panel */}
                <AnimatePresence>
                    {showDatePicker && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 p-4 flex flex-wrap items-end gap-4"
                        >
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</label>
                                <input
                                    type="date"
                                    id="date-from"
                                    value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    max={dateTo || undefined}
                                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40 focus:border-[#d4a574] transition-all cursor-pointer"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</label>
                                <input
                                    type="date"
                                    id="date-to"
                                    value={dateTo}
                                    onChange={e => setDateTo(e.target.value)}
                                    min={dateFrom || undefined}
                                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/40 focus:border-[#d4a574] transition-all cursor-pointer"
                                />
                            </div>
                            <button
                                onClick={applyCustomRange}
                                disabled={!dateFrom || !dateTo}
                                className="flex items-center gap-2 bg-[#d4a574] hover:bg-[#c49060] disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-[#d4a574]/20"
                            >
                                Apply Range
                            </button>
                            <button
                                onClick={() => setShowDatePicker(false)}
                                className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer px-2 py-2"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Top Stat Cards – Tabbed Panel */}
            <motion.div variants={itemVariants} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden">
                {/* Tab switcher */}
                <div className="flex items-center border-b border-slate-100 px-4 pt-3">
                    {[
                        { key: 'records', label: 'Records Overview', icon: <ChartBarIcon className="w-4 h-4" /> },
                        { key: 'issued', label: 'Issued Per Category', icon: <ClipboardDocumentCheckIcon className="w-4 h-4" /> },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStatsMode(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer mr-1 ${
                                statsMode === tab.key
                                    ? 'border-[#d4a574] text-[#d4a574]'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                    <span className="ml-auto text-[9px] text-slate-400 font-bold uppercase tracking-widest pr-2 pb-2 flex items-center gap-2">
                        {quickFilter !== 'all' ? `Filtered · ${filteredApiData.length} records` : `All Time · ${filteredApiData.length} records`}
                        {unmappedCount > 0 && (
                            <span className="text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {unmappedCount} Unmapped
                            </span>
                        )}
                    </span>
                </div>

                <div className="p-4">
                    {isLoading ? (
                        <SkeletonLoader type="cards" rows={1} />
                    ) : statsMode === 'records' ? (
                        /* ── Tab 1: Records Overview ── */
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col justify-center hover:scale-[1.02] transition-transform">
                                <p className="text-emerald-600 text-[10px] font-black uppercase tracking-wider mb-1">Uploaded Docs</p>
                                <h3 className="text-3xl font-black text-emerald-600">{stats.totalDocs}</h3>
                                <p className="text-[9px] text-emerald-400 font-bold mt-1">Total in database</p>
                            </div>
                            <div className="bg-[#d4a574]/10 border border-[#d4a574]/20 p-4 rounded-2xl flex flex-col justify-center hover:scale-[1.02] transition-transform">
                                <p className="text-[#c49060] text-[10px] font-black uppercase tracking-wider mb-1">Birth Certs</p>
                                <h3 className="text-3xl font-black text-[#d4a574]">{stats.birthCount}</h3>
                                <p className="text-[9px] text-[#d4a574]/60 font-bold mt-1">Live birth records</p>
                            </div>
                            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex flex-col justify-center hover:scale-[1.02] transition-transform">
                                <p className="text-rose-500 text-[10px] font-black uppercase tracking-wider mb-1">Death Certs</p>
                                <h3 className="text-3xl font-black text-rose-500">{stats.deathCount}</h3>
                                <p className="text-[9px] text-rose-300 font-bold mt-1">Death certificates</p>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col justify-center hover:scale-[1.02] transition-transform">
                                <p className="text-indigo-500 text-[10px] font-black uppercase tracking-wider mb-1">Marriage Certs</p>
                                <h3 className="text-3xl font-black text-indigo-500">{stats.marriageCount}</h3>
                                <p className="text-[9px] text-indigo-300 font-bold mt-1">Marriage records</p>
                            </div>
                            <div className="bg-gradient-to-br from-[#0f172a] to-slate-800 p-4 rounded-2xl shadow-lg flex flex-col justify-center relative overflow-hidden hover:scale-[1.02] transition-transform">
                                <div className="absolute right-[-10%] top-[-10%] w-24 h-24 bg-[#d4a574]/10 rounded-full blur-xl"></div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">Top Barangay</p>
                                <h3 className="text-lg font-black text-white truncate">{stats.mostActiveBrgy}</h3>
                                <p className="text-[9px] text-slate-500 font-bold mt-1">
                                    {stats.mostActiveBrgy !== 'N/A' ? `${stats.maxTotal} issued` : '0 issued'}
                                </p>
                            </div>
                        </div>
                    ) : (() => {
                        /* ── Tab 2: Issued Per Category ── */
                        const issuedBirth    = filteredApiData.filter(i => getNormalizedType(i) === 'birth').length;
                        const issuedDeath    = filteredApiData.filter(i => getNormalizedType(i) === 'death').length;
                        const issuedMarriage = filteredApiData.filter(i => getNormalizedType(i) === 'marriage').length;
                        const totalIssued    = filteredApiData.length;
                        const maxCount       = Math.max(issuedBirth, issuedDeath, issuedMarriage, 1);

                        // Most issued barangay (from issuances only)
                        const brgyIssuedCounts = {};
                        filteredApiData.forEach(i => {
                            const brgyName = i.barangay || 'Ibayo Silangan';
                            brgyIssuedCounts[brgyName] = (brgyIssuedCounts[brgyName] || 0) + 1;
                        });
                        const mostIssuedBrgy = Object.entries(brgyIssuedCounts).sort((a,b) => b[1]-a[1])[0];

                        const categories = [
                            { label: 'Birth Issued',    count: issuedBirth,    color: 'text-[#d4a574]', barColor: 'bg-[#d4a574]',     bg: 'bg-[#d4a574]/10  border-[#d4a574]/20',  emoji: <UserIcon className="w-6 h-6 text-[#d4a574]" /> },
                            { label: 'Death Issued',    count: issuedDeath,    color: 'text-rose-500',  barColor: 'bg-rose-500',       bg: 'bg-rose-50 border-rose-100',            emoji: <DocumentTextIcon className="w-6 h-6 text-rose-500" /> },
                            { label: 'Marriage Issued', count: issuedMarriage, color: 'text-indigo-500', barColor: 'bg-indigo-500',    bg: 'bg-indigo-50 border-indigo-100',         emoji: <UsersIcon className="w-6 h-6 text-indigo-500" /> },
                        ];

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-stretch">
                                {/* Category cards with mini bars */}
                                {categories.map(cat => (
                                    <div key={cat.label} className={`border p-4 rounded-2xl flex flex-col gap-2 hover:scale-[1.02] transition-transform ${cat.bg}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{cat.label}</span>
                                            <span className="text-lg">{cat.emoji}</span>
                                        </div>
                                        <h3 className={`text-4xl font-black tracking-tighter ${cat.color}`}>{cat.count}</h3>
                                        {/* Progress bar relative to highest category */}
                                        <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mt-auto">
                                            <div
                                                className={`h-full ${cat.barColor} rounded-full transition-all duration-700`}
                                                style={{ width: `${(cat.count / maxCount) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400">
                                            {totalIssued > 0 ? Math.round((cat.count / totalIssued) * 100) : 0}% of total issued
                                        </p>
                                    </div>
                                ))}

                                {/* Total + Most Issued Barangay */}
                                <div className="flex flex-col gap-3">
                                    <div className="bg-gradient-to-br from-[#0f172a] to-slate-800 p-4 rounded-2xl flex flex-col justify-center relative overflow-hidden flex-1 hover:scale-[1.02] transition-transform">
                                        <div className="absolute right-[-10%] top-[-10%] w-16 h-16 bg-[#d4a574]/10 rounded-full blur-xl"></div>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-0.5">Total Issued</p>
                                        <h3 className="text-3xl font-black text-white">{totalIssued}</h3>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex flex-col justify-center flex-1 hover:scale-[1.02] transition-transform">
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-0.5">Top Barangay</p>
                                        <p className="text-sm font-black text-slate-800 truncate">{mostIssuedBrgy ? mostIssuedBrgy[0] : 'N/A'}</p>
                                        {mostIssuedBrgy && <p className="text-[9px] text-slate-400 font-bold">{mostIssuedBrgy[1]} issued</p>}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </motion.div>

            {/* Active Filter Summary Badge */}
            <AnimatePresence>
                {quickFilter !== 'all' && (
                    <motion.div
                        key={quickFilter + dateFrom + dateTo}
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        className="flex items-center gap-2 -mt-2 overflow-hidden"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-[#d4a574]/10 to-[#d4a574]/5 border border-[#d4a574]/25 rounded-full text-xs font-bold text-[#c49060]">
                            <CalendarDaysIcon className="w-3.5 h-3.5" />
                            <span>Showing:</span>
                            <span className="text-[#0f172a] font-black">
                                {quickFilter === 'today' ? 'Today' :
                                 quickFilter === 'week' ? 'This Week' :
                                 quickFilter === 'month' ? 'This Month' :
                                 quickFilter === 'year' ? 'This Year' :
                                 quickFilter === 'custom' ? `${dateFrom} → ${dateTo}` : ''}
                            </span>
                            <span className="text-slate-400 font-medium">·</span>
                            <span className="text-slate-500 font-semibold">{filteredApiData.length} record{filteredApiData.length !== 1 ? 's' : ''}</span>
                            {unmappedCount > 0 && (
                                <span className="text-amber-500 font-semibold text-[10px] bg-amber-50 px-1.5 rounded-sm border border-amber-100 ml-1">
                                    {unmappedCount} Unmapped
                                </span>
                            )}
                            <button
                                onClick={clearFilter}
                                className="ml-1 w-4 h-4 rounded-full bg-[#d4a574]/20 hover:bg-rose-100 hover:text-rose-500 flex items-center justify-center text-[11px] font-black text-[#d4a574] transition-all cursor-pointer"
                                title="Clear filter"
                            >×</button>
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Map and Charts Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Map Section - 2 columns */}
                <motion.div variants={itemVariants} className="lg:col-span-2 relative bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-1 flex flex-col overflow-hidden h-[450px]">
                    {/* Floating Map Controls */}
                    <div className="absolute top-4 right-4 z-[1001] flex flex-col gap-2">
                        <button
                            onClick={() => {
                                setShowRatioMode(!showRatioMode);
                                if (showHeatmap) setShowHeatmap(false);
                            }}
                            className={`p-2.5 rounded-xl shadow-lg border transition-all cursor-pointer ${showRatioMode ? 'bg-[#d4a574] text-white border-[#d4a574]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            title={showRatioMode ? "Switch to Standard View" : "Switch to Demographic Ratio Mode"}
                        >
                            <DocumentChartBarIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                setShowHeatmap(!showHeatmap);
                                if (showRatioMode) setShowRatioMode(false);
                            }}
                            className={`p-2.5 rounded-xl shadow-lg border transition-all cursor-pointer ${showHeatmap ? 'bg-rose-500 text-white border-rose-400' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            title={showHeatmap ? "Switch to Pin View" : "Switch to Heatmap View"}
                        >
                            <FireIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={resetMapView}
                            className="bg-white p-2.5 rounded-xl text-slate-600 shadow-lg border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                            title="Reset Map View"
                        >
                            <ArrowsPointingOutIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Legend Overlay */}
                    <div className="absolute bottom-4 left-4 z-[1001] bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/60 min-w-[145px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            {showRatioMode ? 'Demographic Ratio' : 'Legend'}
                        </p>
                        <div className="space-y-1.5">
                            {showRatioMode ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                                        <span className="text-[10px] font-bold text-slate-700">High Growth (&gt;1.2)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]"></span>
                                        <span className="text-[10px] font-bold text-slate-700">Balanced (0.8-1.2)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                        <span className="text-[10px] font-bold text-slate-700">High Mortality (&lt;0.8)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a] opacity-40"></span>
                                        <span className="text-[10px] font-bold text-slate-700">No Records</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#d4a574]"></span>
                                        <span className="text-[10px] font-bold text-slate-700">Births</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                        <span className="text-[10px] font-bold text-slate-700">Deaths</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                        <span className="text-[10px] font-bold text-slate-700">Marriages</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a] opacity-40"></span>
                                        <span className="text-[10px] font-bold text-slate-700">No Records</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div id="mapContainer" className="w-full h-full rounded-xl bg-slate-100 z-0"></div>
                </motion.div>

                {/* Right Panel Segment - Charts or Demographics & Velocity */}
                <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-5 flex flex-col h-[450px]">
                    {/* Tab Switcher */}
                    <div className="flex bg-slate-100/60 p-1 gap-1 rounded-xl mb-4">
                        <button
                            onClick={() => setRightPanelTab('charts')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${rightPanelTab === 'charts' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setRightPanelTab('demographics')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${rightPanelTab === 'demographics' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Velocity
                        </button>
                        <button
                            onClick={() => setRightPanelTab('barangay')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${rightPanelTab === 'barangay' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            By Barangay
                        </button>
                    </div>

                    {rightPanelTab === 'charts' ? (
                        <>
                            <div className="mb-4">
                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                                    <DocumentChartBarIcon className="w-4 h-4 text-[#d4a574]" />
                                    Monthly Trajectory
                                </h3>
                                <p className="text-[10px] text-slate-500 font-medium">6-month document processing trends</p>
                            </div>
                            <div className="flex-1 relative w-full overflow-hidden">
                                {isLoading ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <SkeletonLoader type="default" />
                                    </div>
                                ) : (
                                    <canvas ref={canvasRef}></canvas>
                                )}
                            </div>
                        </>
                    ) : rightPanelTab === 'barangay' ? (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                                        <MapPinIcon className="w-4 h-4 text-[#d4a574]" />
                                        By Barangay
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-medium">Click any row to locate on map</p>
                                </div>
                                {getBarangayRankings().length > 10 && (
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg">
                                        {showAllBarangays ? getBarangayRankings().length : Math.min(10, getBarangayRankings().length)} of {getBarangayRankings().length}
                                    </span>
                                )}
                            </div>

                            {isLoading ? (
                                <div className="space-y-1.5">
                                    {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
                                </div>
                            ) : getBarangayRankings().length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                                    <MapPinIcon className="w-8 h-8 text-slate-200 mb-2" />
                                    <p className="text-xs text-slate-400 font-semibold">No barangay records yet</p>
                                </div>
                            ) : (() => {
                                const rankings = getBarangayRankings();
                                const maxTotal = rankings[0]?.total || 1;
                                const displayed = showAllBarangays ? rankings : rankings.slice(0, 10);
                                return (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-1">
                                        {displayed.map((brgy, idx) => (
                                            <button
                                                key={brgy.name}
                                                onClick={() => locateBarangay(brgy.name)}
                                                className="w-full text-left p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-white hover:border-[#d4a574]/30 hover:shadow-sm transition-all cursor-pointer group/brgy shrink-0"
                                            >
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 ${
                                                            idx === 0 ? 'bg-amber-400 text-white'
                                                            : idx === 1 ? 'bg-slate-300 text-slate-700'
                                                            : idx === 2 ? 'bg-orange-300 text-white'
                                                            : 'bg-slate-100 text-slate-500'
                                                        }`}>{idx + 1}</span>
                                                        <span className="text-xs font-bold text-slate-700 group-hover/brgy:text-[#d4a574] transition-colors truncate">{brgy.name}</span>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-800 shrink-0 ml-1">{brgy.total}</span>
                                                </div>
                                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-[#d4a574] to-[#c49060] rounded-full transition-all duration-500"
                                                        style={{ width: `${(brgy.total / maxTotal) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-bold text-[#d4a574]">{brgy.births}B</span>
                                                    <span className="text-[9px] font-bold text-rose-400">{brgy.deaths}D</span>
                                                    <span className="text-[9px] font-bold text-indigo-400">{brgy.marriages}M</span>
                                                    <span className="ml-auto text-[9px] font-bold text-slate-400 group-hover/brgy:text-[#d4a574] transition-colors flex items-center gap-0.5">
                                                        <MapPinIcon className="w-3 h-3 text-[#d4a574]" /> Locate
                                                    </span>
                                                </div>
                                            </button>
                                        ))}

                                        {/* Show All / Collapse toggle */}
                                        {rankings.length > 10 && (
                                            <button
                                                onClick={() => setShowAllBarangays(v => !v)}
                                                className="w-full mt-1 py-2 rounded-xl border border-dashed border-slate-200 text-[10px] font-black text-slate-400 hover:border-[#d4a574]/40 hover:text-[#d4a574] hover:bg-[#d4a574]/5 transition-all cursor-pointer uppercase tracking-widest shrink-0"
                                            >
                                                {showAllBarangays
                                                    ? `↑ Show Top 10 Only`
                                                    : `↓ Show All ${rankings.length} Barangays`
                                                }
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            {/* Velocities Header */}
                            <div className="mb-4">
                                <h3 className="text-sm font-black text-slate-800">Transaction Velocities</h3>
                                <p className="text-[10px] text-slate-500 font-medium mb-2.5">Finalized record print rates</p>
                                
                                {isLoading ? (
                                    <div className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="bg-emerald-50/50 border border-emerald-100/50 p-2 rounded-xl flex flex-col justify-center">
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wide">Daily Velocity</span>
                                            <span className="text-lg font-black text-slate-800 font-mono tabular-nums leading-none mt-1">
                                                {getTransactionVelocity().dailyCount} <span className="text-[10px] font-bold text-slate-400">/day</span>
                                            </span>
                                        </div>
                                        <div className="bg-indigo-50/50 border border-indigo-100/50 p-2 rounded-xl flex flex-col justify-center">
                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wide">Weekly Velocity</span>
                                            <span className="text-lg font-black text-slate-800 font-mono tabular-nums leading-none mt-1">
                                                {getTransactionVelocity().weeklyCount} <span className="text-[10px] font-bold text-slate-400">/wk</span>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Demographics Rankings */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Barangay Rankings</span>
                                    <span className="text-[9px] font-bold text-slate-500">Sorted by Volume</span>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                    {isLoading ? (
                                        <div className="space-y-1">
                                            <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
                                            <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
                                            <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
                                        </div>
                                    ) : getBarangayRankings().length === 0 ? (
                                        <div className="text-center py-8 text-xs text-slate-400 font-medium">
                                            No vital events registered yet.
                                        </div>
                                    ) : (
                                        getBarangayRankings().map((brgy, idx) => (
                                            <div 
                                                key={brgy.name}
                                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-colors group/item"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <button 
                                                        onClick={() => locateBarangay(brgy.name)}
                                                        className="text-xs font-bold text-slate-700 hover:text-[#d4a574] text-left truncate max-w-full cursor-pointer"
                                                    >
                                                        {idx + 1}. {brgy.name}
                                                    </button>
                                                    <div className="text-[9.5px] text-slate-400 font-medium mt-0.5">
                                                        B: {brgy.births} · D: {brgy.deaths} · M: {brgy.marriages}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                        {brgy.total}
                                                    </span>
                                                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                                                        brgy.ratio > 1.2 ? 'bg-emerald-50 text-emerald-600' :
                                                        brgy.ratio < 0.8 ? 'bg-rose-50 text-rose-600' :
                                                        'bg-indigo-50 text-indigo-600'
                                                    }`}>
                                                        R: {brgy.ratio.toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Print Records Table */}
            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Recent Document Prints</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Track physical issuance logs
                            {quickFilter !== 'all' && (
                                <span className="ml-1.5 text-[#d4a574] font-bold">
                                    · {quickFilter === 'today' ? 'Today' : quickFilter === 'week' ? 'This Week' : quickFilter === 'month' ? 'This Month' : quickFilter === 'year' ? 'This Year' : quickFilter === 'custom' ? `${dateFrom} → ${dateTo}` : ''} only
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                        {['all', 'birth', 'death', 'marriage'].map(type => (
                            <button
                                key={type}
                                onClick={() => setActiveFilter(type)}
                                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeFilter === type
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                                <th className="p-4 pl-6">Certificate No.</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Subject Name</th>
                                <th className="p-4">Barangay</th>
                                <th className="p-4">Encoded By</th>
                                <th className="p-4 text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-0">
                                        <SkeletonLoader type="table" rows={4} />
                                    </td>
                                </tr>
                            ) : filteredPrints.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        No tracking logs found.
                                    </td>
                                </tr>
                            ) : (
                                filteredPrints.map((print, index) => (
                                    <tr
                                        key={index}
                                        onMouseEnter={() => setHoveredBrgy(print.barangay)}
                                        onMouseLeave={() => setHoveredBrgy(null)}
                                        className={`hover:bg-slate-50 transition-colors text-xs group/row ${hoveredBrgy === print.barangay ? 'bg-slate-50' : ''}`}
                                    >
                                        <td className="p-4 pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{print.number}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{print.date}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {(() => {
                                                const normType = getNormalizedType(print);
                                                const colorClass = normType === 'birth' ? 'text-[#d4a574]' : normType === 'death' ? 'text-rose-500' : 'text-indigo-500';
                                                return (
                                                    <span className={`text-xs font-black uppercase tracking-wider ${colorClass}`}>
                                                        {print.type}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 font-semibold text-slate-700">{print.name}</td>
                                        <td className="p-4 text-slate-600 font-medium">{print.barangay}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Avatar
                                                    size={20}
                                                    name={print.encoded_by || 'System'}
                                                    variant="beam"
                                                    colors={['#0f172a', '#d4a574', '#6366f1', '#f43f5e', '#10b981']}
                                                />
                                                <span className="font-medium text-slate-500">{print.encoded_by || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => locateBarangay(print.barangay)}
                                                    className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[#d4a574] transition-all cursor-pointer"
                                                    title="Locate on Map"
                                                >
                                                    <MagnifyingGlassIcon className="w-4 h-4" />
                                                </button>
                                                <a
                                                    href={`/api/documents/view/${print.document_id || print.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-indigo-500 transition-all cursor-pointer"
                                                    title="View Full Document"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Mapping;

