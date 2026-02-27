import type { UserConfig } from '@commitlint/types'

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Conventional Commits от CONTRIBUTING.md
    'type-enum': [2, 'always', [
      'feat',      // Нова функционалност
      'fix',       // Bug fix
      'refactor',  // Рефакторинг
      'docs',      // Документация
      'chore',     // Поддръжка
      'test',      // Тестове
      'perf',      // Performance
      'ci',        // CI/CD промени
      'build',     // Build system
      'revert',    // Revert на commit
    ]],
    'scope-enum': [1, 'always', [
      'dashboard', 'extension', 'shared', 'validation', 'database',
      'config', 'assets', 'ci', 'deps', 'security',
    ]],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
  },
}

export default config
