module.exports = {
  // TS/TSX — само Prettier + ESLint без --max-warnings 0
  '**/*.{ts,tsx}': [
    'prettier --write',
    // Lint само staged файловете, warn за legacy дълг
    (files) => `eslint --fix --max-warnings 999 ${files.map((f) => `"${f}"`).join(' ')}`,
  ],
  // Legacy JS content scripts — само Prettier, без ESLint
  // (too much pre-existing debt, tracked separately)
  '**/*.js': ['prettier --write'],
  '**/*.{json,md,yml,yaml}': ['prettier --write'],
  'apps/extension/src/**/*.ts': [
    () => 'pnpm run --prefix apps/extension type-check',
    (files) =>
      `pnpm exec vitest related --run --root apps/extension ${files.map((f) => `"${f}"`).join(' ')}`,
  ],
}
