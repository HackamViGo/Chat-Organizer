import { defineConfig } from 'vitest/config';
// @ts-ignore - Bypass type issues with Vite core plugins
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react() as any],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        'src/api/**': {
          statements: 85,
          branches: 80
        },
        'src/components/**': {
          statements: 75,
          branches: 75
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
