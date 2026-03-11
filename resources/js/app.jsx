
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './bootstrap';

// Import React components
import Landing from './components/Landing';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Documents from './components/Documents';
import Issuances from './components/Issuances';
import Users from './components/Users';
import Barangays from './components/Barangays';
import Templates from './components/Templates';
import Layout from './components/Layout';

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

// Animated page wrapper
const AnimatedPage = ({ children }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
        >
            {children}
        </motion.div>
    );
};

// Scroll to top on route change
const ScrollToTop = () => {
    const { pathname } = useLocation();
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

// Animated Routes component
const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                {/* Public Routes */}
                <Route path="/" element={
                    <AnimatedPage>
                        <Landing />
                    </AnimatedPage>
                } />
                <Route path="/login" element={
                    <AnimatedPage>
                        <Login />
                    </AnimatedPage>
                } />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Layout>
                            <AnimatedPage>
                                <Dashboard />
                            </AnimatedPage>
                        </Layout>
                    </ProtectedRoute>
                } />
                <Route path="/documents" element={
                    <ProtectedRoute>
                        <Layout>
                            <AnimatedPage>
                                <Documents />
                            </AnimatedPage>
                        </Layout>
                    </ProtectedRoute>
                } />
                <Route path="/issuances" element={
                    <ProtectedRoute>
                        <Layout>
                            <AnimatedPage>
                                <Issuances />
                            </AnimatedPage>
                        </Layout>
                    </ProtectedRoute>
                } />
                <Route path="/users" element={
                    <ProtectedRoute>
                        <Layout>
                            <AnimatedPage>
                                <Users />
                            </AnimatedPage>
                        </Layout>
                    </ProtectedRoute>
                } />
                <Route path="/barangays" element={
                    <ProtectedRoute>
                        <Layout>
                            <AnimatedPage>
                                <Barangays />
                            </AnimatedPage>
                        </Layout>
                    </ProtectedRoute>
                } />
                <Route path="/templates" element={
                    <ProtectedRoute>
                        <Layout>
                            <AnimatedPage>
                                <Templates />
                            </AnimatedPage>
                        </Layout>
                    </ProtectedRoute>
                } />
                
                {/* Redirect root to landing */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AnimatePresence>
    );
};

function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <AnimatedRoutes />
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

