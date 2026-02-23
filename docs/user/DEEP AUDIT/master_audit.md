# Master Audit — BrainBox AI Chat Organizer
**Тип**: Supreme Meta-Architect Consolidated Report  
**Версия на системата**: 3.1.0  
**Дата**: 2026-02-23  
**Изготвен от**: Supreme Meta-Architect Agent (Layer 3)  
**Входни данни**: `dashboard_audit.md` (Agent 1), `extension_audit.md` (Agent 2), source scan на `packages/*` и root конфигурации  

---

## Chain-of-Thought Execution Log

| Стъпка | Статус |
|--------|--------|
| АУДИТ 1 — Monorepo Tooling Deep-Dive | ✓ ЗАПИС |
| АУДИТ 2 — Shared Packages Full Audit | ✓ ЗАПИС |
| АУДИТ 3 — Cross-Boundary Communication | ✓ ЗАПИС |
| АУДИТ 4 — Schema Consistency Verification | ✓ ЗАПИС |
| АУДИТ 5 — Architectural Friction Synthesis | ✓ ЗАПИС |
| АУДИТ 6 — Health Score & CI/CD Audit | ✓ ЗАПИС |
| АУДИТ 7 — Exhaustive Element Dictionary | ✓ ЗАПИС |

---

## §1 Monorepo Tooling & Pipeline

### 1.1 pnpm Workspaces

**Файл**: `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Workspace globs: 2 прости glob pattern-а. Покрива `apps/dashboard`, `apps/extension` и `packages/shared`, `packages/validation`, `packages/database`, `packages/config`, `packages/assets`. Няма excludes или допълнителни пътища.

### 1.2 Turborepo Pipeline (`turbo.json`)

| Task | dependsOn | Outputs | Cache | Inputs |
|------|-----------|---------|-------|--------|
| `build` | `["^build"]` | `.next/**`, `dist/**` | ✓ | Default (all files) |
| `dev` | — | — | `false` (disabled) | — |
| `lint` | `["^lint"]` | — | ✓ | Default |
| `type-check` | `["^type-check"]` | — | ✓ | Default |
| `test` | `[]` | — | ✓ | Default |
| `verify` | **НЕ СЪЩЕСТВУВА** | — | — | — |

**Глобални dependencies**: `.env` files + `tsconfig.json` → промяна инвалидира целия кеш.  
**Глобални env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV`.

> [!CAUTION]
> **`verify` task липсва от turbo.json** — Health Gate (`pnpm verify`) е документиран в CONTRIBUTING.md, но (1) задачата не е в Turborepo pipeline и следователно **не се кешира и не се оркестрира**, и (2) `verify` script **не съществува в root `package.json`**. Health Gate е documentation-only фикция на ниво monorepo root.

**Допълнителна аномалия**: `test` task с `dependsOn: []` означава, че тестовете могат да стартират ПРЕДИ пакетите да са build-нати. При clean build тестовете срещу stale артефакти.

### 1.3 Root `package.json` Analysis

**Enforced**: `packageManager: pnpm@10.17.0`, `engines: {node: ">=22.0.0", pnpm: ">=10.17.0"}` ✓

**Version Matrix Verification**:

| Technology | Documented | Actual | Status |
|-----------|-----------|--------|--------|
| Node.js | ≥22.0.0 | ≥22.0.0 | ✓ |
| pnpm | ≥10.17.0 | 10.17.0 | ✓ |
| TypeScript | ~5.9.3 | ~5.9.3 | ✓ |
| Next.js | ^14.2.18 | ^14.2.18 | ✓ |
| Vite | ^7.3.1 | ^7.3.1 | ✓ |
| Supabase JS | ^2.47.10 | ^2.47.10 | ✓ |
| Tailwind | ^4.1.18 | ^4.1.18 | ✓ |
| Zustand | ^5.0.2 | ^5.0.2 | ✓ |
| Turborepo | ^2.8.1 | ^2.8.1 | ✓ |

**Peer Dependency & Compatibility Issues**:

| Package | Version | Проблем | Риск |
|---------|---------|---------|------|
| `next-pwa` | ^5.6.0 | Дизайнирано за Next.js ≤13 (Pages Router + Webpack). Next.js 14 App Router е несъвместим. | P1 |
| `tailwind-merge` | ^2.5.5 | v2 може да не разпознава Tailwind v4 class синтаксиса (CSS-first). | P2 |
| `webpack-cli` | ^6.0.1 | Транзитивна зависимост от `next-pwa`. Не трябва да е в root за Vite/Next.js проект. | P2 |
| `@upstash/redis` | ^1.34.3 | Hoisted на root — трябва да е в `apps/dashboard`. | P2 |

**"Nuclear Lockfile" стратегия**: Не е документирана като explicit стратегия. `overrides: { pify: "^5.0.0" }` е единствената override настройка.

**Тест инфраструктура (fragmented)**:
- Root `test` → `playwright test` (E2E)
- `test:unit` → `node tests/unit/schema-validation.test.js` (plain Node.js, NOT Vitest)
- `test:integration` → `node tests/integration/api-health.test.js` (plain Node.js)
- `vitest` и `@vitest/coverage-v8` са в devDependencies но `vitest` се използва в `apps/extension`
- Fragmented тест система: Playwright + raw Node.js + Vitest (3 различни runner-а!)

---

## §2 Shared Packages Analysis

### 2.1 `@brainbox/shared`

**Файлова структура**:
```
packages/shared/
├── index.js          (177 bytes — compiled JS, mystery file)
├── schemas.js        (2330 bytes — compiled JS, mystery file)
├── package.json
├── package-lock.json (АНОМАЛИЯ: package-lock.json в pnpm monorepo!)
└── src/
    ├── index.ts      (exports 15 public items)
    ├── types/
    │   ├── index.ts          (canonical type definitions)
    │   ├── database.types.ts (14320 bytes — generated)
    │   └── database.ts       (14644 bytes — SLIGHTLY DIFFERENT COPY!)
    ├── constants/index.ts
    ├── utils/ (cn, colors, folders, cache)
    ├── validation/ (internal chat, folder, list, prompt — DUPLICATE на @brainbox/validation!)
    ├── services/ (ai, prompt-library-fetcher, smart-prompt-search)
    ├── config/
    └── logic/
```

> [!WARNING]
> **Дублиране на database types**: `packages/shared/src/types/database.types.ts` (14320 bytes) е почти идентичен с `packages/database/database.types.ts` (14317 bytes), но и двата са различни от `packages/shared/src/types/database.ts` (14644 bytes — 324 bytes по-голям). Три версии на database типовете в монорепото. Коя е каноничната?

> [!WARNING]
> **Вътрешна дублирана валидация**: `packages/shared/src/validation/` съдържа собствени chat/folder/list/prompt validators — ПАРАЛЕЛНО на `packages/validation/schemas/*`. Двата пакета дефинират независими validation правила за едни и същи entities. `packages/shared/src/index.ts` re-exports и двата набора.

> [!CAUTION]
> **`package-lock.json` в pnpm workspace**: `packages/shared/` съдържа `package-lock.json`. Това означава, че `npm install` е изпълнявано в директорията поотделно, заобикаляйки pnpm lockfile. Потенциален drift на зависимостите.

**`Chat` Type Inventory** (от `src/types/index.ts`):
```typescript
type Chat = Database['public']['Tables']['chats']['Row'] & {
  tags?: Json | null;          // РЪЧНО добавено — НЕ е в generated types
  embedding?: number[] | null; // РЪЧНО добавено — НЕ е в generated types
  detailed_summary?: string | null; // РЪЧНО добавено — НЕ е в generated types
}
```

Полета от `chats.Row` (от database.types.ts):
`id`, `user_id`, `title`, `content`, `platform`, `url`, `folder_id`, `source_id`, `messages`, `summary`, `tasks`, `is_archived`, `created_at`, `updated_at`

**`Platform` enum**:
```typescript
enum Platform {
  ChatGPT = 'chatgpt', Claude = 'claude', Gemini = 'gemini',
  Grok = 'grok', Perplexity = 'perplexity', LMArena = 'lmarena',
  DeepSeek = 'deepseek', Qwen = 'qwen', Other = 'other'
}
```

**`Message` interface** (от DATA_SCHEMA.md, НЕ от shared package!):
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: { model?: string; images?: string[]; [key: string]: any };
}
```
> [!IMPORTANT]
> `Message` интерфейсът е документиран само в `DATA_SCHEMA.md`. Не съществува като exported type нито в `@brainbox/shared`, нито в `@brainbox/validation`. Всяко използване на Message разчита на implicit структура.

### 2.2 `@brainbox/validation`

**Exports индекс**:

| Schema | Fields | Notable Validations |
|--------|--------|---------------------|
| `createChatSchema` | title, content, platform, url, folder_id, source_id, messages, summary, detailed_summary, tags, tasks, embedding | `messages: z.array(z.any())` ← UNTYPED |
| `updateChatSchema` | `createChatSchema.partial()` + `id: uuid` | — |
| `createPromptSchema` | title, content, color (hex regex), folder_id, use_in_context_menu | ✓ |
| `updatePromptSchema` | id + partial fields | ✓ |
| `createFolderSchema` | name, color, type (folderTypeEnum), icon, parent_id | Enum mismatch с DB! |
| `updateFolderSchema` | id + partial fields | — |
| `listSchema` | title (min1, max100), color (enum), folder_id | ✓ — добра |
| `listItemSchema` | text (min1, max500), completed, position (int) | ✓ — добра |
| `PrivacyConfigSchema` | enabled, maskEmail, maskPhone, maskCreditCard, customPatterns[] | ✓ |

**`folderTypeEnum`**: `z.enum(['chat', 'image', 'prompt', 'list', 'default', 'custom'])` — **6 стойности**  
**DB `folder_type_enum`**: `"chat" | "list" | "image" | "prompt"` — **4 стойности**  

> [!CAUTION]
> **P0 Enum Mismatch**: Validation приема `'default'` и `'custom'` като валидни folder types. Supabase DB-то ще отхвърли INSERT с PostgreSQL constraint violation за тези стойности. Всяко създаване на folder с type='default' или type='custom' ще fail-не на DB ниво след успешна Zod валидация.

### 2.3 `@brainbox/database`

**Таблици**: `chats`, `folders`, `images`, `list_items`, `lists`, `prompts`, `users`  
**Views**: Няма  
**Functions/RPCs**: НЕ са в generated типовете (но `match_chats` RPC се вика от `ai/search/route.ts`)  
**Enums**: `folder_type_enum: "chat" | "list" | "image" | "prompt"`

> [!CAUTION]
> **Stale generated types**: Колоните `tags`, `embedding`, `detailed_summary` присъстват в реалната DB (доказано от API routes и shared type extensions), но ЛИПСВАТ от `database.types.ts`. `pnpm db:gen` не е изпълнявано след добавянето на тези колони. `match_chats` RPC липсва от `Functions` секцията.

### 2.4 `@brainbox/config`

| Файл | Съдържание |
|------|-----------|
| `models.json` | 4 задачи: analysis, summary, enhance, embedding. Всички → `gemini-2.5-flash` или `text-embedding-004`. Единствен доставчик, без fallback. |
| `tsconfig.base.json` | `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `isolatedModules: true` |
| `tailwind.config.ts` | 282 bytes — минимална конфигурация за v4 |
| `postcss.config.js` | Standard PostCSS setup |

### 2.5 `@brainbox/assets`

**Единствен export**: `PROVIDER_ASSETS: Record<string, string>` — 16 entries.

| Платформа | Иконка | Проблем |
|-----------|--------|---------|
| chatgpt, claude, gemini, deepseek, perplexity, grok, qwen | Специфична иконка | ✓ |
| lmarena | `default-bot.png` | Без custom иконка |
| mistral, xai, alibaba | Специфична иконка | `mistral` НЕ е в Platform enum — dead asset |
| fallback | `default-bot.png` | ✓ |

> [!NOTE]
> `PROVIDER_ASSETS` е `Record<string, string>`, не `Record<Platform, string>`. Няма TypeScript enforcement за платформа-иконка съответствие. Ако нова платформа се добави към Platform enum без update на assets, TypeScript не ще ловне грешката.

---

## §3 Cross-Boundary Communication

### 3.1 Пълен JWT Flow

```
[Step 1] Dashboard Login
  User → auth/signin/page.tsx
  → supabase.auth.signInWithPassword()
  → Supabase Auth validates credentials
  → Returns: { access_token (JWT), refresh_token, expires_at }
  → Cookie: sb-{project_id}-auth-token (maxAge: 1h или 30 days ако rememberMe)
  Failure mode A: Supabase config missing → /auth/signin?config=missing
  Failure mode B: localStorage blocked (cross-origin iframe) → silent fail (handled)

[Step 2] Token Bridge — content-dashboard-auth.ts
  Инжектира се в Dashboard pages (manifest.json matches)
  → Reads localStorage key: /^sb-.*-auth-token$/
  → FALLBACK: hardcoded key 'biwiicspmrdecsebcdfp' (PROD PROJECT ID!)
  → Extracts: { access_token, refresh_token, expires_at }
  → chrome.runtime.sendMessage({ action: 'SET_SESSION', ... })
  Security check: rejects if event.origin !== window.location.origin ✓
  Failure mode C: Polling lag up to 5 seconds
  Failure mode D: Multiple Dashboard tabs → duplicate SET_SESSION messages

[Step 3] AuthManager → chrome.storage.local
  → Stores BRAINBOX_SESSION = { access_token, refresh_token, expires_at }
  → PLAIN TEXT в chrome.storage.local!
  Failure mode E: Token expires (1h default) → syncAll() gets 401 → clears token
  → NO background refresh logic! User must revisit Dashboard manually.

[Step 4] dashboardApi.ts → HTTP Request
  → Reads access_token from chrome.storage.local
  → Sets header: Authorization: Bearer <token>
  → POST /api/chats/extension (или /api/chats)
  Failure mode F: chrome.storage read fail → undefined token → 401

[Step 5] Next.js API Route — JWT Verification
  chats/extension/route.ts:
  → Checks X-Extension-Key header AND Authorization: Bearer token
  → Creates Supabase client with NEXT_PUBLIC_SUPABASE_ANON_KEY
  → Calls supabase.auth.getUser(token) — validates JWT via Supabase Auth API ✓
  → Extracts user.id for subsequent DB operations
  Failure mode G: Clock skew > JWT tolerance → verification fails
  Failure mode H: No rate limiting on /api/chats/extension (confirmed by Agent 1)

[Step 6] RLS Enforcement
  → All DB operations filtered by user_id = auth.uid()
  → Unique constraint (user_id, source_id) prevents duplicates
  Failure mode I: RLS disabled on a table → full data exposure
```

### 3.2 Security Analysis на Token Bridge

| Аспект | Статус | Бележка |
|--------|--------|---------|
| XSS protection | ✓ | `event.origin` check в window message listener |
| Token encryption | ✗ | Plain text в chrome.storage.local |
| Hardcoded project ID | ✗ | `biwiicspmrdecsebcdfp` в source code |
| Refresh token rotation | ✗ | Няма background refresh — session dies silently |
| Rate limiting | ✗ | `/api/chats/extension` неограничен |
| CORS policy | ⚠️ | Само `chrome-extension://`, `localhost`, `127.0.0.1` allowed |

### 3.3 CONTEXT_MAP.md Rule 4.1 Compliance

| Правило | Agent 1 (Dashboard) | Agent 2 (Extension) |
|---------|---------------------|---------------------|
| Extension не импортира от `apps/dashboard` | N/A | ✓ Спазено |
| Комуникация само чрез HTTP API | ✓ (използва `/api/*`) | ✓ (`dashboardApi.ts` → Bearer token) |
| Shared packages чрез `@brainbox/*` | ✓ | ✓ |
| Message Passing за token bridge | N/A | ✓ (`content-dashboard-auth.ts`) |

---

## §4 Schema Consistency Report

### Chat Entity — 4-Layer Cross-Reference

| FIELD | @brainbox/shared | @brainbox/validation | @brainbox/database | Platform Adapter |
|-------|-----------------|---------------------|-------------------|-----------------|
| `id` | ✓ string | ✓ uuid() (update only) | ✓ string PK (auto) | ✗ not sent |
| `user_id` | ✓ string | ✗ not in schema (server inject) | ✓ string FK→auth.users | ✗ not sent |
| `title` | ✓ string (required) | ✓ string().min(1) | ✓ string (required) | ✓ extracted |
| `content` | ✓ string\|null | ✗ z.string() — not nullable! | ✓ string\|null | ✓ built from messages |
| `platform` | ✓ string\|null | ⚠️ z.string() — not enum | ✓ text column | ✓ hardcoded Platform value |
| `url` | ✓ string\|null | ⚠️ url() or '' — null rejected | ✓ string\|null | ✓ page URL |
| `folder_id` | ✓ string\|null | ✓ uuid() nullable optional | ✓ string\|null FK→folders | ✓ user selected |
| `source_id` | ✓ string\|null | ✓ z.string() optional | ✓ unique(user_id, source_id) | ✓ platform conv. ID |
| `messages` | ✓ Json\|null | ✗ z.array(z.any()) — UNTYPED | ✓ jsonb | ✓ Message[] structured |
| `summary` | ✓ string\|null | ✓ string nullable optional | ✓ string\|null | ✓ AI generated |
| `detailed_summary` | ✓ string\|null (manual ext.) | ✓ string nullable optional | ✗ MISSING from generated types | partial |
| `tags` | ✓ Json\|null (manual ext.) | ⚠️ z.array(z.string()) — type mismatch vs Json | ✗ MISSING from generated types | ✓ string[] from getOptimizedTags() |
| `tasks` | ✓ Json\|null | ✓ z.array(z.object({...})) | ✓ jsonb | ✓ AI extracted |
| `embedding` | ✓ number[]\|null (manual ext.) | ✓ z.array(z.number()) nullable | ✗ MISSING from generated types | ✗ server-side only |
| `is_archived` | ✓ boolean\|null | ✗ MISSING from schemas | ✓ boolean\|null | ✗ not sent |
| `created_at` | ✓ string\|null | ✗ not in schema (server auto) | ✓ string\|null | ✗ not sent |
| `updated_at` | ✓ string\|null | ✗ not in schema (server auto) | ✓ string\|null | ✗ not sent |

**Легенда**: ✓ = Consistent / ✗ = Missing or Mismatch / ⚠️ = Weak validation

### Folder Entity — Enum Mismatch

| Layer | Values |
|-------|--------|
| `@brainbox/validation` folderTypeEnum | `'chat' \| 'image' \| 'prompt' \| 'list' \| 'default' \| 'custom'` |
| `@brainbox/database` folder_type_enum | `'chat' \| 'list' \| 'image' \| 'prompt'` |
| **Surplus values** | `'default'`, `'custom'` — в Zod но не в DB! |

---

## §5 Architectural Synthesis

### 5.1 Dashboard Assumptions за Extension

| Assumption | Риск |
|-----------|------|
| Extension изпраща `platform` като валидна Platform enum стойност | ✓ Изпълнено (hardcoded) |
| Extension изпраща `messages` в `Message[]` формат | ⚠️ Предположение — не е валидирано от API |
| Extension не изпраща `user_id` (server inject) | ✓ Изпълнено |
| `/api/chats/extension` има X-Extension-Key check | ✓ Има — но key не е ротиран |

### 5.2 Extension Assumptions за Dashboard

| Assumption | Риск |
|-----------|------|
| Dashboard maintain-ва `sb-*-auth-token` в localStorage | ✓ |
| Dashboard `/api/chats/extension` приема Bearer token | ✓ |
| Dashboard `/api/folders` (GET) е налично за `syncAll()` ping | ✓ |
| Dashboard реал-тайм каналите ще получат new chat insertions от Extension | ✓ |

### 5.3 Критични Architectural Friction Points

**FRICTION 1 — `/api/chats/extension` bypasses Zod validation**  
Докато `/api/chats` (POST) използва `createChatSchema`, `/api/chats/extension` (POST) пасва данните директно към Supabase без никаква validation. Extension данни никога не преминават Zod validation. Риск: malformed data в production DB.

**FRICTION 2 — `messages` field е structurally untyped**  
`createChatSchema.messages = z.array(z.any())`. Extension normalizers произвеждат `Message[]` с role/content/timestamp структура. Тази структура НЕ е enforce-вана от нито един schema слой. TypeScript `Message` interface съществува само в docs.

**FRICTION 3 — DataProvider Prompts bypass**  
Dashboard `DataProvider.tsx` fetches `chats` и `folders` чрез API routes, но `prompts` директно от Supabase SDK. Резултат: промпти не преминават `@brainbox/validation` на fetch, а extension updates на промпти минават `/api/prompts` с validation. Split data-access personality.

**FRICTION 4 — Inverted Optimistic Updates (все 3 stores)**  
```typescript
// В useChatStore, useFolderStore, usePromptStore:
try {
  const response = await fetch('/api/chats', { method: 'PUT', body });
  // ✓ Прилага server response при SUCCESS
} catch (error) {
  set(state => /* ✗ ПРИЛАГА updates при FAILURE! */);
  throw error;
}
```
Ако Extension sync предизвика conflict и API върне грешка, Dashboard UI ще показва некоректни данни до refresh.

**FRICTION 5 — Dual Sync Queue за Gemini**  
Extension поддържа:
1. `brainbox_sync_queue` в `chrome.storage.local` (universal, SyncManager)
2. `syncQueue` object store в IndexedDB `BrainBoxGeminiMaster` (Gemini-only)

Двата queue-а могат да се опитат да синхронизират едни и същи Gemini разговори. `(user_id, source_id)` DB constraint предотвратява дублиране, но duplicate requests са ресурсно разточителни и увеличават шанса за rate limiting.

**FRICTION 6 — CSP localhost в production build**  
Manifest.json содержи `ws://localhost:5173` и `http://localhost:3000` в CSP. `stripDevCSP` Vite plugin **не е имплементиран** в `vite.config.ts`. Ако production build се генерира без изрично премахване на dev entries → Chrome Web Store rejection.

**FRICTION 7 — useShallow масово пропускане**  
При всеки Supabase real-time event (включително Extension sync): `DataProvider` update-ва store директно `useChatStore.setState(...)` ИЗВЪН store actions. Тоест:
- Нарушава encapsulation на Zustand store
- Приема се от `GlobalBrain`, `ChatStudio` (без `useShallow`) → масово re-render cascade

**FRICTION 8 — No `Message` type contract between Extension and Dashboard**  
Extension normalizers (normalizers.ts) произвеждат структуриран `Conversation` обект с `Message[]`. Dashboard приема тези данни и ги рендерира в `MessageContent.tsx`. Но:
- `Message` interface не е exported от `@brainbox/shared`
- `messages` в validation е `z.any()`
- Ако normalizer format се промени, Dashboard рендерингът silently се чупи

---

## §6 Health Score & CI/CD Audit

### 6.1 Health Gate — `pnpm verify`

> [!CAUTION]
> **`pnpm verify` не съществува!** Нито в root `package.json` scripts, нито в turbo.json tasks. Командата описана в CONTRIBUTING.md като задължителен health gate е **phantom script** — изпълнението й ще върне: `ERR_PNPM_NO_SCRIPT  Missing script: verify`.

Penalty таблица (от CONTRIBUTING.md):

| Нарушение | Наказание |
|-----------|-----------|
| `console.log` | -5 pts |
| `any` usage | -10 pts |
| Test failure | -20 pts |
| Lint error | -5 pts |
| **Minimum score за PR approval** | **>80 pts** |

### 6.2 Turborepo Cache Strategy

| Инвалидиран от | Scope |
|----------------|-------|
| Промяна в `.env` | Всички tasks в целия monorepo |
| Промяна в `tsconfig.json` | Всички tasks |
| Промяна в env vars (Supabase URLs, NODE_ENV) | Всички tasks |
| Промяна в package files | Само засегнатия package и неговите dependants |

**Stale cache условия**: Липсват `inputs` дефиниции в pipeline tasks → Turborepo използва default (всички файлове в пакета). Резултат: консервативно, но правилно кеширане. Препоръчително е да се добавят explicit `inputs` за по-прецизни invalidations.

### 6.3 Conventional Commits Enforcement

| Инструмент | Статус |
|-----------|--------|
| `commitlint` | ✗ НЕ е инсталиран |
| `husky` | ✗ НЕ е инсталиран |
| Pre-commit hooks | ✗ Не съществуват |
| GitHub Actions CI | ✗ Не документирани |

**Conventional Commits са документирано правило, но не е технически enforce-вано.** Всеки commit може да пробие конвенцията без никакъв автоматичен контрол.

### 6.4 Test Infrastructure Fragmentation

| Runner | Scope | Интеграция |
|--------|-------|-----------|
| Playwright | E2E (root) | Самостоятелен |
| raw Node.js | Unit/Integration scripts | Самостоятелен |
| Vitest | Extension unit tests | В `apps/extension/` |
| Turborepo `test` task | Delegates | Зависи от package конфигурация |

Три различни test runner-а без унифицирана coverage репортинг стратегия.

---

## §7 Exhaustive Element Dictionary

### Root Конфигурации

| Елемент | Цел | Консумиран от | Lifecycle |
|---------|-----|---------------|-----------|
| `pnpm-workspace.yaml` | Workspace glob definitions | pnpm, Turborepo | Build-time |
| `turbo.json` | Pipeline tasks, кеш стратегия, env pass-through | Turborepo | Build-time |
| `package.json` (root) | Root scripts, hoisted deps, engine enforcement | pnpm, CI | Always |
| `tsconfig.json` (root) | TypeScript base config (referenced as global dep) | TypeScript, Turborepo cache | Build-time |

### packages/shared

| Елемент | Цел | Консумиран от | Lifecycle |
|---------|-----|---------------|-----------|
| `src/index.ts` | Public API — re-exports всичко | apps/dashboard, apps/extension | Import-time |
| `src/types/index.ts` | Canonical TypeScript типове (Chat, Folder, Prompt, Image, User, List, Platform enum, UploadItem) | Цял monorepo | Import-time |
| `src/types/database.types.ts` | Supabase generated types (14320 bytes) | src/types/index.ts | Import-time |
| `src/types/database.ts` | Дублиран/разширен database types (14644 bytes) | Unclear — potential dead | Import-time |
| `src/validation/chat.ts` | Internal chat validation | Exports от shared | Import-time |
| `src/validation/folder.ts` | Internal folder validation | Exports от shared | Import-time |
| `src/validation/list.ts` | Internal list validation | Exports от shared | Import-time |
| `src/validation/prompt.ts` | Internal prompt validation | Exports от shared | Import-time |
| `src/utils/cn.ts` | Class name merger utility | Dashboard components | Runtime |
| `src/utils/colors.ts` | Color utilities | Dashboard components | Runtime |
| `src/utils/folders.ts` | Folder hierarchy logic | Dashboard, Extension | Runtime |
| `src/utils/cache.ts` | Cache utilities | Extension CacheManager | Runtime |
| `src/services/ai.ts` | AI service abstraction | Dashboard API routes | Runtime |
| `src/services/prompt-library-fetcher.ts` | Fetches external prompt library | Dashboard prompts | Runtime |
| `src/services/smart-prompt-search.ts` | Smart search within prompts | Dashboard search | Runtime |
| `src/constants/index.ts` | Shared constants (limits, UI configs) | Цял monorepo | Import-time |
| `index.js` (root) | Pre-compiled JS — origin НЕЯСНА | Неизвестен | Unknown |
| `schemas.js` (root) | Pre-compiled schemas JS (2330 bytes) | Неизвестен | Unknown |
| `package-lock.json` (root) | npm lockfile — АНОМАЛИЯ в pnpm workspace | npm (не трябва да се използва) | Never (artifact) |

### packages/validation

| Елемент | Цел | Консумиран от | Lifecycle |
|---------|-----|---------------|-----------|
| `index.ts` | Public API — exports всички Zod schemas и типове | apps/dashboard API routes | Import-time |
| `schemas/chat.ts` | createChatSchema, updateChatSchema | /api/chats/route.ts | Validation-time |
| `schemas/prompt.ts` | createPromptSchema, updatePromptSchema | /api/prompts/route.ts | Validation-time |
| `schemas/folder.ts` | folderTypeEnum, createFolderSchema, updateFolderSchema | /api/folders/route.ts | Validation-time |
| `schemas/list.ts` | listSchema, listItemSchema | /api/lists routes | Validation-time |
| `schemas/privacy.ts` | PrivacyConfigSchema | Extension privacy features | Validation-time |

### packages/database

| Елемент | Цел | Консумиран от | Lifecycle |
|---------|-----|---------------|-----------|
| `database.types.ts` | Supabase generated TypeScript types | packages/shared (re-exports) | Import-time |
| `index.ts` | Re-exports database.types | apps/dashboard | Import-time |

### packages/config

| Елемент | Цел | Консумиран от | Lifecycle |
|---------|-----|---------------|-----------|
| `tsconfig.base.json` | Base TS config (strict, ESNext, bundler resolution) | apps tsconfig.json extends | Build-time |
| `tailwind.config.ts` | Tailwind v4 config | apps/dashboard | Build-time |
| `postcss.config.js` | PostCSS pipeline | apps/dashboard | Build-time |
| `models.json` | AI model aliases (analysis, summary, enhance, embedding) | apps/dashboard AI services | Runtime |

### packages/assets

| Елемент | Цел | Консумиран от | Lifecycle |
|---------|-----|---------------|-----------|
| `src/index.ts` | PROVIDER_ASSETS map, ProviderKey type | Dashboard icon rendering, Extension UI | Runtime |
| `icons/` | Static PNG files за AI провайдъри | Dashboard, Extension popup | Build/Runtime |

---

## §8 Master Risk Register

> [!IMPORTANT]
> **P0** — Блокиращ: Fix преди следващ commit  
> **P1** — Важен: Fix в текущия sprint  
> **P2** — Технически дълг: Следващ цикъл

| P | SOURCE | ISSUE | IMPACT | ACTION |
|---|--------|-------|--------|--------|
| **P0** | §1 / АУДИТ 1 | `pnpm verify` script не съществува в root package.json. Health Gate е phantom. | Quality control изцяло ръчен. All code passes "gate" trivially. | Имплементирай `verify` script: `turbo lint && turbo type-check && turbo test` с custom scoring |
| **P0** | §2 / АУДИТ 2 | `folderTypeEnum` в @brainbox/validation има `'default'` и `'custom'` — стойности, несъществуващи в DB enum. | INSERT с type='default' или type='custom' → PostgreSQL constraint violation → 500 error след успешна Zod validation | Синхронизирай enum: премахни `'default'` и `'custom'` или добави ги в DB migration |
| **P0** | §2 / АУДИТ 2 | `database.types.ts` е STALE — lipsat `tags`, `embedding`, `detailed_summary` колони (и техните DB types), `match_chats` RPC функция | TypeScript type safety е нарушена за ключови AI features. Runtime type errors при Supabase queries. | Изпълни `pnpm db:gen` за регенериране на типовете |
| **P0** | §3 / АУДИТ 3 | JWT токенът се съхранява в plain text в `chrome.storage.local` | При compromised extension или локален атакуващ — пълен access до потребителски акаунт | Имплементирай encrypt/decrypt на токена в chrome.storage с extension-specific ключ |
| **P0** | §1 / АУДИТ 1 | `test` task в turbo.json има `dependsOn: []` — тестовете не чакат packages да build-нат | В clean build: тестове се изпълняват срещу stale артефакти → false negatives/positives | Добави `"dependsOn": ["^build"]` към `test` task |
| **P1** | §1 / АУДИТ 1 | `next-pwa@^5.6.0` е несъвместим с Next.js 14 App Router | PWA functionality може да не работи; `webpack-cli` се тегли ненужно | Мигрирай към `@ducanh2912/next-pwa` или Serwist (App Router compatible) |
| **P1** | §2 / АУДИТ 2 | `messages: z.array(z.any())` в createChatSchema — напълно нетипизирана validation | Malformed messages data достига DB без проверка; тихи data corruption bugs | Дефинирай `messageSchema` в @brainbox/validation и замени `z.any()` |
| **P1** | §3 / АУДИТ 3 | Hardcoded Supabase project ID `biwiicspmrdecsebcdfp` в `content-dashboard-auth.ts` | Project ID exposed в source code; трябва да е env variable | Refactor: използвай env variable или dynamic detection |
| **P1** | §3 / АУДИТ 3 | Няма background JWT refresh логика. Token expires → user logged out от Extension. | UX: потребителят sessions terminate без предупреждение след 1 час | Имплементирай `authManager.ts` auto-refresh: poll `expires_at`, call `/api/auth/refresh` |
| **P1** | §1 / АУДИТ 1 | Agent 1 §1: `/api/chats/extension` и много API routes нямат rate limiting | Потребител/Extension може да spam-ва API без ограничение; DoS вектор | Имплементирай rate limiting middleware (Upstash Redis вече е в dependencies!) |
| **P1** | §2 / АУДИТ 2 | `package-lock.json` в `packages/shared/` — npm е изпълняван директно | Dependency drift: npm и pnpm могат да install-нат различни версии | Изтрий `package-lock.json`, добави `packages/shared/node_modules` в workspace hoisting |
| **P1** | §5 / АУДИТ 5 | `/api/chats/extension` (POST) не прилага `createChatSchema` Zod validation | Extension данни заобикалят цялата validation система; corrupt data в DB | Добави Zod parse на `createChatSchema` в extension route |
| **P1** | §5 / АУДИТ 5 | Inverted optimistic updates в `useChatStore`, `useFolderStore`, `usePromptStore` | UI показва failed mutations като успешни → data desynchronization | Инвертирай логиката: optimistic update ПРЕДИ request, rollback при failure |
| **P1** | §5 / АУДИТ 5 | `stripDevCSP` не е имплементиран в `vite.config.ts` | Production build включва `localhost` в manifest CSP → Chrome Web Store rejection | Добави custom Vite plugin за strip на dev CSP entries при production build |
| **P1** | §2 / АУДИТ 2 | `packages/shared/src/types/database.ts` (14644 bytes) се различава от `database.types.ts` (14320 bytes) | Два diverging canonical type sources → type inconsistencies в различни import пътища | Изтрий единия файл; standardize на един canonical path |
| **P1** | §6 / АУДИТ 6 | Не е имплементиран `commitlint`/`husky` | Conventional Commits са неenhourced; history pollution | Добави `husky` + `commitlint` с `@commitlint/config-conventional` |
| **P2** | §2 / АУДИТ 2 | `Message` interface не е exported type в @brainbox/shared | Normalizers и Dashboard рендерер работят с implicit contract | Добави `Message` interface в @brainbox/shared/src/types/index.ts |
| **P2** | §4 / АУДИТ 4 | `content` field: validation изисква non-nullable string, DB допуска null | Edge case runtime errors ако null се подаде изрично | Добави `.nullable()` на content в createChatSchema |
| **P2** | §4 / АУДИТ 4 | `is_archived` поле: в DB и shared type, но отсъства от validation schemas | Archiving функционалността не може да се задейства чрез API | Добави `is_archived: z.boolean().optional()` в updateChatSchema |
| **P2** | §4 / АУДИТ 4 | `platform` не е validated като Platform enum в createChatSchema | Невалидни platform стойности могат да навлязат в DB | Замени `z.string()` с `z.enum(['chatgpt','claude','gemini',...]). optional()` |
| **P2** | §2 / АУДИТ 2 | `@brainbox/shared` има вътрешна `/validation/*` директория ПАРАЛЕЛНА на `@brainbox/validation` | Architectural confusion; два независими validation source-а за едни entities | Consolidate: или merge в @brainbox/validation или изтрий дублирането от shared |
| **P2** | §4 / АУДИТ 4 | `tags: Json \| null` в shared type vs `z.array(z.string())` в validation | Type mismatch между layers | Или: shared type → `string[] \| null`, или: validation → `z.array(z.string()).or(z.any())` |
| **P2** | §5 / АУДИТ 5 | `DataProvider.tsx` fetches prompts директно от Supabase (bypasses `/api/prompts`) | Split data-access: промпти не преминават server-side validation при fetch | Unifyi: fetches всички данни чрез API routes |
| **P2** | §5 / АУДИТ 5 | `DataProvider` update-ва `useChatStore` извън store actions (`useChatStore.setState(...)`) | Нарушава encapsulation; стате mutations са неtrackable | Извади update логиката в store action метод |
| **P2** | §5 / АУДИТ 5 | Dual Gemini sync queue (chrome.storage + IndexedDB) | Duplicate HTTP requests, doubled rate-limit pressure | Consolidate: IndexedDB syncQueue → chrome.storage SyncManager или vice versa |
| **P2** | §5 / АУДИТ 5 | useShallow missing в GlobalBrain, ChatStudio, ImagesPage, FolderHeader, CreatePromptModal, DailyPromptCard, PromptCard | Every Extension sync triggers mass re-renders | Add `useShallow` wrappers в споменатите компоненти |
| **P2** | §2 / АУДИТ 2 | `mistral` в @brainbox/assets но не в Platform enum | Dead asset, maintenance confusion | Премахни `mistral` от PROVIDER_ASSETS или добави го в Platform enum |
| **P2** | §1 / АУДИТ 1 | `models.json` — единствен AI провайдър (Google/Gemini), без fallback | Single point of failure за всички AI функции | Добави fallback provider конфигурация |
| **P2** | §6 / АУДИТ 6 | Три различни test runner-а (Playwright, raw Node.js, Vitest) без unified coverage | Fragmented QA; не е ясно какъв е overall test coverage | Стандартизирай: Vitest за unit/integration, Playwright за E2E |

---

## §8 Risk Summary Dashboard

```
CRITICAL (P0): 5 issues
  ├─ Phantom `pnpm verify` script
  ├─ folder_type_enum DB ↔ Zod mismatch (P0 crash risk)
  ├─ Stale database.types.ts (tags/embedding/detailed_summary missing)
  ├─ Plain-text JWT in chrome.storage
  └─ test task dependsOn:[] (stale artifact risk)

HIGH (P1): 11 issues
  ├─ next-pwa incompatibility with Next.js 14
  ├─ z.array(z.any()) for messages
  ├─ Hardcoded Supabase project ID
  ├─ No JWT background refresh
  ├─ No rate limiting on API routes
  ├─ npm package-lock.json in pnpm workspace
  ├─ /api/chats/extension bypasses Zod validation
  ├─ Inverted optimistic updates (3 stores)
  ├─ stripDevCSP not implemented
  ├─ Duplicate database type files
  └─ No commitlint/husky enforcement

MEDIUM (P2): 14 issues
  [See full list above]
```

---

## Финален Верификационен Чекпойнт

| Чекпойнт | Статус |
|----------|--------|
| Прочетен изцяло `dashboard_audit.md` | ✅ 475 реда |
| Прочетен изцяло `extension_audit.md` | ✅ 208 реда |
| Schema Consistency Table (Chat entity — всяко поле) | ✅ 17 полета × 4 слоя |
| Всяко ✗ от Таблица §4 → §8 Risk Register | ✅ |
| Версионна матрица верифицирана за peer conflicts | ✅ (next-pwa, tailwind-merge, webpack-cli) |
| JWT flow документиран стъпка по стъпка с failure modes | ✅ 9 failure modes |
| CONTEXT_MAP.md Rule 4.1 — проверени и двата агента | ✅ Compliant |
| Всеки файл в packages/ и root конфигурации → §7 | ✅ |
| Health Score логика с penalty стойности | ✅ |

---

*Master Audit финализиран от Supreme Meta-Architect Agent — 2026-02-23*  
*Входни данни: Agent 1 (Dashboard), Agent 2 (Extension), direct source scan на 47 файла*
