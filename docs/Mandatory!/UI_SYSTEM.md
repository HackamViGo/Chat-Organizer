# UI_SYSTEM.md

> **Версия:** 1.1.0 — 2026-02-27 (верифицирана спрямо кода)
> **Авторитет:** Собственикът на продукта + DASHBOARD_BUILDER за Dashboard, EXTENSION_BUILDER за Extension.  
> **Scope:** Tailwind v4/v3 конфигурация, UI граници между приложенията, custom класове, правила за агенти.  
> **Задължително четене за:** DASHBOARD_BUILDER, EXTENSION_BUILDER, QA_EXAMINER.

---

## ⚠️ Текущо състояние — Tailwind v4 vs v3

В проекта има частична адаптация към Tailwind v4. **Кодът е водещ (Source of Truth).**

| Приложение        | Tailwind Версия    | Конфигурация                                                  |
| ----------------- | ------------------ | ------------------------------------------------------------- |
| **Dashboard**     | v4.1.18 (Next.js)  | v4 CSS-first: `@import "tailwindcss"` в `globals.css`         |
| **Extension**     | v3.4.19 (Vite)     | v3-style directives: `@tailwind base/components/utilities`    |
| **Shared Config** | v4.1.18 (Packages) | `packages/config` съдържа `tailwind.config.ts` (Legacy Shell) |

> [!CAUTION]
> До момента на пълна миграция, **Extension** продължава да ползва v3 синтаксис. Не смесвай стиловете при работа в него.

---

## Архитектура на Tailwind в Monorepo

> 📋 **Планирано (Не е изцяло имплементирано):** Предстои централизиране на конфигурацията в `packages/config/tailwind/`. В момента стиловете са предимно локализирани.

### Реална структура (Current):

```
apps/
  dashboard/
    src/app/globals.css     ← Основен entry point за Dashboard (Tailwind v4)
    tailwind.config.js      ← НЕ СЪЩЕСТВУВА (v4)
  extension/
    src/popup/styles/index.css ← Основен entry point за Popup (Tailwind v3)
    src/content-styles.css   ← Content script UI (standalone CSS)
```

---

## CSS Custom Properties (Design Tokens)

В момента повечето дизайн токени са дефинирани локално в `apps/dashboard/src/app/globals.css`.

### Основни Dashboard променливи (Shadcn-style):

```css
/* apps/dashboard/src/app/globals.css */
@theme {
  --color-background: 0 0% 100%;
  --color-foreground: 222.2 84% 4.9%;
  --color-primary: 221.2 83.2% 53.3%;
  --color-destructive: 0 84.2% 60.2%;
  --radius: 0.5rem;
}
.dark {
  --color-background: 222.2 84% 4.9%;
  --color-primary: 217.2 91.2% 59.8%;
}
```

### Platform Colors (AI Platform Badges)

Документираните `--color-platform-*` променливи все още **не съществуват** като централни CSS variables. В момента се ползват Tailwind класове в компонентите (напр. `text-blue-400` за Gemini).

> [!IMPORTANT]
> При добавяне на нови платформи, използвай `PLATFORM_CLASSES` мап в компонентите за консистентност.

---

## Custom Utility Classes

### Glass Morphism

Дефиниран в `apps/dashboard/src/app/globals.css`.

```css
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
}
.dark .glass-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}
```

### Extension "Glow" Effects

Дефинирани в `apps/extension/src/popup/styles/index.css`.

```css
.glow-chatgpt:hover {
  box-shadow: 0 0 20px hsl(142 71% 45% / 0.5);
}
.glow-gemini:hover {
  box-shadow: 0 0 20px hsl(217 91% 60% / 0.5);
}
```

---

## UI граница: Dashboard vs Extension

### Dashboard (v4 Context)

- **Viewport:** Full tab.
- **Dark mode:** Използва `.dark` селектор.
- **Fonts:** Използва `JetBrains Mono` и `Inter`.

### Extension Popup (v3 Context)

- **Viewport:** Chrome Popup. Не използвай `h-screen`.
- **Styling:** Tailwind v3.
- **Glow Elements:** Използва специфични `.glow-*` класове за платформени бутони.

### Extension Content Script (Prompt Inject)

- **Изолация:** Не ползва външни CSS файлове. Всички стилове се инжектират програмно чрез `injectStyles()` функцията в `prompt-inject.ts`.
- **Dark Mode:** Използва `@media (prefers-color-scheme: dark)`.

---

## Z-Index система

Реалната употреба в кода показва високи стойности за осигуряване на видимост в чужди платформи.

| Елемент            | Z-index в кода | Бележка                 |
| ------------------ | -------------- | ----------------------- |
| Prompt Menu        | 999999         | Инжектирано в чужд DOM  |
| Export Toolbar     | 10000          | Content script UI       |
| Modals (Dashboard) | 50             | Стандартна Shadcn скала |

---

## Шрифтове

| Контекст        | Шрифт               | Статус                        |
| --------------- | ------------------- | ----------------------------- |
| Dashboard       | `JetBrains Mono`    | Основен шрифт за UI и код     |
| Extension Popup | `Inter` / System UI | През CSS променливи           |
| Content Scripts | System UI           | За съвместимост с платформата |

---

## Правила за агенти — Checklist (v1.1.0)

### DASHBOARD_BUILDER

- [ ] Провери дали ползваш Tailwind v4 синтаксис (CSS-first).
- [ ] Използвай `.glass-card` за overlays.
- [ ] Търси цветовете в `globals.css` преди да добавяш нови.

### EXTENSION_BUILDER

- [ ] Внимавай: Popup ползва Tailwind v3.
- [ ] **Prompt Inject:** Никога не добавяй нови CSS файлове. Промените стават чрез `injectStyles` в `prompt-inject.ts`.
- [ ] Не ползвай `h-screen` в Popup.

---

## Известни проблеми и ограничения (Verified)

- `packages/config/tailwind.config.ts` е празен и не синхронизира приложенията.
- Extension Popup и Dashboard имат различен комплект от utility класове.
- Z-index стойностите са хаотични (от 50 до 999999).

---

_Документът е верифициран от DOCS_LIBRARIAN на 2026-02-27. Кодът е единствен източник на истина._
