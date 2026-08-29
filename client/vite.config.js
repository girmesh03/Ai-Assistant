import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration for the ሰላም chat client.
 *
 * The dev server runs on port 3000 and proxies every `/api` request to the
 * Express backend on port 4000, so the client never needs a hard-coded origin.
 *
 * @module vite.config
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});