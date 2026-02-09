# Clean Room Extension Architecture Plan

> **Status**: PLANNING PHASE  
> **Created**: 2026-02-10  
> **Purpose**: Diagnostic Clean Room version of BrainBox Extension

---

## Executive Summary

This document outlines the architecture for `apps/extension-new`, a Clean Room rebuild of the BrainBox Chrome Extension. The goal is to create a simplified, Manifest V3-compliant structure that maintains all core functionality while improving maintainability and diagnostic capabilities.

---

## 1. Proposed Directory Structure

```
apps/extension-new/
├── manifest.json                    # Manifest V3 configuration
├── package.json                     # Workspace-integrated dependencies
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite + CRXJS build config
├── vitest.config.ts                 # Test configuration
├── tailwind.config.ts               # TailwindCSS config
├── postcss.config.js                # PostCSS config
├── .env.development                 # Development environment
├── .env.production                  # Production environment
│
├── public/                          # Static assets
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── content-styles.css           # Global content script styles
│
├── src/
│   ├── background/                  # Service Worker (Manifest V3)
│   │   ├── index.ts                 # Main service worker entry
│   │   ├── lifecycle.ts             # Install/Activate handlers
│   │   ├── core/                    # Core background modules
│   │   │   ├── auth.ts              # Authentication manager
│   │   │   ├── cache.ts             # Cache manager
│   │   │   ├── sync.ts              # Sync manager
│   │   │   ├── storage.ts           # Storage abstraction
│   │   │   └── messaging.ts         # Message router
│   │   ├── services/                # Business logic services
│   │   │   ├── dashboard-api.ts     # Dashboard API client
│   │   │   ├── context-menus.ts     # Dynamic context menus
│   │   │   ├── network-observer.ts  # Network monitoring
│   │   │   ├── tab-manager.ts       # Tab management
│   │   │   └── installation.ts      # Installation/update logic
│   │   └── platforms/               # Platform adapters
│   │       ├── base.ts              # Base adapter interface
│   │       ├── registry.ts          # Platform registry
│   │       ├── chatgpt.ts
│   │       ├── claude.ts
│   │       ├── gemini.ts
│   │       ├── grok.ts
│   │       ├── perplexity.ts
│   │       ├── deepseek.ts
│   │       ├── qwen.ts
│   │       ├── lmarena.ts
│   │       └── lmsys.ts
│   │
│   ├── content/                     # Content scripts
│   │   ├── master.ts                # Universal content script
│   │   ├── platform-scripts/        # Platform-specific injectors
│   │   │   ├── chatgpt.ts
│   │   │   ├── claude.ts
│   │   │   ├── gemini.ts
│   │   │   ├── gemini-inject.ts     # Gemini token extractor
│   │   │   ├── grok.ts
│   │   │   ├── perplexity.ts
│   │   │   ├── deepseek.ts
│   │   │   ├── qwen.ts
│   │   │   ├── lmarena.ts
│   │   │   └── dashboard-auth.ts    # Dashboard auth handler
│   │   └── injectors/               # Prompt injection logic
│   │       └── prompt-inject.ts
│   │
│   ├── popup/                       # Extension popup UI
│   │   ├── index.html
│   │   ├── index.tsx                # React entry point
│   │   ├── App.tsx                  # Main app component
│   │   ├── components/              # UI components
│   │   │   ├── Header.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   ├── CurrentChat.tsx
│   │   │   ├── QuickAccess.tsx
│   │   │   ├── Actions.tsx
│   │   │   ├── ModulesPanel.tsx
│   │   │   └── Footer.tsx
│   │   ├── hooks/                   # React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useStorage.ts
│   │   │   ├── useModules.ts
│   │   │   └── useTheme.ts
│   │   └── styles/
│   │       └── index.css            # TailwindCSS entry
│   │
│   ├── lib/                         # Shared utilities
│   │   ├── config.ts                # Configuration management
│   │   ├── logger.ts                # Logging utility
│   │   ├── schemas.ts               # Zod schemas (local)
│   │   ├── normalizers.ts           # Data normalizers
│   │   ├── rate-limiter.ts          # Rate limiting
│   │   ├── platform-config.ts       # Platform configurations
│   │   └── ui-helpers.ts            # UI utility functions
│   │
│   ├── types/                       # TypeScript types
│   │   ├── global.d.ts              # Global type declarations
│   │   ├── chrome.d.ts              # Chrome API extensions
│   │   ├── platforms.ts             # Platform type definitions
│   │   └── messages.ts              # Message type definitions
│   │
│   └── __tests__/                   # Test suite
│       ├── setup.ts                 # Test setup
│       ├── background/              # Background tests
│       │   ├── auth.test.ts
│       │   ├── messaging.test.ts
│       │   ├── sync.test.ts
│       │   └── platforms/
│       │       ├── chatgpt.test.ts
│       │       ├── claude.test.ts
│       │       ├── gemini.test.ts
│       │       └── integration.test.ts
│       ├── content/                 # Content script tests
│       │   └── master.test.ts
│       └── popup/                   # Popup tests
│           └── App.test.tsx
│
└── docs/                            # Documentation
    ├── ARCHITECTURE.md              # Architecture overview
    ├── MIGRATION.md                 # Migration guide
    └── TESTING.md                   # Testing guide
```

**Total Estimated Structure**: ~18 directories, ~75 files

---

## 2. Dependency Matrix

### 2.1 Workspace Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@brainbox/shared` | `workspace:*` | Shared utilities, types, validation |
| `@brainbox/validation` | `workspace:*` | Zod schemas for data validation |

### 2.2 Production Dependencies

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `react` | `^18.3.1` | UI framework | Popup interface |
| `react-dom` | `^18.3.1` | React DOM renderer | Popup rendering |

### 2.3 Development Dependencies

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@crxjs/vite-plugin` | `^2.0.0-beta.32` | Chrome extension bundler | Manifest V3 support |
| `@types/chrome` | `^0.0.268` | Chrome API types | TypeScript support |
| `@types/node` | `^22.14.0` | Node.js types | Build tooling |
| `@types/react` | `^18.3.27` | React types | TypeScript support |
| `@types/react-dom` | `^18.3.7` | React DOM types | TypeScript support |
| `@vitest/coverage-v8` | `^4.0.18` | Test coverage | Code coverage reports |
| `@vitest/ui` | `^2.0.0` | Test UI | Visual test runner |
| `autoprefixer` | `^10.4.24` | CSS prefixer | PostCSS plugin |
| `happy-dom` | `^14.0.0` | DOM environment | Vitest testing |
| `jsdom` | `^27.4.0` | DOM environment | Alternative test env |
| `postcss` | `^8.5.6` | CSS processor | TailwindCSS requirement |
| `tailwindcss` | `^3.4.19` | CSS framework | UI styling |
| `typescript` | `~5.8.2` | Type system | Monorepo sync |
| `vite` | `^5.4.0` | Build tool | Fast dev server |
| `vite-tsconfig-paths` | `^6.0.5` | Path resolution | TypeScript paths |
| `vitest` | `^2.0.0` | Test framework | Unit/integration tests |

**Key Principle**: NO local `node_modules`. All dependencies resolved via workspace root.

---

## 3. Logic Migration Map

### 3.1 Background Modules

| Current File | New Location | Migration Notes |
|--------------|--------------|-----------------|
| `background/service-worker.ts` | `background/index.ts` | Main entry point |
| N/A | `background/lifecycle.ts` | **NEW**: Extract lifecycle logic |
| `background/modules/authManager.ts` | `background/core/auth.ts` | Rename, simplify |
| `background/modules/cacheManager.ts` | `background/core/cache.ts` | Rename, integrate with shared |
| `background/modules/syncManager.ts` | `background/core/sync.ts` | Rename, refactor |
| N/A | `background/core/storage.ts` | **NEW**: Storage abstraction |
| `background/modules/messageRouter.ts` | `background/core/messaging.ts` | Rename, type-safe |
| `background/modules/dashboardApi.ts` | `background/services/dashboard-api.ts` | Move to services |
| `background/modules/dynamicMenus.ts` | `background/services/context-menus.ts` | Rename, clarify |
| `background/modules/networkObserver.ts` | `background/services/network-observer.ts` | Move to services |
| `background/modules/tabManager.ts` | `background/services/tab-manager.ts` | Move to services |
| `background/modules/installationManager.ts` | `background/services/installation.ts` | Rename, simplify |

### 3.2 Platform Adapters

| Current File | New Location | Migration Notes |
|--------------|--------------|-----------------|
| `background/modules/platformAdapters/base.ts` | `background/platforms/base.ts` | Keep interface |
| `background/modules/platformAdapters/index.ts` | `background/platforms/registry.ts` | Rename for clarity |
| `background/modules/platformAdapters/*.adapter.ts` | `background/platforms/*.ts` | Remove `.adapter` suffix |

**All 10 platform adapters** (ChatGPT, Claude, Gemini, Grok, Perplexity, DeepSeek, Qwen, LMArena, LMSYS) will be migrated with simplified naming.

### 3.3 Content Scripts

| Current File | New Location | Migration Notes |
|--------------|--------------|-----------------|
| `content/brainbox_master.ts` | `content/master.ts` | Rename for clarity |
| `content/content-*.ts` | `content/platform-scripts/*.ts` | Group by purpose |
| `content/inject-gemini-main.ts` | `content/platform-scripts/gemini-inject.ts` | Rename, clarify |
| `prompt-inject/prompt-inject.ts` | `content/injectors/prompt-inject.ts` | Consolidate structure |

### 3.4 Popup UI

| Current File | New Location | Migration Notes |
|--------------|--------------|-----------------|
| `popup/App.tsx` | `popup/App.tsx` | **KEEP AS-IS** |
| `popup/components/*.tsx` | `popup/components/*.tsx` | **KEEP AS-IS** |
| `popup/hooks/*.ts` | `popup/hooks/*.ts` | **KEEP AS-IS** |
| `popup/styles/index.css` | `popup/styles/index.css` | **KEEP AS-IS** |

### 3.5 Shared Utilities

| Current File | New Location | Migration Notes |
|--------------|--------------|-----------------|
| `lib/config.ts` | `lib/config.ts` | **KEEP AS-IS** |
| `lib/logger.ts` | `lib/logger.ts` | **KEEP AS-IS** |
| `lib/normalizers.ts` | `lib/normalizers.ts` | **KEEP AS-IS** |
| `lib/platformConfig.ts` | `lib/platform-config.ts` | Rename for consistency |
| `lib/rate-limiter.ts` | `lib/rate-limiter.ts` | **KEEP AS-IS** |
| `lib/schemas.ts` | `lib/schemas.ts` | **KEEP AS-IS** |
| `lib/ui.ts` | `lib/ui-helpers.ts` | Rename for clarity |

### 3.6 Testing

| Current File | New Location | Migration Notes |
|--------------|--------------|-----------------|
| `src/__tests__/setup.ts` | `src/__tests__/setup.ts` | **KEEP AS-IS** |
| `background/modules/__tests__/*.test.ts` | `src/__tests__/background/*.test.ts` | Flatten structure |
| `background/modules/platformAdapters/__tests__/*.test.ts` | `src/__tests__/background/platforms/*.test.ts` | Consolidate |

---

## 4. Monorepo Integration

### 4.1 Workspace Configuration

The extension will be automatically recognized by the monorepo through the existing `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'        # ← extension-new will be picked up here
  - 'packages/*'
```

### 4.2 Dependency Resolution

**Critical**: The extension will NOT have local `node_modules`. All dependencies are resolved via:

1. **Workspace root** (`/node_modules`): All external packages
2. **Workspace packages** (`packages/*`): Internal shared code

```json
{
  "dependencies": {
    "@brainbox/shared": "workspace:*",
    "@brainbox/validation": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

The `workspace:*` protocol ensures:
- No version conflicts
- Single source of truth for dependencies
- Automatic updates when shared packages change

### 4.3 Build Integration

The extension integrates with Turborepo via `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

This ensures:
1. `@brainbox/shared` builds first
2. `@brainbox/validation` builds second
3. `@brainbox/extension-new` builds last with access to compiled workspace packages

### 4.4 TypeScript Configuration

The extension's `tsconfig.json` extends the root configuration:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@brainbox/shared": ["../../packages/shared/src"],
      "@brainbox/validation": ["../../packages/validation/src"]
    }
  }
}
```

This provides:
- Type-safe imports from workspace packages
- Path aliases for clean imports
- Consistent compiler options across the monorepo

### 4.5 Development Workflow

```bash
# From monorepo root
pnpm install                          # Install all dependencies (root only)
pnpm dev --filter=@brainbox/extension-new  # Start dev server

# From extension directory
cd apps/extension-new
pnpm dev                              # Also works, uses root node_modules
```

**Key Guarantee**: No `pnpm install` needed in `apps/extension-new`. The workspace handles everything.

---

## 5. Manifest V3 Compliance

### 5.1 Service Worker

- ✅ Uses `service_worker` (not `background.scripts`)
- ✅ Implements `skipWaiting()` and `clients.claim()`
- ✅ No DOM access in background context
- ✅ All async operations properly handled

### 5.2 Content Security Policy

- ✅ No inline scripts
- ✅ No `eval()` or `new Function()`
- ✅ Strict CSP in manifest
- ✅ Development origins scrubbed in production

### 5.3 Permissions

- ✅ Minimal permissions (storage, alarms, contextMenus, tabs)
- ✅ Host permissions only for supported platforms
- ✅ No broad `<all_urls>` permission

### 5.4 Web Accessible Resources

- ✅ Uses `use_dynamic_url: true`
- ✅ Scoped to specific origins
- ✅ No localhost in production build

---

## 6. Gap Analysis: Current vs. Planned

### 6.1 Structural Differences

| Aspect | Current (`apps/extension`) | Planned (`apps/extension-new`) | Impact |
|--------|----------------------------|--------------------------------|--------|
| **Directory Depth** | 4-5 levels deep | 3-4 levels deep | ✅ Simpler navigation |
| **Background Structure** | `modules/` with mixed concerns | `core/`, `services/`, `platforms/` | ✅ Clear separation |
| **Content Scripts** | Flat in `content/` | Grouped in `platform-scripts/` | ✅ Better organization |
| **Platform Adapters** | `platformAdapters/*.adapter.ts` | `platforms/*.ts` | ✅ Cleaner naming |
| **Testing** | Nested in module folders | Centralized in `__tests__/` | ✅ Easier test discovery |
| **Popup** | Same structure | Same structure | ➡️ No change |
| **Utilities** | `lib/` | `lib/` | ➡️ Minor renames |

### 6.2 File Count Comparison

| Category | Current | Planned | Delta |
|----------|---------|---------|-------|
| **Background** | 12 modules + 10 adapters | 5 core + 5 services + 10 platforms | ➡️ Same logic, better organized |
| **Content Scripts** | 10 files | 10 files (in subdirectory) | ➡️ No change |
| **Popup** | 7 components + 4 hooks | 7 components + 4 hooks | ➡️ No change |
| **Utilities** | 7 files | 7 files | ➡️ Minor renames |
| **Tests** | ~26 test files | ~26 test files | ➡️ Reorganized |
| **Config Files** | 7 files | 7 files | ➡️ No change |
| **Total** | ~70 files | ~75 files | +5 (new docs, lifecycle) |

### 6.3 Dependency Differences

| Type | Current | Planned | Delta |
|------|---------|---------|-------|
| **Workspace Deps** | 2 (`@brainbox/shared`, `@brainbox/validation`) | 2 (same) | ➡️ No change |
| **Prod Deps** | 2 (React, React-DOM) | 2 (same) | ➡️ No change |
| **Dev Deps** | 16 packages | 16 packages | ➡️ No change |
| **Local node_modules** | ❌ Should not exist | ❌ Will not exist | ✅ Enforced |

### 6.4 Key Improvements

#### ✅ Organizational Clarity

- **Current**: Mixed concerns in `modules/`
- **Planned**: Clear separation (`core/`, `services/`, `platforms/`)
- **Benefit**: Easier onboarding, clearer responsibilities

#### ✅ Naming Consistency

- **Current**: `*.adapter.ts`, `content-*.ts`, `brainbox_master.ts`
- **Planned**: `*.ts`, `platform-scripts/*.ts`, `master.ts`
- **Benefit**: Less cognitive overhead, cleaner imports

#### ✅ Test Organization

- **Current**: Tests nested with implementation
- **Planned**: Centralized `__tests__/` with mirrored structure
- **Benefit**: Easier to run test suites, better IDE support

#### ✅ Lifecycle Management

- **Current**: Lifecycle logic embedded in `service-worker.ts`
- **Planned**: Dedicated `lifecycle.ts` module
- **Benefit**: Clearer separation, easier to test

#### ✅ Documentation

- **Current**: Scattered docs, some outdated
- **Planned**: Dedicated `docs/` with architecture, migration, testing guides
- **Benefit**: Single source of truth for developers

### 6.5 Potential Risks

| Risk | Mitigation |
|------|------------|
| **Import path changes** | Use TypeScript path aliases, update incrementally |
| **Test breakage** | Maintain same test logic, update paths only |
| **Build configuration** | Copy working Vite config, adjust paths |
| **Workspace resolution** | Verify `pnpm-lock.yaml` includes extension-new |

### 6.6 Migration Complexity

| Component | Complexity | Reason |
|-----------|------------|--------|
| **Background Core** | 🟡 Medium | Refactor into `core/`, `services/`, `platforms/` |
| **Content Scripts** | 🟢 Low | Move to subdirectory, update manifest |
| **Popup** | 🟢 Low | Copy as-is, minimal changes |
| **Utilities** | 🟢 Low | Minor renames, same logic |
| **Tests** | 🟡 Medium | Reorganize structure, update imports |
| **Config** | 🟢 Low | Copy and adjust paths |

**Overall Complexity**: 🟡 **Medium** (2-3 days for full migration)

---

## 7. Git Forensic Baseline

> 📋 **Full Report**: [Git_Forensic_Report.md](file:///home/stefanov/Projects/Chat%20Organizer%20Cursor/docs/user/Git_Forensic_Report.md)

### 7.1 Stable Commit Reference

**Baseline Commit**: `1214a70` (2026-01-31 10:35:04 +0200)  
**Message**: "chore: migrate architecture to Turborepo and Vite"  
**Version**: 2.0.6  
**Manifest V3**: ✅ **CONFIRMED**

This commit represents the last known stable state before the addition of testing infrastructure and React dependencies.

### 7.2 Stable Configuration

#### package.json (Stable)
```json
{
  "name": "@brainbox/extension",
  "version": "2.0.6",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@brainbox/shared": "workspace:*"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.32",
    "@types/chrome": "^0.0.268",
    "@types/node": "^22.14.0",
    "typescript": "~5.8.2",
    "vite": "^5.4.0"
  }
}
```

**Key Characteristics**:
- ✅ Minimal scripts (4 total)
- ✅ Single workspace dependency
- ✅ Core devDependencies only
- ✅ No lifecycle hooks (`postinstall`, `prepare`)
- ✅ No local lockfiles
- ✅ No local node_modules (at that time)

### 7.3 Evolution Analysis

**Changes from Stable to Current (HEAD: ffd19de)**:

| Category | Stable (1214a70) | Current (HEAD) | Delta |
|----------|------------------|----------------|-------|
| **Version** | 2.0.6 | 3.0.1 | +0.9.5 |
| **Scripts** | 4 | 16 | +12 (all test-related) |
| **Dependencies** | 1 | 4 | +3 (validation, react, react-dom) |
| **DevDependencies** | 5 | 16 | +11 (testing, styling) |

**Added Dependencies**:
- `@brainbox/validation` (workspace) - ✅ Correct location
- `react` + `react-dom` - ⚠️ Consider moving to root

**Added DevDependencies**:
- Testing: `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `happy-dom`, `jsdom`
- Styling: `tailwindcss`, `autoprefixer`, `postcss`
- Tooling: `vite-tsconfig-paths`
- Types: `@types/react`, `@types/react-dom`

### 7.4 Forensic Findings

#### ✅ Good News
1. **No Local Lockfiles**: Never existed in `apps/extension/` history
2. **Manifest V3**: Supported since stable commit
3. **No Lifecycle Hooks**: No `postinstall` or `prepare` scripts added
4. **Workspace Compliance**: All dependencies properly referenced

#### ⚠️ Observations
1. **node_modules Created**: Feb 9, 2026 23:13 (symlinks to root - expected pnpm behavior)
2. **React Dependencies**: Added at app-level instead of root
3. **Styling Tools**: TailwindCSS added at app-level instead of root

### 7.5 Recommendations for Clean Room

Based on forensic analysis, `apps/extension-new` should:

#### ✅ Adopt from Stable (1214a70)
- Minimal script set (dev, build, preview, type-check)
- Single workspace dependency pattern
- Core devDependencies only
- No lifecycle hooks

#### 🔄 Evaluate Before Adding
- **React/React-DOM**: Keep in app or move to root?
- **TailwindCSS/PostCSS**: Keep in app or move to root?
- **Test Scripts**: Add incrementally, not all 12 at once

#### ❌ Avoid
- Local lockfiles (never needed)
- Lifecycle scripts (not present in stable)
- Duplicate dependencies (check root first)

### 7.6 Clean Room Dependency Strategy

**Option A: Minimal (Stable-Based)**
```json
{
  "dependencies": {
    "@brainbox/shared": "workspace:*"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.32",
    "@types/chrome": "^0.0.268",
    "@types/node": "^22.14.0",
    "typescript": "~5.8.2",
    "vite": "^5.4.0"
  }
}
```

**Option B: Current Feature Set**
```json
{
  "dependencies": {
    "@brainbox/shared": "workspace:*",
    "@brainbox/validation": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    /* ... all 16 current devDeps ... */
  }
}
```

**Recommendation**: Start with **Option A**, add features incrementally with testing.

---

## 8. Next Steps (STOP - DO NOT EXECUTE)


> ⚠️ **CRITICAL**: This is a PLANNING document. Do NOT proceed with implementation until approved.

### 7.1 Approval Required

- [ ] Review proposed structure
- [ ] Validate dependency matrix
- [ ] Confirm migration approach
- [ ] Approve gap analysis

### 7.2 Implementation Phases (Future)

**Phase 1**: Setup
- Create `apps/extension-new/` directory
- Copy configuration files
- Initialize `package.json` with workspace references

**Phase 2**: Core Migration
- Migrate background modules to new structure
- Update imports and paths
- Verify Service Worker functionality

**Phase 3**: Content & Popup
- Migrate content scripts
- Copy popup UI
- Update manifest.json

**Phase 4**: Testing
- Reorganize test files
- Update test imports
- Verify all tests pass

**Phase 5**: Validation
- Build production bundle
- Verify manifest scrubbing
- Test in Chrome

---

## 9. Conclusion

The Clean Room extension (`apps/extension-new`) represents a **structural refinement** rather than a functional rewrite. It maintains 100% feature parity with the current extension while providing:

1. **Better organization**: Clear separation of concerns
2. **Simpler navigation**: Flatter directory structure
3. **Consistent naming**: No `.adapter` or `content-` prefixes
4. **Centralized testing**: Easier test discovery and execution
5. **Improved documentation**: Dedicated architecture guides
6. **Git-Validated Baseline**: Built on proven stable commit `1214a70`

**Key Guarantee**: All dependencies resolved via workspace root, ensuring zero local `node_modules` and perfect monorepo integration.

**Status**: Awaiting approval to proceed with implementation.
