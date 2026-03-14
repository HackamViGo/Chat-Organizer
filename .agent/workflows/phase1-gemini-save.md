---
description: 
---

# BrainBox v3 — Phase 1: Gemini Save

Implement Phase 1 of BrainBox v3 exactly as described in the master plan.
Success criterion: user is on Gemini → right-click → Save Chat → saved to dashboard.

## Step 1 — Scaffold the file structure

Create these files (empty for now):
- apps/extension_v3/src/background/service-worker.ts
- apps/extension_v3/src/background/message-router.ts
- apps/extension_v3/src/background/auth-manager.ts
- apps/extension_v3/src/background/dashboard-api.ts
- apps/extension_v3/src/background/context-menu.ts
- apps/extension_v3/src/platforms/gemini/gemini-main-bridge.ts
- apps/extension_v3/src/platforms/gemini/gemini-content-bridge.ts
- apps/extension_v3/src/platforms/gemini/gemini-dom-extractor.ts
- apps/extension_v3/src/shared/types.ts
- apps/extension_v3/src/shared/storage.ts
- apps/extension_v3/src/shared/logger.ts

## Step 2 — Implement shared/types.ts

Implement the full TypeScript type definitions:
- Platform type (gemini only for now)
- Message interface
- ConversationRecord interface
- DashboardPayload interface
- ExtensionMessage union type
All types must be exactly as specified in the Phase 1 plan.

## Step 3 — Implement the Gemini capture chain

In this exact order:
1. shared/logger.ts — structured (area, msg, data?) signature
2. shared/storage.ts — chrome.storage.local wrapper
3. auth-manager.ts — storePlatformAuth, getGeminiToken
4. gemini-main-bridge.ts — MAIN world IIFE, extracts SNlM0e from window.WIZ_global_data, window.postMessage
5. gemini-dom-extractor.ts — extractMessagesFromDOM(), sorts by DOM order
6. gemini-content-bridge.ts — listens for triggerSaveChat, calls DOM extractor, sends saveToDashboard
7. dashboard-api.ts — saveConversation POST, getUserAuthToken
8. message-router.ts — central switch for all chrome.runtime.onMessage
9. context-menu.ts — registers "BrainBox: Save Chat" for gemini.google.com
10. service-worker.ts — init all modules, inject gemini-main-bridge on request

## Step 4 — Implement manifest.json

Use exactly this structure:
- manifest_version: 3
- permissions: ["storage", "contextMenus", "scripting"]
- host_permissions: gemini + dashboard URL
- content_scripts: gemini-content-bridge, world: ISOLATED
- web_accessible_resources: gemini-main-bridge.js for gemini.google.com
- background service_worker pointing to service-worker.ts

## Step 5 — Implement vite.config.ts

- plugins: [react(), crx({ manifest })]
- define: __APP_VERSION__
- NO manual rollupOptions.input (CRXJS handles entries)
- gemini-main-bridge must be compiled as separate IIFE bundle

## Step 6 — Verify

Run: pnpm --filter apps/extension_v3 type-check
Run: pnpm --filter apps/extension_v3 build
Check dist/ — verify gemini-main-bridge.js exists
Load dist/ as unpacked extension in Chrome
Go to gemini.google.com → right-click → "BrainBox: Save Chat" must appear
Click it → check service worker console → no errors
