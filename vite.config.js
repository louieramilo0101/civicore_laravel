import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
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

// Use trusted mkcert certificates if available
const certPath = path.resolve(__dirname, 'civicore.pem');
const keyPath = path.resolve(__dirname, 'civicore-key.pem');
const hasMkcert = fs.existsSync(certPath) && fs.existsSync(keyPath);

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 5173,
        https: hasMkcert ? {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        } : undefined,
        hmr:{
            host: localIp
        },
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
            '/storage': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            }
        }
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    icons: ['@heroicons/react/24/outline'],
                },
            },
        },
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