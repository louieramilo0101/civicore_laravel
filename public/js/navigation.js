// ==========================================
// NAVIGATION - Page Navigation
// ==========================================

// --- Menu Link Click Handlers ---
document.querySelectorAll('.menu-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = e.target.closest('a').dataset.page + 'Page';
        navigateToPage(pageId);
    });
});

// --- Navigate to Specific Page ---
function navigateToPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show the selected page
    document.getElementById(pageId).classList.add('active');
    
    // Update menu active state
    updateMenuActive();
    
    // Update page title
    updatePageTitle();
    
    // Load page-specific data
    if (pageId === 'dashboardPage') {
        setTimeout(updateAllStatistics, 100);
    }
    if (pageId === 'uploadPage') {
        loadDocuments();
    }
    if (pageId === 'issuancePage') {
        initIssuancePage();
    }
    if (pageId === 'accountsPage') {
        loadAccounts();
        loadPermissions();
    }
    if (pageId === 'mappingPage') {
        setTimeout(() => {
            const mapContainer = document.getElementById('mapContainer');
            if (mapContainer) mapContainer.style.display = 'block';
            setTimeout(initializeMappingPage, 200);
        }, 100);
    }
}

// --- Update Active Menu Item ---
function updateMenuActive() {
    const activePage = document.querySelector('.page.active').id;
    const pageMap = {
        'dashboardPage': 'dashboard', 
        'uploadPage': 'upload', 
        'issuancePage': 'issuance', 
        'mappingPage': 'mapping', 
        'accountsPage': 'accounts'
    };
    const key = pageMap[activePage];
    
    document.querySelectorAll('.menu-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === key) {
            link.classList.add('active');
        }
    });
}

// --- Update Page Title ---
function updatePageTitle() {
    const titleMap = { 
        'dashboardPage': 'Dashboard', 
        'uploadPage': 'Upload Document', 
        'issuancePage': 'Certificate Issuance', 
        'mappingPage': 'Geospatial Analytics', 
        'accountsPage': 'User Management' 
    };
    const activePage = document.querySelector('.page.active').id;
    document.getElementById('pageTitle').textContent = titleMap[activePage] || 'Page';
}

// --- Go Back Function (for OCR pages) ---
function goBack() {
    navigateToPage('uploadPage');
}
