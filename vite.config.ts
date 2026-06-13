import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // Allow CI or remote preview environments to disable websocket HMR.
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  optimizeDeps: {
    include: ['zod'],
  },
});
