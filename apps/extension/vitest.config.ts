import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@brainbox/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@brainbox/validation': path.resolve(__dirname, '../../packages/validation/src'),
      '@brainbox/database': path.resolve(__dirname, '../../packages/database/src')
    }
  }
});
