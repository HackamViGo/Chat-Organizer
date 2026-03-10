<!-- doc: CHROME_MANIFEST.md | version: 1.0 | last-updated: 2026-02-28 -->
# 📄 CHROME_MANIFEST.md

## 📋 Manifest V3 Overview
Brainbox strictly utilizes Manifest V3 (MV3). MV3 enforces enhanced privacy by retiring background pages in favor of ephemeral Service Workers and heavily restricting code execution via strict Content Security Policies (CSP).

## 🔒 Permissions Deep Dive

| Permission | Risk Level | Used By | Purpose |
|---|---|---|---|
| `storage` | Low | Auth & Sync | Persisting AES-GCM encrypted JWTs and offline queue syncing in `chrome.storage.local`. |
| `webRequest` | Medium | NetworkObserver | Used to intercept auth headers and XHR responses directly from targeted AI platforms. |
| `cookies` | Medium | Authentication | Reading platform-specific auth tokens required to perform background fetches. |
| `contextMenus` | Low | Prompts UI | Displaying "Enhance with Brainbox" quick actions on selected text in the browser. |
| `notifications` | Low | UX | Toasting background sync successes/failures when Dashboard is unreachable. |
| `tabs` / `activeTab` | High | Content injection | Triggering specific UI injectors based on user navigation. |
| `scripting` | High | Injector | Executing `prompt-inject.js` dynamically on allowed hosts. |
| `alarms` | Low | SyncManager | Periodically waking the Service Worker to flush offline queues. |

### Host Permissions Strategy
We explicitly declare host permissions (`host_permissions`) ONLY for supported AI platforms (e.g., `https://chatgpt.com/*`, `https://gemini.google.com/*`) and the Dashboard endpoints to minimize the extension's footprint. Universal access (`<all_urls>`) is declared conditionally for edge-case platform support but tightly controlled in the Content Scripts array.

## 🔧 Content Security Policy
MV3 fundamentally prohibits `eval()` and executing inline scripts to prevent XSS attacks.
Our Production CSP enforces scripts to be strictly originating from `'self'` and explicitly whitelists our domain endpoints for `connect-src`.

## ⚡ stripDevCSP Plugin
In Vite development mode, the bundler often attempts to use `eval()` for Hot Module Replacement (HMR). This violates MV3 strict CSP causing dev-builds to crash instantly upon loading in Chrome.
- **Purpose**: The custom `stripDevCSP` Vite plugin intercepts the compiled manifest emitted by `@crxjs/vite-plugin` and forcibly removes or modifies the CSP headers *only* during active development to allow Vite's HMR WebSockets to function smoothly.
- **Production**: This plugin is bypassed completely, ensuring the Chrome Web Store receives the fully secure MV3 compliant CSP.

## 📦 Build Pipeline Impact
The Extension relies heavily on `@crxjs/vite-plugin`.
- **Parsing**: It reads `manifest.json` as the bundler entrypoint, dynamically discovering HTML popups, background scripts, and all content scripts.
- **Output**: Generates a flattened `dist/` directory ensuring paths match the manifest precisely.

## 🔄 Manifest Field Reference

| Field | Value | Purpose |
|---|---|---|
| `background.service_worker` | `src/background/service-worker.ts` | The central brain handling network observers and sync queues ephemerally. |
| `content_scripts[matches]` | Multiple strictly defined arrays | Connects the distinct platform adapters (`content-chatgpt.js`, `content-claude.js`) to their respective URLs. |
| `run_at` | `document_idle` vs `document_start` | Gemini strictly requires `document_start` to hook initialization objects natively. Most others use `document_idle`. |
| `web_accessible_resources` | `src/content/inject-gemini-main.js` | Allows the Gemini platform to read injected logic directly into the main page execution context bypassing sandbox limitations. |

## 🚀 Chrome Web Store Requirements
When deploying to CWS:
- Justifications must be rigorously filled for `webRequest` and `cookies` explaining they are essential for extracting the active conversation state without disrupting the user UI.
- `DEBUG_MODE` must explicitly evaluate to `false` disabling `logger.ts` verbose output to pass automated reviews.

## 🚨 Common Issues & Solutions
- **HMR Not Working**: Verify `stripDevCSP` is correctly active in `vite.config.ts`.
- **Permission Denied**: Trying to fetch from an unlisted domain? Add it to `host_permissions` in `manifest.json` first.
- **Gemini Injection Failing**: Ensure `inject-gemini-main.js` remains listed under `web_accessible_resources` specifically targeting `gemini.google.com`.

## 📎 Related Documents
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [EXTENSION.md](./EXTENSION.md)
