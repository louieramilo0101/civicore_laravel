import axios from 'axios';
window.axios = axios;

const apiBase = import.meta.env.VITE_API_BASE_URL || '';
if (apiBase) {
    window.axios.defaults.baseURL = apiBase.replace(/\/+$/, '');
}

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

/**
 * Silent session-expiry handling.
 *
 * When the server session has expired (120 min inactivity, or account
 * disabled), the RequireSessionAuth middleware returns 401. We catch that
 * globally, wipe the client-side auth cache, and notify the UI so it can
 * route the user back to login without a broken request throwing mid-page.
 */
window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            try { localStorage.removeItem('user'); } catch { /* ignore */ }
            try { sessionStorage.removeItem('user'); } catch { /* ignore */ }
            window.dispatchEvent(new CustomEvent('civicore:session-expired'));
        }
        return Promise.reject(error);
    }
);

