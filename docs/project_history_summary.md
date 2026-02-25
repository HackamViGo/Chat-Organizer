# BrainBox Project Summary

## Извън Спринтовете (Основи & Архитектура)
- **Monorepo:** pnpm + Turborepo с 2 приложения (Next.js Dashboard, Vite Extension) и 4 пакета (`shared`, `validation`, `database`, `assets`).
- **База данни (Supabase):** Настроена PostgreSQL база със стриктни RLS (Row Level Security) политики и SSR (Server-Side) Authentication.
- **Agent Protocols:** Дефинирани стриктни правила за агентите (`main.md`, `core-rules.md`).
- **Dev Среда:** Фиксирани конфигурации на OpenClaw/Antigravity; създадени автоматизации за медия и локални инструменти.

---

## Спринтовете (S1 до S6)

### S1: Екстракция (Extension Data)
- **Content Scripts & Adapters:** Създадени скриптове за извличане (scraping) на чатове от 8 платформи (ChatGPT, Claude, Gemini, DeepSeek, Qwen, Grok, LMArena, Perplexity).
- **Pipeline:** Внедрени "нормализатори", които унифицират всички данни в единен формат.

### S2: Dashboard Основи & UI
- **Мрежа & Дизайн:** Next.js App Router, TailwindCSS, Shadcn UI за модерен вид.
- **State Management:** Внедрен `Zustand` магазин (optimistic updates) за бърз UI при запазване на чатове и папки.
- **Автентикация:** Auth страници (Login, Signup, Callback).

### S3: Server API & Валидация
- **API Routes:** Изградени крайни точки (`/api/chats`, `/api/folders`, `/api/prompts`).
- **Zod Валидация:** Строг контрол на типа (`@brainbox/validation`), работещ на клиента и сървъра.
- Добавена защита срещу загуба или дублиране на данни при запазване.

### S4: Синхронизация (Token Bridge)
- **SyncManager:** Background service worker в екстенжъна, координиращ опашката със заявки.
- **Token Bridge:** Механизъм за трансфер на auth token-и от Dashboard към Extension, елиминиращ нуждата от third-party бисквитки.

### S5: Memory Leaks & Уеб Магазин
- **Memory Fixes:** Оправени течове на памет (чистене на `MutationObserver` и `AbortController`) при SPA навигаторски преходи в ChatGPT и Claude.
- **Web Store Ready:** Custom Vite plugin (`stripDevCSP`), премахващ `localhost` от манифеста, за одобрение в Chrome магазина.

### S6: Тестове & Мониторинг (Текущ)
- **Vitest Suite:** Заменени фейк тестове със 100% работещи Vitest unit тестове за валидационните схеми, Dashboard магазините и API endpoints.
- **Integration Tests:** Рефакторирани тестовете в екстенжъна да mock-ват само мрежата (`fetch`).
- **Sentry/Observability:** Внедрена структура за production error logging в екстенжъна и уеб приложението (fails silently без да крашва).
