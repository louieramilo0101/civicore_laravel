import axios from 'axios';
window.axios = axios;

const apiBase = import.meta.env.VITE_API_BASE_URL || '';
if (apiBase) {
    window.axios.defaults.baseURL = apiBase.replace(/\/+$/, '');
}

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

