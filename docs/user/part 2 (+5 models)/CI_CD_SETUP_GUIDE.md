# CI/CD & Git Hooks Setup Guide

## 🎯 Overview

Complete CI/CD workflows and Git hooks for BrainBox extension, ensuring code quality and preventing bugs.

---

## 📦 Installation

### 1. Install Dependencies

```bash
# Install Git hooks manager
pnpm add -D husky

# Install linting tools
pnpm add -D lint-staged prettier eslint

# Install commit message validator
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

### 2. Initialize Husky

```bash
# Initialize husky
pnpm exec husky install

# Create hooks directory
mkdir -p .husky
```

### 3. Copy Files

```bash
# Copy workflow files
cp -r .github/ /path/to/your/project/

# Copy hook files
cp -r .husky/ /path/to/your/project/

# Copy scripts
cp -r scripts/ /path/to/your/project/

# Copy configs
cp .lintstagedrc.js /path/to/your/project/
```

### 4. Make Hooks Executable

```bash
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
chmod +x .husky/commit-msg
chmod +x scripts/*.js
```

### 5. Update package.json

Add the scripts from `package.json.example` to your `package.json`.

---

## 🔧 GitHub Actions Workflows

### Workflow 1: Test Suite (`.github/workflows/test.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual dispatch

**Jobs:**
1. **Unit Tests** - Runs on Node 18 & 20
2. **Auth Tests** - Tests authentication modules
3. **Platform Tests** - Tests all 8 platform adapters
4. **Integration Tests** - End-to-end flows
5. **Coverage Check** - Enforces 85% threshold

**Artifacts:**
- Test results
- Coverage reports (uploaded to Codecov)

### Workflow 2: Build & Lint (`.github/workflows/build.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests

**Jobs:**
1. **Lint** - ESLint, Prettier, TypeScript
2. **Build** - Extension build verification
3. **Package** - Creates ZIP for distribution

### Workflow 3: Release (`.github/workflows/release.yml`)

**Triggers:**
- Git tags (`v*.*.*`)
- Manual dispatch with version input

**Jobs:**
1. **Validate** - Full test suite + coverage
2. **Build Release** - Creates platform-specific ZIPs
3. **Create Release** - GitHub release with changelog
4. **Publish Chrome** - Uploads to Chrome Web Store
5. **Notify** - Slack notification

---

## 🪝 Git Hooks

### Pre-Commit Hook

**Runs:**
- Lint-staged (ESLint + Prettier on staged files)
- Tests for changed files only
- Fast execution (~5-10 seconds)

**What it does:**
```bash
# Auto-fix linting issues
eslint --fix

# Format code
prettier --write

# Run related tests
vitest related --run
```

**To bypass (not recommended):**
```bash
git commit --no-verify
```

### Pre-Push Hook

**Runs:**
- Full test suite (for `main`/`develop`)
- Quick tests (for feature branches)
- Coverage check
- Build verification

**Execution time:**
- Feature branches: ~10 seconds
- Main/develop: ~30-60 seconds

**To bypass (not recommended):**
```bash
git push --no-verify
```

### Commit-Msg Hook

**Validates:**
- Conventional commit format
- Commit message length
- Valid commit types

**Valid formats:**
```
feat(auth): add DeepSeek token capture
fix(router): handle missing tab gracefully
test(platforms): add Grok adapter tests
docs: update installation guide
```

**Valid types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `perf` - Performance
- `test` - Tests
- `chore` - Maintenance
- `build` - Build system
- `ci` - CI/CD
- `revert` - Revert commit

---

## 📊 Coverage Requirements

### Thresholds
- **Lines**: 85%
- **Branches**: 80%
- **Functions**: 90%
- **Statements**: 85%

### Enforced in:
- ✅ Pre-push hook
- ✅ GitHub Actions (test.yml)
- ✅ Release workflow

---

## 🚀 Usage Examples

### Running Tests Locally

```bash
# All tests
pnpm test:all

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage

# Specific module
pnpm test authManager.test.ts

# Changed files only
pnpm test:changed
```

### Linting

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Release Process

```bash
# Create release (auto-increment)
pnpm release

# Create minor release (2.2.0 → 2.3.0)
pnpm release:minor

# Create major release (2.2.0 → 3.0.0)
pnpm release:major

# Create patch release (2.2.0 → 2.2.1)
pnpm release:patch

# Push release
git push --follow-tags origin main
```

---

## 🔐 Required Secrets

Add these to GitHub Settings → Secrets:

### For Codecov
- `CODECOV_TOKEN` - From codecov.io

### For Chrome Web Store
- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

### For Notifications
- `SLACK_WEBHOOK` - For release notifications

### For Security Scanning
- `SNYK_TOKEN` - From snyk.io

---

## 🐛 Troubleshooting

### Pre-commit fails with "command not found"

```bash
# Reinstall husky
pnpm exec husky install

# Make hooks executable
chmod +x .husky/*
```

### Tests fail in CI but pass locally

```bash
# Check Node version matches CI
node -v  # Should be 18 or 20

# Clear cache
pnpm store prune

# Reinstall
pnpm install --frozen-lockfile
```

### Coverage threshold not met

```bash
# Generate coverage report
pnpm test:coverage

# Open HTML report
open coverage/index.html

# Find uncovered lines
grep -r "0%" coverage/lcov.info
```

### Commit rejected for format

```bash
# Check commit message
cat .git/COMMIT_EDITMSG

# Use conventional format
git commit -m "feat(auth): add new feature"
```

---

## 📈 Monitoring

### GitHub Actions Dashboard
- View: `https://github.com/your-org/brainbox/actions`
- Monitor: Test runs, coverage, build status

### Codecov Dashboard
- View: `https://codecov.io/gh/your-org/brainbox`
- Monitor: Coverage trends, file coverage

---

## ✅ Checklist

Before pushing to `main`:
- [ ] All tests pass locally
- [ ] Coverage meets threshold (85%)
- [ ] Code is linted and formatted
- [ ] Commit messages follow convention
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] Changes documented (if needed)

---

## 🔄 Workflow Diagram

```
Developer → Git Commit
    ↓
Pre-commit Hook
    ├─ Lint staged files
    ├─ Format code
    └─ Run related tests
    ↓
Commit-msg Hook
    └─ Validate message format
    ↓
Git Push
    ↓
Pre-push Hook
    ├─ Run full tests (main/develop)
    ├─ Check coverage
    └─ Verify build
    ↓
GitHub Actions (test.yml)
    ├─ Unit tests (Node 18, 20)
    ├─ Platform tests
    ├─ Integration tests
    └─ Coverage upload
    ↓
GitHub Actions (build.yml)
    ├─ Lint check
    ├─ Type check
    └─ Build verification
    ↓
✅ PR Ready / Merge Approved
```

---

## 📝 Notes

- **Hook bypassing**: Use `--no-verify` only in emergencies
- **Coverage**: Aim for >90% on new code
- **Performance**: Hooks optimized to run <30s
- **Reliability**: All checks deterministic (no flaky tests)

---

**Version**: 2.2.0  
**Last Updated**: 2026-02-02  
**Maintained by**: BrainBox Team
