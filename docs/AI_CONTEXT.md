# 🤖 AI Context: Browser Extension Logic & Architecture

This document is optimized for AI agents to understand the codebase, logic flow, and integration points of the extension.

## 🏗️ Core Architecture (Manifest V3)

### 1. Background Service Worker (`background.js`)
- **Role:** Central event hub.
- **Key Responsibilities:**
    - Manages context menus (`chrome.contextMenus`).
    - Handles payment verification via `ExtPay`.
    - Orchestrates message passing between components.
    - Monitors storage changes for plan upgrades.
- **AI Tip:** Look here for global state logic and external API integrations.

### 2. Content Scripts (`content-script.js`)
- **Role:** DOM manipulator and data extractor.
- **Key Responsibilities:**
    - Injects UI elements (buttons, menus) into AI platforms.
    - Uses `MutationObserver` to detect dynamic sidebar changes.
    - Extracts chat content using platform-specific selectors.
- **AI Tip:** This is where the "scraping" and UI injection logic lives.

### 3. Popup UI (`popup.js` / `popup.html`)
- **Role:** User interface for quick actions.
- **Key Responsibilities:**
    - Displays current chat info.
    - Triggers the "Save" flow.
    - Shows user plan status.
- **AI Tip:** Handles the initial user interaction for saving data.

## 🔄 Data Flow & Communication

### Save Flow:
1. **Trigger:** User clicks "Save" in Popup or Context Menu.
2. **Extraction:** `background.js` sends a message to `content-script.js`.
3. **Response:** `content-script.js` returns `{title, url, content, platform}`.
4. **Redirect:** `background.js` opens a new tab: `BASE_URL/save?params...`.

### Message Schema:
- `{ type: "checkUserStatus" }` -> Returns paid status.
- `{ action: "extractContent" }` -> Returns chat data.
- `{ type: "planUpgraded" }` -> Broadcasts premium status.

## 🔒 State & Storage Schema (`chrome.storage.local`)

```json
{
  "plan": "free" | "premium",
  "chatLimit": number | Infinity,
  "folderLimit": number | Infinity,
  "lastVerified": timestamp,
  "paymentDetected": boolean
}
```

## 🛠️ Platform Selectors Strategy
Since AI platforms change their DOM frequently, the extension uses a multi-strategy approach:
- **Primary:** Specific data-attributes (e.g., `[data-testid="conversation-item"]`).
- **Secondary:** Class-based selectors (e.g., `.group`, `nav aside`).
- **Fallback:** Generic text-based search for headers and main containers.

## 🚀 Development & Debugging
- **Reloading:** Changes to `background.js` require a full extension reload in `chrome://extensions`.
- **Logs:** 
    - Background logs: Click "service worker" link in `chrome://extensions`.
    - Content script logs: Standard browser console.
- **Testing:** Use the `EXTENSION_PRODUCTION_CHECK.md` for verification steps.

## 🔗 Key Integration Points
- **Payment:** `ExtPay` (ID: `extension-ff`).
- **Web App:** `/save` route in the Next.js application.
- **Polyfill:** `webextension-polyfill` for cross-browser compatibility.
