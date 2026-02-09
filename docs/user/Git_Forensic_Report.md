# Git Forensic Report: Extension Stability Analysis

**Generated:** 2026-02-10T00:38:48+02:00  
**Analyst:** DevOps Forensic Architect  
**Scope:** `apps/extension` - Stable vs Current State Comparison

---

## 🎯 Executive Summary

**Stable Commit Identified:** `1214a70` (2026-01-31 10:35:04 +0200)  
**Commit Message:** "chore: migrate architecture to Turborepo and Vite"  
**Manifest V3 Support:** ✅ **CONFIRMED** (`manifest_version: 3`)  
**Local Lockfiles:** ❌ **NEVER EXISTED** in `apps/extension/`  
**Local node_modules:** ⚠️ **EXISTS** (Created: 2026-02-09 23:13) - **SYMLINKS to root** (pnpm workspace behavior)

---

## 📊 Comparative Analysis

### 1. Scripts Evolution

#### Stable Version (1214a70)
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "type-check": "tsc --noEmit"
}
```
**Total:** 4 scripts

#### Current Version (HEAD: ffd19de)
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "type-check": "tsc --noEmit",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:watch": "vitest --watch",
  "test:auth": "vitest --run src/background/modules/__tests__/authManager.test.ts",
  "test:router": "vitest --run src/background/modules/__tests__/messageRouter.test.ts",
  "test:platforms": "vitest --run src/background/modules/platformAdapters/__tests__",
  "test:prompts": "vitest --run src/background/modules/__tests__/promptInjection.test.ts",
  "test:integration": "vitest --run src/background/modules/__tests__/integration.test.ts",
  "test:new-platforms": "vitest --run src/background/modules/platformAdapters/__tests__/{deepseek,perplexity,grok,qwen,lmarena}.test.ts",
  "test:new-integration": "vitest --run src/background/modules/__tests__/newPlatforms.integration.test.ts",
  "test:all": "vitest --run"
}
```
**Total:** 16 scripts  
**Added:** 12 test-related scripts (no `postinstall`, `prepare`, or lifecycle hooks)

---

### 2. Dependencies Evolution

#### Stable Version (1214a70)
```json
{
  "@brainbox/shared": "workspace:*"
}
```
**Total:** 1 workspace dependency

#### Current Version (HEAD)
```json
{
  "@brainbox/shared": "workspace:*",
  "@brainbox/validation": "workspace:*",
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```
**Total:** 4 dependencies  
**Added:**
- `@brainbox/validation` (workspace package - ✅ **CORRECT LOCATION**)
- `react` + `react-dom` (⚠️ **SHOULD BE IN ROOT** for monorepo consistency)

---

### 3. DevDependencies Evolution

#### Stable Version (1214a70)
```json
{
  "@crxjs/vite-plugin": "^2.0.0-beta.32",
  "@types/chrome": "^0.0.268",
  "@types/node": "^22.14.0",
  "typescript": "~5.8.2",
  "vite": "^5.4.0"
}
```
**Total:** 5 devDependencies

#### Current Version (HEAD)
```json
{
  "@crxjs/vite-plugin": "^2.0.0-beta.32",
  "@types/chrome": "^0.0.268",
  "@types/node": "^22.14.0",
  "@types/react": "^18.3.27",
  "@types/react-dom": "^18.3.7",
  "@vitest/coverage-v8": "^4.0.18",
  "@vitest/ui": "^2.0.0",
  "autoprefixer": "^10.4.24",
  "happy-dom": "^14.0.0",
  "jsdom": "^27.4.0",
  "postcss": "^8.5.6",
  "tailwindcss": "^3.4.19",
  "typescript": "~5.8.2",
  "vite": "^5.4.0",
  "vite-tsconfig-paths": "^6.0.5",
  "vitest": "^2.0.0"
}
```
**Total:** 16 devDependencies  
**Added:** 11 packages
- Testing: `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `happy-dom`, `jsdom`
- Styling: `tailwindcss`, `autoprefixer`, `postcss`
- Tooling: `vite-tsconfig-paths`
- Types: `@types/react`, `@types/react-dom`

⚠️ **CONCERN:** `tailwindcss`, `postcss`, `autoprefixer` should ideally be in root `package.json` for monorepo consistency.

---

### 4. Lockfile Timeline

**Search Results:**
```bash
git log --all --oneline --name-status -- apps/extension/pnpm-lock.yaml apps/extension/package-lock.json
# Output: (empty)
```

**Conclusion:** ✅ **NO LOCAL LOCKFILES** have EVER been committed to `apps/extension/`.

---

### 5. node_modules Investigation

**Physical State:**
```bash
ls -la apps/extension/node_modules/ | head -20
```

**Findings:**
- **Created:** 2026-02-09 23:12-23:13 (last night)
- **Type:** Symlinks to `../../../node_modules/.pnpm/`
- **Behavior:** ✅ **EXPECTED** for pnpm workspace architecture
- **Risk:** ❌ **NOT A PROBLEM** - this is how pnpm hoists dependencies

**Example:**
```
lrwxrwxrwx autoprefixer -> ../../../node_modules/.pnpm/autoprefixer@10.4.24_postcss@8.5.6/node_modules/autoprefixer
lrwxrwxrwx react -> ../../../node_modules/.pnpm/react@18.3.1/node_modules/react
```

---

## 🔍 Commit Evolution Timeline

| Commit | Date | Message | Version |
|--------|------|---------|---------|
| `1214a70` | 2026-01-31 10:35 | migrate to Turborepo and Vite | 2.0.6 |
| `44fd64e` | 2026-01-31 23:16 | cleanup project and fix TS errors | 2.1.2 |
| `d59746b` | 2026-02-02 18:13 | integrate 5 new AI platforms | - |
| `bc83f7f` | 2026-02-05 21:04 | update .gitignore and secure state | - |
| `f1e7630` | 2026-02-07 01:14 | security audit and hardening | - |
| `94901c9` | 2026-02-07 03:01 | integrity audit and service worker fix | - |
| `ffd19de` | 2026-02-10 00:38 | MV3 & monorepo compliance audit | 3.0.1 |

---

## ⚠️ PERMISSION_GUARD: Manifest V3 Verification

**Stable Commit (1214a70) Manifest:**
```json
{
  "manifest_version": 3,
  "name": "BrainBox - AI Chat Organizer",
  "version": "2.0.6"
}
```

**Status:** ✅ **SAFE TO CHECKOUT** - Stable version fully supports Manifest V3.

---

## 🧬 Clean Room Blueprint Recommendations

Based on stable commit `1214a70`, the ideal `apps/extension-new` structure should:

### ✅ Keep from Stable
- Minimal `package.json` (4 scripts only)
- Single workspace dependency (`@brainbox/shared`)
- Core devDependencies: `@crxjs/vite-plugin`, `@types/chrome`, `typescript`, `vite`
- Manifest V3 configuration

### ⚠️ Evaluate Before Migration
- **React/React-DOM:** Should these be in root `package.json`?
- **Tailwind/PostCSS:** Should these be in root `package.json`?
- **Test Infrastructure:** Keep or rebuild from scratch?

### ❌ Avoid
- Local lockfiles (never existed, never needed)
- Lifecycle scripts (`postinstall`, `prepare`) - none detected in history

---

## 📋 Action Items (STOP - NO EXECUTION)

As per instructions, **NO CHANGES** are being made. This is a **READ-ONLY ANALYSIS**.

### Recommended Next Steps (for user approval):
1. ✅ Use `1214a70` as baseline for `apps/extension-new`
2. ⚠️ Review dependency placement (react, tailwind in root vs app-level)
3. ✅ Confirm no local lockfiles needed (pnpm workspace handles this)
4. ✅ Verify `node_modules` symlinks are intentional (pnpm behavior)

---

## 🔐 Security Notes

- No hardcoded secrets detected in diff
- No suspicious lifecycle scripts added
- Manifest V3 compliance maintained throughout history
- All added dependencies are legitimate development tools

---

**End of Report**
