# Extension Codebase Audit Report

## 1. Overview
This document provides a comprehensive audit of the `apps/extension` codebase for BrainBox (v2.1.3). The extension is a key component interacting with AI platforms (ChatGPT, Claude, Gemini) and the BrainBox Dashboard.

**Core Tech Stack:**
- **Framework:** Manifest V3 (Chrome Extension)
- **Background Logic:** Service Worker (TypeScript)
- **UI:** React (Popup)
- **Build System:** Vite/Turborepo
- **Shared Logic:** `@brainbox/shared` package

---

## 2. File Structure & Inventory

### `src/background`
The central nervous system of the extension.
- **`service-worker.ts`**: The main entry point. Initializes modules (`AuthManager`, `PromptSyncManager`, `DynamicMenus`), handles message passing (`onMessage`), and sets up content menu logic.
- **`modules/`**:
    - **`authManager.ts`**:
        - Listens to web requests (`onBeforeSendHeaders`, `onBeforeRequest`) to passively capture auth tokens from ChatGPT (Bearer), Claude (Org ID), and Gemini (Dynamic Key).
        - Manages Dashboard session tokens (`accessToken`, `refreshToken`, `expiresAt`) in `chrome.storage.local`.
        - Provides `syncAll` method to validate session and token states.
    - **`dashboardApi.ts`**:
        - Encapsulates API calls to the Dashboard (Folders, Settings, Save Chat).
        - Handles authentication headers and redirect logic if tokens are missing.
    - **`dynamicMenus.ts`**:
        - Manages context menu creation/rebuilding.
        - Dynamically generates menus for "Inject Prompt" based on user folders and prompts.
        - Handles menu click events.
    - **`platformAdapters/`**:
        - **`base.ts`**: Abstract base class and interfaces (`Conversation`, `Message`) for platform adapters.
        - **`index.ts`**: Factory pattern (`getAdapter`) to select the correct adapter.
        - **`chatgpt.adapter.ts`**: API wrapper for ChatGPT conversation fetching.
        - **`claude.adapter.ts`**: API wrapper for Claude.
        - **`gemini.adapter.ts`**: Complex adapter for Gemini's `batchexecute` RPC protocol.

### `src/content`
Scripts injected into web pages.
- **`brainbox_master.js`**:
    - **Target:** Gemini.
    - **Role:** Heavy interceptor for `batchexecute` requests. Manages local IndexedDB for chat data. Intercepts network traffic to capture conversation data and keys.
- **`content-chatgpt.js`**:
    - **Target:** ChatGPT.
    - **Role:** UI injection (Save buttons), DOM observation for new chats, and interaction handling.
- **`content-claude.js`**:
    - **Target:** Claude.
    - **Role:** Similar to ChatGPT content script + Passive Org ID capture logic.
- **`content-dashboard-auth.js`**:
    - **Target:** Dashboard Auth Page (`/extension-auth`).
    - **Role:** Bridges the gap between the web app and extension. Listens for `brainbox-auth-ready` and sends tokens to the Service Worker.
- **`inject-gemini-main.js`**:
    - **Target:** Gemini (MAIN world).
    - **Role:** Extracts tokens/keys accessible only in the page's global context (e.g., `WIZ_global_data`) and posts them to the isolated content script.

### `src/popup`
The extension popup UI.
- **`App.tsx`**: Main React component.
- **`components/`**: UI building blocks (`Header`, `Footer`, `StatusBar`, `CurrentChat`, `ModulesPanel`, `QuickAccess`, `Actions`).
- **`hooks/`**: Custom hooks (`useAuth`, `useStorage`, `useModules`, `useTheme`).
- **`styles/`**: Tailwind CSS integration.

### `src/lib`
Shared utilities.
- **`config.js`**: Environment constants (API_BASE_URL).
- **`normalizers.js`**: Functions to convert raw platform API responses into the standard `Conversation` format.
- **`rate-limiter.js`**: Queues and limits API requests to avoid 429 errors.
- **`schemas.js`**: Zod schemas for data validation.
- **`ui.js`**: Shared UI logic (Toast notifications, Modals) injected into content scripts.

---

## 3. Core Logic Analysis

### 3.1 Authentication System
The system manages two distinct types of authentication:
1.  **Dashboard Authentication** (User Identity)
2.  **Platform Authentication** (Access to ChatGPT/Claude/Gemini)

**Dashboard Auth Flow:**
1.  **Login:** User logs in at Main Dashboard.
2.  **Handoff:** User is redirected to `/extension-auth`.
3.  **Capture:** `content-dashboard-auth.js` captures the `brainbox-auth-ready` event containing `accessToken` and `refreshToken`.
4.  **Storage:** Tokens are sent to Service Worker (`setAuthToken`) -> `AuthManager` -> saved to `chrome.storage.local`.
5.  **Validation:** `AuthManager.isSessionValid()` checks local tokens against expiration. `syncAll()` performs a live "ping" to the API to verify validity.

**Platform Token Capture:**
- **ChatGPT:** `AuthManager` listens to `https://chatgpt.com/backend-api/*` headers for `Authorization: Bearer ...`.
- **Claude:** `AuthManager` listens to `https://claude.ai/api/organizations/*` to extract the `org_id` from the URL.
- **Gemini:** `inject-gemini-main.js` extracts `WIZ_global_data` (token) and `AuthManager` captures `rpcids` (dynamic key) from request bodies.

### 3.2 Synchronization (Sync)
Managed centrally by `PromptSyncManager` (imported from `@brainbox/shared`).

**Key Responsibilities:**
- Fetching Prompts, Folders, and User Settings from Dashboard.
- Caching data in `chrome.storage.local` (`brainbox_prompts_cache`, etc.).

**Sync Logic (`syncAll`):**
1.  **Trigger:** Can be triggered manually (UI button), on Startup, or periodically (30m).
2.  **Auth Check:** Verifies `accessToken` validity.
3.  **Silent Mode:** If `silent=true`, avoids opening tabs/redirects if auth fails.
4.  **Fetch:** Calls `/api/prompts`.
5.  **Update:** Updates specific storage keys (`brainbox_prompts_cache`).
6.  **Refresh:** `DynamicMenus` listens for storage changes and rebuilds context menus.

### 3.3 Dependency Matrix & Data Flow

**Service Worker (`service-worker.ts`)**
- Imports:
    - `AuthManager` (Local)
    - `PromptSyncManager` (Shared Package)
    - `DynamicMenus` (Local)
    - `dashboardApi` (Local)
    - `platformAdapters` (Local)

**Data Flow:**
1.  **ContentScript** (Capture Token) -> **ServiceWorker** (Message) -> **AuthManager** (Storage).
2.  **Popup** (UI Load) -> **Storage** (Read Cache) -> **UI Render**.
3.  **Popup** (Action: Sync) -> **ServiceWorker** (Message `syncAll`) -> **PromptSyncManager** (Fetch API) -> **Storage** (Write Cache).

---

## 4. Observations & Recommendations

1.  **Hardcoded URLs:** `PromptSyncManager` (in shared package) contains a hardcoded URL (`https://brainbox-alpha.vercel.app`). This should be refactored to use `CONFIG.API_BASE_URL` or an injected configuration to ensure environment consistency (Dev vs Prod).
2.  **Gemini Complexity:** The Gemini integration involves multiple layers (Main world injection -> Content Script -> Background). This makes it fragile to DOM changes.
3.  **Shared Code:** `PromptSyncManager` being in `shared` is good for reusability, but its dependence on `chrome.storage` makes it extension-specific. It might be better named `ExtensionPromptSyncManager` or have the storage adapter injected.

