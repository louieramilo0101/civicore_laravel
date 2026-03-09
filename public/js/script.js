// ==========================================
// MAIN APPLICATION LOGIC
// Core functions that are not module-specific
// ==========================================

// Note: API functions are async and return Promises
// Import: <script src="js/api.js"></script> must be in index.html

// Note: Authentication functions are in auth.js
// User info functions are in userInfo.js
// Navigation functions are in navigation.js
// Map functions are in maps.js
// Issuance functions are in issuance.js

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize application when DOM is ready
    console.log('CiviCORE Application Loaded');
});

// Navigation is handled by navigation.js - do not duplicate here

// ==========================================
// SUCCESS MODAL FUNCTIONS
// ==========================================

/**
 * Show the success modal with a custom message
 * @param {string} message - The message to display
 */
function showSuccessModal(message) {
    const modal = document.getElementById('successModal');
    const messageEl = document.getElementById('successModalMessage');
    
    if (modal && messageEl) {
        messageEl.textContent = message;
        modal.classList.add('active');
    }
}

/**
 * Close the success modal
 */
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const successModal = document.getElementById('successModal');
    if (successModal && successModal.classList.contains('active')) {
        if (e.target === successModal) {
            closeSuccessModal();
        }
    }
    
    const errorModal = document.getElementById('errorModal');
    if (errorModal && errorModal.classList.contains('active')) {
        if (e.target === errorModal) {
            closeErrorModal();
        }
    }
});
