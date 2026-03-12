import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './bootstrap';

// Import React components (will be created)
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Documents from './components/Documents';
import Issuances from './components/Issuances';
import Users from './components/Users';
import Barangays from './components/Barangays';
import Templates from './components/Templates';

// Simple auth check - checks if user is logged in via session
const isAuthenticated = () => {
    return document.cookie.includes('laravel_session') || sessionStorage.getItem('user');
};

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />
                <Route path="/documents" element={
                    <ProtectedRoute>
                        <Documents />
                    </ProtectedRoute>
                } />
                <Route path="/issuances" element={
                    <ProtectedRoute>
                        <Issuances />
                    </ProtectedRoute>
                } />
                <Route path="/users" element={
                    <ProtectedRoute>
                        <Users />
                    </ProtectedRoute>
                } />
                <Route path="/barangays" element={
                    <ProtectedRoute>
                        <Barangays />
                    </ProtectedRoute>
                } />
                <Route path="/templates" element={
                    <ProtectedRoute>
                        <Templates />
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

// Mount the React app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

