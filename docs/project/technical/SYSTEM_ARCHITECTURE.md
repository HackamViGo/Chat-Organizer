# 🏗️ BrainBox System Architecture

## 🌉 Extension Components
```
├── Service_Worker (background/service-worker.js)
│   ├── Config_Module (lib/config.js) -> Single source of truth for URL
│   ├── Token_Interceptor (Intercepts ChatGPT Bearer tokens)
│   ├── API_Request_Handler (Talks to Dashboard API)
│   ├── Dynamic_Key_Discovery_Engine (For Gemini batchexecute)
│   └── Rate_Limiter_Queue (Priority bucket logic)
├── Content_Scripts
│   ├── Config_Global (lib/config-global.js) -> Shared state
│   ├── DOM_Injector (Adds "Save" buttons and Prompts UI)
│   ├── MutationObserver_Controller (Live UI detection)
│   └── Platform_Scrapers (ChatGPT, Claude, Gemini deep logic)
```

## 🔐 Authentication Flow
- **Dashboard to Extension**: `/extension-auth` page dispatches `brainbox-auth-ready`.
- **Capture**: `content-dashboard-auth.js` sends tokens to Service Worker.
- **Persistence**: Tokens stored in `chrome.storage.local`.
- **Renewal**: Automatic redirect to `/extension-auth` on 401 response.

## 💾 Data Synchronization
- **Payloads**: Normalized JSON matching `Zod` schemas.
- **Strategies**:
  - **ChatGPT**: API Interception + Mapping extraction.
  - **Gemini**: Dynamic Key discovery + `batchexecute` sniffing.
  - **Claude**: OrgID extraction + fetch.

## ⚡ Performance Optimizations
- **DOM**: MutationObserver with 200ms debounce.
- **Memory**: WeakMaps for UI element tracking.
- **CSP**: Background script fetch bypasses site-specific Content Security Policies.
