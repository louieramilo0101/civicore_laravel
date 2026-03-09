// ==========================================
// MAPS - Geospatial Analytics
// ==========================================

// --- Naic Barangay Data ---
const naicBarangays = [
    { name: "Gomez-Zamora (Pob.)", lat: 14.320, lng: 120.7652},
    { name: "Capt. C. Nazareno (Pob.)", lat: 14.3179, lng: 120.76559 },
    { name: "Ibayo Silangan", lat: 14.3225, lng: 120.7673 },
    { name: "Ibayo Estacion", lat: 14.32358, lng: 120.76485 },
    { name: "Kanluran", lat: 14.31728, lng: 120.76345 },
    { name: "Makina", lat: 14.31462, lng: 120.77060},
    { name: "Sapa", lat: 14.32049, lng: 120.75696 },
    { name: "Bucana Malaki", lat: 14.3251, lng: 120.75574 },
    { name: "Bucana Sasahan", lat: 14.3232, lng: 120.7598 },
    { name: "Bagong Karsada", lat: 14.3211, lng: 120.7535 },
    { name: "Balsahan", lat: 14.3198, lng: 120.7627 },
    { name: "Bancaan", lat: 14.3175, lng: 120.7512 },
    { name: "Muzon", lat: 14.29245, lng: 120.75202 },
    { name: "Latoria", lat: 14.3217999, lng: 120.761},
    { name: "Labac", lat: 14.3126, lng: 120.7373 },
    { name: "Mabolo", lat: 14.3148, lng: 120.7476 },
    { name: "San Roque", lat: 14.31058, lng: 120.7709 },
    { name: "Santulan", lat: 14.3145, lng: 120.7685 },
    { name: "Molino", lat: 14.2795, lng: 120.78071 },
    { name: "Calubcob", lat: 14.2976, lng: 120.7909 },
    { name: "Halang", lat: 14.2939, lng: 120.8007 },
    { name: "Malainen Bago", lat: 14.3078, lng: 120.7683 },
    { name: "Malainen Luma", lat: 14.3000, lng: 120.7700 },
    { name: "Palangue 1", lat: 14.2850, lng: 120.8097 },
    { name: "Palangue 2 & 3", lat: 14.2620, lng: 120.8297 },
    { name: "Humbac", lat: 14.3166, lng: 120.7689 },
    { name: "Munting Mapino", lat: 14.3348, lng: 120.7717 },
    { name: "Sabang", lat: 14.3146, lng: 120.7930 },
    { name: "Timalan Balsahan", lat: 14.3438, lng: 120.7808 },
    { name: "Timalan Concepcion", lat: 14.33699, lng: 120.7790 }
];

// --- Print Analytics Chart ---
let printAnalyticsChart = null;
let allIssuancesData = [];

// --- Initialize Mapping Page ---
async function initializeMappingPage() {
    // Initialize map
    initializeNaicMap();
    
    // Load print records table
    await loadPrintRecordsTable('all');
    
    // Initialize and update analytics
    initializePrintAnalyticsChart();
    await updatePrintAnalytics();
}

// --- Filter Print Records ---
async function filterPrintRecords(filterType) {
    await loadPrintRecordsTable(filterType);
}

// --- Load Print Records Table ---
async function loadPrintRecordsTable(filterType = 'all') {
    const tbody = document.getElementById('printRecordsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #888;">Loading...</td></tr>';
    
    try {
        let records = await getAllIssuances();
        
        if (!Array.isArray(records)) {
            records = [];
        }
        
        // Store for analytics
        allIssuancesData = records;
        
        // Apply filter
        if (filterType !== 'all') {
            records = records.filter(r => r.type === filterType);
        }
        
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #888;">No records found</td></tr>';
            return;
        }
        
        // Sort by date (newest first)
        records.sort((a, b) => new Date(b.issuanceDate) - new Date(a.issuanceDate));
        
        tbody.innerHTML = '';
        
        records.forEach(r => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #eee';
            row.style.transition = 'background 0.2s';
            
            const statusBg = r.status === 'Issued' ? '#d5f4e6' : '#fef5e7';
            const statusColor = r.status === 'Issued' ? '#27ae60' : '#f39c12';
            
            // Format the type for display
            let typeDisplay = r.type || 'N/A';
            if (typeDisplay === 'birth') typeDisplay = 'Birth Certificate';
            else if (typeDisplay === 'death') typeDisplay = 'Death Certificate';
            else if (typeDisplay === 'marriage_license') typeDisplay = 'Marriage License';
            
            row.innerHTML = `
                <td style="padding: 12px; font-weight: 500;">${r.certNumber || 'N/A'}</td>
                <td style="padding: 12px;">${typeDisplay}</td>
                <td style="padding: 12px;">${r.name || 'N/A'}</td>
                <td style="padding: 12px;">${r.barangay || 'N/A'}</td>
                <td style="padding: 12px;">${r.issuanceDate || 'N/A'}</td>
                <td style="padding: 12px;"><span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${r.status || 'N/A'}</span></td>
            `;
            tbody.appendChild(row);
        });
        
        // Also update analytics when table loads
        await updatePrintAnalytics();
        
    } catch (error) {
        console.error('Error loading print records:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading data</td></tr>';
    }
}

// --- Initialize Print Analytics Chart ---
function initializePrintAnalyticsChart() {
    const ctx = document.getElementById('printAnalyticsChart');
    if (!ctx) return;
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    
    // Destroy existing chart if any
    if (printAnalyticsChart) {
        printAnalyticsChart.destroy();
    }
    
    printAnalyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Birth', 'Death', 'Marriage'],
            datasets: [{
                label: 'Certificate Prints',
                data: [0, 0, 0],
                backgroundColor: ['#3498db', '#e74c3c', '#9b59b6'],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// --- Update Print Analytics ---
async function updatePrintAnalytics() {
    try {
        let records = allIssuancesData;
        
        if (!records || records.length === 0) {
            records = await getAllIssuances();
            allIssuancesData = records;
        }
        
        if (!Array.isArray(records)) {
            records = [];
        }
        
        // Count by type
        const birthCount = records.filter(r => r.type === 'birth').length;
        const deathCount = records.filter(r => r.type === 'death').length;
        const marriageCount = records.filter(r => r.type === 'marriage_license').length;
        const totalCount = records.length;
        
        // Count this month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyCount = records.filter(r => {
            const date = new Date(r.issuanceDate);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;
        
        // Count today
        const today = new Date().toISOString().split('T')[0];
        const todayCount = records.filter(r => r.issuanceDate === today).length;
        
        // Update stats
        if (document.getElementById('totalPrints')) {
            document.getElementById('totalPrints').textContent = totalCount;
        }
        if (document.getElementById('birthPrints')) {
            document.getElementById('birthPrints').textContent = birthCount;
        }
        if (document.getElementById('deathPrints')) {
            document.getElementById('deathPrints').textContent = deathCount;
        }
        if (document.getElementById('marriagePrints')) {
            document.getElementById('marriagePrints').textContent = marriageCount;
        }
        if (document.getElementById('monthlyPrints')) {
            document.getElementById('monthlyPrints').textContent = monthlyCount;
        }
        if (document.getElementById('todayPrints')) {
            document.getElementById('todayPrints').textContent = todayCount;
        }
        
        // Update chart
        if (printAnalyticsChart) {
            printAnalyticsChart.data.datasets[0].data = [birthCount, deathCount, marriageCount];
            printAnalyticsChart.update();
        }
        
    } catch (error) {
        console.error('Error updating print analytics:', error);
    }
}

// --- Initialize Naic Map ---
function initializeNaicMap() {
    const mapContainer = document.getElementById('mapContainer');
    
    // Safety check: ensure container exists and is visible
    if (!mapContainer || mapContainer.offsetParent === null) return;

    // Reset map if it already exists to prevent duplication
    if (window.naicMap) {
        window.naicMap.remove();
        window.naicMap = null;
    }

    // Initialize Map centered on Naic
    const map = L.map('mapContainer', {
        center: [14.3150, 120.7700],
        zoom: 13,
        minZoom: 12,
        maxZoom: 15,
        scrollWheelZoom: true
    });
    window.naicMap = map;

    // Define Naic municipality bounds (southwest and northeast corners)
    const naicBounds = [
        [14.26, 120.73],   // Southwest corner of Naic
        [14.36, 120.85]    // Northeast corner of Naic
    ];
    
    // Set max bounds to restrict panning to NAIC municipality only
    map.setMaxBounds(naicBounds);
    map.setMaxZoom(15);
    map.setMinZoom(12);

    // Add OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 12
    }).addTo(map);

    // Force map to recalculate size after initialization
    // This ensures markers are properly rendered
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    // Get Data for Statistics (async-compatible)
    // Use getAllIssuances function if available (async), otherwise use db.getAllIssuances
    let issuances = [];
    if (typeof getAllIssuances === 'function') {
        // It's async, we'll handle it differently
        getAllIssuances().then(data => {
            addMarkersToMap(map, data || []);
        }).catch(() => {
            // Fallback to db.getAllIssuances if available
            if (typeof db !== 'undefined' && db.getAllIssuances) {
                addMarkersToMap(map, db.getAllIssuances());
            } else {
                addMarkersToMap(map, []);
            }
        });
    } else if (typeof db !== 'undefined' && db.getAllIssuances) {
        addMarkersToMap(map, db.getAllIssuances());
    } else {
        addMarkersToMap(map, []);
    }
}

// --- Add Markers to Map ---
function addMarkersToMap(map, issuances) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let activeAreas = 0;

    // Iterate through ALL Barangays
    naicBarangays.forEach(brgy => {
        // Calculate Statistics for this specific Barangay
        const monthlyCount = issuances.filter(i => 
            i.barangay === brgy.name && 
            new Date(i.issuanceDate).getMonth() === currentMonth &&
            new Date(i.issuanceDate).getFullYear() === currentYear
        ).length;

        const totalCount = issuances.filter(i => i.barangay === brgy.name).length;

        // Create the Marker using standard Leaflet pin marker (like original code)
        const marker = L.marker([brgy.lat, brgy.lng]).addTo(map);

        // Define the Popup Content
        const popupContent = `
            <div style="text-align: center; font-family: 'Segoe UI', sans-serif; min-width: 180px; padding: 5px;">
                <strong style="color: #2c3e50; font-size: 15px; display: block; margin-bottom: 8px; border-bottom: 2px solid #d4a574; padding-bottom: 5px;">
                    📍 ${brgy.name}
                </strong>
                <div style="font-size: 13px; text-align: left; padding: 5px;">
                    <div style="margin-bottom: 6px; padding: 4px; background: ${monthlyCount > 0 ? '#d5f4e6' : '#f5f5f5'}; border-radius: 4px;">
                        📅 This Month: <b style="color: ${monthlyCount > 0 ? '#27ae60' : '#7f8c8d'}; float: right;">${monthlyCount}</b>
                    </div>
                    <div style="padding: 4px; background: #e8f4fd; border-radius: 4px;">
                        🗂️ Total Issued: <b style="color: #2980b9; float: right;">${totalCount}</b>
                    </div>
                </div>
            </div>
        `;

        // Bind Popup (click to show details)
        marker.bindPopup(popupContent, {
            className: 'barangay-popup'
        });

        // Also bind tooltip for hover
        const tooltipContent = `<strong>${brgy.name}</strong><br>This Month: ${monthlyCount}<br>Total: ${totalCount}`;
        marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -10],
            opacity: 0.9,
            className: 'barangay-tooltip'
        });

        if (monthlyCount > 0) activeAreas++;
    });

    // Update the "Most Active" stat card on the UI
    if(document.getElementById('activeBarangay')) {
        document.getElementById('activeBarangay').textContent = activeAreas + " Active Areas";
    }
}

// --- Initialize OCR (Placeholder) ---
function initializeOCR() {
    console.log("OCR Ready");
}
