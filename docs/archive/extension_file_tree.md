# Extension Codebase File Tree

Generated on: 2026-02-01

## /src
Root source directory.

### /src/background
Background service worker and modules.
- **`service-worker.ts`**: Entry point. Initializes managers.
- **`/modules`**
    - **`authManager.ts`**: Handles token capture and session management.
    - **`dashboardApi.ts`**: API client for Dashboard endpoints.
    - **`dynamicMenus.ts`**: Context menu manager.
    - **`/platformAdapters`**: Connectors for ChatGPT, Claude, Gemini.

### /src/content
Content scripts injected into pages.
- **`brainbox_master.js`**: Core Gemini interceptor.
- **`content-chatgpt.js`**: ChatGPT UI integration.
- **`content-claude.js`**: Claude UI integration & Org ID capture.
- **`content-dashboard-auth.js`**: Auth bridge.
- **`inject-gemini-main.js`**: Gemini MAIN world token extractor.

### /src/popup
React-based popup UI.
- **`App.tsx`**: Main component.
- **`/components`**: UI components (Header, StatusBar, quick access, etc.).
- **`/hooks`**: Custom hooks (`useAuth`, `useModules`, etc.).

### /src/lib
Shared libraries (used by both background and content scripts).
- **`config.js`**: Configuration (ES Module).
- **`config-global.js`**: Configuration (Global variable for content scripts).
- **`normalizers.js`**: Data transformation logic.
- **`rate-limiter.js`**: API rate limiting.
- **`ui.js`**: Shared UI utilities (Toasts).

### Root Files
- **`manifest.json`**: Extension configuration (V3).
- **`prompt-inject/prompt-inject.js`**: Utility for injecting text into AI input fields.
- **`content-styles.css`**: Global styles for injected UI.

## Note on Duplication
There appears to be some duplication of files between `src/` root and `src/lib/` (e.g., `rate-limiter.js`, `normalizers.js`). The `src/lib` versions seem to be the canonical ones referenced by imports, while root versions might be legacy or build artifacts.
