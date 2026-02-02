# CI/CD Setup Guide for BrainBox

This guide outlines the CI/CD pipeline and configuration for the BrainBox extension.

## GitHub Workflows

The project includes three main workflows in `.github/workflows/`:

1.  **Run Tests (`test.yml`)**: Triggered on every push and pull request to `main` and `develop`. Executes all extension and shared package tests.
2.  **Build Extension (`build.yml`)**: Triggered on every push and pull request to `main` and `develop`. Ensures the extension builds successfully and uploads the build as an artifact.
3.  **Release Extension (`release.yml`)**: Triggered when a new tag starting with `v` (e.g., `v2.1.3`) is pushed. Builds the extension, zips it, and creates a GitHub release with the attached bundle.

## Pre-commit Hooks

The project uses `lint-staged` to ensure code quality before commits.

- **Configuration**: `.lintstagedrc.js` in the project root.
- **Actions**:
    - Fixes ESLint and Prettier for JS/TS/TSX files.
    - Formats JSON, MD, and YML files.
    - Runs TypeScript type checking and relevant Vitest tests for extension files.

## Commit Message Convention

We follow a structured commit message format to maintain a clean history.

- **Hook**: `scripts/validate-commit.js`.
- **Format**: `type(scope): description`
- **Allowed Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **Example**: `feat(auth): add deepseek adapter`

## Manual Test Execution

You can run individual test suites via pnpm:

```bash
# Run all tests
pnpm --filter @brainbox/extension test:all

# Run only new platform tests
pnpm --filter @brainbox/extension test:new-platforms

# Run new integration tests
pnpm --filter @brainbox/extension test:new-integration
```
