import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Read version from root VERSION file
const version = (() => {
  try {
    return fs.readFileSync(path.resolve(__dirname, '../VERSION'), 'utf-8').trim();
  } catch {
    return process.env.APP_VERSION || '0.0.0-unknown';
  }
})();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  build: {
    outDir: 'dist',
    // Disable source maps in production to prevent source code exposure
    // Set VITE_SOURCEMAP=true during development if needed for debugging
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
  },
});
