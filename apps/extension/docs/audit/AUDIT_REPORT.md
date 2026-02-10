# Extension Codebase Audit Report

## 1. File Structure & Inventory

### `src/background`
- **`service-worker.ts`**: Main entry point. Initializes all core managers (`AuthManager`, `PromptSyncManager`, `DynamicMenus`, `NetworkObserver`, `InstallationManager`). Sets up an API Proxy to bypass CORS.
- **`modules/`**:
    - `authManager.ts`: Handles token capture and session management.
    - `syncManager.ts`: Manages offline queue and periodic sync using `chrome.alarms`.
    - `dashboardApi.ts`: Handles communication with the BrainBox Dashboard (folders, settings, saving chats).
    - `messageRouter.ts`: Routes messages between components.
    - `platformAdapters/`: (Analyzed via imports) Platform-specific logic for parsing chat data.

### `src/content`
- **`brainbox_master.ts`**: The "Master Coordinator". Intercepts network requests (XHR/Fetch) across platforms (Gemini, Claude, etc.) and stores raw data in IndexedDB. Acts as a centralized capture hub for all AI interactions.
- **`content-dashboard-auth.ts`**: Listens for auth sync messages from the Dashboard website and passes them to the background.
- **`content-chatgpt.ts`, `content-claude.ts`...**: Specialized platform scripts for UI integration and manual capture triggers.

### `src/popup`
- **`App.tsx`**: Main UI container using a glass-morphism design. Assembles the Header, StatusBar, QuickAccess, and Actions.
- **`components/`**:
    - `Header.tsx`: Contains title and theme toggle.
    - `StatusBar.tsx`: Displays connection status and user email; provides manual sync trigger.
    - `QuickAccess.tsx`: Grid of shortcuts to all supported AI platforms (GPT, Gemini, Claude, Grok, etc.).
    - `ModulesPanel.tsx`: Toggle switches for enabling/disabling "Chats" and "Prompts" modules globally.
    - `Actions.tsx`: Primary action buttons (Open Dashboard).
- **`hooks/`**:
    - `useAuth.ts`: Orchestrates authentication state, syncing with the background via `chrome.runtime.sendMessage`.
    - `useStorage.ts`: Generic hook for real-time `chrome.storage.local` observation.
    - `useModules.ts`: Manages toggle state for extension feature modules.
    - `useTheme.ts`: Handles dark/light mode persistence and DOM application.

### `src/types`
- `global.d.ts`: Extension-wide type definitions, including `Window` augmentations for injected scripts (`BrainBoxUI`, `BrainBoxMaster`).

### Root Configs
- **`manifest.json`**: Defines Manifest V3 configuration, permissions (`storage`, `tabs`, `contextMenus`), and host permissions for AI platforms. Uses `__DASHBOARD_URL__` placeholder for build-time injection.
- **`vite.config.ts`**: Advanced build pipeline using `@crxjs/vite-plugin`. Includes:
    - **`manifestCallback`**: Dynamic placeholder replacement.
    - **`stripDevCSP`**: Critical security plugin that scrubs `localhost` from CSP, host permissions, and assets in production.
    - **Security Hardening**: Drops `console` logs in production and scrubs React DevTools hooks.
- **`package.json`**: Manages dependencies and defines test scripts for all core modules (`auth`, `router`, `platforms`).
- **`tsconfig.json`**: Configures TypeScript with path aliases (`@/*` -> `src/*`).

---

## 2. Core Logic Documentation

### UI & Component Logic
- **Modular React Architecture**: Components are isolated and style-driven (Tailwind/CSS).
- **Reactive Storage**: `useStorage` ensures the UI updates instantly when the background script modifies local state (e.g. status changes).
- **Cross-Component Communication**: Popup hooks send actions (`syncAll`, `updateModuleState`) to the Service Worker via `chrome.runtime.sendMessage`, ensuring logic stays centralized in the background.

### Build & Configuration Workflow
- **Environment Injection**: `VITE_DASHBOARD_URL` is injected into the manifest and code during build.
- **Production Hardening**: The custom `stripDevCSP` plugin ensures no development-only origins (`localhost`) or debugging tools leak into the production `.zip`.
- **Monorepo Integration**: TypeScript path aliases link `apps/extension` to `packages/shared` and other workspace packages.

---

## 3. Function & Dependency Analysis

### Function Inventory

#### `AuthManager`
- `initialize()`: Sets up listeners and loads tokens.
- `syncAll()`: Refreshes state and pings API to verify `accessToken`.
- `setDashboardSession(session)`: Saves Dashboard tokens.
- `isSessionValid()`: Quick check of local storage tokens.
- `handle[Platform]Headers/Request`: Specific parsers for ChatGPT, Claude, Gemini, etc.

#### `DashboardAPI`
- `getUserFolders(silent)`: Fetches folders with "Stale-While-Revalidate" (SWR) pattern via `CacheManager`.
- `getUserSettings()`: Fetches user preferences.
- `saveToDashboard(conversationData, folderId, silent)`: Main function to push chats to server; includes offline queuing via `SyncManager`.
- `enhancePrompt(promptText)`: Proxy to AI gateway for prompt optimization.
- `getOptimizedTags(messages)`: Client-side logic for generating relevant tags from chat content.

#### `Hooks (Popup)`
- `useAuth().sync()`: Dispatches `syncAll` to background.
- `useModules().toggleX()`: Updates local storage and notifies background.
- `useTheme().toggleTheme()`: Persists and applies CSS classes.

#### `Content Scripts`
- `XMLHttpRequest.prototype.open/send`: Interceptors in `brainbox_master.ts`.
- `window.fetch`: Interceptor in `brainbox_master.ts`.
- `handleAuthMessage`: Message listener in `content-dashboard-auth.ts`.

### Dependency Matrix

- **Internal Source Dependencies**:
    - `service-worker.ts` -> `AuthManager`, `SyncManager`, `MessageRouter`, `DynamicMenus`, `NetworkObserver`.
    - `DashboardAPI` -> `SyncManager`, `CacheManager`, `rate-limiter.ts`.
    - `Popup Components` -> `hooks/`, `lib/config.ts`.
- **Shared Package Usage (`@brainbox/*`)**:
    - `@brainbox/config`: Unified configuration (URLs, Versions).
    - `@brainbox/shared`: Shared logic (`PromptSyncManager`, cache utils, loggers).
    - `@brainbox/validation`: Zod schemas for API payloads (`CreateChatInput`).
- **Assets & Config**:
    - `vite.config.ts` -> `manifest.json` (Transformation).
    - `manifest.json` -> `src/background/service-worker.ts`, `src/popup/index.html`.
