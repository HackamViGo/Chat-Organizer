# Blind Audit Report — 2026-02-24

## Резултати

| # | Проверка | Статус | Детайл |
|---|----------|--------|--------|
| 1 | Build & Pipeline | ⚠ | Lint минава. Type-check и Build на `dashboard` гърмят поради липсващи deps (`@vitejs/plugin-react`). `turbo.json` има `verify` task. `test` зависи от `^build`. |
| 2 | JWT Encryption | ✅ | JWT (`accessToken`, `refreshToken`) се криптират с `AES-GCM` (256-bit). Платформени токени (`gemini_at_token`, `chatgpt_token` и др.) са в plain text. |
| 3 | RLS Policies | ✅ | Има RLS миграция за 6 таблици (`chats`, `folders`, `prompts`, `images`, `lists`, `list_items`). Покриват SELECT, INSERT, UPDATE, DELETE чрез `auth.uid() = user_id`. |
| 4 | Zod Validation | ✅ | `z.any()` е премахнат от production validation (`chat.ts`). Extension sync route прилага Zod и взима `user_id` от `auth.getUser()`. |
| 5 | Schema Consistency | ⚠ | Налични 2 DB type файла (в `packages/database` и `packages/shared`). `messageSchema` съществува. `folderTypeEnum` включва `chat`, `list`, `image`, `prompt`. |
| 6 | Rate Limiting | ✅ | Имплементирано чрез Upstash Redis. Приложено на AI endpoints (`generate`, `enhance-prompt`, `search`) и на Extension sync endpoint. |
| 7 | Test Suite | 🚨 | 15 failing (unhandled) грешки при vitest run. 0 `.skip` теста намерени глобално. Dashboard тестовете не се стартират поради `MODULE_NOT_FOUND`. |
| 8 | Build Security | ⚠ | В production manifest (`dist/manifest.json`) присъстват `localhost:3000` и `127.0.0.1:3000`. Не са намерени hardcoded Supabase secrets в `src`. |

## Критични находки (🚨 само)

- `apps/extension` и `apps/dashboard`: Vitest гърми с 15 критични грешки (Unhandled Errors) при опит за пускане на тестовете.
- `apps/dashboard`: Тестовете изобщо не стартират поради липсващ модул `@vitejs/plugin-react` в `vitest.config.ts`.

## Общ Verdict

- 🚨 **COMPROMISED** — Тестовата среда е счупена, build-ът на основното приложение (`dashboard`) е нестабилен поради липсващи зависимости, а в production артефактите на разширението изтичат дев-адреси (`localhost`). Схемите на базата данни са дублирани в два пакета.
