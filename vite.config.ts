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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/node_modules/lucide-react/')) return 'vendor-icons';
          if (normalizedId.includes('/node_modules/react-router/')) return 'vendor-router';
          if (normalizedId.includes('/node_modules/react-router-dom/')) return 'vendor-router';
          if (normalizedId.includes('/node_modules/motion/')) return 'vendor-motion';
          if (normalizedId.includes('/node_modules/recharts/')) return 'vendor-charts';
          if (normalizedId.includes('/node_modules/d3-')) return 'vendor-charts';
          if (normalizedId.includes('/node_modules/zod/')) return 'vendor-validation';
          if (normalizedId.includes('/node_modules/next-themes/')) return 'vendor-theme';
          if (normalizedId.includes('/node_modules/react/')) return 'vendor-react';
          if (normalizedId.includes('/node_modules/react-dom/')) return 'vendor-react';
          if (normalizedId.includes('/node_modules/scheduler/')) return 'vendor-react';

          return undefined;
        },
      },
    },
  },
});
