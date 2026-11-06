import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './bootstrap';
import '../css/app.css';

// Shared providers (lightweight, needed on all routes)
import { ModalProvider, useModal } from './components/ModalContext.jsx';
import { DataProvider } from './components/DataContext.jsx';
import { AccessibilityProvider } from './components/AccessibilityContext.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Public layouts (needed immediately for navigation chrome)
import PublicLayout from './components/PublicLayout.jsx';
import Layout from './components/Layout.jsx';

// Route-based code splitting — each page component loads only when its route
// is matched. Layout is eagerly imported so the sidebar + topbar render
// instantly on navigation; only the page content is Suspense-bound.
// This keeps the landing page bundle tiny (~20KB instead of ~2MB).
const Landing               = React.lazy(() => import('./components/Landing.jsx'));
const Login                 = React.lazy(() => import('./components/Login.jsx'));
const Dashboard             = React.lazy(() => import('./components/Dashboard.jsx'));
const Documents             = React.lazy(() => import('./components/Documents.jsx'));
const Reports               = React.lazy(() => import('./components/Reports.jsx'));
const ArchiveManager        = React.lazy(() => import('./components/ArchiveManager.jsx'));
const Issuances             = React.lazy(() => import('./components/Issuances.jsx'));
const Mapping               = React.lazy(() => import('./components/Mapping.jsx'));
const Accounts              = React.lazy(() => import('./components/Accounts.jsx'));
const Backups               = React.lazy(() => import('./components/Backups.jsx'));
const Announcements         = React.lazy(() => import('./components/Announcements.jsx'));
const AboutPortal           = React.lazy(() => import('./components/AboutPortal.jsx'));
const DigitalServices       = React.lazy(() => import('./components/DigitalServices.jsx'));
const ContactDirectory      = React.lazy(() => import('./components/ContactDirectory.jsx'));
const Ticketing             = React.lazy(() => import('./components/Ticketing.jsx'));
const PublicRestrictedNotice = React.lazy(() => import('./components/PublicRestrictedNotice.jsx'));

// Preloads every route chunk in the background after the first paint so
// subsequent navigations are instant (no spinner, no chunk-download delay).
const LAZY_CHUNKS = [
    () => import('./components/Landing.jsx'),
    () => import('./components/Login.jsx'),
    () => import('./components/Dashboard.jsx'),
    () => import('./components/Documents.jsx'),
    () => import('./components/Reports.jsx'),
    () => import('./components/ArchiveManager.jsx'),
    () => import('./components/Issuances.jsx'),
    () => import('./components/Mapping.jsx'),
    () => import('./components/Accounts.jsx'),
    () => import('./components/Backups.jsx'),
    () => import('./components/Announcements.jsx'),
    () => import('./components/AboutPortal.jsx'),
    () => import('./components/DigitalServices.jsx'),
    () => import('./components/ContactDirectory.jsx'),
    () => import('./components/Ticketing.jsx'),
    () => import('./components/PublicRestrictedNotice.jsx'),
];

/** Kick off background preload of all route chunks after the app mounts. */
function usePreloadChunks() {
    React.useEffect(() => {
        // Wait for the first paint so we don't compete with the initial render.
        const id = requestAnimationFrame(() => {
            LAZY_CHUNKS.forEach((loader) => loader().catch(() => {/* ignore */}));
        });
        return () => cancelAnimationFrame(id);
    }, []);
}

/**
 * Renders the app shell (sidebar + topbar) immediately and plugs the
 * page-content Suspense fallback into the main content region.
 * This avoids the full-screen "Loading…" spinner on route changes.
 */
const ContentFallback = () => (
    <div className="flex-1 flex flex-col p-6 gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3 animate-pulse" />
                    <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
            ))}
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4 animate-pulse" />
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
                ))}
            </div>
        </div>
    </div>
);

// Minimal fallback shown while a route chunk is loading
const RouteFallback = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#d4a574] border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Loading…</span>
        </div>
    </div>
);

const IS_PUBLIC_PORTAL_ONLY = import.meta.env.VITE_PUBLIC_PORTAL_ONLY === 'true';

// ─── Auth helpers ────────────────────────────────────────────────────────────

/** Reads and parses the authenticated user from session storage. */
const getUser = () => {
    try {
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
};

/** Returns whether a valid authenticated user is present. */
const isAuthenticated = () => !!getUser();

/** Clears all client-side auth caches and redirects to login. */
const clearAuthAndRedirect = (navigate, replace = true) => {
    try { localStorage.removeItem('user'); } catch { /* ignore */ }
    try { sessionStorage.removeItem('user'); } catch { /* ignore */ }
    if (navigate) navigate('/login', { replace });
};

/**
 * Redirects already-authenticated users away from the login page.
 * Prevents logged-in staff from landing on the sign-in form.
 */
const AuthRedirect = ({ children }) => {
    const navigate = useNavigate();
    if (isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }
    return children || null;
};

/**
 * Listens for the global `civicore:session-expired` event dispatched by the
 * axios interceptor in bootstrap.js. Fires when the server session has
 * expired (120 min inactivity / account disabled) — wipes client caches and
 * routes the user back to login.
 */
const SessionExpiryListener = () => {
    const navigate = useNavigate();
    const { showSessionExpired } = useModal();

    React.useEffect(() => {
        const handleExpired = () => {
            try { localStorage.removeItem('user'); } catch { /* ignore */ }
            try { sessionStorage.removeItem('user'); } catch { /* ignore */ }
            showSessionExpired(() => {
                navigate('/login', { replace: true });
            });
        };
        window.addEventListener('civicore:session-expired', handleExpired);
        return () => window.removeEventListener('civicore:session-expired', handleExpired);
    }, [navigate, showSessionExpired]);

    return null;
};

// ─── Protected Route ─────────────────────────────────────────────────────────
//
// allowedRoles: if empty → any authenticated user may access
//               if set   → user.role must be in the list
//
/** Guards a route using authentication and optional role requirements. */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0) {
        const user = getUser();
        if (!allowedRoles.includes(user?.role)) {
            // Redirect to the highest page they ARE allowed to access
            return <Navigate to="/documents" replace />;
        }
    }

    return children;
};

// ─── Scroll to top on route change ───────────────────────────────────────────
/** Resets scroll position whenever the active route changes. */
const ScrollToTop = () => {
    const { pathname } = useLocation();
    React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
};

// ─── App ─────────────────────────────────────────────────────────────────────
/** Configures the application providers and route tree. */
function App() {
    // Preload all route chunks in the background so subsequent
    // navigations are instant — no loading spinner, no chunk-download delay.
    usePreloadChunks();

    // When deployed as a public citizen portal (e.g. on Vercel),
    // only mount public pages and guard all back-office routes.
    if (IS_PUBLIC_PORTAL_ONLY) {
        return (
            <AccessibilityProvider>
                <DataProvider>
                    <ModalProvider>
                        <BrowserRouter>
                            <ScrollToTop />
                            <SettingsModal />
                            <Routes>
                                <Route path="/"         element={<PublicLayout><Suspense fallback={<RouteFallback />}><Landing /></Suspense></PublicLayout>} />
                                <Route path="/about"    element={<PublicLayout><Suspense fallback={<RouteFallback />}><AboutPortal /></Suspense></PublicLayout>} />
                                <Route path="/services" element={<PublicLayout><Suspense fallback={<RouteFallback />}><DigitalServices /></Suspense></PublicLayout>} />
                                <Route path="/contact"  element={<PublicLayout><Suspense fallback={<RouteFallback />}><ContactDirectory /></Suspense></PublicLayout>} />
                                <Route path="/ticket-request" element={<PublicLayout><Suspense fallback={<RouteFallback />}><Ticketing mode="portal" /></Suspense></PublicLayout>} />
                                <Route path="/ticket-status/:token" element={<PublicLayout><Suspense fallback={<RouteFallback />}><Ticketing mode="status" /></Suspense></PublicLayout>} />
                                <Route path="/ticket/:token" element={<PublicLayout><Suspense fallback={<RouteFallback />}><Ticketing mode="status" /></Suspense></PublicLayout>} />
                                <Route path="/login"    element={<Suspense fallback={<RouteFallback />}><PublicRestrictedNotice /></Suspense>} />
                                <Route path="*"         element={<Suspense fallback={<RouteFallback />}><PublicRestrictedNotice /></Suspense>} />
                            </Routes>
                        </BrowserRouter>
                    </ModalProvider>
                </DataProvider>
            </AccessibilityProvider>
        );
    }

    return (
        <AccessibilityProvider>
            <DataProvider>
                <ModalProvider>
                    <BrowserRouter>
                        <ScrollToTop />
                        <SettingsModal />
                        <SessionExpiryListener />
                        <Routes>
                        {/* ── Public ─────────────────────────────────────────── */}
                        <Route path="/"         element={<PublicLayout><Suspense fallback={<RouteFallback />}><Landing /></Suspense></PublicLayout>} />
                        <Route path="/about"    element={<PublicLayout><Suspense fallback={<RouteFallback />}><AboutPortal /></Suspense></PublicLayout>} />
                        <Route path="/services" element={<PublicLayout><Suspense fallback={<RouteFallback />}><DigitalServices /></Suspense></PublicLayout>} />
                        <Route path="/contact"  element={<PublicLayout><Suspense fallback={<RouteFallback />}><ContactDirectory /></Suspense></PublicLayout>} />
                        <Route path="/ticket-request" element={<PublicLayout><Suspense fallback={<RouteFallback />}><Ticketing mode="portal" /></Suspense></PublicLayout>} />
                        <Route path="/ticket-status/:token" element={<PublicLayout><Suspense fallback={<RouteFallback />}><Ticketing mode="status" /></Suspense></PublicLayout>} />
                        <Route path="/ticket/:token" element={<PublicLayout><Suspense fallback={<RouteFallback />}><Ticketing mode="status" /></Suspense></PublicLayout>} />
                        <Route path="/login"    element={
                            <AuthRedirect>
                                <Suspense fallback={<RouteFallback />}><Login /></Suspense>
                            </AuthRedirect>
                        } />

                        {/* ── Protected ──────────────────────────────────────── */}
                        {/* Dashboard — Admin + SuperAdmin */}
                        <Route path="/dashboard" element={
                            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
                                <Layout><Suspense fallback={<ContentFallback />}><Dashboard /></Suspense></Layout>
                            </ProtectedRoute>
                        } />

                        {/* Documents — all authenticated */}
                        <Route path="/documents" element={
                            <ProtectedRoute>
                                <Layout><Suspense fallback={<ContentFallback />}><Documents /></Suspense></Layout>
                            </ProtectedRoute>
                        } />

                        {/* Export Reports — Admin + SuperAdmin */}
                        <Route path="/reports" element={
                            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
                                <Layout><Suspense fallback={<ContentFallback />}><Reports /></Suspense></Layout>
                            </ProtectedRoute>
                        } />

                        {/* Issuances — Admin + SuperAdmin */}
                        <Route path="/issuances" element={
                            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
                                <Layout><Suspense fallback={<ContentFallback />}><Issuances /></Suspense></Layout>
                            </ProtectedRoute>
                        } />

                        {/* Archive Manager — Admin + SuperAdmin */}
                        <Route path="/archive" element={
                            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
                                <Layout><Suspense fallback={<ContentFallback />}><ArchiveManager /></Suspense></Layout>
                            </ProtectedRoute>
                        } />

                        {/* Tickets Queue — Admin + SuperAdmin */}
                        <Route path="/tickets" element={
                            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
                                <Layout><Suspense fallback={<ContentFallback />}><Ticketing mode="staff" /></Suspense></Layout>
                            </ProtectedRoute>
                        } />

                        {/* Mapping — SuperAdmin only */}
                        <Route path="/mapping" element={
                            <ProtectedRoute allowedRoles={['SuperAdmin']}>
                                <Layout><Suspense fallback={<ContentFallback />}><Mapping /></Suspense></Layout>
                            </ProtectedRoute>
                        } />

                        {/* Announcements — Admin + SuperAdmin */}
                        <Route path="/announcements" element={
                            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
                                <Layout><Suspense fallback={<ContentFallback />}><Announcements /></Suspense></Layout>
                            </ProtectedRoute>
                        } />

                        {/* Accounts — all authenticated (filtered inside component by role) */}
                        <Route path="/accounts" element={
                            <ProtectedRoute>
                                <Layout><Suspense fallback={<ContentFallback />}><Accounts /></Suspense></Layout>
                            </ProtectedRoute>
                        } />

                        {/* System Backup & Recovery — SuperAdmin only */}
                        <Route path="/backups" element={
                            <ProtectedRoute allowedRoles={['SuperAdmin']}>
                                <Layout><Suspense fallback={<ContentFallback />}><Backups /></Suspense></Layout>
                            </ProtectedRoute>
                        } />

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </ModalProvider>
        </DataProvider>
    </AccessibilityProvider>
    );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);