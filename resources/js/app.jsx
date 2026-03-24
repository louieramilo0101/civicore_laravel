import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './bootstrap';
import '../css/app.css';

// Make sure you delete the line that says import '../css/styles.css'

// Import React components with explicit paths
import Landing from './components/Landing.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import Documents from './components/Documents.jsx';
import Issuances from './components/Issuances.jsx';
import Mapping from './components/Mapping.jsx';
import Accounts from './components/Accounts.jsx';
import Layout from './components/Layout.jsx';
import PublicLayout from './components/PublicLayout.jsx';

// Import new public pages
import AboutPortal from './components/AboutPortal.jsx';
import DigitalServices from './components/DigitalServices.jsx';
import ContactDirectory from './components/ContactDirectory.jsx';

// Simple auth check
const isAuthenticated = () => {
    return document.cookie.includes('laravel_session') || sessionStorage.getItem('user');
};

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    
    if (allowedRoles.length > 0) {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (!allowedRoles.includes(user.role)) {
            // If they can't access this, send them to the most basic allowed page
            return <Navigate to="/documents" replace />;
        }
    }
    
    return children;
};

// Scroll to top on route change
const ScrollToTop = () => {
    const { pathname } = useLocation();
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

import { ModalProvider } from './components/ModalContext.jsx';

function App() {
    return (
        <ModalProvider>
            <BrowserRouter>
                <ScrollToTop />
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
                    <Route path="/about" element={<PublicLayout><AboutPortal /></PublicLayout>} />
                    <Route path="/services" element={<PublicLayout><DigitalServices /></PublicLayout>} />
                    <Route path="/contact" element={<PublicLayout><ContactDirectory /></PublicLayout>} />
                    <Route path="/login" element={<Login />} />
                    
                    {/* Protected Routes */}
                    <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Superadmin', 'Admin']}><Layout><Dashboard /></Layout></ProtectedRoute>} />
                    <Route path="/documents" element={<ProtectedRoute><Layout><Documents /></Layout></ProtectedRoute>} />
                    <Route path="/issuances" element={<ProtectedRoute allowedRoles={['Superadmin', 'Admin']}><Layout><Issuances /></Layout></ProtectedRoute>} />
                    <Route path="/mapping" element={<ProtectedRoute allowedRoles={['Superadmin', 'Admin']}><Layout><Mapping /></Layout></ProtectedRoute>} />
                    <Route path="/accounts" element={<ProtectedRoute><Layout><Accounts /></Layout></ProtectedRoute>} />
                    
                    {/* Redirect root to landing */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </ModalProvider>
    );
}

// Mount the React app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App /> 
);