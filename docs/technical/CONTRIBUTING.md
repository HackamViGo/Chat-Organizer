# Contributing to BrainBox
**Version**: 3.0.0 (2026-02-06)

We follow strict engineering standards to maintain a healthy, type-safe, and performant monorepo.

## 🛠️ Development Workflow

### Prerequisites
- **pnpm**: We strictly use `pnpm` for package management.
- **Node.js**: Ensure you are using the LTS version compatible with `package.json`.

### Commands
- **Install**: `pnpm install`
- **Dev Server**: `pnpm dev` (Starts both Dashboard and Extension)
- **Validation**: `pnpm verify` (Runs Health Check)

---

## 🛡️ Coding Standards

### 1. Strict TypeScript
- **No `any`**: Explicitly type all variables and arguments.
- **No ts-ignore**: Do not bypass the compiler. Fix the root cause.
- **Shared Types**: Use `@brainbox/shared` for types shared between apps.

### 2. Clean Code Policy
- **No `console.log`**: Production code must be free of logs. Use a logger utility if necessary, but strip it in production.
- **No Zombie Code**: Remove unused imports, variables, and functions.

### 3. Component Architecture
- **Composability**: Break down large components (e.g., `ChatCard` was split into `ChatActions`, `ChatBadges`).
- **State**: Use `zustand` with `useShallow` for performant state selection.

---

## 🔒 Security Gate & Health Check

We utilize an automated meta-architect script to enforce project health.

**Command**: `pnpm verify`

This script validates:
1.  **Deductions**:
    - Usage of `console.log` (-5 pts)
    - Usage of `any` (-10 pts)
    - Hardcoded secrets (-20 pts)
    - Test failures (-15 pts)
2.  **Threshold**: You must achieve a **Health Score > 70** to push changes.

---

## 🚀 Committing Guidelines

We use conventional commits:
- `feat`: New features
- `fix`: Bug fixes
- `refactor`: Code restructuring without behavioral change
- `docs`: Documentation updates
- `chore`: Maintenance tasks

**Example**:
```bash
git commit -m "feat(dashboard): add chat folder organization"
```

---

## ⚡ Turborepo Pipeline

We use Turbo to orchestrate builds.
- **`// turbo`**: Use this comment in task files to indicate auto-runnable steps.
- **Caching**: Turbo caches build artifacts. If you have weird issues, try `rm -rf node_modules` and reinstall.
