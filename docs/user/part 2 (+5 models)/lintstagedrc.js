/**
 * Lint-Staged Configuration
 * Runs linters on staged files only
 */

module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write'
  ],
  
  // Test files - run related tests
  '*.test.{ts,tsx}': [
    'vitest related --run'
  ],
  
  // JSON files
  '*.json': [
    'prettier --write'
  ],
  
  // Markdown files
  '*.md': [
    'prettier --write'
  ],
  
  // CSS files
  '*.{css,scss}': [
    'prettier --write'
  ]
};
