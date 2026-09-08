import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import os from 'os';

/** Selects a non-loopback local address for network-accessible HMR. */
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    
    // 1. Hunt specifically for the Wi-Fi adapter first
    for (const name of Object.keys(interfaces)) {
        if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless')) {
            for (const iface of interfaces[name]) {
                if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
                    return iface.address;
                }
            }
        }
    }

    // 2. Fallback to the original method if Wi-Fi isn't found
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
                return iface.address;
            }
        }
    }
    
    return 'localhost';
}

const localIp = getLocalIp();

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 5173,
        hmr:{
            host: localIp
        }
    },
    plugins: [
        tailwindcss(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
    ],
});