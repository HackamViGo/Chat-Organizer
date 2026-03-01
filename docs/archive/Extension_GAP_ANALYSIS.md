# Extension Architecture Gap Analysis

> **Document Type**: Comparative Analysis  
> **Created**: 2026-02-10  
> **Purpose**: Detailed comparison of current vs. planned extension structure

---

## 1. Current Structure (`apps/extension`)

```
apps/extension/
├── ARCHITECTURE_AUDIT.md
├── content-styles.css
├── docs/
│   └── audit/
│       ├── AUDIT_REPORT.md
│       ├── file_tree.md
│       └── TODO.md
├── .env.development
├── .env.production
├── icons/
│   ├── icon128.png
│   ├── icon16.png
│   ├── icon32.png
│   └── icon48.png
├── manifest.json
├── package.json
├── postcss.config.js
├── README.md
├── src/
│   ├── background/
│   │   ├── modules/
│   │   │   ├── authManager.ts
│   │   │   ├── cacheManager.ts
│   │   │   ├── dashboardApi.ts
│   │   │   ├── dynamicMenus.ts
│   │   │   ├── installationManager.ts
│   │   │   ├── messageRouter.ts
│   │   │   ├── networkObserver.ts
│   │   │   ├── platformAdapters/
│   │   │   │   ├── base.ts
│   │   │   │   ├── chatgpt.adapter.ts
│   │   │   │   ├── claude.adapter.ts
│   │   │   │   ├── deepseek.adapter.ts
│   │   │   │   ├── gemini.adapter.ts
│   │   │   │   ├── grok.adapter.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── lmarena.adapter.ts
│   │   │   │   ├── lmsys.adapter.ts
│   │   │   │   ├── perplexity.adapter.ts
│   │   │   │   ├── qwen.adapter.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── chatgpt.adapter.test.ts
│   │   │   │       ├── claude.adapter.test.ts
│   │   │   │       ├── deepseek.test.ts
│   │   │   │       ├── gemini.adapter.test.ts
│   │   │   │       ├── grok.test.ts
│   │   │   │       ├── lmarena.test.ts
│   │   │   │       ├── newPlatforms.adapter.test.ts
│   │   │   │       ├── perplexity.test.ts
│   │   │   │       ├── platformSave.test.ts
│   │   │   │       └── qwen.test.ts
│   │   │   ├── syncManager.ts
│   │   │   ├── tabManager.ts
│   │   │   └── __tests__/
│   │   │       ├── authManager.test.ts
│   │   │       ├── integration.test.ts
│   │   │       ├── messageRouter.test.ts
│   │   │       ├── newPlatforms.integration.test.ts
│   │   │       └── promptInjection.test.ts
│   │   └── service-worker.ts
│   ├── content/
│   │   ├── brainbox_master.ts
│   │   ├── content-chatgpt.ts
│   │   ├── content-claude.ts
│   │   ├── content-dashboard-auth.ts
│   │   ├── content-deepseek.ts
│   │   ├── content-grok.ts
│   │   ├── content-lmarena.ts
│   │   ├── content-perplexity.ts
│   │   ├── content-qwen.ts
│   │   └── inject-gemini-main.ts
│   ├── content-styles.css
│   ├── icons/
│   │   ├── icon128.png
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   └── icon48.png
│   ├── lib/
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── normalizers.ts
│   │   ├── platformConfig.ts
│   │   ├── rate-limiter.ts
│   │   ├── schemas.ts
│   │   └── ui.ts
│   ├── popup/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Actions.tsx
│   │   │   ├── CurrentChat.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── ModulesPanel.tsx
│   │   │   ├── QuickAccess.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useModules.ts
│   │   │   ├── useStorage.ts
│   │   │   └── useTheme.ts
│   │   ├── index.html
│   │   ├── index.tsx
│   │   └── styles/
│   │       └── index.css
│   ├── prompt-inject/
│   │   └── prompt-inject.ts
│   ├── README.md
│   ├── __tests__/
│   │   └── setup.ts
│   ├── types/
│   │   └── global.d.ts
│   └── ui/                          # Empty directory
├── tailwind.config.ts
├── test_full_log.txt
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts

**Total**: 21 directories, 97 files
```

---

## 2. Planned Structure (`apps/extension-new`)

```
apps/extension-new/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── .env.development
├── .env.production
│
├── public/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── content-styles.css
│
├── src/
│   ├── background/
│   │   ├── index.ts                 # Main service worker entry
│   │   ├── lifecycle.ts             # NEW: Install/Activate handlers
│   │   ├── core/                    # NEW: Core modules
│   │   │   ├── auth.ts
│   │   │   ├── cache.ts
│   │   │   ├── sync.ts
│   │   │   ├── storage.ts           # NEW: Storage abstraction
│   │   │   └── messaging.ts
│   │   ├── services/                # NEW: Business logic
│   │   │   ├── dashboard-api.ts
│   │   │   ├── context-menus.ts
│   │   │   ├── network-observer.ts
│   │   │   ├── tab-manager.ts
│   │   │   └── installation.ts
│   │   └── platforms/               # Renamed from platformAdapters
│   │       ├── base.ts
│   │       ├── registry.ts          # Renamed from index.ts
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
│   ├── content/
│   │   ├── master.ts                # Renamed from brainbox_master.ts
│   │   ├── platform-scripts/        # NEW: Grouped content scripts
│   │   │   ├── chatgpt.ts
│   │   │   ├── claude.ts
│   │   │   ├── gemini.ts
│   │   │   ├── gemini-inject.ts     # Renamed from inject-gemini-main.ts
│   │   │   ├── grok.ts
│   │   │   ├── perplexity.ts
│   │   │   ├── deepseek.ts
│   │   │   ├── qwen.ts
│   │   │   ├── lmarena.ts
│   │   │   └── dashboard-auth.ts
│   │   └── injectors/               # NEW: Prompt injection
│   │       └── prompt-inject.ts
│   │
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   ├── CurrentChat.tsx
│   │   │   ├── QuickAccess.tsx
│   │   │   ├── Actions.tsx
│   │   │   ├── ModulesPanel.tsx
│   │   │   └── Footer.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useStorage.ts
│   │   │   ├── useModules.ts
│   │   │   └── useTheme.ts
│   │   └── styles/
│   │       └── index.css
│   │
│   ├── lib/
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── schemas.ts
│   │   ├── normalizers.ts
│   │   ├── rate-limiter.ts
│   │   ├── platform-config.ts
│   │   └── ui-helpers.ts            # Renamed from ui.ts
│   │
│   ├── types/
│   │   ├── global.d.ts
│   │   ├── chrome.d.ts              # NEW: Chrome API extensions
│   │   ├── platforms.ts             # NEW: Platform types
│   │   └── messages.ts              # NEW: Message types
│   │
│   └── __tests__/
│       ├── setup.ts
│       ├── background/              # NEW: Organized tests
│       │   ├── auth.test.ts
│       │   ├── messaging.test.ts
│       │   ├── sync.test.ts
│       │   └── platforms/
│       │       ├── chatgpt.test.ts
│       │       ├── claude.test.ts
│       │       ├── gemini.test.ts
│       │       └── integration.test.ts
│       ├── content/
│       │   └── master.test.ts
│       └── popup/
│           └── App.test.tsx
│
└── docs/                            # NEW: Documentation
    ├── ARCHITECTURE.md
    ├── MIGRATION.md
    └── TESTING.md

**Total**: ~18 directories, ~75 files
```

---

## 3. File-by-File Comparison

### 3.1 Root Level

| Current | Planned | Change Type | Notes |
|---------|---------|-------------|-------|
| `ARCHITECTURE_AUDIT.md` | ❌ Removed | Deletion | Moved to `docs/ARCHITECTURE.md` |
| `content-styles.css` | `public/content-styles.css` | Move | Better organization |
| `docs/audit/` | `docs/` | Restructure | Simplified, focused docs |
| `.env.development` | `.env.development` | ✅ Keep | No change |
| `.env.production` | `.env.production` | ✅ Keep | No change |
| `icons/` | `public/icons/` | Move | Standard Vite convention |
| `manifest.json` | `manifest.json` | ✅ Keep | No change |
| `package.json` | `package.json` | ✅ Keep | No change |
| `postcss.config.js` | `postcss.config.js` | ✅ Keep | No change |
| `README.md` | ❌ Removed | Deletion | Extension-specific, not needed |
| `tailwind.config.ts` | `tailwind.config.ts` | ✅ Keep | No change |
| `test_full_log.txt` | ❌ Removed | Deletion | Temporary file |
| `tsconfig.json` | `tsconfig.json` | ✅ Keep | No change |
| `vite.config.ts` | `vite.config.ts` | ✅ Keep | No change |
| `vitest.config.ts` | `vitest.config.ts` | ✅ Keep | No change |

### 3.2 Background Modules

| Current | Planned | Change Type | Notes |
|---------|---------|-------------|-------|
| `background/service-worker.ts` | `background/index.ts` | Rename | Clearer entry point |
| ❌ N/A | `background/lifecycle.ts` | **NEW** | Extract lifecycle logic |
| `background/modules/authManager.ts` | `background/core/auth.ts` | Move + Rename | Core responsibility |
| `background/modules/cacheManager.ts` | `background/core/cache.ts` | Move + Rename | Core responsibility |
| `background/modules/syncManager.ts` | `background/core/sync.ts` | Move + Rename | Core responsibility |
| ❌ N/A | `background/core/storage.ts` | **NEW** | Storage abstraction |
| `background/modules/messageRouter.ts` | `background/core/messaging.ts` | Move + Rename | Core responsibility |
| `background/modules/dashboardApi.ts` | `background/services/dashboard-api.ts` | Move | Business logic |
| `background/modules/dynamicMenus.ts` | `background/services/context-menus.ts` | Move + Rename | Business logic |
| `background/modules/networkObserver.ts` | `background/services/network-observer.ts` | Move | Business logic |
| `background/modules/tabManager.ts` | `background/services/tab-manager.ts` | Move | Business logic |
| `background/modules/installationManager.ts` | `background/services/installation.ts` | Move + Rename | Business logic |

### 3.3 Platform Adapters

| Current | Planned | Change Type | Notes |
|---------|---------|-------------|-------|
| `platformAdapters/base.ts` | `platforms/base.ts` | Move | Shorter path |
| `platformAdapters/index.ts` | `platforms/registry.ts` | Move + Rename | Clearer purpose |
| `platformAdapters/chatgpt.adapter.ts` | `platforms/chatgpt.ts` | Move + Rename | Remove `.adapter` |
| `platformAdapters/claude.adapter.ts` | `platforms/claude.ts` | Move + Rename | Remove `.adapter` |
| `platformAdapters/deepseek.adapter.ts` | `platforms/deepseek.ts` | Move + Rename | Remove `.adapter` |
| `platformAdapters/gemini.adapter.ts` | `platforms/gemini.ts` | Move + Rename | Remove `.adapter` |
| `platformAdapters/grok.adapter.ts` | `platforms/grok.ts` | Move + Rename | Remove `.adapter` |
| `platformAdapters/lmarena.adapter.ts` | `platforms/lmarena.ts` | Move + Rename | Remove `.adapter` |
| `platformAdapters/lmsys.adapter.ts` | `platforms/lmsys.ts` | Move + Rename | Remove `.adapter` |
| `platformAdapters/perplexity.adapter.ts` | `platforms/perplexity.ts` | Move + Rename | Remove `.adapter` |
| `platformAdapters/qwen.adapter.ts` | `platforms/qwen.ts` | Move + Rename | Remove `.adapter` |

### 3.4 Content Scripts

| Current | Planned | Change Type | Notes |
|---------|---------|-------------|-------|
| `content/brainbox_master.ts` | `content/master.ts` | Rename | Cleaner name |
| `content/content-chatgpt.ts` | `content/platform-scripts/chatgpt.ts` | Move + Rename | Remove `content-` prefix |
| `content/content-claude.ts` | `content/platform-scripts/claude.ts` | Move + Rename | Remove `content-` prefix |
| `content/content-dashboard-auth.ts` | `content/platform-scripts/dashboard-auth.ts` | Move + Rename | Remove `content-` prefix |
| `content/content-deepseek.ts` | `content/platform-scripts/deepseek.ts` | Move + Rename | Remove `content-` prefix |
| `content/content-grok.ts` | `content/platform-scripts/grok.ts` | Move + Rename | Remove `content-` prefix |
| `content/content-lmarena.ts` | `content/platform-scripts/lmarena.ts` | Move + Rename | Remove `content-` prefix |
| `content/content-perplexity.ts` | `content/platform-scripts/perplexity.ts` | Move + Rename | Remove `content-` prefix |
| `content/content-qwen.ts` | `content/platform-scripts/qwen.ts` | Move + Rename | Remove `content-` prefix |
| `content/inject-gemini-main.ts` | `content/platform-scripts/gemini-inject.ts` | Move + Rename | Clearer purpose |
| `prompt-inject/prompt-inject.ts` | `content/injectors/prompt-inject.ts` | Move | Consolidate content logic |

### 3.5 Popup (No Changes)

| Current | Planned | Change Type | Notes |
|---------|---------|-------------|-------|
| `popup/App.tsx` | `popup/App.tsx` | ✅ Keep | No change |
| `popup/components/*.tsx` | `popup/components/*.tsx` | ✅ Keep | All 7 components unchanged |
| `popup/hooks/*.ts` | `popup/hooks/*.ts` | ✅ Keep | All 4 hooks unchanged |
| `popup/index.html` | `popup/index.html` | ✅ Keep | No change |
| `popup/index.tsx` | `popup/index.tsx` | ✅ Keep | No change |
| `popup/styles/index.css` | `popup/styles/index.css` | ✅ Keep | No change |

### 3.6 Utilities

| Current | Planned | Change Type | Notes |
|---------|---------|-------------|-------|
| `lib/config.ts` | `lib/config.ts` | ✅ Keep | No change |
| `lib/logger.ts` | `lib/logger.ts` | ✅ Keep | No change |
| `lib/normalizers.ts` | `lib/normalizers.ts` | ✅ Keep | No change |
| `lib/platformConfig.ts` | `lib/platform-config.ts` | Rename | Kebab-case consistency |
| `lib/rate-limiter.ts` | `lib/rate-limiter.ts` | ✅ Keep | No change |
| `lib/schemas.ts` | `lib/schemas.ts` | ✅ Keep | No change |
| `lib/ui.ts` | `lib/ui-helpers.ts` | Rename | Clearer purpose |

### 3.7 Types

| Current | Planned | Change Type | Notes |
|---------|---------|-------------|-------|
| `types/global.d.ts` | `types/global.d.ts` | ✅ Keep | No change |
| ❌ N/A | `types/chrome.d.ts` | **NEW** | Chrome API extensions |
| ❌ N/A | `types/platforms.ts` | **NEW** | Platform type definitions |
| ❌ N/A | `types/messages.ts` | **NEW** | Message type definitions |

### 3.8 Tests

| Current | Planned | Change Type | Notes |
|---------|---------|-------------|-------|
| `src/__tests__/setup.ts` | `src/__tests__/setup.ts` | ✅ Keep | No change |
| `background/modules/__tests__/authManager.test.ts` | `__tests__/background/auth.test.ts` | Move + Rename | Centralized |
| `background/modules/__tests__/messageRouter.test.ts` | `__tests__/background/messaging.test.ts` | Move + Rename | Centralized |
| `background/modules/__tests__/integration.test.ts` | `__tests__/background/platforms/integration.test.ts` | Move | Better grouping |
| `background/modules/__tests__/newPlatforms.integration.test.ts` | `__tests__/background/platforms/integration.test.ts` | Merge | Consolidate |
| `background/modules/__tests__/promptInjection.test.ts` | ❌ Removed | Deletion | Redundant with platform tests |
| `platformAdapters/__tests__/*.test.ts` | `__tests__/background/platforms/*.test.ts` | Move | Centralized |
| ❌ N/A | `__tests__/background/sync.test.ts` | **NEW** | Test sync manager |
| ❌ N/A | `__tests__/content/master.test.ts` | **NEW** | Test master content script |
| ❌ N/A | `__tests__/popup/App.test.tsx` | **NEW** | Test popup UI |

---

## 4. Structural Differences Summary

### 4.1 Directory Organization

| Aspect | Current | Planned | Improvement |
|--------|---------|---------|-------------|
| **Background Structure** | Flat `modules/` | `core/`, `services/`, `platforms/` | ✅ Clear separation of concerns |
| **Content Scripts** | Flat in `content/` | Grouped in `platform-scripts/` | ✅ Better organization |
| **Platform Adapters** | Nested in `modules/platformAdapters/` | Top-level `platforms/` | ✅ Shorter import paths |
| **Tests** | Nested with implementation | Centralized `__tests__/` | ✅ Easier test discovery |
| **Static Assets** | Mixed (`icons/`, `src/icons/`) | Unified in `public/` | ✅ Standard Vite convention |
| **Documentation** | `docs/audit/` | `docs/` | ✅ Focused, actionable docs |

### 4.2 Naming Conventions

| Pattern | Current | Planned | Benefit |
|---------|---------|---------|---------|
| **Adapters** | `*.adapter.ts` | `*.ts` | ✅ Less verbose |
| **Content Scripts** | `content-*.ts` | `*.ts` (in subdirectory) | ✅ Redundant prefix removed |
| **Master Script** | `brainbox_master.ts` | `master.ts` | ✅ Cleaner name |
| **Managers** | `*Manager.ts` | `*.ts` | ✅ Implicit from directory |
| **Services** | `dynamic*.ts`, `network*.ts` | `context-menus.ts`, `network-observer.ts` | ✅ Consistent kebab-case |

### 4.3 New Additions

| File | Purpose | Justification |
|------|---------|---------------|
| `background/lifecycle.ts` | Service Worker lifecycle management | Extract `skipWaiting()` and `clients.claim()` logic |
| `background/core/storage.ts` | Storage abstraction layer | Centralize `chrome.storage` interactions |
| `types/chrome.d.ts` | Chrome API type extensions | Custom type definitions for Chrome APIs |
| `types/platforms.ts` | Platform type definitions | Centralize platform-related types |
| `types/messages.ts` | Message type definitions | Type-safe messaging between contexts |
| `docs/ARCHITECTURE.md` | Architecture overview | High-level system design |
| `docs/MIGRATION.md` | Migration guide | Step-by-step migration instructions |
| `docs/TESTING.md` | Testing guide | Test strategy and best practices |
| `__tests__/background/sync.test.ts` | Sync manager tests | Missing test coverage |
| `__tests__/content/master.test.ts` | Master content script tests | Missing test coverage |
| `__tests__/popup/App.test.tsx` | Popup UI tests | Missing test coverage |

### 4.4 Removals

| File | Reason |
|------|--------|
| `ARCHITECTURE_AUDIT.md` | Replaced by `docs/ARCHITECTURE.md` |
| `README.md` | Extension-specific, not needed in monorepo |
| `test_full_log.txt` | Temporary file, should not be committed |
| `src/ui/` | Empty directory |
| `promptInjection.test.ts` | Redundant with platform integration tests |

---

## 5. Quantitative Analysis

### 5.1 File Count

| Category | Current | Planned | Delta |
|----------|---------|---------|-------|
| **Configuration** | 7 | 7 | 0 |
| **Background** | 22 | 21 | -1 |
| **Content Scripts** | 10 | 11 | +1 |
| **Popup** | 14 | 14 | 0 |
| **Utilities** | 7 | 7 | 0 |
| **Types** | 1 | 4 | +3 |
| **Tests** | 26 | 29 | +3 |
| **Documentation** | 4 | 3 | -1 |
| **Static Assets** | 6 | 6 | 0 |
| **Total** | **97** | **102** | **+5** |

### 5.2 Directory Count

| Level | Current | Planned | Delta |
|-------|---------|---------|-------|
| **Top-level** | 21 | 18 | -3 |
| **Nested** | Varies | Varies | More organized |

### 5.3 Import Path Length

| Type | Current | Planned | Improvement |
|------|---------|---------|-------------|
| **Platform Adapters** | `@/background/modules/platformAdapters/chatgpt.adapter` | `@/background/platforms/chatgpt` | -27 chars |
| **Content Scripts** | `@/content/content-chatgpt` | `@/content/platform-scripts/chatgpt` | +7 chars (but clearer) |
| **Background Modules** | `@/background/modules/authManager` | `@/background/core/auth` | -13 chars |

---

## 6. Migration Complexity Matrix

| Component | Files Affected | Complexity | Estimated Time |
|-----------|----------------|------------|----------------|
| **Background Core** | 12 | 🟡 Medium | 4-6 hours |
| **Platform Adapters** | 11 | 🟢 Low | 2-3 hours |
| **Content Scripts** | 11 | 🟢 Low | 2-3 hours |
| **Popup** | 14 | 🟢 Low | 1 hour |
| **Utilities** | 7 | 🟢 Low | 1 hour |
| **Types** | 4 | 🟢 Low | 1-2 hours |
| **Tests** | 29 | 🟡 Medium | 4-6 hours |
| **Configuration** | 7 | 🟢 Low | 1 hour |
| **Documentation** | 3 | 🟢 Low | 2-3 hours |
| **Total** | **98** | 🟡 **Medium** | **18-25 hours** |

---

## 7. Risk Assessment

### 7.1 High-Risk Changes

| Change | Risk Level | Mitigation |
|--------|------------|------------|
| Background module restructure | 🟡 Medium | Incremental migration, comprehensive testing |
| Test reorganization | 🟡 Medium | Verify all tests pass before and after |
| Import path updates | 🟡 Medium | Use TypeScript compiler to catch errors |

### 7.2 Low-Risk Changes

| Change | Risk Level | Reason |
|--------|------------|--------|
| Popup migration | 🟢 Low | Copy as-is, no logic changes |
| Utility renames | 🟢 Low | Simple file renames |
| Documentation | 🟢 Low | No code impact |
| Static asset moves | 🟢 Low | Vite handles path resolution |

---

## 8. Recommendations

### 8.1 Immediate Actions

1. ✅ **Approve Structure**: Review and approve the planned structure
2. ✅ **Validate Dependencies**: Ensure workspace integration is correct
3. ✅ **Plan Migration**: Schedule migration in phases

### 8.2 Migration Strategy

1. **Phase 1**: Setup (1-2 hours)
   - Create directory structure
   - Copy configuration files
   - Initialize `package.json`

2. **Phase 2**: Background (4-6 hours)
   - Migrate core modules
   - Migrate services
   - Migrate platform adapters
   - Update imports

3. **Phase 3**: Content & Popup (3-4 hours)
   - Migrate content scripts
   - Copy popup UI
   - Update manifest.json

4. **Phase 4**: Testing (4-6 hours)
   - Reorganize tests
   - Update test imports
   - Verify all tests pass

5. **Phase 5**: Validation (2-3 hours)
   - Build production bundle
   - Verify manifest scrubbing
   - Test in Chrome

**Total Estimated Time**: 14-21 hours (2-3 days)

### 8.3 Success Criteria

- [ ] All tests pass
- [ ] Production build succeeds
- [ ] No `localhost` in `dist/manifest.json`
- [ ] Extension loads in Chrome without errors
- [ ] All features work as expected
- [ ] No local `node_modules` in `apps/extension-new`

---

## 9. Conclusion

The planned `apps/extension-new` structure represents a **significant organizational improvement** over the current `apps/extension` while maintaining 100% functional parity.

**Key Benefits**:
- ✅ **Clearer organization**: `core/`, `services/`, `platforms/` separation
- ✅ **Shorter import paths**: Remove redundant prefixes and nesting
- ✅ **Better testability**: Centralized test structure
- ✅ **Improved maintainability**: Consistent naming conventions
- ✅ **Enhanced documentation**: Dedicated architecture guides

**Migration Complexity**: 🟡 **Medium** (2-3 days)

**Recommendation**: ✅ **Proceed with migration** after approval.
