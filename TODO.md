# TODO: Replace Alert with Professional Toast Notifications

## Task Overview
Replace all browser `alert()` calls with professional-looking toast notifications across the React application.

## Information Gathered
- **Files with alert() calls:**
  - `resources/js/components/Documents.jsx` - 3 alerts (validation, success, error)
  - `resources/js/components/Landing.jsx` - 1 alert (info)
  
- **Current dependencies:**
  - React 19, Framer Motion, React Router DOM, Heroicons
  - No toast library currently installed
  
- **Recommended solution:** Use `react-hot-toast` - lightweight, beautiful, and professional-looking toast library

## Plan

### Step 1: Install Toast Library
- Install `react-hot-toast` package
- Add toaster component to app.jsx

### Step 2: Create Toast Integration
- Add `<Toaster />` component to `app.jsx` for global toast notifications
- Configure toaster with professional styling matching app theme

### Step 3: Update Documents.jsx
- Replace `alert('Please select a document type and file')` with toast.error()
- Replace `alert(data.message || 'Upload successful')` with toast.success()
- Replace `alert('Upload failed: ' + err.message)` with toast.error()

### Step 4: Update Landing.jsx (if needed)
- Review and replace any remaining alerts

## Dependent Files to Edit
1. `package.json` - Add dependency
2. `resources/js/app.jsx` - Add Toaster component
3. `resources/js/components/Documents.jsx` - Replace alerts with toasts

## Followup Steps
1. Run `npm install react-hot-toast` to install the library
2. Verify the changes work by testing each toast trigger
3. Test that the UI looks professional and matches the app theme

