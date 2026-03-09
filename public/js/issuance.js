// ==========================================
// ISSUANCE - Certificate Issuance Management
// ==========================================

// Note: Uses API functions directly from api.js

// --- Initialize Issuance Page ---
async function initIssuancePage() {
    await loadBarangaysToDropdown();
    await generateCertNumber();
    await loadIssuanceData();
    initializeDateInputValidation();
}

// --- Load Barangays to Dropdown ---
async function loadBarangaysToDropdown() {
    const barangaySelect = document.getElementById('newCertBarangay');
    if (!barangaySelect) return;
    
    try {
        const barangays = await getAllBarangays();
        barangaySelect.innerHTML = '';
        
        barangays.forEach(b => {
            const option = document.createElement('option');
            option.value = b.name;
            option.textContent = b.name;
            barangaySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading barangays:', error);
        // Fallback to Naic barangays if API fails
        const naicBarangays = [
            "Gomez-Zamora (Pob.)", "Capt. C. Nazareno (Pob.)", "Ibayo Silangan",
            "Ibayo Estacion", "Kanluran", "Makina", "Sapa", "Bucana Malaki",
            "Bucana Sasahan", "Bagong Karsada", "Balsahan", "Bancaan", "Muzon",
            "Latoria", "Labac", "Mabolo", "San Roque", "Santulan", "Molino",
            "Calubcob", "Halang", "Malainen Bago", "Malainen Luma", "Palangue 1",
            "Palangue 2 & 3", "Humbac", "Munting Mapino", "Sabang", "Timalan Balsahan",
            "Timalan Concepcion"
        ];
        barangaySelect.innerHTML = '';
        naicBarangays.forEach(b => {
            const option = document.createElement('option');
            option.value = b;
            option.textContent = b;
            barangaySelect.appendChild(option);
        });
    }
}

// --- Auto-generate Certificate Number ---
async function generateCertNumber() {
    const certType = document.getElementById('newCertType');
    const certNumberInput = document.getElementById('newCertNumber');
    if (!certType || !certNumberInput) return;
    
    try {
        const result = await getNextCertNumber(certType.value);
        certNumberInput.value = result.certNumber;
    } catch (error) {
        console.error('Error generating cert number:', error);
    }
}

// --- Load Issuance Data ---
async function loadIssuanceData() {
    await loadIssuanceTable();
    updateAllStatistics();
}

// --- Load Issuance Table ---
async function loadIssuanceTable(filterType = 'all') {
    const tbody = document.getElementById('issuanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Clear selected checkboxes when reloading
    window.selectedIssuanceIds = [];
    
    try {
        let records = await getAllIssuances();
        console.log('Fetched issuances:', records);
        console.log('Total records:', records.length);
        
        if (!Array.isArray(records)) {
            console.error('Error: Expected array but got:', typeof records);
            records = [];
        }
        
        if (filterType !== 'all') {
            records = records.filter(r => r.type === filterType);
        }
        
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #888;">No records found</td></tr>';
            return;
        }
        
        records.forEach(r => {
            const row = document.createElement('tr');
            row.className = 'issuance-row';
            row.dataset.id = r.id;
            const statusBg = r.status === 'Issued' ? '#d5f4e6' : '#fef5e7';
            const statusColor = r.status === 'Issued' ? '#27ae60' : '#f39c12';
            
            row.innerHTML = `
                <td class="checkbox-hidden" style="padding: 12px;">
                    <label class="checkbox-container">
                        <input type="checkbox" class="issuance-checkbox" value="${r.id}" onchange="updateSelectAllCheckbox()">
                        <span class="checkbox-custom"></span>
                    </label>
                </td>
                <td style="padding: 12px; font-weight: 500;">${r.certNumber || 'N/A'}</td>
                <td style="padding: 12px;">${r.type ? r.type.toUpperCase() : 'N/A'}</td>
                <td style="padding: 12px;">${r.name || 'N/A'}</td>
                <td style="padding: 12px;">${r.barangay || 'N/A'}</td>
                <td style="padding: 12px;">${r.issuanceDate || 'N/A'}</td>
                <td style="padding: 12px;"><span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 8px; border-radius: 4px;">${r.status || 'N/A'}</span></td>
                <td style="padding: 12px;">
                    <div class="action-btn-group">
                        <button class="action-btn view" onclick="viewIssuanceDocument(${r.id})" title="View">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="action-btn print" onclick="printIssuanceRecord(${r.id})" title="Print">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                        </button>
                        <button class="action-btn delete" onclick="openDeleteIssuanceModal(${r.id}, '${r.certNumber || ''}')" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading issuance table:', error);
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: red;">Error loading data: ' + error.message + '</td></tr>';
    }
}

// --- Filter Issuance ---
function filterIssuance(type) {
    loadIssuanceTable(type);
}

// --- Search Certificates ---
async function searchCertificates() {
    const searchTerm = document.getElementById('certificateSearch').value.toLowerCase();
    const tbody = document.getElementById('issuanceTableBody');
    if (!tbody) return;
    
    const allRecords = await getAllIssuances();
    
    const filteredRecords = allRecords.filter(r => {
        const certNumber = (r.certNumber || '').toLowerCase();
        const name = (r.name || '').toLowerCase();
        const type = (r.type || '').toLowerCase();
        const barangay = (r.barangay || '').toLowerCase();
        
        return certNumber.includes(searchTerm) || 
               name.includes(searchTerm) || 
               type.includes(searchTerm) ||
               barangay.includes(searchTerm);
    });
    
    tbody.innerHTML = '';
    
    if (filteredRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #888;">No records found</td></tr>';
        return;
    }
    
    filteredRecords.forEach(r => {
        const row = document.createElement('tr');
        const statusBg = r.status === 'Issued' ? '#d5f4e6' : '#fef5e7';
        const statusColor = r.status === 'Issued' ? '#27ae60' : '#f39c12';
        
        row.innerHTML = `
            <td class="checkbox-hidden" style="padding: 12px;">
                <label class="checkbox-container">
                    <input type="checkbox" class="issuance-checkbox" value="${r.id}" onchange="updateSelectAllCheckbox()">
                    <span class="checkbox-custom"></span>
                </label>
            </td>
            <td style="padding: 12px; font-weight: 500;">${r.certNumber || 'N/A'}</td>
            <td style="padding: 12px;">${r.type ? r.type.toUpperCase() : 'N/A'}</td>
            <td style="padding: 12px;">${r.name || 'N/A'}</td>
            <td style="padding: 12px;">${r.barangay || 'N/A'}</td>
            <td style="padding: 12px;">${r.issuanceDate || 'N/A'}</td>
            <td style="padding: 12px;"><span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 8px; border-radius: 4px;">${r.status || 'N/A'}</span></td>
            <td style="padding: 12px;">
                <div class="action-btn-group">
                    <button class="action-btn view" onclick="viewIssuanceDocument(${r.id})" title="View">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="action-btn print" onclick="printIssuanceRecord(${r.id})" title="Print">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="openDeleteIssuanceModal(${r.id}, '${r.certNumber || ''}')" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// --- Initialize Date Input Event Listeners ---
function initializeDateInputValidation() {
    const certDateInput = document.getElementById('newCertDate');
    const dateError = document.getElementById('dateError');
    
    if (certDateInput) {
        // Clear error when user starts typing/selecting a date
        certDateInput.addEventListener('input', function() {
            if (this.value) {
                this.style.borderColor = '#28a745';
                this.style.borderWidth = '1px';
                if (dateError) {
                    dateError.style.display = 'none';
                }
            } else {
                this.style.borderColor = '#e74c3c';
                this.style.borderWidth = '2px';
                if (dateError) {
                    dateError.style.display = 'block';
                }
            }
        });
    }
}

// --- Add New Issuance ---
async function addNewIssuance() {
    const certNumber = document.getElementById('newCertNumber').value;
    const certType = document.getElementById('newCertType').value;
    const certNameInput = document.getElementById('newCertName');
    const certName = certNameInput.value;
    const certBarangay = document.getElementById('newCertBarangay').value;
    const certDateInput = document.getElementById('newCertDate');
    const certDate = certDateInput.value;
    const certStatus = document.getElementById('newCertStatus').value;
    const dateError = document.getElementById('dateError');
    const nameError = document.getElementById('nameError');
    
    // Validate required fields - Recipient Name
    if (!certName) {
        // Show visual error - red border and error message
        certNameInput.style.borderColor = '#e74c3c';
        certNameInput.style.borderWidth = '2px';
        nameError.style.display = 'block';
        certNameInput.focus();
        return;
    }
    
    // Clear error styling when name is filled
    certNameInput.style.borderColor = '#28a745';
    certNameInput.style.borderWidth = '1px';
    nameError.style.display = 'none';
    
    // Validate Date of Issuance is required
    if (!certDate) {
        // Show visual error - red border and error message
        certDateInput.style.borderColor = '#e74c3c';
        certDateInput.style.borderWidth = '2px';
        dateError.style.display = 'block';
        certDateInput.focus();
        return;
    }
    
    // Clear error styling when date is filled
    certDateInput.style.borderColor = '#28a745';
    certDateInput.style.borderWidth = '1px';
    dateError.style.display = 'none';
    
    const result = await saveIssuance({
        certNumber,
        type: certType,
        name: certName,
        barangay: certBarangay,
        issuanceDate: certDate,
        status: certStatus
    });
    
    // Show success modal
    showSuccessModal('Certificate has been issued successfully!');
    
    // Clear form fields and reset styles
    document.getElementById('newCertName').value = '';
    document.getElementById('newCertDate').value = '';
    certDateInput.style.borderColor = '';
    certDateInput.style.borderWidth = '';
    dateError.style.display = 'none';
    certNameInput.style.borderColor = '';
    certNameInput.style.borderWidth = '';
    nameError.style.display = 'none';
    
    // Generate new certificate number for next entry
    await generateCertNumber();
    
    loadIssuanceData();
}

// --- View Issuance Document ---
async function viewIssuanceDocument(id) {
    console.log('Viewing issuance document with ID:', id);
    
    try {
        const record = await getIssuanceById(id);
        console.log('Fetched record:', record);
        
        if (!record) {
            console.error('No record found for ID:', id);
            alert('Record not found');
            return;
        }
        
        if (record.error) {
            console.error('Error fetching record:', record.error);
            alert('Error loading record: ' + record.error);
            return;
        }
        
        // Find associated doc if exists - using 'date' field instead of 'dateAdded'
        const docs = await getAllDocuments();
        console.log('All documents:', docs);
        
        // Try to find matching document by personName or name
        const matchingDoc = docs.find(d => d.personName && record.name && d.personName.toLowerCase().includes(record.name.toLowerCase().split(' ')[0]));
        console.log('Matching document:', matchingDoc);
        
        displayIssuanceDocumentModal(record, matchingDoc);
    } catch (error) {
        console.error('Error in viewIssuanceDocument:', error);
        alert('Error loading document: ' + error.message);
    }
}

// --- Display Issuance Document Modal ---
function displayIssuanceDocumentModal(record, doc) {
    const modalHTML = `
        <div id="documentModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 10px; max-width: 800px; width: 100%; padding: 30px; position: relative;">
                <button onclick="document.getElementById('documentModal').remove()" style="position: absolute; top: 15px; right: 15px; border: none; background: none; font-size: 20px; cursor: pointer;">✕</button>
                
                <h2 style="border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px;">${record.type ? record.type.toUpperCase() : 'N/A'} Certificate</h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div><strong>Certificate Number:</strong> ${record.certNumber || 'N/A'}</div>
                    <div><strong>Name:</strong> ${record.name || 'N/A'}</div>
                    <div><strong>Barangay:</strong> ${record.barangay || 'N/A'}</div>
                    <div><strong>Date:</strong> ${record.issuanceDate || 'N/A'}</div>
                    <div><strong>Status:</strong> ${record.status || 'N/A'}</div>
                </div>
                
                ${doc ? `
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin-bottom: 20px;">
                    <strong>Attached File:</strong> ${doc.name} (${doc.size})
                    ${doc.previewData ? `<br><img src="${doc.previewData}" style="max-width: 100%; height: auto; margin-top: 10px; border: 1px solid #ddd;">` : ''}
                </div>` : '<div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #ccc; margin-bottom: 20px;"><em>No attached file found</em></div>'}
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn-primary" onclick="printIssuanceRecord(${record.id})">🖨️ Print Certificate</button>
                    <button class="btn-small danger" onclick="document.getElementById('documentModal').remove()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('documentModal');
    if(existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- Print Issuance Record ---
async function printIssuanceRecord(id) {
    console.log('Printing issuance record with ID:', id);
    
    try {
        const record = await getIssuanceById(id);
        console.log('Fetched record for printing:', record);
        
        if (!record || record.error) {
            console.error('No record found or error:', record);
            alert('Record not found or error loading record');
            return;
        }
        
        const w = window.open('', '_blank');
        if (!w) {
            alert('Please allow popups to print');
            return;
        }
        
        w.document.write(`
            <html>
            <head>
                <title>Print</title>
                <style>
                    body {
                        font-family: serif;
                        padding: 40px;
                        text-align: center;
                        border: 5px double black;
                        height: 90vh;
                    }
                </style>
            </head>
            <body>
                <h1>CERTIFICATE OF ${record.type ? record.type.toUpperCase() : 'N/A'}</h1>
                <p>Civil Registry of Naic, Cavite</p>
                <hr>
                <div style="text-align: left; margin: 50px;">
                    <p><strong>Cert No:</strong> ${record.certNumber || 'N/A'}</p>
                    <p><strong>Name:</strong> ${record.name || 'N/A'}</p>
                    <p><strong>Barangay:</strong> ${record.barangay || 'N/A'}</p>
                    <p><strong>Date Issued:</strong> ${record.issuanceDate || 'N/A'}</p>
                </div>
                <script>setTimeout(() => window.print(), 500);</script>
            </body>
            </html>
        `);
        w.document.close();
    } catch (error) {
        console.error('Error in printIssuanceRecord:', error);
        alert('Error printing document: ' + error.message);
    }
}

// --- Update All Statistics (Dashboard) ---
async function updateAllStatistics() {
    const docs = await getAllDocuments();
    const issuances = await getAllIssuances();
    const users = await getAllUsers();
    
    if(document.getElementById('totalDocs')) {
        document.getElementById('totalDocs').textContent = docs.length;
    }
    if(document.getElementById('totalUsers')) {
        document.getElementById('totalUsers').textContent = users.length;
    }
    if(document.getElementById('totalIssuances')) {
        document.getElementById('totalIssuances').textContent = issuances.length;
    }
    
    // Count pending issuances
    const pendingCount = issuances.filter(i => i.status === 'Pending').length;
    if(document.getElementById('pendingIssuance')) {
        document.getElementById('pendingIssuance').textContent = pendingCount;
    }
    
    // Issuance this month
    const currentM = new Date().getMonth();
    const count = issuances.filter(i => new Date(i.issuanceDate).getMonth() === currentM).length;
    if(document.getElementById('issuedThisMonth')) {
        document.getElementById('issuedThisMonth').textContent = count;
    }
    
    // Update dashboard stat cards (Processed and Pending)
    if(document.getElementById('processedDocs')) {
        const processedCount = issuances.filter(i => i.status === 'Issued').length;
        document.getElementById('processedDocs').textContent = processedCount;
    }
    if(document.getElementById('pendingDocs')) {
        document.getElementById('pendingDocs').textContent = pendingCount;
    }
    
    // Update dashboard charts
    updateDashboardCharts(docs, issuances);
}

// --- Dashboard Charts ---
let charts = {
    docTypes: null,
    status: null,
    trend: null,
    accuracy: null
};

// --- Initialize Dashboard Charts ---
function initializeDashboardCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    
    // Chart 1: Document Types Distribution (Pie Chart)
    const docTypesCtx = document.getElementById('docTypesChart');
    if (docTypesCtx) {
        charts.docTypes = new Chart(docTypesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Birth Certificates', 'Death Certificates', 'Marriage Licenses'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#3498db', '#e74c3c', '#9b59b6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Chart 2: Processing Status (Pie Chart)
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        charts.status = new Chart(statusCtx, {
            type: 'pie',
            data: {
                labels: ['Issued', 'Pending'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#27ae60', '#f39c12'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Chart 3: Monthly Upload Trend (Line Chart)
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
        charts.trend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: getLast6Months(),
                datasets: [{
                    label: 'Documents Uploaded',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
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
    
    // Chart 4: OCR Accuracy Rate (Bar Chart)
    const accuracyCtx = document.getElementById('accuracyChart');
    if (accuracyCtx) {
        charts.accuracy = new Chart(accuracyCtx, {
            type: 'bar',
            data: {
                labels: ['Birth', 'Death', 'Marriage'],
                datasets: [{
                    label: 'OCR Accuracy (%)',
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
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
}

// --- Helper: Get Last 6 Months Labels ---
function getLast6Months() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleDateString('en-US', { month: 'short' }));
    }
    return months;
}

// --- Update Dashboard Charts with Data ---
function updateDashboardCharts(docs, issuances) {
    // Initialize charts if not already done
    if (!charts.docTypes) {
        initializeDashboardCharts();
    }
    
    // 1. Document Types Distribution
    if (charts.docTypes && docs) {
        const birthCount = docs.filter(d => d.type === 'birth').length;
        const deathCount = docs.filter(d => d.type === 'death').length;
        const marriageCount = docs.filter(d => d.type === 'marriage').length;
        
        charts.docTypes.data.datasets[0].data = [birthCount, deathCount, marriageCount];
        charts.docTypes.update();
    }
    
    // 2. Processing Status (from issuances)
    if (charts.status && issuances) {
        const issuedCount = issuances.filter(i => i.status === 'Issued').length;
        const pendingCount = issuances.filter(i => i.status === 'Pending').length;
        
        charts.status.data.datasets[0].data = [issuedCount, pendingCount];
        charts.status.update();
    }
    
    // 3. Monthly Upload Trend
    if (charts.trend && docs) {
        const monthlyData = getMonthlyDocumentCounts(docs);
        charts.trend.data.datasets[0].data = monthlyData;
        charts.trend.update();
    }
    
    // 4. OCR Accuracy Rate (simulated based on document processing)
    if (charts.accuracy && docs) {
        const accuracyData = calculateOCRAccuracy(docs);
        charts.accuracy.data.datasets[0].data = accuracyData;
        charts.accuracy.update();
    }
}

// --- Helper: Get Monthly Document Counts ---
// FIXED: Changed doc.dateAdded to doc.date to match database schema
function getMonthlyDocumentCounts(docs) {
    const monthlyCounts = [0, 0, 0, 0, 0, 0];
    const now = new Date();
    
    docs.forEach(doc => {
        if (doc.date) {
            const docDate = new Date(doc.date);
            // Check if the date is valid
            if (!isNaN(docDate.getTime())) {
                const monthDiff = (now.getFullYear() - docDate.getFullYear()) * 12 + (now.getMonth() - docDate.getMonth());
                if (monthDiff >= 0 && monthDiff < 6) {
                    monthlyCounts[5 - monthDiff]++;
                }
            }
        }
    });
    
    return monthlyCounts;
}

// --- Helper: Calculate OCR Accuracy (simulated based on documents with extracted data) ---
function calculateOCRAccuracy(docs) {
    // In a real application, this would calculate actual OCR accuracy
    // For now, we'll simulate based on whether documents have complete data
    const birthDocs = docs.filter(d => d.type === 'birth');
    const deathDocs = docs.filter(d => d.type === 'death');
    const marriageDocs = docs.filter(d => d.type === 'marriage');
    
    // Simulate accuracy (in real app, compare extracted vs verified data)
    const birthAccuracy = birthDocs.length > 0 ? Math.min(95, 70 + Math.random() * 25) : 0;
    const deathAccuracy = deathDocs.length > 0 ? Math.min(95, 70 + Math.random() * 25) : 0;
    const marriageAccuracy = marriageDocs.length > 0 ? Math.min(95, 70 + Math.random() * 25) : 0;
    
    return [birthAccuracy, deathAccuracy, marriageAccuracy];
}

// --- Initialize Dashboard ---
function initializeDashboard() {
    initializeDashboardCharts();
    updateAllStatistics();
}

// --- Open Delete Issuance Modal ---
function openDeleteIssuanceModal(id, certNumber) {
    // Remove existing modal if any
    const existing = document.getElementById('deleteIssuanceModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div id="deleteIssuanceModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 10px; max-width: 420px; width: 100%; padding: 30px; position: relative;">
                <button onclick="closeDeleteIssuanceModal()" style="position: absolute; top: 15px; right: 15px; border: none; background: none; font-size: 20px; cursor: pointer;">✕</button>
                
                <h2 style="border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; color: #e74c3c;">Delete Certificate</h2>
                
                <p style="margin: 0 0 10px 0; color: #333;">
                    You are about to delete:
                    <strong>Certificate No: ${certNumber || id}</strong>
                </p>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 13px;">
                    This action cannot be undone. Enter your Super Admin password to confirm.
                </p>

                <form id="deleteIssuanceForm" onsubmit="handleConfirmDeleteIssuance(event, ${id})">
                    <div class="form-field">
                        <label>Super Admin Password *</label>
                        <input type="password" id="deleteIssuancePassword" placeholder="Enter your password" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>

                    <p id="deleteIssuanceError" style="display: none; margin-top: 10px; color: #c0392b; font-size: 13px;"></p>

                    <div style="display: flex; gap: 10px; margin-top: 25px;">
                        <button id="confirmDeleteIssuanceBtn" type="submit" class="btn-primary" style="flex: 1; background: #e74c3c;">Confirm Delete</button>
                        <button type="button" onclick="closeDeleteIssuanceModal()" class="btn-primary" style="flex: 1; background: #95a5a6;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- Close Delete Issuance Modal ---
function closeDeleteIssuanceModal() {
    const modal = document.getElementById('deleteIssuanceModal');
    if (modal) modal.remove();
}

// --- Handle Confirm Delete Issuance ---
async function handleConfirmDeleteIssuance(event, id) {
    event.preventDefault();

    const passwordInput = document.getElementById('deleteIssuancePassword');
    const errorText = document.getElementById('deleteIssuanceError');
    const confirmBtn = document.getElementById('confirmDeleteIssuanceBtn');

    if (!passwordInput || !errorText || !confirmBtn) return;

    const password = passwordInput.value.trim();
    if (!password) {
        errorText.textContent = 'Password is required.';
        errorText.style.display = 'block';
        return;
    }

    errorText.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting...';

    try {
        // Verify the current user's password
        const response = await fetch('http://localhost:5000/api/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: currentUser.id, 
                password: password 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Password verified, now delete the issuance
            const deleteResult = await deleteIssuance(id);
            
            if (deleteResult.success) {
                closeDeleteIssuanceModal();
                // Reload the table
                loadIssuanceData();
                // Show success modal
                showSuccessModal('Certificate has been deleted successfully!');
            } else {
                errorText.textContent = deleteResult.error || 'Failed to delete certificate. Please try again.';
                errorText.style.display = 'block';
            }
        } else {
            errorText.textContent = data.message || 'Invalid password. Please try again.';
            errorText.style.display = 'block';
        }
    } catch (error) {
        console.error('Error deleting issuance:', error);
        errorText.textContent = 'Failed to connect to server. Make sure the server is running.';
        errorText.style.display = 'block';
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Delete';
    }
}

// ==========================================
// NEW FUNCTIONS FOR PRINT SELECTED/ALL
// ==========================================

// --- Toggle Select All Checkboxes ---
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.issuance-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// --- Update Select All Checkbox State ---
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.issuance-checkbox');
    
    if (checkboxes.length === 0) return;
    
    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
    const someChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);
    
    if (allChecked) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (someChecked) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

// --- Get Selected Issuance IDs ---
function getSelectedIssuanceIds() {
    const checkboxes = document.querySelectorAll('.issuance-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => parseInt(checkbox.value));
}

// --- Print Selected Issuance Records ---
async function printSelectedIssuance() {
    const selectedIds = getSelectedIssuanceIds();
    
    if (selectedIds.length === 0) {
        alert('Please select at least one certificate to print.');
        return;
    }
    
    console.log('Printing selected issuance records:', selectedIds);
    
    try {
        const w = window.open('', '_blank');
        if (!w) {
            alert('Please allow popups to print');
            return;
        }
        
        const records = [];
        for (const id of selectedIds) {
            const record = await getIssuanceById(id);
            if (record && !record.error) {
                records.push(record);
            }
        }
        
        if (records.length === 0) {
            alert('No records found for printing.');
            w.close();
            return;
        }
        
        let certificatesHTML = '';
        records.forEach((record, index) => {
            certificatesHTML += `
                <div style="page-break-after: ${index < records.length - 1 ? 'always' : 'none'};">
                    <h1>CERTIFICATE OF ${record.type ? record.type.toUpperCase() : 'N/A'}</h1>
                    <p>Civil Registry of Naic, Cavite</p>
                    <hr>
                    <div style="text-align: left; margin: 50px;">
                        <p><strong>Cert No:</strong> ${record.certNumber || 'N/A'}</p>
                        <p><strong>Name:</strong> ${record.name || 'N/A'}</p>
                        <p><strong>Barangay:</strong> ${record.barangay || 'N/A'}</p>
                        <p><strong>Date Issued:</strong> ${record.issuanceDate || 'N/A'}</p>
                        <p><strong>Status:</strong> ${record.status || 'N/A'}</p>
                    </div>
                </div>
            `;
        });
        
        w.document.write(`
            <html>
            <head>
                <title>Print Certificates</title>
                <style>
                    body {
                        font-family: serif;
                        padding: 40px;
                        text-align: center;
                        border: 5px double black;
                    }
                    @media print {
                        body { border: none; }
                    }
                </style>
            </head>
            <body>
                ${certificatesHTML}
                <script>setTimeout(() => window.print(), 500);</script>
            </body>
            </html>
        `);
        w.document.close();
    } catch (error) {
        console.error('Error in printSelectedIssuance:', error);
        alert('Error printing documents: ' + error.message);
    }
}

// --- Print All Issuance Records ---
async function printAllIssuance() {
    console.log('Printing all issuance records');
    
    try {
        const records = await getAllIssuances();
        
        if (!records || records.length === 0) {
            alert('No records found to print.');
            return;
        }
        
        const w = window.open('', '_blank');
        if (!w) {
            alert('Please allow popups to print');
            return;
        }
        
        let certificatesHTML = '';
        records.forEach((record, index) => {
            certificatesHTML += `
                <div style="page-break-after: ${index < records.length - 1 ? 'always' : 'none'};">
                    <h1>CERTIFICATE OF ${record.type ? record.type.toUpperCase() : 'N/A'}</h1>
                    <p>Civil Registry of Naic, Cavite</p>
                    <hr>
                    <div style="text-align: left; margin: 50px;">
                        <p><strong>Cert No:</strong> ${record.certNumber || 'N/A'}</p>
                        <p><strong>Name:</strong> ${record.name || 'N/A'}</p>
                        <p><strong>Barangay:</strong> ${record.barangay || 'N/A'}</p>
                        <p><strong>Date Issued:</strong> ${record.issuanceDate || 'N/A'}</p>
                        <p><strong>Status:</strong> ${record.status || 'N/A'}</p>
                    </div>
                </div>
            `;
        });
        
        w.document.write(`
            <html>
            <head>
                <title>Print All Certificates</title>
                <style>
                    body {
                        font-family: serif;
                        padding: 40px;
                        text-align: center;
                        border: 5px double black;
                    }
                    @media print {
                        body { border: none; }
                    }
                </style>
            </head>
            <body>
                ${certificatesHTML}
                <script>setTimeout(() => window.print(), 500);</script>
            </body>
            </html>
        `);
        w.document.close();
    } catch (error) {
        console.error('Error in printAllIssuance:', error);
        alert('Error printing documents: ' + error.message);
    }
}

// ==========================================
// NEW FUNCTIONS FOR TOGGLE CHECKBOXES & DELETE SELECTED
// ==========================================

// --- Track checkbox visibility state ---
let checkboxesVisible = false;

// --- Toggle Checkboxes Visibility ---
function toggleCheckboxes() {
    const checkboxes = document.querySelectorAll('.issuance-checkbox');
    const headerCheckbox = document.getElementById('selectAllCheckbox');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const toggleBtn = document.getElementById('toggleCheckboxesBtn');
    
    checkboxesVisible = !checkboxesVisible;
    
    checkboxes.forEach(checkbox => {
        // Toggle on the checkbox-container (label)
        const container = checkbox.closest('.checkbox-container');
        if (container) {
            if (checkboxesVisible) {
                container.classList.remove('checkbox-hidden');
            } else {
                container.classList.add('checkbox-hidden');
            }
        }
        // Also toggle on the parent td element
        const td = checkbox.closest('td');
        if (td) {
            if (checkboxesVisible) {
                td.classList.remove('checkbox-hidden');
            } else {
                td.classList.add('checkbox-hidden');
            }
        }
    });
    
    // Also toggle the header checkbox
    if (headerCheckbox) {
        const headerContainer = headerCheckbox.closest('.checkbox-container');
        if (headerContainer) {
            if (checkboxesVisible) {
                headerContainer.classList.remove('checkbox-hidden');
            } else {
                headerContainer.classList.add('checkbox-hidden');
            }
        }
        // Toggle on the parent th element
        const th = headerCheckbox.closest('th');
        if (th) {
            if (checkboxesVisible) {
                th.classList.remove('checkbox-hidden');
            } else {
                th.classList.add('checkbox-hidden');
            }
        }
        // Uncheck and reset when hiding
        if (!checkboxesVisible) {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = false;
            checkboxes.forEach(cb => cb.checked = false);
        }
    }
    
    // Show/hide the Delete Selected button based on selection
    updateDeleteSelectedButton();
    
    // Update toggle button - change background color based on state
    if (toggleBtn) {
        if (checkboxesVisible) {
            toggleBtn.style.background = '#27ae60'; // Green when in edit mode (checkboxes visible)
        } else {
            toggleBtn.style.background = '#9b59b6'; // Purple when not in edit mode
        }
    }
}

// --- Update Delete Selected Button Visibility ---
function updateDeleteSelectedButton() {
    const selectedIds = getSelectedIssuanceIds();
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    
    if (deleteSelectedBtn) {
        if (selectedIds.length > 0 && checkboxesVisible) {
            deleteSelectedBtn.style.display = 'inline-flex';
        } else {
            deleteSelectedBtn.style.display = 'none';
        }
    }
}

// --- Delete Selected Issuance Records ---
function deleteSelectedIssuance() {
    const selectedIds = getSelectedIssuanceIds();
    
    if (selectedIds.length === 0) {
        alert('Please select at least one certificate to delete.');
        return;
    }
    
    // Open confirmation modal
    openDeleteSelectedModal(selectedIds);
}

// --- Open Delete Selected Modal ---
function openDeleteSelectedModal(selectedIds) {
    // Remove existing modal if any
    const existing = document.getElementById('deleteSelectedModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div id="deleteSelectedModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 10px; max-width: 420px; width: 100%; padding: 30px; position: relative;">
                <button onclick="closeDeleteSelectedModal()" style="position: absolute; top: 15px; right: 15px; border: none; background: none; font-size: 20px; cursor: pointer;">✕</button>
                
                <h2 style="border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; color: #e74c3c;">Delete Multiple Certificates</h2>
                
                <p style="margin: 0 0 10px 0; color: #333;">
                    You are about to delete <strong>${selectedIds.length}</strong> certificate(s).
                </p>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 13px;">
                    This action cannot be undone. Enter your Super Admin password to confirm.
                </p>

                <form id="deleteSelectedForm" onsubmit="handleConfirmDeleteSelected(event, ${JSON.stringify(selectedIds).replace(/"/g, '"')})">
                    <div class="form-field">
                        <label>Super Admin Password *</label>
                        <input type="password" id="deleteSelectedPassword" placeholder="Enter your password" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>

                    <p id="deleteSelectedError" style="display: none; margin-top: 10px; color: #c0392b; font-size: 13px;"></p>

                    <div style="display: flex; gap: 10px; margin-top: 25px;">
                        <button id="confirmDeleteSelectedBtn" type="submit" class="btn-primary" style="flex: 1; background: #e74c3c;">Confirm Delete (${selectedIds.length})</button>
                        <button type="button" onclick="closeDeleteSelectedModal()" class="btn-primary" style="flex: 1; background: #95a5a6;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- Close Delete Selected Modal ---
function closeDeleteSelectedModal() {
    const modal = document.getElementById('deleteSelectedModal');
    if (modal) modal.remove();
}

// --- Handle Confirm Delete Selected ---
async function handleConfirmDeleteSelected(event, selectedIds) {
    event.preventDefault();

    const passwordInput = document.getElementById('deleteSelectedPassword');
    const errorText = document.getElementById('deleteSelectedError');
    const confirmBtn = document.getElementById('confirmDeleteSelectedBtn');

    if (!passwordInput || !errorText || !confirmBtn) return;

    const password = passwordInput.value.trim();
    if (!password) {
        errorText.textContent = 'Password is required.';
        errorText.style.display = 'block';
        return;
    }

    errorText.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting...';

    try {
        // Verify the current user's password
        const response = await fetch('http://localhost:5000/api/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: currentUser.id, 
                password: password 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Password verified, now delete all selected issuances
            let deletedCount = 0;
            let failedCount = 0;
            
            for (const id of selectedIds) {
                try {
                    const deleteResult = await deleteIssuance(id);
                    if (deleteResult.success) {
                        deletedCount++;
                    } else {
                        failedCount++;
                    }
                } catch (err) {
                    console.error('Error deleting issuance ' + id, err);
                    failedCount++;
                }
            }
            
            closeDeleteSelectedModal();
            
            // Reload the table
            loadIssuanceData();
            
            // Show success message
            if (failedCount === 0) {
                showSuccessModal(`Successfully deleted ${deletedCount} certificate(s)!`);
            } else {
                showSuccessModal(`Deleted ${deletedCount} certificate(s). ${failedCount} failed.`);
            }
        } else {
            errorText.textContent = data.message || 'Invalid password. Please try again.';
            errorText.style.display = 'block';
        }
    } catch (error) {
        console.error('Error deleting issuances:', error);
        errorText.textContent = 'Failed to connect to server. Make sure the server is running.';
        errorText.style.display = 'block';
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = `Confirm Delete (${selectedIds.length})`;
    }
}
