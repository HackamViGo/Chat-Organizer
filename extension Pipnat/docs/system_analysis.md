# System Analysis & Module Coordination

## 📂 Project Structure

```text
.
├── background
│   └── service-worker.js         # Core: Tokens, API Requests, Sync
├── content
│   ├── brainbox_master.js        # Low-level Interceptor for Gemini (XHR/Fetch)
│   ├── content-chatgpt.js        # UI Injection for ChatGPT
│   ├── content-claude.js         # UI Injection for Claude
│   ├── content-dashboard-auth.js # Token Capture from Dashboard
│   └── inject-gemini-main.js     # WIZ Token Extraction from Gemini
├── image-saver
│   └── image-saver.js            # Batch Image Saving
├── lib
│   ├── normalizers.js            # Data Transformation to Common Schema
│   ├── rate-limiter.js           # Request Rate Control (Stealth)
│   ├── schemas.js                # Data Validation & Models
│   └── ui.js                     # Shared UI Components (Modals/Toasts)
├── prompt-inject
│   └── prompt-inject.js          # Prompt Injection in textareas
└── ui
    ├── popup.html                # Main Extension Menu
    └── popup.js                  # Popup UI Logic
```

## 🔍 Module Analysis

### 1. 🧠 Background Service Worker (`service-worker.js`)
*Central hub for state management and API communication.*

*   **`handleGetConversation`**: Proxies requests through the Rate Limiter.
*   **`fetchChatGPTConversation`**: Direct Fetch to ChatGPT API with Bearer token.
*   **`fetchGeminiConversation`**: Generates complex `batchexecute` payload with dynamic keys.
*   **`handleSaveToDashboard`**: Syncs normalized data to Vercel Backend.

### 2. 🧬 Data Normalizers (`normalizers.js`)
*Logic for converting chaotic JSON/DOM into a clean structure.*

*   **`normalizeGemini`**: Unpacks deeply nested arrays from Google `batchexecute` responses.
*   **`determineGeminiRoleImproved`**: Heuristic-based role detection (User vs. AI) based on text patterns.
*   **`normalizeChatGPT`**: Reconstructs linear threads from ChatGPT's mapping tree.

### 3. 🎯 Content Interceptors (`brainbox_master.js` & `image-saver.js`)
*Direct interaction with DOM and network stack.*

*   **`setupBatchexecuteInterceptor`**: Monkey-patches `XMLHttpRequest` and `fetch` to capture real-time data.
*   **`processBatchexecuteResponse`**: Cleans ASCII security prefixes and splits batch requests.
*   **`syncImageToAPI`**: Uploads locally cached images via Proxy to bypass CORS.

### 4. 🎛️ Rate Limiter (`rate-limiter.js`)
*Anti-bot evasion algorithm.*

*   **`schedule`**: Priority-weighted queue with Token Bucket refill.
*   **`jitter`**: Adds random noise (2-5s) to simulate human behavior.

---

## 📊 Dependency Matrix

| File | Imports / Uses | Serves |
| :--- | :--- | :--- |
| `service-worker.js` | `normalizers`, `schemas`, `rate-limiter` | Content Scripts |
| `normalizers.js` | `schemas.js` | `service-worker.js` |
| `content-chatgpt.js` | `ui.js` | ChatGPT Interface |
| `brainbox_master.js` | IndexedDB API | Gemini Interception |
| `image-saver.js` | IndexedDB, Proxy API | Image Dashboard Sync |
| `prompt-inject.js` | Chrome Storage, Dashboard API | AI Textareas |
| `popup.js` | Chrome Storage | User Interface |

---

## ⚖️ Сравнение с документацията (Discrepancies)

### 1. ⚠️ LMArena Detection Gap
*   **Документи:** В `extension_agent.md` е посочено, че работи.
*   **Код:** Липсва интеграция в `service-worker.js` и липсват нормализатори. Платформата е само в "план".

### 2. 🛡️ Undocumented Stealth (Rate Limiter)
*   **Разминаване:** `rate-limiter.js` не съществува в архитектурните схеми.
*   **Реалност:** Критичен за сигурността модул с Token Bucket и Jitter (2-5s), който предотвратява Anti-bot детекция.

### 3. 💾 Data Persistence (IndexedDB)
*   **Разминаване:** Документацията разчита само на `chrome.storage`.
*   **Реалност:** Инжектираните скриптове използват **IndexedDB** за управление на големи масиви `rawData` и изображения (Batch saving).

### 4. 🖼️ Image Proxy & CORS
*   **Разминаване:** Липсва описание на логиката за заобикаляне на CORS.
*   **Реалност:** `image-saver.js` принудително използва `/api/proxy-image` на Vercel, тъй като директният Fetch към Google CDN е блокиран.

---

## 🔑 Critical Sources of Truth
1.  **Tokens**: Stored ONLY in `chrome.storage.local`. Captured by content scripts, used by Background.
2.  **Gemini Keys**: `SNlM0e` extracted from `MAIN` world and sent via `postMessage`.
3.  **Persistence**: `IndexedDB` used for large payloads (rawData/images) to prevent RAM bottlenecks.
4.  **CORS**: All image uploads are proxied through `/api/proxy-image`.
