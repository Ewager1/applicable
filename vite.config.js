import { defineConfig } from 'vite';
import { buildNotices } from './scripts/build-notices.mjs';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src',
  base: '/my-app/',
  publicDir: false,
  plugins: [buildNotices(), react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
  build: { outDir: '../dist', emptyOutDir: true },
});
