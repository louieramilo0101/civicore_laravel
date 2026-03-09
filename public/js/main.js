// ==========================================
// MAIN - Initialization & Configuration
// ==========================================

// Global constants
const today = new Date();
const currentYear = today.getFullYear();
const currentDateStr = new Date().toISOString().split('T')[0];

// Global charts object
let charts = {};
let printRecords = [];

// ==========================================
// PASSWORD VISIBILITY TOGGLE
// ==========================================

/**
 * Toggle password visibility for login forms
 * @param {string} inputId - The ID of the password input field
 * @param {HTMLElement} toggleBtn - The toggle button element
 */
function togglePasswordVisibility(inputId, toggleBtn) {
    console.log('togglePasswordVisibility called', { inputId, toggleBtn });
    
    try {
        const passwordInput = document.getElementById(inputId);
        
        if (passwordInput) {
            console.log('Password input found, current type:', passwordInput.type);
            // Toggle between password and text type
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                toggleBtn.classList.add("active");
                console.log('Password visibility: ON');
            } else {
                passwordInput.type = "password";
                toggleBtn.classList.remove("active");
                console.log('Password visibility: OFF');
            }
        } else {
            console.error('Password input not found for id:', inputId);
        }
    } catch (error) {
        console.error('Error in togglePasswordVisibility:', error);
    }
}

// Make function globally accessible
window.togglePasswordVisibility = togglePasswordVisibility;

// ==========================================
// INITIALIZATION ON PAGE LOAD
// ==========================================

// Any code that needs to run on page load can go here
// The scripts are loaded in order, so db, auth, navigation, etc. are already available

console.log("CiviCORE - All modules loaded successfully!");
