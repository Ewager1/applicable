import { defineConfig } from 'vite';
import { buildNotices } from './scripts/build-notices.mjs';

export default defineConfig({
  root: 'src',
  base: './',
  publicDir: false,
  plugins: [buildNotices()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
  build: { outDir: '../dist', emptyOutDir: true },
});
