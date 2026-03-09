---
version: 5.0.0
priority: HIGH
override_allowed: WITH_DOCUMENTATION
---

# Workflow Rules — Git, DevOps, Environment

> These rules ensure consistent development workflow and deployment processes.

---

## 🟡 W1. Git Workflow

### W1.1 Branch Strategy

#### Rule: Three-Tier Model

```
main (production)
  ↑ PR only
dev (integration)
  ↑ PR only
feature/* | fix/* | hotfix/* | chore/*
  ↑ Work here
```

#### Branch Lifespan

- **main**: Permanent (protected)
- **dev**: Permanent (protected)
- **feature/**: Delete after merge
- **fix/**: Delete after merge
- **hotfix/**: Keep for 30 days (audit trail)

---

### W1.2 Branch Naming Convention

#### Rule: Structured Names

```bash
# Format: {type}/{scope}-{description}

# Types
feature/    # New functionality
fix/        # Bug fix
hotfix/     # Critical production fix
chore/      # Maintenance (deps, configs)
refactor/   # Code restructure
docs/       # Documentation only
test/       # Test additions/updates

# Examples
feature/dashboard-global-brain        ✅
fix/extension-token-encryption        ✅
hotfix/rls-bypass-critical            ✅
chore/update-dependencies             ✅
refactor/zustand-stores               ✅

# Bad examples
my-branch                             ❌ No type
feature/add-stuff                     ❌ Unclear description
fix                                   ❌ No description
FEATURE/dashboard                     ❌ Uppercase type
```

#### Scope Guidelines

```
dashboard    — Dashboard app changes
extension    — Extension changes
api          — Backend API changes
db           — Database changes
ui           — UI component library
docs         — Documentation
ci           — CI/CD changes
deps         — Dependency updates
```

---

### W1.3 Commit Message Format

#### Rule: Conventional Commits

```
type(scope): short description

[optional body]

[optional footer]
```

#### Types

```
feat      — New feature
fix       — Bug fix
refactor  — Code change (no behavior change)
perf      — Performance improvement
style     — Formatting, missing semicolons (no code change)
test      — Add/update tests
docs      — Documentation only
chore     — Tooling, configs, dependencies
revert    — Revert previous commit
```

#### Examples

```bash
# ✅ GOOD
feat(dashboard): add global brain search
fix(extension): correct token encryption logic
refactor(store): migrate to useShallow pattern
perf(api): add database query indexes
test(e2e): add auth flow test
docs(readme): update installation steps
chore(deps): update next to 14.1.0

# With body and footer
feat(extension): add Gemini platform adapter

- Implement conversation extraction from __WIZ_DATA__
- Handle double-serialized JSON format
- Add retry logic for rate limits

Closes #123
Breaking change: Requires new manifest permission

# ❌ BAD
update stuff                          ❌ No type
Fix bug                               ❌ Capitalized, no scope
feat: added new feature here          ❌ Past tense, vague
WIP                                   ❌ Work in progress (use draft PR instead)
```

#### Scope Guidelines

Same as branch scopes + specific components:

```
(auth)         — Authentication
(chat)         — Chat features
(prompt)       — Prompt features
(folder)       — Folder management
(ai)           — AI integration
(rls)          — Row Level Security
```

---

### W1.4 Commit Checklist

#### Rule: Pre-Commit Requirements

```bash
# Before every commit:
- [ ] pnpm verify ≥ 80 score
- [ ] No console.log statements (use logger.ts)
- [ ] No commented-out code blocks
- [ ] No TODO comments without issue number
- [ ] Tests pass (pnpm test)
- [ ] Types check (pnpm type-check)
- [ ] Lint passes (pnpm lint)
```

#### Automated Check (Husky)

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# 1. Verify score
SCORE=$(pnpm verify --json | jq '.score')
if [ "$SCORE" -lt 80 ]; then
  echo "❌ Verify score too low: $SCORE/100 (minimum: 80)"
  exit 1
fi

# 2. Check for console.log
if git diff --cached | grep -E "console\.(log|debug|info)" > /dev/null; then
  echo "❌ console.log detected. Use logger.ts instead."
  exit 1
fi

# 3. Check for commented code
if git diff --cached | grep -E "^[+].*\/\/ [A-Z]" | grep -v "TODO\|FIXME\|NOTE" > /dev/null; then
  echo "⚠️  Warning: Commented code detected. Consider removing."
fi

echo "✅ Pre-commit checks passed"
```

---

### W1.5 Protected Branches

#### Rule: Branch Protection (GitHub Settings)

```yaml
main:
  required_reviews: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
  required_status_checks:
    - type-check
    - lint
    - test
    - build
  enforce_admins: true
  restrict_pushes: true
  allowed_push_users: [] # Nobody can push directly

dev:
  required_reviews: 1
  dismiss_stale_reviews: true
  required_status_checks:
    - type-check
    - lint
    - test
  restrict_pushes: true
  allowed_push_users: []
```

#### Rule: Force Push

```bash
# ❌ ABSOLUTELY FORBIDDEN
git push --force origin main
git push --force origin dev

# ✅ ALLOWED (only on feature branches, with caution)
git push --force-with-lease origin feature/my-branch

# Use case: After interactive rebase to clean history before PR
```

---

## 🟡 W2. Pull Request Protocol

### W2.1 PR Template

#### Rule: Required Sections

```markdown
## Description

Brief summary of changes (1-2 sentences).

## Type of Change

- [ ] 🎉 New feature
- [ ] 🐛 Bug fix
- [ ] 🔧 Refactor
- [ ] 📝 Documentation
- [ ] 🧪 Tests
- [ ] ⚡ Performance
- [ ] 🔒 Security fix

## Changes Made

- Change 1 (file: `path/to/file.ts`)
- Change 2 (file: `path/to/another.ts`)

## Related Issues

Closes #123
Refs #456

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

### Test Coverage

- Before: X%
- After: Y%

## Screenshots (if UI changes)

| Before   | After    |
| -------- | -------- |
| ![](url) | ![](url) |

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] pnpm verify ≥ 80
- [ ] Breaking changes documented (if any)

## Deployment Notes

Any special steps needed for deployment?

## Rollback Plan

How to revert if this causes issues?
```

---

### W2.2 PR Size Guidelines

#### Rule: Size Limits

```
Target:  ≤ 400 lines changed
Maximum: ≤ 800 lines changed

Exceptions:
- Generated code (mark with [auto-generated] in title)
- Database migrations (single migration file)
- Dependency updates (automated PR)
- Initial project setup
```

#### How to Split Large PRs

```
Example: "Add chat feature"

Split into:
1. PR #1: Add database schema (migrations)
2. PR #2: Add API endpoints (backend)
3. PR #3: Add Zod schemas (validation)
4. PR #4: Add Zustand store (state)
5. PR #5: Add UI components (frontend)

Each PR builds on the previous, but is independently reviewable.
```

---

### W2.3 Review Process

#### Rule: Review Checklist (for Reviewers)

```markdown
## Code Review Checklist

### Security

- [ ] No hardcoded secrets
- [ ] User input validated with Zod
- [ ] Authentication checks present
- [ ] RLS policies correct

### Architecture

- [ ] No cross-app imports (dashboard ↔ extension)
- [ ] Shared code in packages/
- [ ] Follows file ownership matrix
- [ ] No new architectural layers without RFC

### Type Safety

- [ ] No `any` types
- [ ] Type guards for `unknown`
- [ ] Zod schemas for external data
- [ ] TypeScript strict mode passing

### Code Quality

- [ ] No console.log
- [ ] Error handling present
- [ ] Comments explain "why" not "what"
- [ ] No dead code
- [ ] No TODOs without issue numbers

### Testing

- [ ] Tests added for new features
- [ ] Tests updated for changes
- [ ] Coverage ≥ 80%
- [ ] E2E tests for critical paths

### Documentation

- [ ] README updated (if needed)
- [ ] API docs updated (if new endpoint)
- [ ] Comments for complex logic
- [ ] Migration guide (if breaking change)
```

#### Approval Requirements

```
Target branch: dev
  Required: 1 approval from any senior developer

Target branch: main
  Required: 2 approvals
  - 1 from ARCHITECT
  - 1 from relevant domain expert (BACKEND/FRONTEND/EXTENSION)
```

---

### W2.4 Merge Strategy

#### Rule: Squash and Merge

```bash
# ✅ CORRECT (default for all PRs)
# GitHub: Use "Squash and merge" button

# Result: Clean history on dev/main
feat(dashboard): add global brain search (#123)

# ❌ FORBIDDEN
# Merge commit (creates messy history)
# Rebase and merge (loses PR context)
```

#### Exception: Release Merges

```bash
# When merging dev → main for release
# Use "Create a merge commit" to preserve release history

git checkout main
git merge --no-ff dev -m "Release v2.0.0"
git tag v2.0.0
git push origin main --tags
```

---

## 🟡 W3. Environment Management

### W3.1 Environment Files

#### Rule: File Structure

```
.env.example      ✅ Template (safe to commit)
.env.prod         ✅ Production (NEVER commit)
.env.dev          ✅ Development (NEVER commit)
.env.docker       ✅ Local Docker (NEVER commit)
.env              ✅ Active env (NEVER commit, git ignored)

.env.local        ❌ FORBIDDEN (Next.js convention, but we use .env.dev)
.env.production   ❌ FORBIDDEN (use .env.prod)
```

#### .gitignore

```bash
# Correct .gitignore
.env
.env.prod
.env.dev
.env.docker
.env.*.local

# But NOT .env.example (this should be committed)
!.env.example
```

---

### W3.2 Environment Switching

#### Rule: Manual Copy (Intentional)

```bash
# ✅ CORRECT (manual, conscious decision)
# Development
cp .env.dev .env

# Production (DANGEROUS — only for verified deploys)
cp .env.prod .env

# ❌ FORBIDDEN (automatic switching)
# No scripts that auto-switch based on NODE_ENV
# (prevents accidental production data access)
```

#### Rule: Subdirectory Sync

```bash
# After switching root .env, sync to apps
pnpm run sync:env

# scripts/sync-env.sh
#!/bin/bash
if [ -f ".env" ]; then
  cp .env apps/dashboard/.env
  cp .env apps/extension/.env
  echo "✅ Environment synced to subdirectories"
else
  echo "❌ No .env file found. Run 'cp .env.dev .env' first."
  exit 1
fi
```

---

### W3.3 Variable Naming Convention

#### Rule: Prefix System

```bash
# Public (exposed to client — use sparingly!)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_APP_URL=https://brainbox.app
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx

# Private (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
GEMINI_API_KEY=AIzaSy...
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
DATABASE_URL=postgresql://...

# Format: {SERVICE}_{TYPE}_{QUALIFIER}
SUPABASE_SERVICE_ROLE_KEY     ✅
GEMINI_API_KEY                ✅
UPSTASH_REDIS_REST_TOKEN      ✅

# Bad formats
API_KEY                       ❌ Too generic
SUPABASE_KEY                  ❌ Which key?
gemini_api_key                ❌ Lowercase
```

#### Security Rules

```bash
# ✅ SAFE (public endpoints, non-sensitive)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_APP_URL=...

# ❌ DANGEROUS (exposing secrets to client)
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...  # CRITICAL VIOLATION
NEXT_PUBLIC_GEMINI_API_KEY=...             # CRITICAL VIOLATION
```

---

### W3.4 Docker-Only Development

#### Rule: No Local Services

```bash
# ❌ FORBIDDEN (local installations)
brew install postgresql
brew install redis
apt-get install postgres

# ✅ CORRECT (Docker Compose)
docker-compose up -d postgres redis supabase

# Exception: Node.js and pnpm (needed on host for IDE support)
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: brainbox_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  supabase:
    image: supabase/supabase-local:latest
    ports:
      - '54321:54321' # Studio
      - '54322:54322' # API
    volumes:
      - ./supabase:/supabase

volumes:
  postgres_data:
```

---

## 🟡 W4. CI/CD Pipeline

### W4.1 Quality Gate Workflow

#### Rule: Required Checks (GitHub Actions)

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on:
  push:
    branches: [dev, main]
  pull_request:
    branches: [dev, main]

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile

  type-check:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo type-check

  lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint

  format-check:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm prettier --check "**/*.{ts,tsx,md,json}"

  test:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build:
    needs: [type-check, lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm audit --audit-level=moderate
```

#### Failure Handling

```
Any job fails → PR cannot be merged
Override: Only via emergency protocol (00_META.md)
```

---

### W4.2 Deployment Triggers

#### Rule: Automatic Deployments

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches:
      - dev # → Vercel Preview
      - main # → Vercel Production

jobs:
  deploy-dashboard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile

      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            vercel deploy --prod --token=$VERCEL_TOKEN
          else
            vercel deploy --token=$VERCEL_TOKEN
          fi

      - name: Notify Deployment
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Dashboard deployed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Branch:* ${{ github.ref_name }}\n*Commit:* ${{ github.sha }}"
                  }
                }
              ]
            }
```

#### Extension Release

```yaml
# .github/workflows/release-extension.yml
name: Release Extension

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  build-extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile

      - name: Build Extension
        run: pnpm turbo build --filter=@brainbox/extension

      - name: Package Chrome
        run: |
          cd apps/extension/dist
          zip -r ../brainbox-chrome-${{ github.ref_name }}.zip .

      - name: Package Firefox
        run: |
          node scripts/convert-manifest-to-v2.js
          cd apps/extension/dist-firefox
          zip -r ../brainbox-firefox-${{ github.ref_name }}.zip .

      - name: Generate Checksums
        run: |
          cd apps/extension
          shasum -a 256 *.zip > checksums.txt

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            apps/extension/brainbox-chrome-*.zip
            apps/extension/brainbox-firefox-*.zip
            apps/extension/checksums.txt
          body: |
            ## Changes
            See [CHANGELOG.md](CHANGELOG.md)

            ## Installation
            ### Chrome
            1. Download `brainbox-chrome-*.zip`
            2. Extract to folder
            3. Load unpacked in `chrome://extensions`

            ### Firefox
            1. Download `brainbox-firefox-*.zip`
            2. Visit `about:debugging#/runtime/this-firefox`
            3. Load temporary add-on
```

---

### W4.3 Rollback Procedure

#### Rule: Production Rollback

```bash
# If production breaks after deploy:

# 1. Immediate revert (on main branch)
git revert {bad-commit-sha}
git push origin main

# 2. Vercel will auto-deploy the revert

# 3. Create hotfix branch for proper fix
git checkout -b hotfix/fix-production-issue main
# ... make fix ...
git commit -m "hotfix: fix production issue"

# 4. PR directly to main (skip dev for hotfix)
# 5. After merge, cherry-pick to dev
git checkout dev
git cherry-pick {hotfix-commit-sha}
git push origin dev
```

#### Database Rollback

```bash
# If migration caused issue:

# 1. Find migration timestamp
ls supabase/migrations/
# e.g., 20260225143000_problematic_migration.sql

# 2. Apply rollback script
supabase db reset --db-url $DATABASE_URL
psql $DATABASE_URL < supabase/rollbacks/20260225143000_rollback.sql

# 3. Revert migration commit
git revert {migration-commit}

# 4. Document incident
# docs/incidents/2026-02-25_migration_rollback.md
```

---

## 🟡 W5. Verification Score System

### W5.1 Score Calculation

#### Rule: Component Weights

```bash
pnpm verify

# Components:
Type Check     30 points  (tsc --noEmit)
Lint           20 points  (eslint)
Format         10 points  (prettier --check)
Tests          30 points  (vitest run --coverage)
Security       10 points  (pnpm audit)
─────────────────────────
Total         100 points
```

#### Implementation

```typescript
// scripts/verify.ts
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function verify() {
  let score = 0
  const results = []

  // Type check (30 points)
  try {
    await execAsync('pnpm turbo type-check')
    score += 30
    results.push({ name: 'Type Check', score: 30, status: 'pass' })
  } catch (error) {
    results.push({ name: 'Type Check', score: 0, status: 'fail' })
  }

  // Lint (20 points)
  try {
    await execAsync('pnpm turbo lint')
    score += 20
    results.push({ name: 'Lint', score: 20, status: 'pass' })
  } catch (error) {
    results.push({ name: 'Lint', score: 0, status: 'fail' })
  }

  // Format (10 points)
  try {
    await execAsync('pnpm prettier --check "**/*.{ts,tsx,md}"')
    score += 10
    results.push({ name: 'Format', score: 10, status: 'pass' })
  } catch (error) {
    results.push({ name: 'Format', score: 0, status: 'fail' })
  }

  // Tests with coverage (30 points)
  try {
    const { stdout } = await execAsync('pnpm turbo test -- --coverage --json')
    const coverage = JSON.parse(stdout)
    const coveragePercent = coverage.total.lines.pct

    if (coveragePercent >= 80) {
      score += 30
      results.push({ name: 'Tests', score: 30, status: 'pass', coverage: coveragePercent })
    } else {
      const partialScore = Math.floor((coveragePercent / 80) * 30)
      score += partialScore
      results.push({
        name: 'Tests',
        score: partialScore,
        status: 'partial',
        coverage: coveragePercent,
      })
    }
  } catch (error) {
    results.push({ name: 'Tests', score: 0, status: 'fail' })
  }

  // Security audit (10 points)
  try {
    await execAsync('pnpm audit --audit-level=moderate')
    score += 10
    results.push({ name: 'Security', score: 10, status: 'pass' })
  } catch (error) {
    results.push({ name: 'Security', score: 0, status: 'fail' })
  }

  // Output
  console.log('\n📊 Verification Results\n')
  results.forEach((r) => {
    const icon = r.status === 'pass' ? '✅' : r.status === 'partial' ? '⚠️' : '❌'
    console.log(`${icon} ${r.name}: ${r.score} points`)
    if (r.coverage) console.log(`   Coverage: ${r.coverage}%`)
  })

  console.log(`\n🎯 Total Score: ${score}/100`)

  if (score < 80) {
    console.log('\n❌ Score too low for commit (minimum: 80)')
    process.exit(1)
  } else {
    console.log('\n✅ Ready to commit')
  }
}

verify()
```

---

### W5.2 Minimum Thresholds

#### Rule: Commit Gate

```
Minimum to commit: 80/100

Breakdown tolerance:
- Type Check: Must pass (30/30) — NO EXCEPTIONS
- Lint: Must pass (20/20) — NO EXCEPTIONS
- Format: Must pass (10/10) — can auto-fix
- Tests: ≥ 24/30 (80% coverage)
- Security: 0-10 (moderate vulns allowed temporarily)
```

#### Exception Process

```bash
# If score < 80 but commit is urgent:

# 1. Document reason
git commit --no-verify -m "fix: critical bug

VERIFY_EXCEPTION: Score 75/100
Reason: Tests failing due to external API mock issue
Tracking: #456
Plan: Fix tests in follow-up PR within 24h"

# 2. Create tracking issue immediately
gh issue create --title "Fix verify score for commit abc123" --label tech-debt

# 3. Add to sprint board with HIGH priority
```

---

## 🟡 W6. Documentation Requirements

### W6.1 Code Comments

#### Rule: When to Comment

```typescript
// ✅ GOOD (explains WHY or complex logic)
// We cache prompts for 24h because the external API has aggressive rate limits
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Using token bucket instead of fixed window because:
// 1. Prevents thundering herd at window reset
// 2. Allows burst traffic while maintaining average rate
class TokenBucket { ... }

// ❌ BAD (explains WHAT — code is self-documenting)
// Set the user ID
const userId = user.id;

// Loop through chats
chats.forEach(chat => { ... });
```

#### Rule: TODO Comments

```typescript
// ✅ CORRECT (with issue number)
// TODO(#123): Refactor to use React 19 useTransition when stable

// TODO(#456): Add retry logic after upstream library fixes type exports
// Tracking: https://github.com/library/repo/issues/789

// ❌ FORBIDDEN (no tracking)
// TODO: Fix this later
// FIXME: Broken
```

---

### W6.2 API Documentation

#### Rule: Endpoint Documentation

````typescript
/**
 * Create a new chat
 *
 * @route POST /api/chats
 * @access Private (requires authentication)
 * @rateLimit 10 requests per 10 seconds
 *
 * @body {CreateChatInput} - Chat data
 * @returns {Chat} Created chat with ID
 *
 * @throws {400} Validation error
 * @throws {401} Unauthorized
 * @throws {429} Rate limit exceeded
 * @throws {500} Database error
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/chats', {
 *   method: 'POST',
 *   headers: { 'Authorization': `Bearer ${token}` },
 *   body: JSON.stringify({
 *     title: 'My Chat',
 *     platform: 'chatgpt',
 *     content: '...'
 *   })
 * });
 * const chat = await response.json();
 * ```
 */
export async function POST(req: Request) {
  // Implementation
}
````

---

### W6.3 README Requirements

#### Rule: Minimum Sections

Every package/app must have a README with:

````markdown
# {Package/App Name}

Brief description (1-2 sentences).

## Installation

```bash
pnpm install
```
````

## Usage

```typescript
import { something } from '@brainbox/{package}'
```

## API Reference

(if applicable)

## Development

```bash
pnpm dev
pnpm test
pnpm build
```

## Environment Variables

(if applicable)

## Architecture

(link to main docs if complex)

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT

````

---

## 🚨 Violation Handling

### Automatic Enforcement
```yaml
# Pre-commit hooks (.husky/pre-commit)
- Check commit message format (commitlint)
- Run pnpm verify
- Check for forbidden patterns

# CI/CD (.github/workflows/quality-gate.yml)
- All checks must pass
- Coverage ≥ 80%
- No security vulnerabilities (moderate+)
````

### Manual Review

- PR reviewers check branch naming
- Reviewers verify PR template completion
- Reviewers check documentation updates

---

## 📚 Related Documents

- **00_META.md** — Rule hierarchy, amendments
- **01_CRITICAL.md** — Security, architecture rules
- **03_CODE_STANDARDS.md** — Code style, conventions
- **docs/Guides/ARCHITECTURE.md** — System architecture

---

**END OF WORKFLOW RULES**
