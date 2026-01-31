import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';

// Read manifest directly (CRXJS needs JSON object, not import)
import manifest from './manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@brainbox/shared': resolve(__dirname, '../../packages/shared'),
      '@brainbox/shared/schemas': resolve(__dirname, '../../packages/shared/schemas.js'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/ui/popup.html'),
      },
    },
  },
  // Dev server config for extension HMR
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
