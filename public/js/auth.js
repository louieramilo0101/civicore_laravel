// ==========================================
// AUTHENTICATION - Login, Logout & Access Control
// ==========================================

let currentUser = null;

// ==========================================
// ERROR MODAL FUNCTIONS
// ==========================================
function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    const messageEl = document.getElementById('errorModalMessage');
    if (messageEl) {
        messageEl.textContent = message || 'Invalid email or password';
    }
    if (modal) {
        modal.classList.add('active');
    }
}

function closeErrorModal() {
    const modal = document.getElementById('errorModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('errorModal');
    if (e.target === modal) {
        closeErrorModal();
    }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeErrorModal();
    }
});

// ==========================================
// SESSION VALIDATION ON PAGE LOAD
// ==========================================
async function validateSession() {
    // ALWAYS validate session with server to get fresh user data from database
    // This ensures permissions are always up-to-date - no caching issues!
    // Session is maintained via cookies (express-session), no localStorage needed
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (data.success && data.user) {
            // Use fresh user data from server (includes latest permissions)
            currentUser = data.user;
            console.log('Session validated with server, fresh permissions:', currentUser.permissions);
            loginUser();
            return true;
        } else {
            // Session is invalid
            console.log('No active session');
            currentUser = null;
            return false;
        }
    } catch (err) {
        console.error('Error validating session with server:', err);
        currentUser = null;
        return false;
    }
}

// ==========================================
// DOMContentLoaded Listener
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved user in localStorage
    validateSession();
});

// ==========================================
// LOGIN PAGE
// ==========================================
function toLoginPage() {
    document.getElementById('landingContainer').classList.remove('active');
    document.getElementById('loginContainer').classList.add('active');
    document.getElementById('email').focus();
}

// ==========================================
// LANDING PAGE (BACK TO HOME)
// ==========================================
function toLandingPage() {
    // Clear the current user session
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // Show landing page, hide login and main containers
    document.getElementById('landingContainer').classList.add('active');
    document.getElementById('loginContainer').classList.remove('active');
    document.getElementById('mainContainer').classList.remove('active');
    
    // Reset login form
    document.getElementById('loginForm').reset();
    
    // Reset password visibility toggle - ensure password is hidden
    const passwordInput = document.getElementById('password');
    const toggleBtn = passwordInput ? passwordInput.closest('.password-input-wrapper').querySelector('.password-toggle-btn') : null;
    if (passwordInput) {
        passwordInput.type = "password";
    }
    if (toggleBtn) {
        toggleBtn.classList.remove("active");
    }
}

// ==========================================
// LOGIN FORM SUBMISSION HANDLER
// ==========================================
function handleLoginSubmit(e) {
    if (e) {
        e.preventDefault();
    }
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log('Login attempt for:', email);

    // Use fetch API for login
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Login response:', data);
        
        if (data.success) {
            // Save user to localStorage (persists after browser close)
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            loginUser();
        } else {
            showErrorModal(data.message || 'Invalid email or password');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showErrorModal('Could not connect to the server. Make sure node server.js is running!');
    });
}

// Attach login form event listener - runs immediately when script loads
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    // Remove any existing event listeners to avoid duplicates
    loginForm.removeEventListener('submit', handleLoginSubmit);
    // Add the event listener
    loginForm.addEventListener('submit', handleLoginSubmit);
    console.log('Login form event listener attached');
} else {
    console.error('Login form not found!');
    // Fallback: try to attach when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', handleLoginSubmit);
            console.log('Login form event listener attached (fallback)');
        }
    });
}

// ==========================================
// PASSWORD TOGGLE BUTTON EVENT LISTENER
// ==========================================
// Add event listener for password toggle button when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const passwordToggleBtn = document.querySelector('.password-toggle-btn');
    if (passwordToggleBtn) {
        passwordToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                // Toggle password visibility
                if (passwordInput.type === "password") {
                    passwordInput.type = "text";
                    this.classList.add("active");
                    console.log('Password visibility: ON');
                } else {
                    passwordInput.type = "password";
                    this.classList.remove("active");
                    console.log('Password visibility: OFF');
                }
            } else {
                console.error('Password input not found');
            }
        });
        console.log('Password toggle button event listener attached');
    } else {
        console.error('Password toggle button not found!');
    }
});

// ==========================================
// LOGIN USER
// ==========================================
async function loginUser() {
    document.getElementById('landingContainer').classList.remove('active');
    document.getElementById('loginContainer').classList.remove('active');
    document.getElementById('mainContainer').classList.add('active');
    
    updateUserInfo();
    checkAdminAccess();
    
    // Initialize UI - this fixes Bug 2: ensures fresh UI state after login
    await initializeAppUI();
    
    // Load ALL data directly from API
    initializeDashboard();
    loadDocuments();
    initializeOCR();
}

// ==========================================
// LOGOUT
// ==========================================
document.getElementById('logoutBtn').addEventListener('click', async () => {
    // Clear localStorage to log out
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // Show landing page
    document.getElementById('mainContainer').classList.remove('active');
    document.getElementById('loginContainer').classList.remove('active');
    document.getElementById('landingContainer').classList.add('active');
    document.getElementById('loginForm').reset();
    
    // Reset password visibility toggle - ensure password is hidden
    const passwordInput = document.getElementById('password');
    const toggleBtn = passwordInput ? passwordInput.closest('.password-input-wrapper').querySelector('.password-toggle-btn') : null;
    if (passwordInput) {
        passwordInput.type = "password";
    }
    if (toggleBtn) {
        toggleBtn.classList.remove("active");
    }
});

// ==========================================
// PERMISSION & ACCESS CONTROL
// ==========================================
function checkAdminAccess() {
    const accountsLink = document.getElementById('accountsMenuLink');
    const uploadLink = document.querySelector('[data-page="upload"]');
    const mappingLink = document.querySelector('[data-page="mapping"]');
    const addUserBtn = document.getElementById('addUserBtn');
    const editAccountBtn = document.getElementById('editAccountBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    
    // 1. Account Management - ALL users should be able to see this to manage their own account
    // Show for everyone: Super Admin, Admin, and regular Users
    if (accountsLink) accountsLink.style.display = 'block';
    
    // 2. Upload (Admin/Super Admin)
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Super Admin') {
        if (uploadLink) uploadLink.closest('li').style.display = 'none';
    } else {
        if (uploadLink) uploadLink.closest('li').style.display = 'block';
    }
    
    // 3. Mapping (Permissions Check)
    if (!currentUser.permissions.includes('Mapping Analytics')) {
        if (mappingLink) mappingLink.closest('li').style.display = 'none';
    } else {
        if (mappingLink) mappingLink.closest('li').style.display = 'block';
    }
    
    // 4. Add User Button - ONLY Super Admin can see this
    if (currentUser.role === 'Super Admin' && currentUser.permissions.includes('Manage Users')) {
        if (addUserBtn) addUserBtn.style.display = 'block';
    } else {
        if (addUserBtn) addUserBtn.style.display = 'none';
    }
    
    // 5. Edit Account Button - Show if user has permission to manage users OR for all users to edit their own account
    // All users should be able to edit their own account
    if (currentUser.permissions.includes('Manage Users')) {
        if (editAccountBtn) editAccountBtn.style.display = 'block';
    } else {
        // Check if user is logged in (they should be since we're in this function)
        if (editAccountBtn && currentUser) {
            // All logged-in users can edit their own account
            editAccountBtn.style.display = 'block';
        } else if (editAccountBtn) {
            editAccountBtn.style.display = 'none';
        }
    }
    
    // 6. Delete Account Button - Only Super Admin can delete accounts
    if (currentUser.role === 'Super Admin' && currentUser.permissions.includes('Manage Users')) {
        if (deleteAccountBtn) deleteAccountBtn.style.display = 'block';
    } else {
        if (deleteAccountBtn) deleteAccountBtn.style.display = 'none';
    }
}
