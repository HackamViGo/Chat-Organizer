# 🦴 KNOWLEDGE ARCHAEOLOGY AUDIT — BrainBox Monorepo
**Дата:** 2026-02-25 | **Версия:** 1.0.0 | **Автор:** Senior Knowledge Archaeologist (Antigravity)

---

## 📁 1. СПИСЪК НА СКАНИРАНИТЕ ФАЙЛОВЕ

### Mandatory (задължителни):
- `docs/Mandatory!/PRODUCT.md`
- `docs/Mandatory!/ARCHITECTURE.md`
- `docs/Mandatory!/CODE_GUIDELINES.md`
- `docs/Mandatory!/SECURITY.md`
- `docs/Mandatory!/FEATURE_TEMPLATE.md`
- `docs/Mandatory!/DEPLOYMENT.md`
- `docs/Mandatory!/Tech_Stack_Docs.md`
- `docs/Mandatory!/AI_BEST_PRACTICES_GUIDE.md`
- `docs/Mandatory!/TOOLING_SETUP_PROMPT.md`
- `docs/Mandatory!/README.md`
- `.agent/rules/main.md`
- `.agents/rules/core-rules.md` _(= MEMORY[core-rules.md])_

### Technical:
- `docs/technical/CONTEXT_MAP.md`
- `docs/technical/SYNC_PROTOCOL.md`
- `docs/technical/DATA_SCHEMA.md`
- `docs/technical/CHROME_EXTENSION_POLICY.md`
- `docs/technical/UI_STANDARDS.md`
- `docs/technical/CONTRIBUTING.md`
- `docs/technical/EXTENSION_BUILD_PIPELINE.md`
- `docs/technical/MONOREPO_DEPS.md`
- `docs/technical/REQUIRED_TOOLING.md`

### Archive:
- `docs/archive/ARCHITECTURE_AUDIT.md`
- `docs/archive/technical_ARCHITECTURE.md`
- `docs/archive/EXTENSION_ARCHITECTURE.md`
- `docs/archive/monorepo_tooling_migration.md`
- `docs/archive/Git_Forensic_Report.md`
- `docs/archive/AGENT_SYSTEM_AUDIT.md`
- `docs/archive/AGENT_SYSTEM_REMEDIATION_PLAN.md`
- `docs/archive/AUDIT_PHASE_1.md`
- `docs/archive/BLIND_AUDIT_REPORT.md`
- `docs/archive/BUILD_REPORT.md`
- `docs/archive/Extension_GAP_ANALYSIS.md`
- `docs/archive/NewExtension_PLAN.md`
- `docs/archive/EXTENSION_ARCHITECTURE.md`

### Deep Audit Reports:
- `docs/user/DEEP AUDIT/master_audit.md`
- `docs/user/DEEP AUDIT/blind_spots_audit.md`
- `docs/user/DEEP AUDIT/dashboard_audit.md`
- `docs/user/DEEP AUDIT/extension_audit.md`
- `docs/user/DEEP AUDIT/test_audit.md`
- `docs/user/THE_WHOLE_PICTURE.md`
- `docs/user/Meta_Architect_v3.1_Overview.md`

### Agent Roles:
- `docs/agents/roles/DASHBOARD_BUILDER.md`
- `docs/agents/roles/EXTENSION_BUILDER.md`
- `docs/agents/roles/DB_ARCHITECT.md`
- `docs/agents/roles/QA_EXAMINER.md`
- `docs/agents/roles/DOCS_LIBRARIAN.md`
- `apps/extension/docs/audit/AUDIT_REPORT.md`
- `apps/extension/docs/audit/TODO.md`

### Config Files (implicit rules):
- `tsconfig.json`
- `.eslintrc.json`
- `.prettierrc`
- `turbo.json`
- `pnpm-workspace.yaml` / `.npmrc`
- `next.config.js`
- `apps/dashboard/src/middleware.ts`
- `supabase/migrations/20260223000000_add_rls_policies.sql`
- `package.json`

### Git (deleted files recovered):
- `.agent/skills/meta_architect/` — whole directory (20+ files): DUAL_GRAPH_ARCHITECTURE.md, ESCALATION_PROTOCOL.md, 6 workflow YAMLs, profiles, etc.
- `agent_states/` — 15 YAML/MD state files at root level, deleted in `c988308`

---

## 📊 2. ГЛАВНА ТАБЛИЦА

| # | Правило / Шаблон | Кат. | Източник | Текущо состояние в кода | Статус | Коментар |
|---|---|---|---|---|---|---|
| 1 | Винаги използвай `pnpm`. Никога `npm install` или `yarn`. | 🔴 MUST | `core-rules.md §2.1`, `docs/Mandatory!/ARCHITECTURE.md` | Коренът има `pnpm-lock.yaml`. Пакетите `packages/shared/` и `packages/validation/` имат `package-lock.json` | ⚠️ ЧАСТИЧНО | `packages/shared/package-lock.json` е npm artifact — директно нарушение |
| 2 | Всички споделени зависимости (React, Zod, Lucide) ТРЯБВА да са в root `package.json` | 🔴 MUST | `core-rules.md §2.1` | React, Zod, Lucide са в root `package.json`. `packages/validation/` има собствен `pnpm-lock.yaml` | ⚠️ ЧАСТИЧНО | `packages/validation/` е изолиран пакет с отделен lock файл |
| 3 | `apps/extension` НИКОГА не импортира директно от `apps/dashboard` | 🔴 MUST NOT | `core-rules.md §2.1`, `ARCHITECTURE.md` | Grep: нула cross-boundary imports намерени | ✅ СПАЗВА СЕ | — |
| 4 | `useShallow` ЗАДЪЛЖИТЕЛНО при Zustand деструктуриране в React компоненти | 🔴 MUST | `core-rules.md §3.1`, `CODE_GUIDELINES.md` | 14+ компонента ползват `useShallow` коректно. 4 pages (`prompts/page.tsx`, `archive/page.tsx`, `settings/page.tsx`, `chats/page.tsx`) деструктурират директно | ⚠️ ЧАСТИЧНО | 4 нарушения в страниците (не в компоненти, ПО-МАЛКО критично но inconsistent) |
| 5 | True Optimistic Updates: Обнови Zustand ПЪРВО, след API, rollback при грешка | 🔴 MUST | `core-rules.md §3.1`, `CODE_GUIDELINES.md` | Stores (`useChatStore`, `useFolderStore`, `usePromptStore`) имат `catch` блокове. `useListStore.ts` коментира "optimistic updates". `useChatStore.test.ts` тества optimistic | ⚠️ ЧАСТИЧНО | Catch блоковете съществуват, но не е ясно дали правят revert или просто log |
| 6 | Забранено `z.any()` или TypeScript `any` | 🔴 MUST NOT | `core-rules.md §3.2`, `CODE_GUIDELINES.md` | 15+ употреби на `any` в API routes (`import/route.ts`, `images/route.ts`, `settings/page.tsx`, `folders/route.ts`, `HybridSidebar.tsx`, `ImagesPage.tsx`, `logger.ts`) | ❌ НЕ СЕ СПАЗВА | Масово нарушение — `catch (error: any)` навсякъде, `(supabase as any)` в 3 файла |
| 7 | Всички Zod схеми живеят в `@brainbox/validation` | 🔴 MUST | `core-rules.md §3.2`, `CODE_GUIDELINES.md` | Zod схеми дефинирани inline в `api/folders/route.ts`, `api/prompts/search/route.ts`, `api/ai/enhance-prompt/route.ts` — НЕ в `packages/validation/` | ❌ НЕ СЕ СПАЗВА | Нарушава Single Source of Truth. `packages/validation/schemas/` има само 6 файла, но API routes дефинират свои локални схеми |
| 8 | Нов споделен тип → `packages/shared/src/types/index.ts`. Никога inline | 🔴 MUST | `core-rules.md §3.2` | `HybridSidebar.tsx` има `visibleChats: any[]` и inline type `DisplayItemsResult`; `images/route.ts` има `user_id: string` inline | ⚠️ ЧАСТИЧНО | Повечето типове са централизирани, но има exceptions |
| 9 | Забранено `console.log` в production. Използвай `logger.debug()/error()` | 🔴 MUST NOT | `core-rules.md §3.3`, `CODE_GUIDELINES.md` | 20+ `console.error/warn` в dashboard API routes. Самият `logger.ts` ползва `console.*` вътрешно. `next.config.js` конфигурира `removeConsole` за production | ⚠️ ЧАСТИЧНО | `console.error` в catch блокове е частично допустимо; `next.config.js` ги remove-ва в prod. Но `console.warn` в компоненти остава |
| 10 | `user_id` идва САМО от `auth.getUser()` server-side | 🔴 MUST | `core-rules.md §3.3`, `SECURITY.md` | Всички API routes (`folders`, `import`, `prompts`, `images`, `export`, `stats`) извикват `auth.getUser()` и ползват `user.id` | ✅ СПАЗВА СЕ | — |
| 11 | RLS е активно за всички таблици. Никога не го заобикаляй | 🟣 EXTERNAL | `core-rules.md §3.3`, `SECURITY.md` | Migration `20260223000000_add_rls_policies.sql` активира RLS за 6 основни таблици: `chats`, `folders`, `prompts`, `images`, `lists`, `list_items` | ✅ СПАЗВА СЕ | Добавено late (Feb 23 2026 migration — почти 3 седмици след старта). `profiles` таблица — ⚠️ не е видяно RLS |
| 12 | Никога директен push към `main`. Всичко минава през `feature/*` или `fix/*` branch | 🔴 MUST NOT | `core-rules.md §6.1` | HEAD е `main`. Commits от `switzerland-extension`, `TurboVite` branches мерджнати. НО commit `47904a9` е директно на `main` | ⚠️ ЧАСТИЧНО | Branches съществуват, но `main` има директни commits |
| 13 | ESLint checks задължителни (не се изключват по време на build) | 🔴 MUST | `CODE_GUIDELINES.md`, implied | `next.config.js` ред 27-28: `eslint: { ignoreDuringBuilds: true }` — добавено в commit `24f6882` | ❌ НЕ СЕ СПАЗВА | **КРИТИЧНО.** Коментарът в commit е "temporarily" but it's been merged to main |
| 14 | TypeScript type checking задължително при build | 🔴 MUST | `CODE_GUIDELINES.md`, `tsconfig.json strict:true` | `next.config.js` ред 30-31: `typescript: { ignoreBuildErrors: true }` | ❌ НЕ СЕ СПАЗВА | **КРИТИЧНО.** `strict: true` в tsconfig е безсмислено при `ignoreBuildErrors: true` |
| 15 | Монорепо инструментариум: Turborepo с `pnpm` | 🟡 PATTERN | `ARCHITECTURE.md`, `monorepo_tooling_migration.md` | `turbo.json` съществува; `turbo` v2.8.1 в devDeps; pipeline с `build`, `dev`, `lint`, `type-check`, `test`, `verify` | ✅ СПАЗВА СЕ | Мигрирано от pure Next.js в commit `1214a70` "migrate architecture to Turborepo and Vite" |
| 16 | Extension: само MV3 Manifest | 🟣 EXTERNAL | `CHROME_EXTENSION_POLICY.md`, `EXTENSION_BUILD_PIPELINE.md` | `manifest.json` е MV3 (проверено в audit); Service Worker pattern (не background page) | ✅ СПАЗВА СЕ | — |
| 17 | Extension НЕ ползва `localStorage` за auth tokens | 🔴 MUST NOT | `SYNC_PROTOCOL.md`, commit `54b7e62` "remove unused localStorage from extension auth flow" | `apps/extension/` файлове: grep не откри `localStorage` (OK). `apps/dashboard/src/` ползва `localStorage` за `brainbox_remember_me`, `brainbox_last_sync_time`, `geminiApiKey`, `isPro` | ⚠️ ЧАСТИЧНО | Extension ✅. Dashboard ⚠️ — използва localStorage за UI state и settings (частично приемливо) |
| 18 | Extension: Token Bridge механизъм за auth (cookie-based, без IndexedDB за auth) | 🔵 ADR | `SYNC_PROTOCOL.md` (последна версия след Feb 22 update) | `authManager.ts` използва `chrome.storage.local`. `brainbox_master.js` все още има IndexedDB! | 🔄 ПРОТИВОРЕЧИЕ | `brainbox_master.js` е legacy файл с IndexedDB v7. `SYNC_PROTOCOL.md` казва "deprecated". Файлът съществува в `src/content/` |
| 19 | Extension: `IndexedDB` и `brainbox_master.ts` са deprecated | 🗑️ ОСТАРЯЛО | `SYNC_PROTOCOL.md` (Feb 22 2026 update) | `apps/extension/src/content/brainbox_master.js` съществува и има `DB_VERSION: 7`, `DEBUG_MODE: true` | ❌ НЕ СЕ СПАЗВА | **КРИТИЧНО.** Deprecated файл все още присъства и е вероятно зареден. Conversation `b65bef1a` е за "Update Database Version" от Feb 22 |
| 20 | Prettier: `semi: false`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: 'es5'`, `printWidth: 100` | 🟡 PATTERN | `.prettierrc` | Форматирането в повечето `.ts`/`.tsx` файлове изглежда consistent | ✅ СПАЗВА СЕ | `@prettier/plugin-tailwindcss` е конфигуриран |
| 21 | Node.js версия: 20.19.0 (LTS) | 🟡 PATTERN | `.nvmrc` | `.nvmrc` съдържа `20.19.0` | ✅ СПАЗВА СЕ | — |
| 22 | Tailwind config живее в `packages/config/tailwind.config.ts` | 🟡 PATTERN | `ARCHITECTURE.md`, `Tech_Stack_Docs.md` | `packages/config/tailwind.config.ts` съществува. Root `tailwind.config.ts` също съществува | ⚠️ ЧАСТИЧНО | Два tailwind config файла — потенциален конфликт |
| 23 | AI задачи минават само през `@brainbox/shared/src/services/ai.ts` | 🟡 PATTERN | `AI_BEST_PRACTICES_GUIDE.md`, `packages/shared/src/services/ai.ts` коментар: "All internal AI tasks... must route" | `apps/dashboard/src/app/api/ai/` директно ползва `@google/generative-ai` SDK | ⚠️ ЧАСТИЧНО | API routes bypass-ват shared service |
| 24 | Никога inline styles в компонентите | 🟡 PATTERN | `UI_STANDARDS.md`, `.cursorrules` implied | `apps/extension/src/ui.js` — масови `!important` inline styles (но това е content script за inject, специфичен случай) | ⚠️ ЧАСТИЧНО | Extension UI injection изисква `!important` за override на host page styles — приемливо изключение |
| 25 | DEBUG_MODE трябва да е `false` в production | 🔴 MUST | implied from `CODE_GUIDELINES.md`, commit `02bf50e` "cleanup console logs" | `apps/extension/src/background/modules/dynamicMenus.ts:19`: `DEBUG_MODE = true`; `apps/extension/src/background/modules/authManager.ts:50`: `DEBUG_MODE = false // Disabled for production`; `apps/extension/src/content/brainbox_master.js:14`: `DEBUG_MODE: true`; `apps/extension/src/background/modules/platformAdapters/chatgpt.adapter.ts:10`: `DEBUG_MODE = true` | ❌ НЕ СЕ СПАЗВА | 3 модула с `DEBUG_MODE = true` в production код |
| 26 | API Routes валидират request body с Zod ПРЕДИ да докоснат DB | 🔴 MUST | `core-rules.md §3.2`, `CODE_GUIDELINES.md` | `api/folders/route.ts` — Zod схеми дефинирани локално и ползвани. `api/chats/route.ts` — uses `req.json()` без Zod parse. `api/import/route.ts` — `map((folder: any) =>` без Zod validation | ⚠️ ЧАСТИЧНО | 2 routes от 8+ нямат Zod validation |
| 27 | Всички Supabase операции приемат активно RLS | 🟣 EXTERNAL | `core-rules.md §3.3` | API routes добавят `.eq('user_id', user.id)` дори при активно RLS — double protection | ✅ СПАЗВА СЕ | Defense in depth — правилно |
| 28 | `fetch`/`axios` забранени за client-side мутации; Server Actions preferred | 🟡 PATTERN | `CODE_GUIDELINES.md` implied, `AI_BEST_PRACTICES_GUIDE.md` | Dashboard използва `fetch('/api/...')` навсякъде (не Server Actions). Extension ползва `DashboardApi` клас | 🗑️ ОСТАРЯЛО | Правилото е от React pre-Next.js era. Текущата архитектура (API Routes) е documented и approved |
| 29 | Никога `npm install` — само `pnpm add` | 🔴 MUST | `core-rules.md §2.1`, `REQUIRED_TOOLING.md` | `packages/shared/package-lock.json` съществува | ❌ НЕ СЕ СПАЗВА | `npm install` е изпълнено в `packages/shared/` |
| 30 | MutationObserver и AbortController задължителна cleanup | 🔴 MUST | `blind_spots_audit.md`, conversation `bf7d22c0` "Fix Extension Memory Leaks" | `apps/extension/src/prompt-inject/prompt-inject.ts` — cleanup беше имплементиран | ✅ СПАЗВА СЕ | Global cleanup механизъм добавен Feb 23 2026 |
| 31 | ESLint config: `extends: next/core-web-vitals` | 🟡 PATTERN | `.eslintrc.json` | `.eslintrc.json` есть и ползва `next/core-web-vitals` | ✅ СПАЗВА СЕ | НО `ignoreDuringBuilds: true` — безсмислено |
| 32 | TypeScript `strict: true` + `strictNullChecks: true` | 🟡 PATTERN | `tsconfig.json` | `tsconfig.json` — `"strict": true, "strictNullChecks": true` | ⚠️ ЧАСТИЧНО | `ignoreBuildErrors: true` в `next.config.js` анулира ефекта |
| 33 | App Router (Next.js 14) — не Pages Router | 🔵 ADR | `ARCHITECTURE.md`, `monorepo_tooling_migration.md` | `apps/dashboard/src/app/` структура потвърждава App Router | ✅ СПАЗВА СЕ | — |
| 34 | `createServerSupabaseClient` за server-side (не `createClient`) | 🟡 PATTERN | `Tech_Stack_Docs.md`, `CODE_GUIDELINES.md` | API routes ползват `createServerSupabaseClient` (11 imports). Компоненти ползват `createClient` (15 imports). | ✅ СПАЗВА СЕ | Правилното разделение е спазено |
| 35 | Shared package `@brainbox/validation` за Zod схеми | 🔴 MUST | `core-rules.md §3.2`, `ARCHITECTURE.md` | `packages/validation/schemas/` има 6 файла. API routes дефинират локални схеми. Validation пакетът е изолиран с `pnpm-lock.yaml` | ❌ НЕ СЕ СПАЗВА | API routes не ползват `@brainbox/validation` — ползват собствени Zod схеми |
| 36 | GitHub Actions за CI/CD с stable actions/checkout@v3 | 🟡 PATTERN | `.github/workflows/`, commit `3f16770` "downgrade github actions to stable v3" | `.github/workflows/build.yml`, `release.yml`, `test.yml` съществуват | ✅ СПАЗВА СЕ | v3 downgrade е workaround за IDE errors |
| 37 | `packages/shared/src/config/ai_models_config.json` — single source на AI модели | 🟡 PATTERN | `Tech_Stack_Docs.md`, `AI_BEST_PRACTICES_GUIDE.md` | Файлът съществува. `packages/config/models.json` СЪЩО съществува | 🔄 ПРОТИВОРЕЧИЕ | Два JSON файла с AI модел конфигурации |
| 38 | Промяна в `packages/shared/src/types/` изисква explicit approval | 🔴 MUST | `core-rules.md §5` | `packages/shared/src/types/database.types.ts` и `packages/database/database.types.ts` са дублирани | 🔄 ПРОТИВОРЕЧИЕ | Два пъти дефинирани database types — нарушение на DRY |
| 39 | Промяна в `apps/extension/manifest.json` permissions изисква approval | 🔴 MUST | `core-rules.md §5`, `CHROME_EXTENSION_POLICY.md` | N/A — изисква ръчна проверка | ⚠️ Не е проверено | — |
| 40 | Промяна в `apps/dashboard/src/middleware.ts` auth logic изисква approval | 🔴 MUST | `core-rules.md §5` | `middleware.ts` е модифициран (добавен "remember me" cookie logic) | ⚠️ ЧАСТИЧНО | Трябваше approval за auth logic промяна |
| 41 | Supabase `profiles` таблица за потребителски данни | 🟡 PATTERN | `DATA_SCHEMA.md` | `DATA_SCHEMA.md` описва `profiles` таблица. Migration SQL не покрива `profiles` RLS | 👻 ФАНТОМ | RLS за `profiles` не е в migration файла |
| 42 | Prompt Library се зарежда от GitHub URL директно | 🟡 PATTERN | `packages/shared/src/services/prompt-library-fetcher.ts` коментар: "Always use GitHub URL directly" | Хардкоден GitHub URL в `prompt-library-fetcher.ts` | 🆕 НЕДОКУМЕНТИРАНО | Няма документация за тази архитектурнаChoice |
| 43 | `geminiApiKey` и `isPro` flag се съхраняват в `localStorage` | 🟡 PATTERN | (implicitly from `ChatStudio.tsx`) | `ChatStudio.tsx:49-50`: `localStorage.getItem('isPro')`, `localStorage.getItem('geminiApiKey')` | 🆕 НЕДОКУМЕНТИРАНО | Чувствителни данни (API Key) в localStorage без документация |
| 44 | Extension строго MV3: Service Worker вместо background page | 🟣 EXTERNAL | `CHROME_EXTENSION_POLICY.md` | `apps/extension/src/background/service-worker.ts` съществува | ✅ СПАЗВА СЕ | — |
| 45 | `logger.ts` централизиран logging utility | 🟡 PATTERN | `core-rules.md §3.3`, implied | `apps/dashboard/src/lib/logger.ts` съществува. Ползва се с `logger.debug/error/warn` | ⚠️ ЧАСТИЧНО | `logger.ts` вътрешно ползва `console.*` — OK. Но API routes директно ползват `console.error` вместо `logger.error` |

---

## ⚡ 3. КРИТИЧНИ НАХОДКИ (Top 5)

### 🔴 КРИТИЧНО #1: ESLint + TypeScript checks изключени при build
**Файл:** `next.config.js` ред 27-31
```js
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true }
```
**Commit:** `24f6882` — "fix(dashboard): disable eslint/ts checks during build **temporarily**"
**Дата:** 2026-02-11
**Риск:** Проектът може да се build-ва с TypeScript грешки / ESLint violations без да се знае. `tsconfig.json` с `strict: true` е безсмислен. 14 дни след "temporary" fix — все още не е revert-нат.

---

### 🔴 КРИТИЧНО #2: `brainbox_master.js` е deprecated но все още активен
**Файл:** `apps/extension/src/content/brainbox_master.js`
**Проблем:** `SYNC_PROTOCOL.md` (обновен Feb 22 2026) декларира `brainbox_master.ts` и `IndexedDB` като **deprecated**. Файлът обаче:
- Съществува в production код
- Има `DEBUG_MODE: true` (logging активен)
- Използва IndexedDB с `DB_VERSION: 7` (обновен Feb 22 в разговор b65bef1a)
Contradiction: защо се обновява version на deprecated файл?

---

### 🔴 КРИТИЧНО #3: Масово използване на TypeScript `any`
**Файлове:** 15+ файла в `apps/dashboard/src/`
**Примери:**
- `(supabase as any)` в `prompts/page.tsx` и `folder/[id]/page.tsx`
- `catch (error: any)` в 8+ API routes
- `(folder: any)` в `api/import/route.ts` без Zod validation
**Rule:** `core-rules.md §3.2` — "no `any`"

---

### 🔴 КРИТИЧНО #4: Zod валидация не се прилага от `@brainbox/validation`
**Проблем:** API routes дефинират локални Zod схеми вместо да ползват `@brainbox/validation`. `api/chats/route.ts` и `api/import/route.ts` изобщо нямат Zod validation на input-а.
**Rule:** `core-rules.md §3.2` — "Single Source of Truth: всички Zod схеми в @brainbox/validation"

---

### 🔴 КРИТИЧНО #5: Gemini API Key в `localStorage`
**Файл:** `apps/dashboard/src/components/features/chats/ChatStudio.tsx:50`
```js
const storedKey = localStorage.getItem('geminiApiKey') || ''
```
**Риск:** API ключ в localStorage е достъпен за всеки JavaScript на страницата (XSS вектор). Не е документирано, не е обсъждано в security policy.

---

## 🔄 4. ПРОТИВОРЕЧИЯ МЕЖДУ ДОКУМЕНТИ

| # | Документ A | Казва | Документ B | Казва | Вердикт |
|---|---|---|---|---|---|
| C1 | `SYNC_PROTOCOL.md` (Feb 22 update) | `brainbox_master.ts` и IndexedDB са **deprecated** | `apps/extension/src/content/brainbox_master.js` | Активен файл с `DB_VERSION: 7`, обновен Feb 22 | **Код wins** над документация — файлът трябва да бъде премахнат |
| C2 | `packages/shared/src/config/ai_models_config.json` | Single source на AI модели (implied) | `packages/config/models.json` | Друга конфигурация на AI модели | Неясно кой е canonical — нужна консолидация |
| C3 | `packages/shared/src/types/database.types.ts` | TypeScript типове за DB | `packages/database/database.types.ts` | Идентично съдържание (дублиран файл) | Дублиране. `packages/database/` трябва да е canonical |
| C4 | `core-rules.md §3.2` | "Всички Zod схеми в `@brainbox/validation`" | `apps/dashboard/src/app/api/folders/route.ts` ред 8-22 | Локални Zod схеми дефинирани inline | Правилото не се спазва |
| C5 | `tsconfig.json` | `"strict": true` — забранено несигурен код | `next.config.js` | `ignoreBuildErrors: true` — ignore-ва TypeScript грешки при build | `next.config.js` анулира tsconfig |
| C6 | `core-rules.md §2.1` | Само `pnpm`. Никога `npm install` | `packages/shared/package-lock.json` + `packages/validation/pnpm-lock.yaml` | Изолирани package managers | Нарушение — `npm` е ползван в `packages/shared/` |

---

## 👻 5. ФАНТОМИ (Документирани правила за несъществуващ код)

| # | Правило | Документ | Проблем |
|---|---|---|---|
| P1 | `profiles` таблица с RLS policies | `DATA_SCHEMA.md` описва `profiles` | RLS migration НЕ покрива `profiles` |
| P2 | `logger.debug()` / `logger.error()` задължително | `core-rules.md §3.3` | API routes изобщо не импортират `logger` — ползват `console.*` директно |
| P3 | `CONTEXT_MAP.md` описва `apps/extension/src/background/brainbox_master.ts` | `CONTEXT_MAP.md` | Файлът е `brainbox_master.js` в `src/content/` — неправилен path и extension |
| P4 | Dual Graph Architecture (Meta-Architect) | Deleted `.agent/skills/meta_architect/docs/DUAL_GRAPH_ARCHITECTURE.md` | Цялата Meta-Architect skill архитектура е изтрита в `c988308` — само архив в `docs/archive/` |
| P5 | `@brainbox/shared` е единственото комуникационно средство между apps | `ARCHITECTURE.md` | Extension ползва HTTP API директно към dashboard — правилно, но `@brainbox/shared` не е bridge |

---

## 🆕 6. НЕДОКУМЕНТИРАНИ ШАБЛОНИ

| # | Шаблон в кода | Файл | Какво трябва да има |
|---|---|---|---|
| N1 | `geminiApiKey` и `isPro` flag в `localStorage` | `ChatStudio.tsx:49-50` | Документация + Security policy за client-side key storage |
| N2 | `Prompt Library` fetch директно от GitHub raw URL | `prompt-library-fetcher.ts:29` | ADR за защо GitHub, вместо Supabase или bundled data |
| N3 | `DEBUG_MODE` flag pattern в extension modules | 10+ файла | Convention: кога е допустимо `DEBUG_MODE = true` в production |
| N4 | `crypto.subtle` / DOMPurify за XSS protection | `dompurify` в deps | Документирана стратегия за sanitization |
| N5 | Double-auth pattern в API routes (`tokenUser` + `cookieUser` fallback) | `api/prompts/route.ts`, `api/images/route.ts` | Документация на auth waterfall (Token → Cookie fallback) |
| N6 | `brainbox_remember_me` cookie като cross-cutting concern | `middleware.ts`, `signin/page.tsx`, `settings/page.tsx` | Consistency — 3 места управляват едно и също |
| N7 | `removeConsole` в `next.config.js` за production | `next.config.js compiler` | Документирано изрично — console.error оставя в prod |
| N8 | `public-hoist-pattern` в `.npmrc` за Tailwind, Vite, ESLint | `.npmrc` | MONOREPO_DEPS.md не обяснява hoist стратегията |

---

## 📅 7. ХРОНОЛОГИЯ НА ПРОМЕНИТЕ В ПРАВИЛАТА

```
[2026-01-?] Начало: React + Vite → мигрирано към Next.js 14 (commit 98e6bd2)
[2026-02-04] eb9183f — Hybrid Sidebar v3.0, Meta-Architect audit (agent система установена)
[2026-02-05] bc83f7f — .gitignore обновен, проект защитен
[2026-02-06] 02bf50e — Cleanup console logs (score 89/100), 1cad315 — parallelize data fetching
[2026-02-07] 94901c9 — Extension integrity audit, f1e7630 — security audit + hardening
[2026-02-08] 450bf79 — Sidebar fix + AGENT INFRA CLEANUP (agent_states/ root директория изтрита)
[2026-02-08] 4efbb33 — "baseline before agent-infra cleanup" (META-ARCHITECT BASELINE)
[2026-02-09] ffd19de — MV3 & monorepo compliance audit
[2026-02-10] c988308 — Service worker recovery + PROJECT CLEANUP (meta_architect skill изтрит)
[2026-02-10] 4b0ecd4 — Security hardening, test fixes
[2026-02-11] 24f6882 — ⚠️ ESLint + TS checks DISABLED в build (merge от TurboVite branch)
[2026-02-11] 1bca04b — Production URL update, scrubbing
[2026-02-22] [conversation b65bef1a] — DB_VERSION 7 в brainbox_master.js (deprecated файл обновен!)
[2026-02-22] [conversation 8082468e] — Deep security audit (blind spots)
[2026-02-22] [conversation 85ee2557] — SYNC_PROTOCOL.md обновен: IndexedDB deprecated
[2026-02-23] [conversation bf7d22c0] — Memory leaks fix (MutationObserver cleanup)
[2026-02-23] 47904a9 — SAVE POINT: full workspace snapshot
```

---

## 💡 8. ПРЕПОРЪКИ

### 🚨 Незабавни (High Priority)

1. **Revert `ignoreBuildErrors` и `ignoreDuringBuilds`** в `next.config.js` — поправи TypeScript грешките, не ги игнорирай. Commit `24f6882` е от 2 седмици.

2. **Изтрий `apps/extension/src/content/brainbox_master.js`** — файлът е deprecated по `SYNC_PROTOCOL.md`. Или го изтрий, или го де-deprecated. Не и двете.

3. **Преместни `geminiApiKey` от `localStorage`** — ползвай `sessionStorage` (tab-scoped) или `SecureStorage` / сървърна страна. XSS риск.

4. **Фиксирай `DEBUG_MODE = true`** в production:
   - `apps/extension/src/background/modules/dynamicMenus.ts:19`
   - `apps/extension/src/background/modules/platformAdapters/chatgpt.adapter.ts:10`
   - `apps/extension/src/content/brainbox_master.js:14`

### ⚠️ Средно-срочни (Medium Priority)

5. **Мигрирай inline Zod схеми** от API routes към `@brainbox/validation/schemas/` — спазване на `core-rules.md §3.2`.

6. **Елиминирай `any`** — особено `(supabase as any)` → използвай generated types от `packages/database/`.

7. **Добави RLS policies за `profiles` таблица** — missing в `20260223000000_add_rls_policies.sql`.

8. **Консолидирай дублираните файлове:**
   - `packages/shared/src/types/database.types.ts` vs `packages/database/database.types.ts` — едното трябва да re-export другото
   - `packages/shared/src/config/ai_models_config.json` vs `packages/config/models.json` — един canonical

9. **Добави `useShallow`** в 4-те pages (`prompts`, `archive`, `settings`, `chats`) — за consistency.

10. **Документирай double-auth pattern** (Token → Cookie fallback) в `SYNC_PROTOCOL.md`.

### 📝 Дългосрочни (качество на документация)

11. **Документирай Prompt Library GitHub fetch** — ADR защо GitHub URL, а не Supabase/bundled.

12. **`packages/shared/package-lock.json`** — изтрий (npm artifact в pnpm монорепо).

13. **Унифицирай `logger.ts` usage** — API routes да импортират `logger` вместо `console.*`.

14. **Създай `DEBUG_MODE` convention** — стандарт кога е допустимо и как се управлява.

---

*Одитът обхваща 50+ файла документация, 35+ Git commits, и пълно сканиране на `apps/dashboard/src/`, `apps/extension/src/`, и `packages/`.*
