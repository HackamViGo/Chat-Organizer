import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/popup/**',
        'src/types/**',
        'src/**/*.d.ts',
      ],
    },
    setupFiles: ['src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@brainbox/shared': resolve(__dirname, '../../packages/shared/src'),
      '@brainbox/shared/logic': resolve(__dirname, '../../packages/shared/src/logic'),
    },
  },
})
