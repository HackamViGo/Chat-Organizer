import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/__tests__/**'
      ],
      thresholds: {
        'src/background/**': {
          statements: 90,
          branches: 85
        }
      }
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts'
    ],
    mockReset: true,
    restoreMocks: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@brainbox/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@brainbox/validation': path.resolve(__dirname, '../../packages/validation/src')
    }
  }
});
