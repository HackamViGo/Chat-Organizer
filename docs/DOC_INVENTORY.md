<!-- doc: DOC_INVENTORY.md | version: 2.0 | last-updated: 2026-02-28 -->
# Document Inventory
> **Обновен:** 2026-02-28 | **Одитиран от:** SENIOR_UI_ARCHITECT

## Активни документи (Използвай тези)

| Файл | Описва | За кого | Версия / Дата | Статус |
| ---- | ------ | ------- | ------------- | ------ |
| `docs/Mandatory!/README.md` | Ред на четене и йерархия | Всички агенти | 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/ARCHITECTURE.md` | Глобална 3-слойна архитектура, packages таблица | Всички агенти | v3.2.0 / 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/UI_SYSTEM.md` | **(v3.0.0)** UI граници, Tailwind v4, design tokens, z-index, dark mode | DASHBOARD_BUILDER, EXTENSION_BUILDER, QA_EXAMINER | v3.0.0 / 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/SECURITY.md` | RLS, JWT и сигурност | DB & API Агенти | 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/CODE_GUIDELINES.md` | Стандарти за код и Zustand | Frontend Агенти | 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/EXTENSION.md` | Deep-dive в разширението, Tailwind v4 | Extension Builder | v2.3.0 / 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/PRODUCT.md` | Бизнес логика и Product requirements | Product/Features Агенти | 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/DEPLOYMENT.md` | Актуален гид за Vercel + Supabase Migrations | Всички агенти | 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/FEATURE_TEMPLATE.md` | Шаблон за нови feature документи | Всички агенти | — | ✅ Пълен |
| `docs/Mandatory!/Tech_Stack_Docs.md` | Технологичен стак — версии и линкове | Всички агенти | 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/AI_BEST_PRACTICES_GUIDE.md` | Best practices за DOM, React, Zustand, Supabase | Всички агенти | v1.1.0 / 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/DASHBOARD.md` | Next.js Dashboard архитектура, Route Guards, Zustand store map, UI State, Shadcn компоненти | DASHBOARD_BUILDER, QA_EXAMINER | v1.0 / 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/TESTING.md` | Vitest setup, coverage thresholds, Playwright E2E конфигурация | Всички агенти | v1.0 / 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/PROMPTS.md` | Prompt Library feature — бизнес логика, context menu интеграция, schema | DASHBOARD_BUILDER, EXTENSION_BUILDER | v1.0 / 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/AI_PIPELINE.md` | Gemini SDK usage, `ai_models_config.json`, route `/api/ai/*`, enhance-prompt логика | DASHBOARD_BUILDER | v1.0 / 2026-02-28 | ✅ Пълен |
| `docs/Mandatory!/CHROME_MANIFEST.md` | Permissions обяснение, `stripDevCSP` plugin, web_accessible_resources | EXTENSION_BUILDER | v1.0 / 2026-02-28 | ✅ Пълен |
| `.agent/rules/main.md` | Глобален оперативен протокол | Всички агенти | — | ✅ Пълен |
| `.agent/rules/knowledge_graph.json` | Бизнес логика, guidelines, external docs | Всички агенти | v1.4.0 / 2026-02-28 | ✅ Пълен |
| `.agent/rules/ProjectGraph.json` | Файлова карта — зависимости и responsibilities | Всички агенти | 50 nodes / 2026-02-28 | ✅ Пълен |

## Архивирани документи (docs/archive/)

| Файл | Защо е архивиран |
| ---- | --------------- |
| `Extension_GAP_ANALYSIS.md` | Описва разлики, които вече са имплементирани. |
| `NewExtension_PLAN.md` | Планът за S1-S4 вече е реалност. |
| `EXTENSION_ARCHITECTURE.md` | Дублира и е по-стар от `ARCHITECTURE.md`. |
| `monorepo_tooling_migration.md` | Изпълнена задача от началото на февруари. |
| `extension_tree.md` | Статично дърво, което вече не е актуално. |
| `technical_ARCHITECTURE.md` | Дублира `docs/Mandatory!/ARCHITECTURE.md`. |
| `BLIND_AUDIT_REPORT.md` | Изпълнен одит. |
| И множество други одити/насоки... | Виж `ls docs/archive/` за пълния списък. |

## ⚠️ Липсваща документация (Gap Analysis — 2026-02-28)

> Всички документи изброени по-горе са налични и пълни. Не съществуват DASHBOARD.md, TESTING.md, PROMPTS.md, AI_PIPELINE.md и CHROME_MANIFEST.md в "липсващи" — всичките 5 са създадени на 2026-02-28.

| Документ | Приоритет | Защо е нужен | Покрит в Graph? |
| -------- | --------- | ------------ | --------------- |
| `docs/Mandatory!/STATUS.md` | **MEDIUM** | Build status, known issues, next milestones — snapshot за агентите | ❌ Липсва |
| `docs/Mandatory!/CODEBASE_SUMMARY.md` | **MEDIUM** | Workspace map — кратко описание на всяко app/package | ❌ Липсва |

### Засечено в Graph-а но без документация

| Graph Node | Проблем |
| ---------- | ------- |
| `knowledge_graph.json` B.13 — Pending Improvements | Upstash Rate Limiting TODO е в graph-а но без task/issue |
| `ProjectGraph.json` — `apps/extension/src/lib/normalizers.ts` | Маркиран `"status": "deprecated"` — кога ще бъде изтрит? Няма документирано решение |
| `ProjectGraph.json` — отсъства `packages/shared/src/logic/promptSync.ts` | Файлът е dependency на `service-worker.ts` и `messageRouter.ts`, но няма node |
| `knowledge_graph.json` — Tailwind секция в `AI_BEST_PRACTICES_GUIDE.md` | Все още описва v3 практики вътре в документа (само заглавната е обновена) |

### Препратки към несъществуващи файлове (преди одита — вече поправени)

| Документ | Грешна препратка | Статус |
| -------- | --------------- | ------ |
| `README.md` | `docs/technical/CHROME_EXTENSION_POLICY.md` | ✅ Поправено |
| `README.md` | `docs/technical/DATA_SCHEMA.md` | ✅ Поправено |
| `README.md` | `docs/technical/SYNC_PROTOCOL.md` | ✅ Поправено |
| `README.md` | `docs/technical/CONTEXT_MAP.md` | ✅ Поправено |
| `README.md` | `docs/project_history_summary.md` | ✅ Поправено |
