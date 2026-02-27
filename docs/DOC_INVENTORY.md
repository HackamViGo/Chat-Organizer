# Document Inventory (Updated Feb 2026)

## Активни документи (Използвай тези)

| Файл                                  | Описва                                        | За кого                 |
| ------------------------------------- | --------------------------------------------- | ----------------------- |
| `docs/Mandatory!/README.md`           | (НОВО) Ред на четене и йерархия               | Всички агенти           |
| `docs/Mandatory!/ARCHITECTURE.md`     | Глобална 3-слойна архитектура                 | Всички агенти           |
| `docs/Mandatory!/SECURITY.md`         | RLS, JWT и сигурност                          | DB & API Агенти         |
| `docs/Mandatory!/CODE_GUIDELINES.md`  | Стандарти за код и Zustand                    | Frontend Агенти         |
| `docs/Mandatory!/EXTENSION.md`        | Deep-dive в разширението                      | Extension Builder       |
| `docs/Mandatory!/PRODUCT.md`          | Бизнес логика и Product requirements          | Product/Features Агенти |
| `docs/Mandatory!/DEPLOYMENT.md`       | Актуален гид за Vercel + Supabase Migrations. | Всички агенти           |
| `docs/Mandatory!/FEATURE_TEMPLATE.md` | Шаблон за нови feature документи              | Всички агенти           |
| `.agent/rules/main.md`                | Глобален оперативен протокол                  | Всички агенти           |

## Архивирани документи (docs/archive/)

| Файл                              | Защо е архивиран                              |
| --------------------------------- | --------------------------------------------- |
| `Extension_GAP_ANALYSIS.md`       | Описва разлики, които вече са имплементирани. |
| `NewExtension_PLAN.md`            | Планът за S1-S4 вече е реалност.              |
| `EXTENSION_ARCHITECTURE.md`       | Дублира и е по-стар от `ARCHITECTURE.md`.     |
| `monorepo_tooling_migration.md`   | Изпълнена задача от началото на февруари.     |
| `extension_tree.md`               | Статично дърво, което вече не е актуално.     |
| `technical_ARCHITECTURE.md`       | Дублира `docs/Mandatory!/ARCHITECTURE.md`.    |
| `BLIND_AUDIT_REPORT.md`           | Изпълнен одит.                                |
| И множество други одити/насоки... | Виж `ls docs/archive/` за пълния списък.      |

## Липсващи или предвидени за създаване

| Документ                       | Защо е нужен                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `docs/Mandatory!/DASHBOARD.md` | Аналогично на `EXTENSION.md`, описващо Route Guards, UI State и Store logic. |
| `docs/Mandatory!/TESTING.md`   | Описва Vitest/Playwright интеграцията в Dashboard и Extension.               |
