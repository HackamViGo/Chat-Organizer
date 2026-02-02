module.exports = {
  '*.{js,ts,tsx}': [
    'eslint --fix',
    'prettier --write'
  ],
  '*.{json,md,yml}': [
    'prettier --write'
  ],
  'apps/extension/src/**/*.ts': [
    () => 'npm run --prefix apps/extension type-check',
    'vitest related --run'
  ]
};
