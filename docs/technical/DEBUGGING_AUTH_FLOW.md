# Debugging Report: Authentication & Save Flow (v2.1.3)
Date: 2026-02-01
Status: Resolving Critical Auth Loop & Sync Issues

## 🚨 Problem Overview
The user experienced a persistent issue where the extension would:
1. Detect a missing token when trying to save a chat (Claude/Gemini).
2. Open the login page.
3. User would log in successfully.
4. User would return to the chat, try to save, and **be asked to log in again**.
5. In Gemini, the "Save" action would fail silently or with generic errors.

## 🔍 Investigation & Findings

### 1. Dashboard Middleware Redirect Logic
**Issue:** The dashboard middleware (`apps/dashboard/src/middleware.ts`) was aggressively redirecting authenticated users to the homepage (`/`), ignoring the `?redirect=/extension-auth` parameter.
**Impact:** The user was never reaching the `/extension-auth` page, which is the *only* place where the token is handed off to the extension.
**Fix:** Modified middleware to check for `redirect` param even if the user is already logged in.

### 2. Extension Manifest & Localhost
**Issue:** When switching to development mode (`http://localhost:3000`), the `apps/extension/manifest.json` did not list `localhost` in the `matches` for `content-dashboard-auth.js`.
**Impact:** The token-capture script was physically present in the codebase but was **never injected** by Chrome into the localhost page. The extension never received the token.
**Fix:** Added `http://localhost:3000/extension-auth` to `matches` and `http://localhost/*` to `host_permissions` in `manifest.json`.

### 3. Stale Token State in Content Scripts
**Issue:** Content scripts (`content-claude.js`, `brainbox_master.js`) load once when the page loads. They read the token on startup. If the user logs in *while* the chat page is open, the content script still holds the `null` or old token in memory.
**Impact:** Even after a successful token sync in the background, the content script would check its *local variable*, see it's missing, and trigger the login flow again.
**Fix:** Implemented a **Force Refresh** pattern. Before every "Save" action, the script now explicitly calls `chrome.storage.local.get(['accessToken'])` to ensure it has the absolute latest state.

### 4. Prompt Inject Script Crash
**Issue:** The `prompt-inject.js` script runs in all frames, including sandboxed iframes in Gemini where `chrome.storage` is undefined.
**Impact:** `TypeError: Cannot read properties of undefined` in the console, creating noise and potential instability.
**Fix:** Added specific checks for `chrome.storage` existence before accessing it, with a graceful fallback to default config.

### 6. Gemini Context Menu Mismatch
**Issue:** `DynamicMenus` sends `triggerSaveChat` for all platforms, but `brainbox_master.js` was only listening for `saveConversationFromContextMenu`.
**Impact:** Clicking "Save Chat" in Gemini did absolutely nothing (silently ignored).
**Fix:** Updated `brainbox_master.js` to listen for `triggerSaveChat` and added logic to extract the Conversation ID from `window.location.href` if the background script doesn't provide it.

### 7. UI Library Race Condition
**Issue:** `content-chatgpt.js` and `brainbox_master.js` were attempting to initialize the UI library (`window.BrainBoxUI`) before `ui.js` had fully executed/attached to the window, leading to "UI Library NOT found" errors.
**Fix:** Implemented a retry mechanism (poll every 100ms up to 10 times) in both scripts to ensure they wait for the UI library to be ready.

### 8. Message Channel Timeout (Gemini)
**Issue:** Chrome closes the message channel if an asynchronous response (from the context menu click) takes too long. Waiting for IndexedDB checks or user confirmation caused this to fail.
**Fix:** Refactored Gemini handler to "Fire and Forget". Send `{success: true}` immediately to acknowledge the click, then process heavy logic (DB, network, UI) in a detached async loop.

### 9. Gemini Save Not Working (2026-02-02)
**Issue:** Clicking "Save Chat" in Gemini context menu did nothing. No toast appeared, no save happened.
**Root Causes:**
1. **Missing Auth Check:** Unlike Claude, `brainbox_master.js` didn't check for valid `accessToken` before attempting save.
2. **Missing Function:** `isChatIncomplete()` was called but not defined, causing `ReferenceError`.

**Fixes Applied:**
1. **Added Force Token Refresh** (lines 1635-1667):
   - Check `chrome.storage.local` for `accessToken` and `expiresAt`
   - Validate token exists and is not expired
   - If invalid → show toast "Please log in first" and open login page
   - If valid → proceed with save
2. **Added `isChatIncomplete()` function** (lines 1826-1847):
   - Checks if chat has 6+ messages AND can scroll up OR has "load more" buttons
   - Returns `true` if chat is not fully loaded
   - Used to show confirmation dialog before saving incomplete chats

**Result:** Save now works correctly with proper auth validation and user warnings for incomplete chats.

---

## ⚠️ Unresolved / Pending Issues (Handover)

### 1. `brainbox_master.js` Fragility
- **Problem:** I introduced syntax errors (accidental async wrappers) while refactoring the save handler.
- **Current Status:**
    - Cleaned up the `triggerSaveChat` handler.
    - Removed the duplicate legacy handler.
    - **CRITICAL:** The save logic is now fully contained in `brainbox_master.js`, but it relies on extracting DOM data which can be brittle.
- **Next Step:** Verify that `request.action === 'triggerSaveChat'` works END-TO-END. If it fails, revert to a simpler synchronous handler and use `chrome.runtime.sendMessage` for *everything* (logging, saving, toasts).

### 2. Duplicate Save Handlers
- **Problem:** There were two blocks listening for `triggerSaveChat` in `brainbox_master.js`.
- **Status:** I deleted the second one.
- **Next Step:** Verify no other listeners are conflicting.

### 3. "Failed to fetch" on Localhost
- **Problem:** Localhost (via `127.0.0.1`) is working now, but any network instability triggers the *Auth Logic* (opening login page).
- **Recommendation:** Only trigger login flow on `401/403` status codes, NOT on generic `failed to fetch` which could just be the dev server being down.

---

## 🛠️ Fix Registry (Files Modified)

| File | Change |
|------|--------|
| `apps/dashboard/src/middleware.ts` | Respects `?redirect=` param for logged-in users; Added CORS for Localhost/Extension. |
| `apps/extension/manifest.json` | Added `localhost` & `127.0.0.1` support for auth script injection. |
| `apps/extension/src/content/content-claude.js` | Added **Force Token Refresh**; Added `Failed to fetch` as Auth Error. |
| `apps/extension/src/content/brainbox_master.js` | Added Auth Check logic; **Fixed `triggerSaveChat` handler**; Added UI Library retry; **Refactored to Fire-and-Forget async pattern**; **Added Force Token Refresh before save (2026-02-02)**; **Added `isChatIncomplete()` function (2026-02-02)**. |
| `apps/extension/src/content/content-chatgpt.js` | Added UI Library initialization retry loop. |
| `apps/extension/src/background/modules/dashboardApi.ts` | Added verbose logging (URL, Token existence, Expiry). |
| `apps/extension/src/prompt-inject/prompt-inject.js` | Added safety checks for `chrome.storage` API availability. |
| `apps/extension/src/lib/config.js` | Switched to `127.0.0.1` (Dev Environment). |


---

## 🔮 Future Maintenance Guide

### How to Debug Auth Issues
If users report "Looping Login" or "Save Failed":

1.  **Check the Redirect Flow:**
    *   Does the user land on `/extension-auth`?
    *   Does the "Extension Connected" toast appear?
    *   *If NO:* Check `middleware.ts` and `manifest.json` matches.

2.  **Check Token Handoff:**
    *   Open `extension-auth` page console. Look for `[BrainBox] Auth event received`.
    *   Open Extension Background console. Look for `[BrainBox Worker] 📨 Message received: setAuthToken`.
    *   *If Missing:* Content script isn't running. Check `manifest.json`.

3.  **Check Token Freshness:**
    *   In the Content Script (Claude/Gemini), verify `chrome.storage.local.get` is called *at the moment of action*, not just at startup. Variables are not reactive across context boundaries.

### Critical Rules
*   **NEVER** use `localStorage` for auth tokens in the extension. Always use `chrome.storage.local`.
*   **ALWAYS** update `manifest.json` when adding new environments (Staging/Dev).
*   **ALWAYS** validate the token expiry (`expiresAt`) before making API calls to avoid server-side 401s.
