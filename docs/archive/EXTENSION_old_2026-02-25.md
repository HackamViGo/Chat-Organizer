# Extension Deep-Dive (March 2026)

Този документ описва реалното състояние на Chrome Extension-а, базирано изключително на текущия сорс код.

## Платформи

Системата поддържа 8 AI платформи чрез модулна архитектура с `platformAdapters`.

| Платформа | Content Script | Capture Метод | Известни ограничения / Edge Cases | Статус |
|-----------|----------------|----------------|-----------------------------------|--------|
| **ChatGPT** | `content-chatgpt.js` | Background fetch (JWT) | Изисква `chatgpt_token` в storage. | ✅ Работи |
| **Claude** | `content-claude.js` | Background fetch (Cookies) | Използва `credentials: include`. Изисква `claude_org_id`. | ✅ Работи |
| **Gemini** | N/A (UI bridge) | Background fetch (Batch) | Изисква `gemini_at_token` и `gemini_dynamic_key`. Сложен Payload. | ✅ Работи |
| **DeepSeek** | `content-deepseek.js` | Background fetch (Token) | Изисква `deepseek_token`. | ✅ Работи |
| **Grok** | `content-grok.js` | Background fetch (Token) | Изисква `grok_at_token`. | ✅ Работи |
| **Perplexity** | `content-perplexity.js` | Background fetch (REST) | Изисква `perplexity_session`. API ендпоинтите се променят често. | ✅ Работи |
| **Qwen** | `content-qwen.js` | Background fetch (Token) | Най-новият адаптер. | ✅ Работи |
| **LMArena** | `content-lmarena.js` | DOM Scrape Fallback | Хеуристично засичане на роли (`assistant` по подразбиране). Временни сесии. | ⚠ Частично |

---

## Конфигурация на Средата (Environments)
От 25.02.2026, Extension-ът поддържа три хардно кодирани (в `config.ts` и `config-global.js`) среди за разработка и връзка с API-то:
1. `dev`: Свързва се с `http://localhost:3000` (локален Dashboard).
2. `docker`: Свързва се с `http://localhost:3000` (за Dashboard) и `http://127.0.0.1:54321` (за директно локално Supabase API тестване, ако се наложи).
3. `prod`: Свързва се с `https://brainbox.ai` (Production).

---

## Какво може Extension-ът (Потвърдено в кода)

1.  **Проактивно улавяне на Auth**: Улавя автоматично токени и сесии от AI платформите чрез `networkObserver.ts`.
2.  **Offline-first Sync**: При липса на мрежа или грешка 5xx, чатовете се записват в `brainbox_sync_queue` в `chrome.storage.local` (SyncManager.ts).
3.  **Автоматично тагване**: Локално генериране на тагове базирано на честота на думи и whitelist (dashboardApi.ts).
4.  **Rate Limiting**: Вграден `p-limit` за Dashboard и всяка AI платформа индивидуално (rate-limiter.js).
5.  **Prompt Enhancement**: Интеграция с Dashboard API за подобряване на промпти директно в интерфейса на платформата.

## Какво НЕ може (Технически причини)

1.  **Директен DB запис**: По CSP и архитектурни причини, разширението няма достъп до Supabase. Всичко минава през Dashboard API.
2.  **Streaming Capture**: В момента улавя само завършени състояния на разговорите (статични снимки).
3.  **Real-time Logic Sync**: Бизнес логиката е изолирана в Dashboard. Разширението е само "сензор".

---

## Файлова карта

| Файл | Какво прави | Какво НЕ прави |
|------|-------------|----------------|
| `service-worker.ts` | Координира съобщения и жизнения цикъл на SW. | Не съдържа логика за парсване на платформи. |
| `authManager.ts` | Управлява и криптира Dashboard сесията. | Не управлява logic сесиите на AI платформите. |
| `syncManager.ts` | Управлява локалната опашка (retry logic). | Не праща заявки (само менажира опашката). |
| `dashboardApi.ts` | Изпълнява реалните HTTP заявки към Dashboard. | Не знае нищо за спецификите на DOM на платформите. |
| `platformAdapters/` | Канонизира данните от суров JSON към `Chat` обект. | Не се занимава с мрежова комуникация извън fetch-а на чата. |

---

## Известни проблеми (от кода)

- `dashboardApi.ts:246` — Твърдо кодиран ендпоинт към `/api/chats`. Документацията в `SYNC_PROTOCOL.md` твърди `/api/chats/extension`.
- `SyncManager.ts:16` — Използва `any` за `data` в `SyncItem`, което нарушава стриктната типизация.
- `lmarena.adapter.ts` — Използва твърдо кодирано `assistant` за всички съобщения ако не може да определи ролята.
- **Enforced**: `DEBUG_MODE = false` enforced в Production на 25.02.2026.

---
*Генерирано автоматично от BrainBox Audit Tool на 25.02.2026.*
