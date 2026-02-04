# BrainBox Extension v2.1.2 - Release Notes

**Release Date:** 2026-02-02  
**Build Status:** ✅ Production Ready  
**Version:** 2.1.2

---

## 🎯 Overview

Version 2.1.2 is a major update focused on universal AI platform support. We have expanded our reach from 3 to **8 AI platforms**, introducing a modular adapter architecture and a robust DOM-scraping fallback system for platforms without accessible internal APIs.

---

## ✨ New Features

### 1. **Universal AI Support (8 Platforms)**
Full support for "Save Chat" via Context Menu for:
- 🟢 **ChatGPT** (chatgpt.com)
- 🟢 **Claude** (claude.ai)
- 🟢 **Gemini** (gemini.google.com)
- 🆕 **Grok** (grok.com / x.com)
- 🆕 **Perplexity** (perplexity.ai)
- 🆕 **LMSYS Chatbot Arena** (arena.ai / lmarena.ai)
- 🆕 **DeepSeek** (chat.deepseek.com)
- 🆕 **Qwen** (chat.qwen.ai)

### 2. **Modular Adapter Architecture**
- Ported normalization logic to a dedicated `platformAdapters` module.
- Each platform now has its own isolated adapter (e.g., `grok.adapter.ts`, `deepseek.adapter.ts`).
- Centralized `fetchConversation` factory for easier maintenance.

### 3. **Hybrid Scraping Engine**
- Integrated **DOM Scraping fallback** for all new platforms.
- Captures chat history even when API tokens are unavailable or structures are obfuscated.
- Implemented `payload` passing from content scripts to background adapters.

---

## 🐛 Bug Fixes

### 1. **LMSYS / Arena Visibility**
- **Issue:** Context menu was missing on `arena.ai` and `lmarena.ai`.
- **Fix:** Added `https://arena.ai/*` and `https://lmarena.ai/*` to `documentUrlPatterns`.

### 2. **Perplexity API 404s**
- **Issue:** Old `/api/predict/get_thread` endpoint was broken.
- **Fix:** Switched to `/rest/threads/${slug}` with a robust DOM-scraping fallback.

### 3. **Qwen Session Detection**
- **Issue:** URLs using `/chat/` instead of `/c/` were not recognized.
- **Fix:** Updated regex to support both formats.

### 4. **DeepSeek Generic Capture**
- **Issue:** Obfuscated class names prevented consistent data extraction.
- **Fix:** Implemented a generic text-block capturing mechanism for DeepSeek.

### 5. **UI Library Found Errors**
- **Issue:** Race conditions caused "BrainBoxUI not found" in some platforms.
- **Fix:** Optimized initialization sequence and added retry delays.

---

## 🔧 Technical Improvements

### 1. **Modular Service Worker**
```typescript
// apps/extension/src/background/modules/platformAdapters/index.ts
const adapters: Record<string, IPlatformAdapter> = {
    chatgpt: new ChatGPTAdapter(),
    claude: new ClaudeAdapter(),
    // ... New 2026 platforms
    grok: new GrokAdapter(),
    perplexity: new PerplexityAdapter(),
    lmarena: new LMArenaAdapter()
};
```

### 2. **Enhanced `BasePlatformAdapter`**
- Updated `fetchConversation` signature to accept `payload: any`.
- Allows content scripts to "pre-scrape" the DOM and pass structured data to the background.

### 3. **Manifest V3 Hardening**
- Expanded `host_permissions` to cover all new platform domains.
- Updated `content_scripts` injection logic for reliable payload delivery.

---

## 🧪 Testing Checklist

- [x] Context Menu visibility on all 8 sites
- [x] Grok "Save Chat" (Scraping Fallback)
- [x] DeepSeek "Save Chat" (Scraping Fallback)
- [x] Perplexity "Save Chat" (API + Scraping)
- [x] Qwen "Save Chat" (Regex path fix)
- [x] LMArena "Save Chat" (Domain visibility)
- [x] Gemini/Claude/ChatGPT (Regression testing)
- [x] Build passing (`pnpm build:extension`)

---

## 📝 Files Modified

### Background
- `apps/extension/src/background/modules/platformAdapters/*` (New Adapters)
- `apps/extension/src/background/modules/dynamicMenus.ts` (URL Patterns)
- `apps/extension/src/background/modules/messageRouter.ts` (Payload Support)

### Content
- `apps/extension/src/content/content-grok.js`
- `apps/extension/src/content/content-deepseek.js`
- `apps/extension/src/content/content-qwen.js`
- `apps/extension/src/content/content-perplexity.js`
- `apps/extension/src/content/content-lmarena.js`

### Configuration
- `apps/extension/manifest.json`
- `package.json` (v2.1.2)

---

## 📚 Related Documentation

- [CONTEXT_MAP.md](../technical/CONTEXT_MAP.md)
- [DATA_SCHEMA.md](../technical/DATA_SCHEMA.md)
- [FOLDER_STRUCTURE.md](../technical/FOLDER_STRUCTURE.md)
- [walkthrough.md](../walkthrough.md)

---

## 👥 Contributors

- **Stefanov** - Architect & Implementation
- **Antigravity AI** - Code generation, Logic optimization, Documentation

---

**Status:** ✅ Production Ready  
**Next Version:** 2.1.3 (AI-based auto-tagging improvements, Batch Save UI)
