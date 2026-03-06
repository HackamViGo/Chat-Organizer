# Package Sync Audit Report — BrainBox

> **Статус:** 🚨 КРИТИЧНИ НЕСЪОТВЕТСТВИЯ (BOMBS DETECTED)
> **Дата:** 2026-03-06
> **Скрипт:** `tools/guardians/package_sync_checker.py`

---

## 💣 Критични находки (Logic Bombs)

1. **`@brainbox/shared` Hoisting Hazard**:
   - Пакетът експортира валидационна логика, но **няма `zod`** в своите преки зависимости. Разчита изцяло на хойстване (hoisting), което е опасна практика за runtime среда.
   - **Изискване:** Добави `zod` към `@brainbox/shared/package.json`.

2. **`typescript` Version Mismatch**:
   - `apps/extension`: `~5.8.2`
   - `Root`: `~5.9.3`
   - **Риск:** Разминаване в типовите дефиниции при билд.

3. **`vitest` / `vite` Fragmentation**:
   - Големи разлики между версиите в `Root` (v7/v3) и `apps/extension` (v5/v2).
   - **Риск:** Тестовете в Extension може да се държат по различен начин от тези в Dashboard.

---

## 📁 Пълен опис на несъответствията

### Липсващи в ROOT (Трябва да се хойстнат съгласно ПРАВИЛО #1):

- `eslint-plugin-react-hooks` (от `apps/extension`)
- `happy-dom` (от `apps/extension`)
- `jsdom` (от `apps/extension`)
- `@types/chrome` (от `packages/shared`)

### Версионни конфликти (Version Mismatches):

| Package      | Root Version | Sub-package Version | Path                  |
| :----------- | :----------- | :------------------ | :-------------------- |
| `typescript` | `~5.9.3`     | `~5.8.2`            | `apps/extension`      |
| `vite`       | `^7.3.1`     | `^5.4.0`            | `apps/extension`      |
| `vitest`     | `^3.2.4`     | `^2.0.0`            | `apps/extension`      |
| `vitest`     | `^3.2.4`     | `^2.1.0`            | `packages/validation` |

---

## 🛠️ Препоръчителен план за действие

1. **`pnpm install -w zod typescript@~5.9.3 vite@^7.3.1 vitest@^3.2.4`** - за синхронизация на версията в root.
2. **Премахни локалните версии** от sub-packages и ги остави да ползват тези от root, освен ако няма изрична ARCHITECTURE причина.
3. **Обнови `inventory.json`** след промените.

---

_Докладът е генериран автоматично от BrainBox Guardians._
