import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        tailwindcss(),
        react(),
    ],
    build: {
        outDir: 'dist',
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    icons: ['@heroicons/react/24/outline'],
                },
            },
        },
    },
});
