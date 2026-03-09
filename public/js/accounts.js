// ==========================================
// ACCOUNTS - User Management
// ==========================================

// Note: Uses API functions directly from api.js instead of db wrapper

// Track the currently selected user for the static buttons
let selectedUserForActions = null;

// Flag to prevent concurrent calls to loadAccounts
let isLoadingAccounts = false;

// Store pending edit data when password confirmation is needed
let pendingEditData = null;

// --- Initialize App UI (for Bug 2 Fix) ---
// This function resets all UI state and reinitializes the interface
// Call this after login and after role/permission changes
async function initializeAppUI() {
    console.log('Initializing App UI...');
    
    // Reset global UI state
    selectedUserForActions = null;
    
    // Clear account details
    const details = document.getElementById('accountDetailsContainer');
    if (details) details.innerHTML = '';
    
    // Reload accounts + permissions
    await loadAccounts();
    await loadPermissions();
    
    // Also re-check admin access for navigation elements
    if (typeof checkAdminAccess === 'function') {
        checkAdminAccess();
    }
    
    // Update user info display if exists
    if (typeof updateUserInfo === 'function') {
        updateUserInfo();
    }
    
    console.log('App UI initialized successfully');
}

// --- Load Accounts List ---
async function loadAccounts() {
    // Prevent concurrent calls
    if (isLoadingAccounts) {
        console.log('loadAccounts already in progress, skipping...');
        return;
    }
    
    isLoadingAccounts = true;
    
    const list = document.getElementById('accountsList');
    const accountsSidebar = document.querySelector('.accounts-sidebar');
    const permissionsSection = document.querySelector('#accountsPage > div:last-child');
    const addUserBtn = document.getElementById('addUserBtn');
    
    console.log('loadAccounts called - currentUser:', currentUser);
    
    if (!list) {
        console.error('accountsList element not found!');
        isLoadingAccounts = false;
        return;
    }
    
    list.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading accounts...</div>';
    
    // Get users from API based on role - Super Admin sees all, others only see themselves
    let users;
    const accountsContainer = document.querySelector('.accounts-container');
    
    try {
        if (currentUser.role === 'Super Admin') {
            console.log('Loading all users for Super Admin...');
            users = await getAllUsers();
            console.log('Users loaded:', users);
            
            // Show the user accounts list for Super Admin
            if (accountsSidebar) accountsSidebar.style.display = 'block';
            // Show permissions section for Super Admin
            if (permissionsSection) permissionsSection.style.display = 'block';
            // Show Add User button for Super Admin
            if (addUserBtn) addUserBtn.style.display = 'block';
            // Remove sidebar-hidden class for Super Admin
            if (accountsContainer) accountsContainer.classList.remove('sidebar-hidden');
        } else {
            // Non-Super Admin users can only see their own account
            users = [currentUser];
            // Hide the user accounts list for non-Super Admin
            if (accountsSidebar) accountsSidebar.style.display = 'none';
            // Show permissions section for non-Super Admin (but only shows their own permissions)
            if (permissionsSection) permissionsSection.style.display = 'block';
            // Hide Add User button for non-Super Admin
            if (addUserBtn) addUserBtn.style.display = 'none';
            // Add sidebar-hidden class for Admin/User to expand the details section
            if (accountsContainer) accountsContainer.classList.add('sidebar-hidden');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        list.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Error loading accounts. Please refresh the page.</div>';
        isLoadingAccounts = false;
        return;
    }
    
    // Clear the loading message
    list.innerHTML = '';
    
    if (!users || users.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No accounts found</div>';
        isLoadingAccounts = false;
        return;
    }
    
    // For non-Super Admin users, don't render a list - just show their own details
    if (currentUser.role !== 'Super Admin') {
        // Don't render list items for non-Super Admin
        // They can only see their own account
    } else {
        // Only render list for Super Admin
        users.forEach((user) => {
            const item = document.createElement('div');
            item.className = 'account-item';
            item.innerHTML = `<div class="account-name">${user.name}</div><div class="account-role">${user.role}</div>`;
            item.addEventListener('click', () => displayAccountDetails(user));
            list.appendChild(item);
        });
        
        console.log('Accounts rendered:', users.length, 'accounts');
        
        // Show the currently logged-in user's details by default
        if(users.length > 0) {
            const currentUserInList = users.find(u => u.id === currentUser.id);
            displayAccountDetails(currentUserInList || users[0]);
        }
    }
    
    // For non-Super Admin, display their own details
    if (currentUser.role !== 'Super Admin') {
        displayAccountDetails(currentUser);
    }
    
    // Reset the loading flag
    isLoadingAccounts = false;
}

// Flag to prevent concurrent calls to loadPermissions
let isLoadingPermissions = false;

// --- Load Permissions ---
// This shows the permissions of the currently selected user
async function loadPermissions(userId = null) {
    // Prevent concurrent calls
    if (isLoadingPermissions) {
        console.log('loadPermissions already in progress, skipping...');
        return;
    }
    
    isLoadingPermissions = true;
    
    const container = document.getElementById('permissionsContainer');
    if(!container) {
        console.error('permissionsContainer element not found!');
        isLoadingPermissions = false;
        return;
    }
    
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading permissions...</div>';
    
    // If no userId is provided, use the currently selected user
    let user = null;
    
    try {
        if (currentUser.role !== 'Super Admin') {
            // Non-Super Admin users can only see their own permissions
            user = currentUser;
        } else if (userId) {
            // Load specific user's permissions (Super Admin only)
            user = await getUserById(userId);
        } else if (selectedUserForActions) {
            // Use the currently selected user from the account list (Super Admin only)
            user = selectedUserForActions;
        } else {
            // Fallback to current logged in user
            user = currentUser;
        }
        
        if (!user) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No user selected</div>';
            isLoadingPermissions = false;
            return;
        }
        
    } catch (error) {
        console.error('Error loading permissions:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Error loading permissions. Please refresh the page.</div>';
        isLoadingPermissions = false;
        return;
    }
    
    // Ensure permissions is an array
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    
    // Clear the loading message and display the user's permissions
    container.innerHTML = `
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid var(--secondary-color);">
            <h4 style="margin: 0 0 10px 0; color: var(--primary-color);">${user.name}</h4>
            <p style="margin: 0 0 15px 0; color: #666; font-size: 13px;"><strong>Role:</strong> ${user.role}</p>
            <div style="background: white; padding: 15px; border-radius: 5px;">
                <strong style="color: var(--primary-color);">Permissions:</strong><br>
                <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;">
                    ${permissions.length > 0 ? permissions.map(perm => `
                        <span style="background: var(--secondary-color); color: white; padding: 5px 12px; border-radius: 15px; font-size: 12px;">${perm}</span>
                    `).join('') : '<span style="color: #999;">No permissions assigned</span>'}
                </div>
            </div>
        </div>
    `;
    
    console.log('Permissions loaded for user:', user.name);
    
    // Reset the loading flag
    isLoadingPermissions = false;
}

// --- Display Account Details ---
function displayAccountDetails(user) {
    const container = document.getElementById('accountDetailsContainer');
    if(!container) return;
    
    // Store selected user for static button actions
    selectedUserForActions = user;

    container.innerHTML = `
        <div class="detail-field"><label>Name:</label> ${user.name}</div>
        <div class="detail-field"><label>Email:</label> ${user.email}</div>
        <div class="detail-field"><label>Role:</label> ${user.role}</div>
    `;
    
    // Show/hide action buttons based on current user's permissions
    updateActionButtonsVisibility(user);
    
    // Update the permissions section to show the selected user's permissions
    loadPermissions();
}

// --- Update Action Buttons Visibility ---
function updateActionButtonsVisibility(targetUser) {
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const editAccountBtn = document.getElementById('editAccountBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const accountActions = document.getElementById('accountActions');
    
    if (!accountActions) return;
    
    // Current user can always change their own password
    const isSelf = currentUser.id === targetUser.id;
    
    // Check if current user can manage users (Super Admin with Manage Users permission)
    const canManageUsers = currentUser.role === 'Super Admin' && 
                          currentUser.permissions && 
                          currentUser.permissions.includes('Manage Users');
    
    // Show buttons based on permissions
    // Change Password: Always show for self, show for others if canManageUsers
    if (changePasswordBtn) {
        changePasswordBtn.style.display = (isSelf || canManageUsers) ? 'block' : 'none';
    }
    
    // Edit Account: Show if can manage users OR if editing own account
    if (editAccountBtn) {
        editAccountBtn.style.display = (isSelf || canManageUsers) ? 'block' : 'none';
    }
    
    // Delete Account: Only show for Super Admin with Manage Users permission, and cannot delete self
    if (deleteAccountBtn) {
        const canDelete = canManageUsers && !isSelf;
        deleteAccountBtn.style.display = canDelete ? 'block' : 'none';
    }
}

// --- Open Change Password Modal ---
async function openChangePasswordModal(userId) {
    // First try to get user from currentUser (if changing own password)
    let user = null;
    
    if (currentUser && currentUser.id === userId) {
        user = currentUser;
    } else {
        // For Super Admin changing other users' passwords, get from API
        user = await getUserById(userId);
    }
    
    if (!user) {
        showAlertModal('User Not Found', 'User not found. Please refresh the page and try again.', 'error');
        return;
    }

    // Create modal HTML
    const modalHTML = `
        <div id="changePasswordModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 10px; max-width: 400px; width: 100%; padding: 30px; position: relative;">
                <button onclick="closeChangePasswordModal()" style="position: absolute; top: 15px; right: 15px; border: none; background: none; font-size: 20px; cursor: pointer;">✕</button>
                
                <h2 style="border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; color: var(--primary-color);">Change Password</h2>
                
                <p style="margin-bottom: 20px; color: #666;">Changing password for: <strong>${user.name}</strong></p>
                
                <form id="changePasswordForm" onsubmit="handleChangePassword(event, ${user.id})">
                    <div class="form-field">
                        <label>Current Password *</label>
                        <input type="password" id="currentPassword" placeholder="Enter current password" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    
                    <div class="form-field" style="margin-top: 15px;">
                        <label>New Password *</label>
                        <input type="password" id="newPassword" placeholder="Enter new password" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    
                    <div class="form-field" style="margin-top: 15px;">
                        <label>Confirm New Password *</label>
                        <input type="password" id="confirmPassword" placeholder="Confirm new password" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    
                    <p style="margin-top: 10px; color: #666; font-size: 12px;">* Passwords must be at least 6 characters</p>
                    
                    <div style="display: flex; gap: 10px; margin-top: 25px;">
                        <button type="submit" class="btn-primary" style="flex: 1; background: var(--success-color);">Change Password</button>
                        <button type="button" onclick="closeChangePasswordModal()" class="btn-primary" style="flex: 1; background: #95a5a6;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existing = document.getElementById('changePasswordModal');
    if (existing) existing.remove();
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- Close Change Password Modal ---
function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.remove();
}

// --- Open Edit Account Confirmation Modal (for password verification) ---
function openEditAccountConfirmModal(user, onConfirm) {
    const existing = document.getElementById('editAccountConfirmModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div id="editAccountConfirmModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 10px; max-width: 420px; width: 100%; padding: 30px; position: relative;">
                <button onclick="closeEditAccountConfirmModal()" style="position: absolute; top: 15px; right: 15px; border: none; background: none; font-size: 20px; cursor: pointer;">✕</button>
                
                <h2 style="border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; color: #f39c12;">Confirm Account Edit</h2>
                
                <p style="margin: 0 0 10px 0; color: #333;">
                    You are about to edit the account:
                    <strong>${user.name}</strong> (${user.role})
                </p>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 13px;">
                    Enter your password to confirm this action.
                </p>

                <form id="editAccountConfirmForm" onsubmit="handleEditAccountConfirm(event, ${user.id}, '${onConfirm}')">
                    <div class="form-field">
                        <label>Your Password *</label>
                        <input type="password" id="editAccountConfirmPassword" placeholder="Enter your password" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>

                    <p id="editAccountConfirmError" style="display: none; margin-top: 10px; color: #c0392b; font-size: 13px;"></p>

                    <div style="display: flex; gap: 10px; margin-top: 25px;">
                        <button id="confirmEditAccountBtn" type="submit" class="btn-primary" style="flex: 1; background: #f39c12;">Confirm</button>
                        <button type="button" onclick="closeEditAccountConfirmModal()" class="btn-primary" style="flex: 1; background: #95a5a6;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeEditAccountConfirmModal() {
    const modal = document.getElementById('editAccountConfirmModal');
    if (modal) modal.remove();
}

async function handleEditAccountConfirm(event, userId, onConfirm) {
    event.preventDefault();

    const passwordInput = document.getElementById('editAccountConfirmPassword');
    const errorText = document.getElementById('editAccountConfirmError');
    const confirmBtn = document.getElementById('confirmEditAccountBtn');

    if (!passwordInput || !errorText || !confirmBtn) return;

    const password = passwordInput.value.trim();
    if (!password) {
        errorText.textContent = 'Password is required.';
        errorText.style.display = 'block';
        return;
    }

    errorText.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Confirming...';

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
            closeEditAccountConfirmModal();
            // Call the callback to proceed with the edit
            window[onConfirm](userId);
        } else {
            errorText.textContent = data.message || 'Invalid password. Please try again.';
            errorText.style.display = 'block';
        }
    } catch (error) {
        console.error('Error verifying password:', error);
        errorText.textContent = 'Failed to connect to server. Make sure the server is running.';
        errorText.style.display = 'block';
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm';
    }
}

// --- Open Edit Account Modal ---
async function openEditAccountModal(userId) {
    console.log('openEditAccountModal called with userId:', userId);
    
    // First try to get user from currentUser (if editing own profile)
    let user = null;
    
    if (currentUser && currentUser.id === userId) {
        user = currentUser;
        console.log('Using currentUser:', user);
    } else {
        // For Super Admin editing other users' profiles, get from API
        user = await getUserById(userId);
        console.log('Fetched user from API:', user);
    }
    
    if (!user) {
        showAlertModal('User Not Found', 'User not found. Please refresh the page and try again.', 'error');
        return;
    }

    // Check permissions
    const isSelf = currentUser.id === user.id;
    const isSuperAdmin = currentUser.role === 'Super Admin' && 
                        currentUser.permissions && 
                        currentUser.permissions.includes('Manage Users');
    
    console.log('Permission check:', { isSelf, isSuperAdmin, currentUserRole: currentUser.role });
    
    // Determine what can be edited:
    // - Super Admin can edit ANYONE (including role)
    // - Admin/User can only edit their OWN account (no role change)
    const canEdit = isSuperAdmin || isSelf;
    
    if (!canEdit) {
        showAlertModal('Permission Denied', 'You do not have permission to edit this account.', 'error');
        return;
    }

    // Show role dropdown ONLY if current user is Super Admin with Manage Users permission
    const showRoleDropdown = isSuperAdmin;

    // Build role dropdown HTML
    let roleDropdownHTML = '';
    if (showRoleDropdown) {
        roleDropdownHTML = `
            <div class="form-field" style="margin-top: 15px;">
                <label>Role *</label>
                <select id="editUserRole" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    <option value="Super Admin" ${user.role === 'Super Admin' ? 'selected' : ''}>Super Admin</option>
                    <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
                    <option value="User" ${user.role === 'User' ? 'selected' : ''}>User</option>
                </select>
            </div>
        `;
    }

    // Create modal HTML
    const modalHTML = `
        <div id="editAccountModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 10px; max-width: 450px; width: 90%; padding: 30px; position: relative; max-height: 90vh; overflow-y: auto;">
                <button onclick="closeEditAccountModal()" style="position: absolute; top: 15px; right: 15px; border: none; background: none; font-size: 20px; cursor: pointer;">✕</button>
                
                <h2 style="border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; color: var(--primary-color);">Edit Account</h2>
                
                <p style="margin-bottom: 20px; color: #666;">Editing: <strong>${user.name}</strong> (${user.role})</p>
                
                <!-- Edit Profile Form -->
                <form id="editAccountForm">
                    <input type="hidden" id="editUserId" value="${user.id}">
                    <div class="form-field">
                        <label>Full Name *</label>
                        <input type="text" id="editUserName" value="${user.name}" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    
                    <div class="form-field" style="margin-top: 15px;">
                        <label>Email *</label>
                        <input type="email" id="editUserEmail" value="${user.email}" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    
                    ${roleDropdownHTML}
                    
                    <div style="display: flex; gap: 10px; margin-top: 25px;">
                        <button type="button" onclick="handleEditAccountSubmit()" class="btn-primary" style="flex: 1; background: var(--success-color);">Save Changes</button>
                        <button type="button" onclick="closeEditAccountModal()" class="btn-primary" style="flex: 1; background: #95a5a6;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existing = document.getElementById('editAccountModal');
    if (existing) existing.remove();
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Modal added to page');
}

// Separate function to handle form submission
function handleEditAccountSubmit() {
    const userId = parseInt(document.getElementById('editUserId').value);
    const name = document.getElementById('editUserName').value;
    const email = document.getElementById('editUserEmail').value;
    const roleSelect = document.getElementById('editUserRole');
    const newRole = roleSelect ? roleSelect.value : null;
    
    console.log('handleEditAccountSubmit:', { userId, name, email, newRole });
    
    // Call the original handler
    handleEditAccount({ preventDefault: function() {} }, userId, name, email, newRole);
}

// --- Close Edit Account Modal ---
function closeEditAccountModal() {
    const modal = document.getElementById('editAccountModal');
    if (modal) modal.remove();
}

// --- Handle Edit Account Form Submission ---
async function handleEditAccount(event, userId, name, email, newRole) {
    // If called from handleEditAccountSubmit, event is a fake event object
    // If name and email are not passed (undefined), get them from the form
    
    // Only get values from form if they weren't passed as arguments
    if (name === undefined || email === undefined) {
        name = document.getElementById('editUserName').value;
        email = document.getElementById('editUserEmail').value;
        const roleSelect = document.getElementById('editUserRole');
        newRole = roleSelect ? roleSelect.value : null;
    }
    
    if (!name || !email) {
        showAlertModal('Validation Error', 'Please fill in all fields', 'error');
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlertModal('Validation Error', 'Please enter a valid email address', 'error');
        return;
    }
    
    // Check if current user is Super Admin with Manage Users permission
    const isSuperAdmin = currentUser.role === 'Super Admin' && 
                        currentUser.permissions && 
                        currentUser.permissions.includes('Manage Users');
    
    const isSelf = currentUser.id === userId;
    
    // Get the original user to check what is being changed
    let originalUser = currentUser;
    try {
        originalUser = await getUserById(userId);
    } catch (e) {
        console.error('Error fetching original user:', e);
    }
    
    // Store the pending edit data for use after password confirmation
    pendingEditData = {
        userId: userId,
        newRole: newRole,
        name: name,
        email: email
    };
    
    // ALWAYS require password confirmation for ALL account edits
    // This includes: editing own account, editing other users, changing roles
    console.log('handleEditAccount: Password confirmation required for all edits', { userId, isSelf, isSuperAdmin, newRole });
    
    // Open password confirmation modal before proceeding
    openEditAccountConfirmModal(originalUser, 'performEditAccountWithPendingData');
}

// --- Perform the actual edit ---
async function performEditAccount(userId, newRole, name, email) {
    try {
        // Update profile (name and email)
        const result = await updateUserProfile(userId, name, email);
        
        // If role was changed, update it through the API
        // The server will automatically assign the correct permissions based on the new role
        if (newRole) {
            const user = await getUserById(userId);
            if (user && user.role !== newRole) {
                // Server handles permissions automatically based on role
                await updateUser({ id: userId, role: newRole, permissions: null });
            }
        }
        
        if (result.success) {
            // Use the existing successModal from script.js
            showSuccessModal('Account has been updated successfully!');
            closeEditAccountModal();
            
            // Always fetch the FULL updated user from backend after any role change
            // This ensures role AND permissions are both updated correctly
            const freshUser = await getUserById(userId);
            
            // If it's the current user being edited, update currentUser and localStorage
            if (currentUser.id === userId) {
                currentUser = freshUser;
                // Also update localStorage to persist the change
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            
            // Fix #3: Display the updated user's details immediately after editing
            // This ensures the admin sees the updated info right away without needing to refresh
            if (selectedUserForActions && selectedUserForActions.id === userId) {
                selectedUserForActions = freshUser;
                displayAccountDetails(freshUser);
            }
            
            // Reinitialize UI to reflect new permissions (for all cases)
            await initializeAppUI();
        } else {
            showAlertModal('Error', result.message || 'Failed to update account. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error updating account:', error);
        showAlertModal('Connection Error', 'Failed to connect to server. Make sure the server is running.', 'error');
    }
}

// --- Perform edit with pending data (used after password confirmation) ---
async function performEditAccountWithPendingData(userId) {
    // Check if we have pending edit data
    if (!pendingEditData) {
        showAlertModal('Error', 'No pending edit data found. Please try again.', 'error');
        return;
    }
    
    // Get the data from pendingEditData
    const { newRole, name, email } = pendingEditData;
    
    // Clear the pending data
    pendingEditData = null;
    
    // Proceed with the edit
    await performEditAccount(userId, newRole, name, email);
}

// --- Handle Change Password Form Submission ---
async function handleChangePassword(event, userId) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlertModal('Validation Error', 'Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlertModal('Validation Error', 'New password and confirm password do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showAlertModal('Validation Error', 'Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:5000/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: userId, 
                currentPassword: currentPassword, 
                newPassword: newPassword 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Use the existing successModal from script.js
            showSuccessModal('Password has been changed successfully!');
            closeChangePasswordModal();
        } else {
            showAlertModal('Error', data.message || 'Failed to change password. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showAlertModal('Connection Error', 'Failed to connect to server. Make sure the server is running.', 'error');
    }
}

// --- Open Add User Modal ---
function openAddUserModal() {
    // Check if user has permission to manage users
    if (!currentUser.permissions.includes('Manage Users')) {
        showAlertModal('Permission Denied', 'You do not have permission to create new users.', 'error');
        return;
    }

    // Create modal HTML with password toggle
    const modalHTML = `
        <div id="addUserModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 10px; max-width: 500px; width: 100%; padding: 30px; position: relative; max-height: 90vh; overflow-y: auto;">
                <button onclick="closeAddUserModal()" style="position: absolute; top: 15px; right: 15px; border: none; background: none; font-size: 20px; cursor: pointer;">✕</button>
                
                <h2 style="border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; color: var(--primary-color);">Add New User</h2>
                
                <form id="addUserForm" onsubmit="handleAddUser(event)">
                    <div class="form-field">
                        <label>Full Name *</label>
                        <input type="text" id="newUserName" placeholder="Enter full name" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    
                    <div class="form-field" style="margin-top: 15px;">
                        <label>Email *</label>
                        <input type="email" id="newUserEmail" placeholder="Enter email address" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    
                    <div class="form-field" style="margin-top: 15px;">
                        <label>Password *</label>
                        <div class="password-input-wrapper" style="position: relative;">
                            <input type="password" id="newUserPassword" placeholder="Enter password" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; padding-right: 45px;">
                            <button type="button" class="password-toggle-btn" onclick="toggleAddUserPasswordVisibility(this)" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 5px; display: flex; align-items: center; justify-content: center; color: var(--text-light);">
                                <svg class="eye-closed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                                <svg class="eye-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; display: none;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-field" style="margin-top: 15px;">
                        <label>Role *</label>
                        <select id="newUserRole" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                            <option value="">Select Role</option>
                            <option value="Super Admin">Super Admin</option>
                            <option value="Admin">Admin</option>
                            <option value="User">User</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 25px;">
                        <button type="submit" class="btn-primary" style="flex: 1; background: var(--success-color);">Create User</button>
                        <button type="button" onclick="closeAddUserModal()" class="btn-primary" style="flex: 1; background: #95a5a6;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existing = document.getElementById('addUserModal');
    if (existing) existing.remove();
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- Toggle Password Visibility for Add User Modal ---
function toggleAddUserPasswordVisibility(btn) {
    const passwordInput = btn.parentElement.querySelector('#newUserPassword');
    const eyeClosed = btn.querySelector('.eye-closed');
    const eyeOpen = btn.querySelector('.eye-open');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeClosed.style.display = 'none';
        eyeOpen.style.display = 'block';
    } else {
        passwordInput.type = 'password';
        eyeClosed.style.display = 'block';
        eyeOpen.style.display = 'none';
    }
}

// --- Close Add User Modal ---
function closeAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.remove();
}

// --- Handle Add User Form Submission ---
async function handleAddUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('newUserName').value;
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    
    if (!name || !email || !password || !role) {
        showAlertModal('Validation Error', 'Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:5000/api/create-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        
        const data = await response.json();
        
        // Check if account was created successfully
        // Success is determined by: response status is OK AND (data.success is true OR message contains "success")
        const isCreateSuccess = response.ok && (data.success === true || (data.message && data.message.toLowerCase().includes('success')));
        
        if (isCreateSuccess) {
            closeAddUserModal();
            loadAccounts(); // Refresh the accounts list
            loadPermissions(); // Refresh permissions display
            // Use the existing successModal from script.js
            showSuccessModal('Account has been created successfully!');
        } else {
            showAlertModal('Error', 'Error: ' + (data.error || 'Failed to create user'), 'error');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showAlertModal('Connection Error', 'Failed to connect to server. Make sure the server is running.', 'error');
    }
}

// --- Static Button Handlers for Account Actions ---

// Handle Change Password button click (from static buttons)
function handleChangePasswordBtn() {
    if (!selectedUserForActions) {
        showAlertModal('No User Selected', 'Please select a user first', 'error');
        return;
    }
    
    // Check permissions - user can change their own password or if they can manage users
    const isSelf = currentUser.id === selectedUserForActions.id;
    const canManage = currentUser.permissions.includes('Manage Users');
    
    if (!isSelf && !canManage) {
        showAlertModal('Permission Denied', 'You do not have permission to change this user\'s password', 'error');
        return;
    }
    
    openChangePasswordModal(selectedUserForActions.id);
}

// Handle Edit Account button click (from static buttons)
function handleEditAccountBtn() {
    if (!selectedUserForActions) {
        showAlertModal('No User Selected', 'Please select a user first', 'error');
        return;
    }
    
    // Check permissions
    const isSelf = currentUser.id === selectedUserForActions.id;
    const canManage = currentUser.permissions.includes('Manage Users');
    
    if (!isSelf && !canManage) {
        showAlertModal('Permission Denied', 'You do not have permission to edit this account', 'error');
        return;
    }
    
    openEditAccountModal(selectedUserForActions.id);
}

// Handle Delete Account button click (from static buttons)
async function handleDeleteAccountBtn() {
    if (!selectedUserForActions) {
        showAlertModal('No User Selected', 'Please select a user first', 'error');
        return;
    }
    
    // Check permissions - only Super Admin can delete users
    if (currentUser.role !== 'Super Admin' || !currentUser.permissions.includes('Manage Users')) {
        showAlertModal('Permission Denied', 'You do not have permission to delete users', 'error');
        return;
    }
    
    // Prevent self-deletion
    if (selectedUserForActions.id === currentUser.id) {
        showAlertModal('Action Not Allowed', 'You cannot delete your own account', 'error');
        return;
    }

    openDeleteAccountModal(selectedUserForActions);
}

// --- Delete Account Modal ---
function openDeleteAccountModal(user) {
    if (!user) return;

    // Remove existing modal if any
    const existing = document.getElementById('deleteAccountModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div id="deleteAccountModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 10px; max-width: 420px; width: 100%; padding: 30px; position: relative;">
                <button onclick="closeDeleteAccountModal()" style="position: absolute; top: 15px; right: 15px; border: none; background: none; font-size: 20px; cursor: pointer;">✕</button>
                
                <h2 style="border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; color: #e74c3c;">Delete Account</h2>
                
                <p style="margin: 0 0 10px 0; color: #333;">
                    You are about to delete:
                    <strong>${user.name}</strong> (${user.email})
                </p>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 13px;">
                    This action cannot be undone. Enter your Super Admin password to confirm.
                </p>

                <form id="deleteAccountForm" onsubmit="handleConfirmDeleteAccount(event, ${user.id})">
                    <div class="form-field">
                        <label>Super Admin Password *</label>
                        <input type="password" id="deleteAccountPassword" placeholder="Enter your password" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>

                    <p id="deleteAccountError" style="display: none; margin-top: 10px; color: #c0392b; font-size: 13px;"></p>

                    <div style="display: flex; gap: 10px; margin-top: 25px;">
                        <button id="confirmDeleteAccountBtn" type="submit" class="btn-primary" style="flex: 1; background: #e74c3c;">Confirm Delete</button>
                        <button type="button" onclick="closeDeleteAccountModal()" class="btn-primary" style="flex: 1; background: #95a5a6;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) modal.remove();
}

async function handleConfirmDeleteAccount(event, userId) {
    event.preventDefault();

    const passwordInput = document.getElementById('deleteAccountPassword');
    const errorText = document.getElementById('deleteAccountError');
    const confirmBtn = document.getElementById('confirmDeleteAccountBtn');

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
        const data = await deleteUser(userId, password);

        if (data.success) {
            closeDeleteAccountModal();
            loadAccounts();
            loadPermissions();
            // Use the existing successModal from script.js
            showSuccessModal('Account has been deleted successfully!');
            return;
        }

        errorText.textContent = data.message || 'Failed to delete user. Please try again.';
        errorText.style.display = 'block';
    } catch (error) {
        console.error('Error deleting user:', error);
        errorText.textContent = 'Failed to connect to server. Make sure the server is running.';
        errorText.style.display = 'block';
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Delete';
    }
}

// --- Generic Alert Modal Function ---
function showAlertModal(title, message, type = 'info') {
    // Remove existing modal if any
    const existing = document.getElementById('alertModal');
    if (existing) existing.remove();

    // Set colors based on type
    let titleColor = 'var(--primary-color)';
    let buttonColor = '#95a5a6';
    
    switch(type) {
        case 'success':
            titleColor = 'var(--success-color)';
            buttonColor = 'var(--success-color)';
            break;
        case 'error':
            titleColor = '#e74c3c';
            buttonColor = '#e74c3c';
            break;
        case 'warning':
            titleColor = '#f39c12';
            buttonColor = '#f39c12';
            break;
        default:
            titleColor = 'var(--primary-color)';
    }

    const modalHTML = `
        <div id="alertModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 10px; max-width: 400px; width: 100%; padding: 30px; position: relative;">
                <h2 style="border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; color: ${titleColor};">${title}</h2>
                <p style="margin: 0 0 20px 0; color: #333; font-size: 14px; line-height: 1.5;">${message}</p>
                <button type="button" onclick="closeAlertModal()" class="btn-primary" style="width: 100%; background: ${buttonColor};">OK</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeAlertModal() {
    const modal = document.getElementById('alertModal');
    if (modal) modal.remove();
}
