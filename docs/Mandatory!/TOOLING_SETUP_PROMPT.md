# AGENT — Tooling Setup & CI/CD

**Задача:** Провери и настрой development tooling за BrainBox monorepo.  
**Обхват:** Husky, lint-staged, ESLint, Prettier, GitHub Actions CI/CD.  
**Output:** Работещи git hooks + CI pipeline + подробен доклад за направените промени.

---

## Задължително четене преди старт

- `ARCHITECTURE.md` — monorepo структура (pnpm workspaces, Turborepo)
- `CODE_GUIDELINES.md` — naming, import rules, забранени конструкции (`any`, `console.log`)
- `CONTRIBUTING.md` — Health Gate, Conventional Commits, команди
- `DEPLOYMENT.md` — CI/CD workflow, branch стратегия
- `MONOREPO_DEPS.md` — версии (Node 22, pnpm 10.17, TypeScript 5.9, Vite 7, Next.js 14, Tailwind 4)

---

## Фаза 1 — Диагностика (прочети, не променяй)

### 1.1 Провери какво съществува

Изпълни следните команди и запиши output-а — нищо не инсталираш още:

```bash
# Husky
ls -la .husky/ 2>/dev/null || echo "NO .husky/ directory"
cat .husky/pre-commit 2>/dev/null || echo "NO pre-commit hook"
cat .husky/pre-push 2>/dev/null || echo "NO pre-push hook"

# lint-staged
cat package.json | grep -A 20 '"lint-staged"' || echo "NO lint-staged config"

# ESLint
ls -la .eslintrc* eslint.config* 2>/dev/null || echo "NO eslint config"
ls -la apps/dashboard/.eslintrc* apps/dashboard/eslint.config* 2>/dev/null || echo "NO dashboard eslint"
ls -la apps/extension/.eslintrc* apps/extension/eslint.config* 2>/dev/null || echo "NO extension eslint"

# Prettier
ls -la .prettierrc* prettier.config* 2>/dev/null || echo "NO prettier config"
cat .prettierignore 2>/dev/null || echo "NO .prettierignore"

# commitlint
ls -la .commitlintrc* commitlint.config* 2>/dev/null || echo "NO commitlint config"

# GitHub Actions
ls -la .github/workflows/ 2>/dev/null || echo "NO GitHub Actions workflows"

# Installed packages (check for presence)
cat package.json | grep -E '"husky|lint-staged|commitlint|prettier|eslint"' || echo "NONE found in root"
cat apps/dashboard/package.json | grep -E '"eslint|prettier"' || echo "NONE in dashboard"
cat apps/extension/package.json | grep -E '"eslint|prettier"' || echo "NONE in extension"
```

### 1.2 Диагностичен доклад

След изпълнение на командите, попълни:

```
## Диагностичен Доклад

| Инструмент | Статус | Детайл |
|------------|--------|--------|
| Husky | ✅ Инсталиран / ❌ Липсва / ⚠ Частичен | ... |
| lint-staged | ✅ / ❌ / ⚠ | ... |
| ESLint (root) | ✅ / ❌ / ⚠ | ... |
| ESLint (dashboard) | ✅ / ❌ / ⚠ | ... |
| ESLint (extension) | ✅ / ❌ / ⚠ | ... |
| Prettier | ✅ / ❌ / ⚠ | ... |
| commitlint | ✅ / ❌ / ⚠ | ... |
| pre-commit hook | ✅ / ❌ / ⚠ | ... |
| pre-push hook | ✅ / ❌ / ⚠ | ... |
| GitHub Actions (CI) | ✅ / ❌ / ⚠ | ... |
| GitHub Actions (CD) | ✅ / ❌ / ⚠ | ... |
```

**Спри тук. Представи доклада на потребителя. Чакай потвърждение преди да продължиш към Фаза 2.**

---

## Фаза 2 — Инсталация (само при потвърждение)

### 2.1 Prettier

**Инсталирай само ако липсва:**

```bash
pnpm add -D -w prettier @prettier/plugin-tailwindcss
```

**Създай `.prettierrc` в root:**

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["@prettier/plugin-tailwindcss"],
  "tailwindConfig": "./packages/config/tailwind.config.ts",
  "overrides": [
    {
      "files": ["*.json", "*.md"],
      "options": { "tabWidth": 2 }
    }
  ]
}
```

**Създай `.prettierignore`:**

```
node_modules
.next
dist
.turbo
coverage
*.snap
pnpm-lock.yaml
apps/extension/dist
packages/database/database.types.ts
packages/shared/src/types/database.types.ts
```

### 2.2 ESLint

**Инсталирай само ако липсва:**

```bash
# Root
pnpm add -D -w eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-import

# Dashboard добавки
pnpm add -D --filter @brainbox/dashboard eslint-plugin-react eslint-plugin-react-hooks eslint-config-next

# Extension добавки  
pnpm add -D --filter @brainbox/extension eslint-plugin-react eslint-plugin-react-hooks
```

**Създай `eslint.config.mjs` в root (ESLint flat config):**

```javascript
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
      'no-console': ['error', { allow: [] }],              // ЗАБРАНЕНО: console.*
      
      // Imports — от CODE_GUIDELINES.md §11
      'import/order': ['error', {
        groups: ['builtin', 'external', ['internal'], 'parent', 'sibling', 'index'],
        pathGroups: [
          { pattern: '@brainbox/**', group: 'internal' },
          { pattern: '@/**', group: 'internal', position: 'after' },
        ],
        newlinesBetween: 'always',
        alphabetize: { order: 'asc' },
      }],
      'import/no-duplicates': 'error',
      
      // General
      'no-debugger': 'error',
      'prefer-const': 'error',
    },
  },
]
```

**Добави lint scripts в root `package.json`:**

```json
{
  "scripts": {
    "lint": "turbo lint",
    "lint:fix": "turbo lint -- --fix",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,md}\""
  }
}
```

**Добави lint task в `turbo.json`:**

```json
{
  "tasks": {
    "lint": {
      "dependsOn": [],
      "inputs": ["**/*.ts", "**/*.tsx", "eslint.config.*", ".eslintrc*"],
      "outputs": []
    }
  }
}
```

### 2.3 commitlint

**Инсталирай само ако липсва:**

```bash
pnpm add -D -w @commitlint/cli @commitlint/config-conventional
```

**Създай `commitlint.config.ts` в root:**

```typescript
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
```

### 2.4 Husky

**Инсталирай само ако липсва:**

```bash
pnpm add -D -w husky lint-staged
pnpm exec husky init
```

**`.husky/pre-commit`** — форматиране + lint на staged файлове:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Pre-commit: Running lint-staged..."
pnpm exec lint-staged

if [ $? -ne 0 ]; then
  echo "❌ Pre-commit failed. Fix errors before committing."
  exit 1
fi

echo "✅ Pre-commit passed."
```

**`.husky/pre-push`** — тестове + type check:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Блокирай директен push към main
if [ "$BRANCH" = "main" ]; then
  echo "❌ Direct push to main is forbidden."
  echo "   Create a feature/* or fix/* branch and open a Pull Request."
  exit 1
fi

echo "🔍 Pre-push: Running type check..."
pnpm turbo type-check
if [ $? -ne 0 ]; then
  echo "❌ Type check failed."
  exit 1
fi

echo "🔍 Pre-push: Running tests..."
pnpm turbo test --filter=@brainbox/extension
if [ $? -ne 0 ]; then
  echo "❌ Tests failed."
  exit 1
fi

echo "✅ Pre-push passed."
```

**`.husky/commit-msg`** — Conventional Commits validation:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm exec commitlint --edit "$1"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Commit message does not follow Conventional Commits format."
  echo "   Examples:"
  echo "   feat(dashboard): add folder nesting"
  echo "   fix(extension): resolve auth token refresh"
  echo "   docs: update ARCHITECTURE.md"
  exit 1
fi
```

### 2.5 lint-staged конфигурация

Добави в root `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.{css,scss}": [
      "prettier --write"
    ]
  }
}
```

---

## Фаза 3 — GitHub Actions

**Създай файловете само ако липсват. Ако съществуват — покажи diff с предложените промени.**

### `.github/workflows/quality-gate.yml`

```yaml
name: Quality Gate

on:
  push:
    branches:
      - 'feature/**'
      - 'fix/**'
      - 'hotfix/**'
      - develop
  pull_request:
    branches:
      - main
      - develop
    types: [opened, synchronize, reopened]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality Gate
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.17.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm turbo type-check

      - name: Lint
        run: pnpm turbo lint

      - name: Format check
        run: pnpm format:check

      - name: Commit message check
        if: github.event_name == 'pull_request'
        run: |
          git log --oneline origin/${{ github.base_ref }}..HEAD | while read commit; do
            echo "Checking: $commit"
          done
          pnpm exec commitlint --from origin/${{ github.base_ref }} --to HEAD --verbose

      - name: Unit tests
        run: pnpm turbo test --filter=@brainbox/extension

      - name: Coverage check
        run: |
          pnpm turbo test:coverage --filter=@brainbox/extension
          node -e "
            const fs = require('fs');
            const summary = JSON.parse(fs.readFileSync('./apps/extension/coverage/coverage-summary.json'));
            const lines = summary.total.lines.pct;
            const branches = summary.total.branches.pct;
            console.log('Lines:', lines + '%', '(required: 85%)');
            console.log('Branches:', branches + '%', '(required: 80%)');
            if (lines < 85 || branches < 80) {
              console.error('Coverage thresholds not met!');
              process.exit(1);
            }
          "

      - name: Build Extension
        run: pnpm turbo build --filter=@brainbox/extension

      - name: Build Dashboard
        run: pnpm turbo build --filter=@brainbox/dashboard
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: apps/extension/coverage/
          retention-days: 7
```

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  verify-before-deploy:
    name: Final verification
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.17.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Full quality check
        run: |
          pnpm turbo type-check
          pnpm turbo lint
          pnpm turbo test --filter=@brainbox/extension

      - name: Build verification
        run: pnpm turbo build --filter=@brainbox/extension
        
      # Dashboard се deploy-ва автоматично от Vercel при push към main
      # Този job само верифицира кода преди Vercel да го вземе

  notify:
    name: Deployment notification
    needs: verify-before-deploy
    runs-on: ubuntu-latest
    if: success()

    steps:
      - name: Log deployment
        run: |
          echo "✅ Quality gate passed for commit ${{ github.sha }}"
          echo "🚀 Vercel will auto-deploy from main branch"
          echo "📦 Extension build ready for manual Chrome Web Store upload"
```

---

## Фаза 4 — Верификация

След всички промени провери:

```bash
# 1. Git hooks работят ли?
echo "test: verify hooks work" | pnpm exec commitlint  # Трябва да FAIL (грешен format)
echo "feat(dashboard): test commit message" | pnpm exec commitlint  # Трябва да PASS

# 2. ESLint открива ли нарушенията?
echo "const x: any = 1" > /tmp/test.ts
pnpm exec eslint /tmp/test.ts  # Трябва да репортира грешка

# 3. Prettier форматира ли?
pnpm format:check  # Проверява без промяна

# 4. pre-commit hook работи ли?
git add -A && git commit -m "test"  # Трябва да trigger-ира lint-staged

# 5. pre-push към main блокира ли?
git checkout main 2>/dev/null && git push origin main  # Трябва да FAIL
```

---

## Финален доклад

При приключване представи:

```markdown
## Tooling Setup — Доклад

### Инсталирани пакети
- [пакет@версия] — [защо]

### Създадени файлове
- [файл] — [какво прави]

### Променени файлове
- [файл] — [какво е променено]

### Верификация
- [x] commitlint работи
- [x] ESLint улавя `any` и `console.log`
- [x] Prettier форматира
- [x] pre-commit hook trigger-ира lint-staged
- [x] pre-push блокира push към main
- [x] GitHub Actions файлове са създадени

### Необходими GitHub Secrets
Добави тези в GitHub → Repository → Settings → Secrets and variables → Actions:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(Останалите secrets са само за Vercel — не за CI)

### Следващи стъпки
- [ ] [ако има нещо незавършено]
```
