# BrainBox Extension v2.1.0 - Release Notes

**Release Date:** 2026-01-31  
**Build Status:** ✅ Production Ready  
**Bundle Size:** 151KB (48KB gzipped)

---

## 🎯 Overview

Version 2.1.0 represents a major UX upgrade with full interactivity in the React popup UI and comprehensive context menu fixes. All user-facing features are now functional with proper error handling and debugging support.

---

## ✨ New Features

### 1. **Functional Settings Button**
- Opens BrainBox dashboard settings page in new tab
- Click handler: `chrome.tabs.create({ url: 'https://brainbox-alpha.vercel.app/settings' })`
- Location: Header component (⚙️ icon)

### 2. **Theme Toggle with Persistence**
- Switch between dark mode (🌓) and light mode (☀️)
- State persisted to `chrome.storage.local`
- Loads saved theme on popup mount
- Visual icon changes based on current theme
- Location: Header component

### 3. **Enhanced Context Menus**
Three distinct context menu items now properly scoped:

#### a) **BrainBox Prompts** (Dynamic)
- **Context:** `editable` only (textarea/input fields)
- **Trigger:** Right-click in text input areas
- **Action:** Shows prompt selection menu
- **Fixed:** No longer appears everywhere

#### b) **Save Chat** (Static)
- **Context:** `page` on AI platform URLs
- **Platforms:** ChatGPT, Claude, Gemini
- **Trigger:** Right-click anywhere on AI chat pages
- **Action:** Sends `triggerSaveChat` message to content script

#### c) **Create Prompt** (Static)
- **Context:** `selection` (when text is selected)
- **Trigger:** Right-click on selected text
- **Action:** Opens prompt creation dialog with selected text
- **Message:** `openCreatePromptDialog` with `selectedText`

---

## 🐛 Bug Fixes

### 1. **Auth Sync Issues**
- **Before:** Callback-based chrome.runtime.sendMessage with no error handling
- **After:** Async/await with try-catch blocks
- **Improvement:** Reloads fresh storage data on successful sync
- **Logging:** Console logs for debugging auth flow

### 2. **Context Menu Scope**
- **Issue:** "BrainBox Prompts" appeared on all page elements
- **Fix:** Restricted to `contexts: ['editable']`
- **File:** `src/background/modules/dynamicMenus.ts` (line 48-111)

### 3. **Missing onClick Handlers**
- **Issue:** Settings and Theme toggle buttons were non-functional
- **Fix:** Added proper event handlers with chrome API calls
- **File:** `src/popup/components/Header.tsx`

### 4. **Version Display**
- **Before:** "v.2.1.0-beta"
- **After:** "v2.1.0"
- **File:** `src/popup/components/Footer.tsx`

---

## 🔧 Technical Improvements

### 1. **Error Handling**
```typescript
// useAuth.ts - Before
chrome.runtime.sendMessage({ action: 'checkDashboardSession' }, (response) => {
  if (response?.isValid) {
    setIsConnected(true);
  }
});

// After
try {
  const response = await chrome.runtime.sendMessage({ action: 'checkDashboardSession' });
  if (response?.isValid) {
    const freshStorage = await chrome.storage.local.get(['accessToken', 'userEmail']);
    setIsConnected(!!freshStorage.accessToken);
    setUserEmail(freshStorage.userEmail || null);
  }
} catch (error) {
  console.error('[Popup] Auth sync error:', error);
  setIsConnected(false);
}
```

### 2. **Theme Persistence**
```typescript
// Load theme on mount
useEffect(() => {
  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme) {
      setTheme(result.theme);
    }
  });
}, []);

// Save theme on toggle
const handleThemeToggle = () => {
  const newTheme = theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  chrome.storage.local.set({ theme: newTheme });
  console.log('[Popup] Theme toggled to:', newTheme);
};
```

### 3. **Debugging Support**
- Console logging added to all auth operations
- Theme toggle operations logged
- Format: `[Popup useAuth]`, `[Popup]` prefixes for easy filtering
- Helps diagnose token and sync issues in chrome:monitor

---

## 📦 Build Metrics

| Metric | Value |
|--------|-------|
| Total Bundle | 151.07 KB |
| Gzipped | 48.17 KB |
| Build Time | ~950ms |
| Components | 7 |
| Hooks | 3 |
| Context Menus | 3 (2 static + 1 dynamic) |

---

## 🧪 Testing Checklist

- [x] Settings button opens dashboard in new tab
- [x] Theme toggle switches icon and saves preference
- [x] "BrainBox Prompts" appears only in textareas
- [x] "Save Chat" appears on AI platform pages
- [x] "Create Prompt" appears when text is selected
- [x] Auth sync updates status correctly
- [x] Logout clears storage and updates UI
- [x] Version displays as "v2.1.0"
- [x] Console logging works in chrome:monitor

---

## 📝 Files Modified

### Core Components
- `src/popup/components/Header.tsx` - Added Settings & Theme handlers
- `src/popup/components/Footer.tsx` - Updated version display
- `src/popup/hooks/useAuth.ts` - Improved sync with async/await

### Service Worker
- `src/background/service-worker.js` - Added static context menu items

### Content Scripts
- `src/prompt-inject/prompt-inject.js` - Added handlers for triggerSaveChat & openCreatePromptDialog

### Manifests
- `manifest.json` - v2.1.0
- `src/manifest.json` - v2.1.0
- `package.json` - v2.1.0

### Documentation
- `AI Knowlage/knowledge_graph.json` - Updated popup UI node and added context menu edges

---

## 🚀 Deployment Instructions

1. **Build Extension:**
   ```bash
   cd apps/extension
   pnpm build
   ```

2. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `apps/extension/dist/` folder

3. **Testing with Debug Mode:**
   ```bash
   # Terminal 1: Start Chrome in debug mode
   npm run chrome:debug
   
   # Terminal 2: Monitor console logs
   npm run chrome:monitor
   ```

4. **Verify Functionality:**
   - Click extension icon → popup should open
   - Click ⚙️ → dashboard settings page opens
   - Click 🌓 → icon changes to ☀️, theme saved
   - Visit ChatGPT → right-click in textarea → "BrainBox Prompts"
   - Right-click on page → "Save Chat"
   - Select text → right-click → "Create Prompt"

---

## 🔮 Known Limitations

1. **Theme Application:** Theme toggle saves preference but doesn't yet update popup CSS in real-time (requires CSS variable injection)
2. **Save Chat Handler:** Currently shows notification if platform-specific save button not found (requires platform-specific implementation)

---

## 📚 Related Documentation

- [UI Standards](../../docs/technical/UI_STANDARDS.md)
- [Platform Adapters](../../docs/technical/platform-adapters.md)
- [Knowledge Graph](../../AI%20Knowlage/knowledge_graph.json)
- [Walkthrough](../../docs/walkthrough.md)

---

## 👥 Contributors

- **Stefanov** - Full implementation, debugging, and testing
- **Antigravity AI** - Code generation and documentation

---

**Status:** ✅ Production Ready  
**Next Version:** 2.2.0 (Theme CSS application, Save Chat platform handlers)
