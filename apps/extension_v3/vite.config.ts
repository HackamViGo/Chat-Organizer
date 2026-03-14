import { resolve } from 'path';

import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),          // Must be BEFORE crx
    crx({ manifest })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '3.0.0')
  },
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    cors: true,
    hmr: {
      clientPort: 5174,
      host: 'localhost'
    }
  }
});
