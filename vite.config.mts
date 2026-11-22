import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

import svgrPlugin from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  // Assets are served from the site root on every host (Cloudflare preview
  // URLs included); CF_PAGES_URL is a full origin and must not be used here.
  base: '/',
  server: {
    port: 3000,
    strictPort: true,
  },
  // This changes the out put dir from dist to build
  // comment this out if that isn't relevant for your project
  build: {
    outDir: 'build',
    // One JS bundle by design: an open tab never needs a chunk from an older
    // deploy (Cloudflare Pages serves only the latest deployment's files).
    rolldownOptions: {
      output: { inlineDynamicImports: true },
    },
    chunkSizeWarningLimit: 1200,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
  },
  plugins: [
    react(),
    svgrPlugin({
      svgrOptions: {
        icon: true,
        // ...svgr options (https://react-svgr.com/docs/options/)
      },
    }),
  ],
});
