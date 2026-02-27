# BrainBox Documentation — Reading Order

Този документ описва йерархията и препоръчителния ред за четене на документацията на BrainBox.

## Задължително четене (всеки агент, всяка сесия)
1. `main.md` — Идентичност, стандарти, забрани и оперативен протокол.
2. `ARCHITECTURE.md` — 3-те основни слоя (Extension, Dashboard, Supabase) и комуникационни пътеки.
3. `CODE_GUIDELINES.md` — Стандарти за писане на код, Zustand state management и Zod валидация.
4. `SECURITY.md` — RLS политики, JWT сигурност и защита на личните данни.

## При работа по Chrome Extension
- `docs/Mandatory!/EXTENSION.md` — Платформи, адаптери, файлова карта и специфични за разширението проблеми.
- `docs/technical/CHROME_EXTENSION_POLICY.md` — Политики за сигурност и изисквания на Chrome Web Store.

## При работа по Dashboard & API
- `docs/technical/DATA_SCHEMA.md` — Каноничен формат на данните и Zod схеми.
- `docs/technical/SYNC_PROTOCOL.md` — Детайлно описание на API endpoints и синхронизацията.
- `docs/Mandatory!/PRODUCT.md` — Бизнес логика,freemium модел и целева аудитория.

## При инфраструктурни и проектни промени
- `docs/technical/CONTEXT_MAP.md` — Собственост на файловете по слоеве.
- `docs/project_history_summary.md` — Хронология на развитието и технологичен стак.

---
> [!IMPORTANT]
> **Кодът е истината.** Документацията трябва винаги да отразява актуалното състояние на кода. При архитектурна промяна, актуализирайте съответните документи веднага.
