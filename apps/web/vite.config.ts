import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// VITE_API_URL is set in GitHub Actions → repo variable
// e.g. https://form-builder-api.onrender.com
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@form-builder/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  // In production (GitHub Pages), no proxy — requests go directly to Render API
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_URL, changeOrigin: true },
      '/s/':  { target: API_URL, changeOrigin: true },
      '/auth': { target: API_URL, changeOrigin: true },
    },
  },
  // GitHub Pages serves from /repo-name/ — set base to '/' if using custom domain
  base: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/',
  define: {
    __API_URL__: JSON.stringify(API_URL),
  },
});
