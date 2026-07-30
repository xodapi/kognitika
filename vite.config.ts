import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Strips dead vendor-charts cross-chunk imports from the entry chunk.
 * Rollup manualChunks can leave stale import statements across chunk
 * boundaries even when the imported binding is tree-shaken away, causing
 * recharts/d3 (vendor-charts, ~477 KB) to be counted in the initial bundle.
 */
function stripVendorChartsPreload(): Plugin {
  return {
    name: 'strip-vendor-charts-preload',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        return html.replace(
          /\n\s*<link[^>]+rel="modulepreload"[^>]+vendor-charts[^>]+>/g,
          '',
        );
      },
    },
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) {
          const code = chunk.code;
          const cleaned = code
            // Remove vendor-charts import at line start
            .replace(/import\{[^}]*\}from"\.\/vendor-charts-[^"]+\.js";/g, '')
            // Remove vendor-charts import with leading semicolons
            .replace(/;\s*import\{[^}]*\}from"\.\/vendor-charts-[^"]+\.js"/g, '');
          if (code !== cleaned) {
            chunk.code = cleaned;
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stripVendorChartsPreload()],
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
  esbuild: {
    keepNames: true,
    // Preserve data-testid attributes in production
    drop: [],
  },
  build: {
    minify: 'esbuild',
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
