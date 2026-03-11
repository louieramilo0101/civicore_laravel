// ==========================================
// API LAYER - MySQL Database via Node.js Server
// ==========================================

const API_BASE = 'http://localhost:8000';

// Documents API
async function getAllDocuments() {
    const response = await fetch(`${API_BASE}/api/documents`);
    return await response.json();
}

async function saveDocument(doc) {
    const response = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
    });
    return await response.json();
}

async function deleteDocument(id) {
    const response = await fetch(`${API_BASE}/api/documents/${id}`, { method: 'DELETE' });
    return await response.json();
}

// File upload function with better error handling
async function uploadDocument(file, docType, personName, barangay) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    formData.append('personName', personName);
    formData.append('barangay', barangay);
    
    try {
        const response = await fetch(`${API_BASE}/api/documents/upload`, {
            method: 'POST',
            body: formData
        });
        
        // Check if response is OK
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// OCR Processing API - EasyOCR
async function processOCR(filePath, languages = 'en,tl') {
    const response = await fetch(`${API_BASE}/api/ocr/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, languages })
    });
    return await response.json();
}

// OCR Processing by Document ID (for database-stored files)
async function processOCRById(documentId, languages = 'en,tl') {
    const response = await fetch(`${API_BASE}/api/ocr/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, languages })
    });
    return await response.json();
}

// Document Download/View from Database
async function downloadDocument(id) {
    const response = await fetch(`${API_BASE}/api/documents/download/${id}`);
    return response;
}

// Issuances API
async function getAllIssuances() {
    const response = await fetch(`${API_BASE}/api/issuances`);
    return await response.json();
}

async function getIssuanceById(id) {
    const response = await fetch(`${API_BASE}/api/issuances/${id}`);
    return await response.json();
}

async function saveIssuance(record) {
    const response = await fetch(`${API_BASE}/api/issuances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
    });
    return await response.json();
}

async function getNextCertNumber(type) {
    const response = await fetch(`${API_BASE}/api/issuances/next-cert-number/${type}`);
    return await response.json();
}

async function deleteIssuance(id) {
    const response = await fetch(`${API_BASE}/api/issuances/${id}`, {
        method: 'DELETE'
    });
    return await response.json();
}

// Barangays API
async function getAllBarangays() {
    const response = await fetch(`${API_BASE}/api/barangays`);
    return await response.json();
}

// Users API
async function getAllUsers() {
    const response = await fetch(`${API_BASE}/api/users`);
    return await response.json();
}

async function getUserById(id) {
    const response = await fetch(`${API_BASE}/api/users/${id}`);
    return await response.json();
}

async function updateUser(user) {
    const response = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: user.role, permissions: user.permissions })
    });
    return await response.json();
}

async function updateUserProfile(userId, name, email) {
    const response = await fetch(`${API_BASE}/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
    });
    return await response.json();
}

async function deleteUser(id, password) {
    const response = await fetch(`${API_BASE}/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    return await response.json();
}

async function verifyPassword(password) {
    const response = await fetch(`${API_BASE}/api/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    return await response.json();
}

// Templates API
async function getTemplates() {
    const response = await fetch(`${API_BASE}/api/templates`);
    return await response.json();
}

async function updateTemplate(type, content) {
    const response = await fetch(`${API_BASE}/api/templates/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
    return await response.json();
}
