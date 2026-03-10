# Chrome Extension — Deep Dive
**Версия:** 2.3.0 | **Последна актуализация:** 2026-02-28 | **Базиран на код от:** 2026-02-28

---

## Бърза справка

| Аспект | Стойност |
|--------|----------|
| Manifest версия | MV3 |
| Build система | Vite 5 + CRXJS |
| CSS система | Tailwind **v4** (CSS-first, `@import "tailwindcss"`) |
| Auth метод | AES-GCM encrypted JWT в `chrome.storage.local` |
| Sync метод | Background fetch → Dashboard API |
| Offline support | `chrome.storage.local` queue (`SyncManager`) |
| Debug режим | `false` (enforced via `stripDevCSP`) |

---

## Среди (Environments)

Конфигурирани в `apps/extension/src/lib/config.ts`.

| Среда | Dashboard URL | API Base URL | Бележки |
|-------|-------------|-------------|---------|
| `dev` | `http://localhost:3000` | `http://localhost:3000` | Локално разработка |
| `docker` | `http://localhost:3000` | `http://localhost:3000` | Локално с Docker (Supabase на 54321) |
| `prod` | `https://brainbox.ai` | `https://brainbox.ai` | Продукция |

---

## Платформи

Повечето платформи използват `document_end` или `document_idle` за инжектиране, с изключение на Gemini.

| Платформа | Content Script | Matches | Capture Метод | Изисква |
|-----------|---------------|---------|--------------|---------|
| **ChatGPT** | `content-chatgpt.js` | `chatgpt.com`, `chat.openai.com` | DOM Scraping | `prompt-inject.js` |
| **Claude** | `content-claude.js` | `claude.ai` | DOM Scraping | `prompt-inject.js` |
| **Gemini** | `brainbox_master.js` | `gemini.google.com` | `document_start` injection | `inject-gemini-main.js` |
| **DeepSeek** | `content-deepseek.js` | `chat.deepseek.com` | Platform Adapter | API Interception |
| **Perplexity** | `content-perplexity.js` | `www.perplexity.ai` | Platform Adapter | DOM + API |
| **Grok** | `content-grok.js` | `x.com/i/grok*`, `grok.com` | DOM Scraping | `x.com` permissions |
| **Qwen** | `content-qwen.js` | `chat.qwen.ai` | Platform Adapter | DOM |
| **LM Arena** | `content-lmarena.js` | `chat.lmsys.org`, `arena.ai` | DOM Scraping | - |

---

## Архитектура на потоците

### Auth Flow
1. **networkObserver.ts**: Улавя `org_id` и `token` от заявките към таблото (Dashboard).
2. **authManager.ts**: Получава данните, криптира ги с **AES-GCM** (ползвайки `crypto.ts`).
3. **Storage**: Записва криптирания JWT в `chrome.storage.local`.
4. **Usage**: При всяка заявка към Dashboard API, `authManager` декриптира токена за заглавната част (Authorization header).

### Save Chat Flow
1. **Content Script**: Улавя събитие за запис (бутон или автоматично).
2. **Message Router**: Изпраща съобщение към Service Worker.
3. **Platform Adapter**: Преобразува специфичния за платформата формат на чата в универсален BrainBox формат.
4. **Dashboard API**: Изпраща данните към `/api/v1/chats`.

### Sync Queue Flow
1. **SyncManager**: Ако Dashboard е недостъпен (offline), заявката се добавя в `brainbox_sync_queue`.
2. **Retry Logic**: Използва `chrome.alarms` за периодични опити за синхронизация при възстановяване на връзката.
3. **Разлика с Dashboard**: Докато Extension използва `SyncManager` за *offline queueing*, Dashboard използва `SyncBatchService` за *rate limit safety* (batching на бързи мутации от UI-я).

---

## Файлова карта (src/)

- `background/service-worker.ts`: Входна точка за фоновия процес.
- `background/modules/authManager.ts`: Управлява сесиите и криптирането. **НЕ** достъпва директно DOM.
- `background/modules/syncManager.ts`: Управлява опашката за офлайн синхронизация.
- `background/modules/platformAdapters/`: Логика, специфична за всяка AI платформа.
- `content/`: Скриптове, работещи директно в страниците на AI чатовете.
- `prompt-inject/`: Инжектира менюто за "AI Enhance" и избор на промптове.
- `lib/crypto.ts`: Имплементация на AES-GCM за сигурност на локалните данни.
- `lib/logger.ts`: Централизиран логер, поддържащ `DEBUG_MODE`.

---

## Известни проблеми и ограничения

- **Gemini document_start**: Изисква `inject-gemini-main.js` да бъде зареден като `web_accessible_resource` (`manifest.json:200`).
- **Token Expiry**: Extension-ът не поддържа автоматично обновяване на `refresh_token` самостоятелно; разчита на активна сесия в Dashboard.
- **DEBUG_MODE**: Трябва да е `false` в `config.ts:14` за продукционни билдове.

---

## Deprecated

- `src/content/brainbox_master.js`: Маркиран за замяна с модулни адаптери (но все още активен за Gemini).
- `IndexedDB`: Вече не се използва за кеширане на чатове; заменен от `chrome.storage.local`.

---

## Changelog
| Дата | Промяна | Файл |
|------|---------|------|
| 2026-02-25 | Пълна реконструкция на документацията | `docs/Mandatory!/EXTENSION.md` |
| 2026-02-28 | Tailwind v3 → v4 миграция. `tailwind.config.ts` изтрит. CSS: `@import "tailwindcss"` + `@theme` блок. | `postcss.config.js`, `popup/styles/index.css` |
| 2026-02-28 | `@brainbox/ui` пакет добавен — централизирани design tokens | `packages/ui/tokens/` |
| 2026-02-25 | Енфорснат `DEBUG_MODE=false` | `config.ts` |
