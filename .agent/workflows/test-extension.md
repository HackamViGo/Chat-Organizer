---
description: how to test the extension using a persistent Chrome profile
---

# Workflow: Test BrainBox Extension

Use this workflow to launch Chrome with the pre-configured test account (Ivan)
and the extension loaded. Run after every build.

## Step 1 — Build or start dev server

Option A (production build):
```bash
pnpm --filter=brainbox-extension-v3 build
```

Option B (dev mode with hot reload):
```bash
pnpm --filter=brainbox-extension-v3 dev
```
If dev mode — Vite runs on port 5174. Keep this terminal open.

## Step 2 — Launch Chrome with Ivan profile

```bash
pkill google-chrome || true
google-chrome --remote-debugging-port=9222 \
  --user-data-dir="/home/stefanov/.brainbox-profiles/ivan-gemini" \
  --no-first-run \
  --no-default-browser-check \
  --load-extension="$(pwd)/apps/extension_v3/dist" \
  "https://gemini.google.com" &
```

This loads:
- Pre-logged-in profile as "Ivan"
- Extension from apps/extension_v3/dist
- Opens Gemini directly

## Step 3 — Verify connection via MCP

Use chrome-devtools MCP → list_pages to confirm session is active.
Expected: at least one page with URL containing gemini.google.com.

## Step 4 — Manual smoke test

1. Wait for Gemini to fully load
2. Right-click anywhere on the page
3. Verify "BrainBox: Save Chat" appears in context menu
4. Open a Gemini conversation
5. Right-click → Save Chat → check extension badge turns ✓ (green)
6. Open extension popup → verify auth status shows connected
7. Check service worker console (chrome://extensions → BrainBox → service worker) → no errors

## Step 5 — If something is broken

Check in this order:
1. `apps/extension_v3/dist/` exists and has files → if not, run build again
2. Service worker errors → check message-router.ts handler exists for the action
3. Context menu missing → check manifest.json host_permissions includes gemini.google.com
4. Badge not showing → check chrome.action.setBadgeText call in message-router.ts
5. Popup blank → confirm @vitejs/plugin-react is in vite.config.ts

## Notes

- Profile path: `/home/stefanov/.brainbox-profiles/ivan-gemini`
- Remote debugging port: 9222
- Extension dist: `$(pwd)/apps/extension_v3/dist`
- Dev server port: 5174 (not 5173 — loaded as extension, not standalone)