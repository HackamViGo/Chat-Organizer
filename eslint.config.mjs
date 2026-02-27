import typescriptPlugin from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      'packages/database/**',      // Auto-generated
      'packages/shared/src/types/database.types.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'import': importPlugin,
    },
    rules: {
      // TypeScript — от CODE_GUIDELINES.md §1
      '@typescript-eslint/no-explicit-any': 'error',       // ЗАБРАНЕНО: any
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
      }],
      
      // Console — от CODE_GUIDELINES.md §8
      'no-console': 'error',              // ЗАБРАНЕНО: console.*
      
      // Imports — от CODE_GUIDELINES.md §11
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      }],
      'import/no-duplicates': 'error',
      
      // General
      'no-debugger': 'error',
      'prefer-const': 'error',
    },
  },
]
