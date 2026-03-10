# BrainBox Documentation — Reading Order
> **Обновен:** 2026-02-28

Този документ описва йерархията и препоръчителния ред за четене на документацията на BrainBox.

## Задължително четене (всеки агент, всяка сесия)
1. `main.md` — Идентичност, стандарти, забрани и оперативен протокол.
2. `ARCHITECTURE.md` — 3-те основни слоя (Extension, Dashboard, Supabase) и комуникационни пътеки.
3. `CODE_GUIDELINES.md` — Стандарти за писане на код, Zustand state management и Zod валидация.
4. `SECURITY.md` — RLS политики, JWT сигурност и защита на личните данни.

## При работа по Chrome Extension
- `docs/Mandatory!/EXTENSION.md` — Платформи, адаптери, файлова карта и специфични за разширението проблеми.
- `docs/Mandatory!/UI_SYSTEM.md` — UI граници, Tailwind v4, design tokens, dark mode стратегии.

## При работа по Dashboard & API
- `docs/Mandatory!/UI_SYSTEM.md` — UI граници, Tailwind v4 CSS-first конфигурация, design tokens.
- `docs/Mandatory!/PRODUCT.md` — Бизнес логика, freemium модел и целева аудитория.

## При инфраструктурни и проектни промени
- `docs/Mandatory!/DEPLOYMENT.md` — CI/CD, Vercel, Chrome Web Store.
- `docs/Mandatory!/ARCHITECTURE.md` — 3-слоева архитектура и комуникационни пътеки.

---
> [!IMPORTANT]
> **Кодът е истината.** Документацията трябва винаги да отразява актуалното състояние на кода. При архитектурна промяна, актуализирайте съответните документи веднага.
