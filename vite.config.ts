import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — приложение работает и на GitHub Pages в подпапке, и локально,
// потому что все ассеты и service worker подключены относительными путями.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
  },
});
