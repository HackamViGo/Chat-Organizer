import { resolve } from 'path'
import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'
import manifest from './src/manifest.json' with { type: 'json' }

export default defineConfig({
  plugins: [crx({ manifest }) as any],
  resolve: {
    alias: {
      '@brainbox/shared/logic': resolve(__dirname, '../../packages/shared/src/logic'),
      '@brainbox/shared': resolve(__dirname, '../../packages/shared'),
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: { port: 5174 },
  },
})
