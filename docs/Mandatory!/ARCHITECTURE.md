# ARCHITECTURE.md

> **Версия:** 3.1.0  
> **Авторитет:** Архитект. Промени изискват архитектурен review, не само PR approval.  
> **Правило:** Никой агент не добавя нов слой, нов state manager или нова комуникационна пътека без да актуализира този файл първо.

---

## Системата се състои от три части

```
┌─────────────────────────────────────────────────────────┐
│  Chrome Extension (apps/extension)                       │
│  Улавя данни. Не пази UI state. Не съдържа бизнес логика.│
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP API (Bearer JWT)
                        │ Само тази пътека. Без изключения.
┌───────────────────────▼─────────────────────────────────┐
│  Dashboard — Next.js (apps/dashboard)                    │
│  Показва данни. Пази UI state. Съдържа бизнес логика.    │
└───────────────────────┬─────────────────────────────────┘
                        │ Supabase SDK (RLS)
┌───────────────────────▼─────────────────────────────────┐
│  Supabase (PostgreSQL + Auth + Storage + Realtime)        │
│  Единствено истинно хранилище. Enforces ownership чрез RLS│
└─────────────────────────────────────────────────────────┘
```

---

## Chrome Extension

**Роля:** Пасивен наблюдател. Улавя AI разговори и ги изпраща към Dashboard API.

**Какво прави:**
- Наблюдава мрежовия трафик на AI платформи чрез `chrome.webRequest`
- Извлича auth credentials за background API calls (никога не ги показва в UI)
- Изпълнява background fetch към AI платформите, използвайки уловените credentials
- Нормализира отговорите към canonical `Chat` schema
- Поддържа локална sync queue (offline-first) в `chrome.storage.local`
- Комуникация с Dashboard чрез HTTP API с Bearer JWT
- **Rate Limiting:** Интегриран Token Bucket ограничител (apps/extension/src/lib/rate-limiter.ts) за избягване на блокиране от AI платформи:
  - ChatGPT: 60 RPM | Claude: 30 RPM | Gemini: 20 RPM | Dashboard: 100 RPM

**Какво НЕ прави:**
- Не съдържа бизнес логика (тя е в Dashboard)
- Не пази UI state извън popup
- Не пише директно в Supabase — всичко минава през Dashboard API
- Не импортира код от `apps/dashboard`
- Не модифицира DOM на AI платформите (с изключение на prompt inject UI)

**Вътрешна организация:**
- `service-worker.ts` — централен координатор, живее в background
- `background/modules/` — специализирани модули (auth, sync, cache, routing)
- `background/modules/platformAdapters/` — нормализатори по платформа
- `content/` — content scripts, по един на платформа
- `lib/` — споделени utility функции в контекста на Extension

**Платформена поддръжка:** ChatGPT, Claude, Gemini, DeepSeek, Grok, Perplexity, Qwen, LMArena

---

## Dashboard (Next.js)

**Роля:** Команден център. Показва, организира и обогатява данните.

**Какво прави:**
- Server-side: API routes за всички мутации, Supabase SSR auth
- Client-side: Zustand stores за UI state, Realtime subscriptions за live sync
- AI enrichment: обобщения, тагове, задачи чрез AI API routes
- Приема данни от Extension чрез защитени API routes

**Какво НЕ прави:**
- Не съдържа Extension логика
- Не комуникира директно с Extension (само Extension комуникира с Dashboard)
- Не излага Supabase credentials към клиента (service role key е само server-side)

**Слоеве (отвън навътре):**
1. `middleware.ts` — auth guard, CORS за Extension, rate limiting
2. `app/api/**/route.ts` — API layer, Zod validation, Supabase операции
3. `store/*.ts` — Zustand, UI state, optimistic updates
4. `components/` — React компоненти, само рендериране и event handling

**Правило за слоевете:** Логика тече само надолу. Компонент не извиква Supabase директно. Store не рендерира UI. API route не импортира от store.

---

## Споделени пакети (packages/)

Monorepo пакети, достъпни в двете приложения чрез `@brainbox/*` импорти.

| Пакет | Съдържа | Използва се от |
|-------|---------|----------------|
| `@brainbox/shared` | TypeScript типове, utility функции, constants | Всичко |
| `@brainbox/validation` | Zod schemas — единствен source of truth за валидация | Dashboard API, Extension adapters |
| `@brainbox/database` | Supabase генерирани TypeScript типове | Dashboard, shared |
| `@brainbox/config` | Tailwind, TypeScript, PostCSS конфигурации | Двете приложения |
| `@brainbox/assets` | AI платформени икони и branding | Dashboard UI, Extension popup |

**Правило:** Пакетите не съдържат runtime логика, специфична за едното приложение. Ако нещо работи само в Extension — то е в Extension. Ако работи само в Dashboard — то е в Dashboard.

---

## Комуникационни пътеки

Съществуват точно три легитимни пътеки. Всяка друга е архитектурен нарушение.

**1. Extension → Dashboard API**
```
Extension (background) → HTTPS POST/PUT/DELETE → /api/** → Supabase
Authorization: Bearer <JWT>
Body: Zod-validated JSON
```

**2. Dashboard → Supabase**
```
Dashboard API routes → @supabase/ssr (server) → PostgreSQL (RLS enforced)
Dashboard client → @supabase/ssr (browser) → Supabase Realtime
```

**3. Token Bridge (еднопосочен, при login)**
```
Dashboard /extension-auth page → content-dashboard-auth.ts → chrome.runtime.sendMessage → authManager.ts → chrome.storage.local
```
Тази пътека съществува само за предаване на JWT от Dashboard към Extension. Използва се веднъж при login. Не се използва за данни.

---

## Сигурност на данните

**Row Level Security (RLS):** Всяка таблица в Supabase има RLS политики. Потребител вижда само своите данни, дори при директна заявка към Supabase REST API. RLS е последната линия на защита — не разчитаме само на Next.js middleware.

**JWT проверка:** Dashboard API routes проверяват JWT при всяка заявка. Не се кешира auth state между заявки.

**Extension credentials:** Auth токените в `chrome.storage.local` са достъпни само за разширението. Не се предават към трети страни.

**Входни данни:** Всичко, влизащо в система, минава през Zod validation. Не съществува path от raw HTTP input директно към Supabase.

---

## Какво НЕ се слага и къде

| Нещо | Не се слага в |
|------|---------------|
| Supabase service role key | Клиентски код, Extension, `NEXT_PUBLIC_*` variables |
| Бизнес логика | UI компоненти (само рендериране) |
| Supabase заявки | UI компоненти или Zustand stores (само в API routes) |
| Extension-специфичен код | Dashboard или packages |
| Dashboard-специфичен код | Extension или packages |
| Raw потребителски вход | Директно в база данни без Zod validation |
| `console.log` | Production код (използвай `logger.ts`) |
| `any` тип | Навсякъде — без изключения |

---

## Карта на ресурсите и конфигурацията (Resource & Configuration Map)

Справка за местоположението на ключови настройки и ресурси. Използвайте тези пътища за бърза навигация и избягване на дублиращи се търсения.

| Ресурс | Местоположение (Path) | Описание |
|--------|----------------------|----------|
| **Local Supabase Keys** | `supabase/.supabase_local_keys.txt` | Генериран файл с URL, Anon Key и Service Key за локална среда. |
| **Global Environment** | `.env`, `.env.local` | Глобални настройки в корена на проекта. |
| **Dashboard Config** | `apps/dashboard/.env`, `.env.local` | Настройки специфични за Dashboard приложението. |
| **Extension Config** | `apps/extension/.env.production`, `.env.development` | Настройки специфични за Chrome Extension. |
| **Supabase Config** | `supabase/config.toml` | Настройки на Supabase CLI и Docker контейнерите. |
| **Database Migrations** | `supabase/migrations/` | SQL скриптове за дефиниране на схемата и RLS политиките. |
| **Validation Schemas** | `packages/validation/schemas/` | Zod схеми за валидация (единствен сорс на истина). |
| **Shared Types** | `packages/shared/src/types/` | Споделени TypeScript интерфейси и типове. |

---

## Правила при промяна на архитектурата

1. Промяна в комуникационните пътеки → актуализирай този файл + `CONTEXT_MAP.md`
2. Нов shared тип → добавя се само в `@brainbox/shared`
3. Нова Zod schema → добавя се само в `@brainbox/validation`
4. Нова таблица в Supabase → migration + `pnpm db:gen` + актуализация на `@brainbox/database`
5. Нова платформа в Extension → нов adapter + нов content script + актуализация на `DATA_SCHEMA.md`

---

## Производителност и Качество (Performance & Quality)

Всички компоненти и API-та трябва да се стремят към следните нива:

| Метрика | Цел | Обяснение |
|---------|-----|-----------|
| **API Response** | < 500ms | Време за отговор на Dashboard API (без AI generation) |
| **Main Bundle** | < 250KB | Размер на основния JavaScript пакет на Dashboard |
| **Lighthouse** | > 90 | Performance, Accessibility, SEO и Best Practices |
| **LCP** | < 2.5s | Largest Contentful Paint за Dashboard страниците |
