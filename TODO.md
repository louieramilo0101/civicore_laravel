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
- [ ] Fix checkbox toggle functionality in issuance table
- [ ] Ensure selectAllCheckbox works properly
- [ ] Add visual feedback for checkbox state
- [ ] Test toggle button functionality

### 2. EasyOCR Running - Loading Button & Display
- [ ] Add loading spinner/indicator when EasyOCR is processing
- [ ] Show extracted text in a document area for accuracy review
- [ ] Add "Paste to Form" button to transfer OCR text to form fields
- [ ] Display confidence score and words found

### 3. Input Validation in Upload Section
- [ ] Add file type validation (only PDF, JPG, PNG allowed)
- [ ] Add file size validation (max 10MB)
- [ ] Add document type selection validation (must select birth/death/marriage)
- [ ] Show clear error messages for validation failures

### 4. EasyOCR Text Capture & Document Display
- [ ] Add extracted text preview area in upload page
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

### 9. Integrate Inertia.js for Laravel + React (Recommended: Use Laravel Breeze)
- [ ] Create new Laravel project
- [ ] Install Laravel Breeze with React/Inertia stack (recommended approach)
  - Run: `composer require laravel/breeze --dev`
  - Run: `php artisan breeze:install react`
  - This automatically sets up React + Inertia.js together
- [ ] No need to install separate React framework - Breeze handles it
- [ ] Configure database connection to existing MySQL (civicore_db)
- [ ] Set up Inertia.js in Laravel (server-side)
- [ ] Install Inertia.js React adapter (client-side) - handled by Breeze
- [ ] Create React components that work with Inertia
- [ ] Replace traditional API responses with Inertia::render()
- [ ] Pass data directly from Laravel controllers to React components
- [ ] Update routes to use Inertia routes instead of API endpoints
- [ ] Remove need for separate API endpoints (controllers render React directly)
- [ ] Maintain Laravel routing, controllers, and data logic
- [ ] Make React frontend feel like part of Laravel application
- [ ] Migrate existing Express.js API endpoints to Laravel controllers
- [ ] Port over all functionality: auth, documents, issuances, users, barangays, templates
- [ ] Integrate EasyOCR Python script execution from Laravel

### 7. Secure Login - Hide Password/Account Details
- [ ] Implement JWT (JSON Web Tokens) for authentication
- [ ] Store tokens securely (httpOnly cookies)
- [ ] Hash passwords with bcrypt on server
- [ ] Implement proper session management
- [ ] Add CSRF protection
- [ ] Ensure sensitive data is never sent to client
- [ ] Implement logout functionality that clears tokens

### 8. Migrate Express.js to Laravel
- [ ] Create new Laravel project in separate directory
- [ ] Set up Laravel routes (API endpoints matching existing Express routes)
- [ ] Create Laravel controllers for all API functionality
- [ ] Configure database connection to existing MySQL (civicore_db)
- [ ] Implement user authentication (login, logout, session)
- [ ] Implement user/role management with permissions
- [ ] Implement document upload with multer
- [ ] Implement EasyOCR integration (Python script execution from PHP)
- [ ] Create issuances, barangays, templates API endpoints
- [ ] Test all API endpoints match existing Express API
- [ ] Keep frontend (vanilla JS) unchanged - API-only Laravel approach
- [ ] Deploy and switch from Express to Laravel

---

## Completed Tasks
- [x] Update HTML - Add toggle button and Delete Selected button
- [x] Update JavaScript - Add toggle and delete functions
- [x] Update CSS - Add styling for new elements

