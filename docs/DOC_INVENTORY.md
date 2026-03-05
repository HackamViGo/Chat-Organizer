<!-- doc: DOC_INVENTORY.md | version: 2.1 | last-updated: 2026-03-03 -->
# Document Inventory
>
> **Обновен:** 2026-03-03 | **Одитиран от:** DOCS_LIBRARIAN

## Активни документи (Използвай тези)

| Файл | Описва | За кого | Версия / Дата | Статус |
| ---- | ------ | ------- | ------------- | ------ |
| `docs/Mandatory!/README.md` | Ред на четене и йерархия | Всички агенти | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/ARCHITECTURE.md` | Глобална 3-слойна архитектура, packages таблица | Всички агенти | v3.2.0 / 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/UI_SYSTEM.md` | UI граници, Tailwind v4, design tokens, z-index, dark mode | Frontend Агенти | v3.0.0 / 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/SECURITY.md` | RLS, JWT и сигурност | DB & API Агенти | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/CODE_GUIDELINES.md` | Стандарти за код и Zustand | Frontend Агенти | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/EXTENSION.md` | Deep-dive в разширението, Tailwind v4 | Extension Builder | v2.3.0 / 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/PRODUCT.md` | Бизнес логика и Product requirements | Product/Features Агенти | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/DEPLOYMENT.md` | Актуален гид за Vercel + Supabase Migrations | Всички агенти | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/FEATURE_TEMPLATE.md` | Шаблон за нови feature документи | Всички агенти | — | ✅ Пълен |
| `docs/Mandatory!/Tech_Stack_Docs.md` | Технологичен стак — версии и линкове | Всички агенти | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/AI_BEST_PRACTICES_GUIDE.md` | Best practices за DOM, React, Zustand, Supabase | Всички агенти | v1.1.0 / 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/DASHBOARD.md` | Dashboard архитектура, Route Guards, Stores | DASHBOARD_BUILDER | v1.0 / 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/TESTING.md` | Vitest setup, coverage, Playwright | QA_EXAMINER | v1.0 / 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/PROMPTS.md` | Prompt Library feature spec | DASHBOARD_BUILDER | v1.0 / 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/AI_PIPELINE.md` | Gemini SDK, endpoints, models config | DASHBOARD_BUILDER | v1.0 / 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/CHROME_MANIFEST.md` | Permissions, CSP, stripDevCSP | EXTENSION_BUILDER | v1.0 / 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/STATUS.md` | Build status, known issues, snapshots | Всички агенти | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/CODEBASE_SUMMARY.md` | Workspace map (apps/packages) | Всички агенти | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/API_REFERENCE.md` | Backend API endpoints & formats | Всички агенти | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/DATABASE_SCHEMA.md` | Supabase schema & relationships | DB_ARCHITECT | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/ERROR_CODES.md` | Internal error codes dictionary | Всички агенти | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/SUPABASE_MIGRATION.md` | Migration procedure & OAuth sync | ENV_ENGINEER | 2026-03-03 | ✅ Пълен |
| `docs/Mandatory!/TOOLING_SETUP_PROMPT.md` | Tooling & setup prompt for generic agents | Всички агенти | 2026-03-03 | ✅ Пълен |
| `docs/DEVELOPER_GUIDE.md` | Comprehensive guide for project setup, architecture, and guidelines | Всички агенти | 2026-03-03 | ✅ Пълен |
| `.agent/rules/main.md` | Глобален оперативен протокол | Всички агенти | — | ✅ Пълен |
| `.agent/rules/knowledge_graph.json` | Бизнес логика, guidelines, external docs | Всички агенти | v2.1.0 / 2026-03-03 | ✅ Пълен |
| `.agent/rules/ProjectGraph.json` | Файлова карта — зависимости и responsibilities | Всички агенти | 75 nodes / 2026-03-03 | ✅ Пълен |

## Архивирани документи (docs/archive/)

| Файл | Защо е архивиран |
| ---- | --------------- |
| `Extension_GAP_ANALYSIS.md` | Описва разлики, които вече са имплементирани. |
| `NewExtension_PLAN.md` | Планът за S1-S4 вече е реалност. |
| `EXTENSION_ARCHITECTURE.md` | Дублира и е по-стар от `ARCHITECTURE.md`. |
| `monorepo_tooling_migration.md` | Изпълнена задача от началото на февруари. |
| `extension_tree.md` | Статично дърво, което вече не е актуално. |

## ⚠️ Липсваща документация (Gap Analysis — 2026-03-03)

> Всички критични документи са налични. Продължава мониторинг на техническия дълг в `STATUS.md`.

| Документ | Приоритет | Защо е нужен | Покрит в Graph? |
| -------- | --------- | ------------ | --------------- |
| `docs/Mandatory!/PROJECT_HEALTH.md` | **LOW** | Разширена версия на STATUS.md с дългосрочни метрики | ❌ Липсва |

### Засечено в Graph-а но без документация

| Graph Node | Проблем |
| ---------- | ------- |
| `knowledge_graph.json` B.13 — Pending Improvements | Upstash Rate Limiting TODO е в graph-а но без task/issue |
| `ProjectGraph.json` — `apps/extension/src/lib/normalizers.ts` | Маркиран `"status": "deprecated"` — чака почистване. |
| `knowledge_graph.json` — Tailwind секция в `AI_BEST_PRACTICES_GUIDE.md` | Все още описва v3 практики вътре в документа (само заглавната е обновена) |
