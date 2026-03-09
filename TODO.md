# Implementation TODO

---

## 📋 Recommended Approach for This Project

Given the current Express.js + vanilla JS setup and the goal to integrate Inertia.js, here's the recommended migration path:

### Phase 1: Keep Express, Add React Gradually (Recommended for Now)
1. **Keep current Express.js backend** - It's working well and all API endpoints are functional
2. **Gradually convert frontend to React** - Start with new features, not everything at once
3. **Use React Router** for SPA navigation without page reloads
4. **Keep API endpoints** - Your Express API works fine, React can consume it

### Phase 2: When Ready for Laravel + Inertia (Long-term)
1. **Create new Laravel project** alongside current Express app
2. **Install Laravel Breeze with React/Inertia** (`php artisan breeze:install react`)
3. **Replicate Express API in Laravel** - Port controllers one by one
4. **Switch frontend to Inertia** - Convert React components to Inertia pages
5. **Point to Laravel** instead of Express

### Optional: OpenCV for Document Processing
- **OpenCV (Python)** can be used as an alternative to EasyOCR for document preprocessing
- Useful for: image enhancement, noise reduction, skew correction, contrast adjustment
- Can be combined with EasyOCR for better OCR results
- Run as Python script similar to ocr_processor.py
- Install: `pip install opencv-python`

### Why This Approach?
- ✅ Lower risk - don't break what's working
- ✅ Incremental migration - can do it feature by feature
- ✅ Keep using existing OCR Python script (works with both Express and Laravel)
- ✅ Time to learn React/Inertia without pressure

---

## Current Tasks from User Request

### 1. Checkbox in Issuance Section - FIX
- [x] Fix checkbox toggle functionality in issuance table
- [x] Ensure selectAllCheckbox works properly
- [x] Add visual feedback for checkbox state
- [x] Test toggle button functionality

### 2. EasyOCR Running - Loading Button & Display
- [x] Add loading spinner/indicator when EasyOCR is processing
- [x] Show extracted text in a document area for accuracy review
- [ ] Add "Paste to Form" button to transfer OCR text to form fields
- [x] Display confidence score and words found

### 3. Input Validation in Upload Section
- [x] Add file type validation (only PDF, JPG, PNG allowed)
- [ ] Add file size validation (max 10MB)
- [x] Add document type selection validation (must select birth/death/marriage)
- [x] Show clear error messages for validation failures

### 4. EasyOCR Text Capture & Document Display
- [x] Add extracted text preview area in upload page
- [ ] Create editable text area to review/edit OCR results
- [ ] Add "Use This Text" button to populate form fields
- [ ] Add copy to clipboard functionality

### 5. Save Files to Database (Not User Device)
- [ ] Modify database schema to store files as BLOB
- [ ] Update server.js to handle BLOB storage
- [ ] Update upload API to store file data in database
- [ ] Update document retrieval to fetch from database
- [ ] Add file download functionality from database

---

## Major TODO List (Long-term)

### 6. Transfer to React - No Page Loading
- [ ] Convert existing vanilla JS to React components
- [ ] Implement React Router for navigation
- [ ] Use React state management for data
- [ ] Implement Server-Side Rendering (SSR) for initial load
- [ ] Add React loading states and transitions

### 9. Integrate Inertia.js for Laravel + React (SKIPPED - Using Pure React Instead)
- [x] SKIPPED - Using pure React with Vite (Option 2 chosen by user)
- [ ] See Task #10 for pure React setup instead

### 10. Migrate Frontend to Pure React with Vite
- [x] Install React and React DOM dependencies
- [x] Install React Router for navigation
- [x] Configure Vite for React
- [x] Create React app structure in resources/js/
- [x] Create main App component with routing
- [x] Convert existing vanilla JS pages to React components:
  - [x] Login/Auth pages
  - [x] Dashboard
  - [x] Documents/Upload
  - [x] Issuances
  - [x] Users management
  - [x] Barangays
  - [x] Templates
- [x] Update public/index.html to mount React app
- [ ] Test React frontend with Laravel API
- [ ] Verify all features work in React

### 7. Secure Login - Hide Password/Account Details
- [x] Implement bcrypt password hashing (using Laravel Hash facade)
- [x] Store passwords securely (hashed with bcrypt)
- [x] Hash passwords with bcrypt on server
- [x] Implement proper session management
- [x] Ensure sensitive data (passwords) never sent to client
- [x] Implement logout functionality that clears session
- [x] Auto-upgrade plain text passwords to bcrypt on login
- [ ] Implement JWT (JSON Web Tokens) for authentication - Not needed for localhost (sessions work fine)
- [ ] Store tokens securely (httpOnly cookies) - Not needed for localhost
- [ ] Add CSRF protection - Not needed for API-only localhost

### 8. Migrate Express.js to Laravel
- [x] Create new Laravel project in separate directory
- [x] Set up Laravel routes (API endpoints matching existing Express routes)
- [x] Create Laravel controllers for all API functionality
- [x] Configure database connection to existing MySQL (civicore_db)
- [x] Implement user authentication (login, logout, session)
- [x] Implement user/role management with permissions
- [x] Implement document upload with multer
- [x] Implement EasyOCR integration (Python script execution from PHP)
- [x] Create issuances, barangays, templates API endpoints
- [x] Test all API endpoints match existing Express API
- [x] Keep frontend (vanilla JS) unchanged - API-only Laravel approach
- [x] Deploy and switch from Express to Laravel

---

## Completed Tasks
- [x] Update HTML - Add toggle button and Delete Selected button
- [x] Update JavaScript - Add toggle and delete functions
- [x] Update CSS - Add styling for new elements

### Implementation Details - Issuance Checkbox Features (COMPLETED)
- Added toggle button (purple) to show/hide checkboxes in issuance table
- Added Delete Selected button that appears when items are selected
- Checkbox states: unchecked (purple border), checked (green), indeterminate (orange)
- Select All checkbox with proper visual feedback
- Bulk delete with password verification

### Implementation Details - EasyOCR Features (COMPLETED)
- Loading spinner/indicator when EasyOCR is processing
- Shows extracted text in document area for accuracy review
- Displays confidence score and words found
- File type validation (PDF, JPG, PNG only)
- Document type selection validation (birth/death/marriage required)
- Clear error and success messages via modals

### Implementation Details - Laravel Migration (COMPLETED)
**Migration Status: COMPLETE** ✅

The entire Express.js backend has been successfully migrated to Laravel:

- **Laravel Location**: `c:/laragon/www/civicore_laravel/` (runs on port 8000)
- **Express.js Location**: `c:/laragon/www/CiviCORE/` (runs on port 5000, still available as backup)
- **Database**: Both connect to same MySQL database (`civicore_db`)

**Laravel Controllers Implemented**:
- `AuthController` - login, logout, session, change-password, verify-password
- `UserController` - CRUD operations, profile management, permissions
- `DocumentController` - document management, file upload with multer
- `OcrController` - EasyOCR Python script integration using Laravel Process
- `IssuanceController` - certificate issuance management
- `BarangayController` - barangay data retrieval
- `TemplateController` - template management

**API Endpoints Migrated**:
- All Express.js API endpoints replicated in Laravel routes/api.php
- Frontend (api.js) updated to point to Laravel at `http://localhost:8000`
- EasyOCR Python script execution works from Laravel via Process facade

**React Frontend Status**: 
- React components created in resources/js/components/
- Login component implemented and working with Laravel API
- Frontend served from public/index.html
- API prefix configured in bootstrap/app.php

**Note**: The Express.js backend at CiviCORE is still available but currently not in use. Frontend now uses Laravel API.

### Implementation Details - React Login Fix (COMPLETED) ✅
- Created React Login component in resources/js/components/Login.jsx
- Updated AuthController with proper session handling
- Added apiPrefix configuration to bootstrap/app.php
- Updated routes/api.php to ensure proper route registration
- Login functionality now working with Laravel backend

