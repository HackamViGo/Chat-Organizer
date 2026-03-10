# UI_SYSTEM.md

> **Версия:** 3.0.0 — 2026-02-28
> **Авторитет:** Собственикът на продукта + DASHBOARD_BUILDER за Dashboard, EXTENSION_BUILDER за Extension.
> **Scope:** Tailwind конфигурация, UI граници, design tokens, custom класове, ESLint tier архитектура, правила за агенти.
> **Задължително четене за:** DASHBOARD_BUILDER, EXTENSION_BUILDER, QA_EXAMINER.
> **Верифицирано:** SENIOR_UI_ARCHITECT — 2026-02-28 (унифицирана система, двата build-а минаха)

---

## Единна Tailwind v4 система

**И двете приложения** използват Tailwind v4 (CSS-first). Tailwind v3 е премахнат.

| Приложение | Tailwind | Синтаксис | Entry CSS |
|------------|----------|-----------|-----------| 
| **Dashboard** | **v4** | `@import "tailwindcss"` | `apps/dashboard/src/app/globals.css` |
| **Extension Popup** | **v4** | `@import "tailwindcss"` | `apps/extension/src/popup/styles/index.css` |
| **Content Scripts** | **няма** | Само inline styles чрез `injectStyles()` | `apps/extension/src/prompt-inject/prompt-inject.ts` |

| | v4 (и двете apps) |
|--|-------------------|
| Config файл | **Няма** — CSS-first |
| Custom теми | `@theme {}` блок в CSS |
| Dark mode config | `@variant dark` в CSS |
| PostCSS плъгин | `@tailwindcss/postcss` |
| Entry directive | `@import "tailwindcss"` |

> ✅ `apps/extension/tailwind.config.ts` е **изтрит**. `tailwindcss@3.x` е премахнат от Extension deps.

---

## Файлова структура

```
packages/
  ui/                         ← НОВА — shared design tokens
    package.json              ← { "name": "@brainbox/ui", exports: { "./tokens": "./index.css" } }
    index.css                 ← @import на всички token файлове
    tokens/
      colors.css              ← --ui-color-platform-*, --ui-color-glass-*
      typography.css          ← --ui-font-sans, --ui-font-mono
      z-index.css             ← --ui-z-* (двустепенна скала)
      effects.css             ← --ui-effect-glass-*, --ui-effect-glow-*
  config/
    tailwind.config.ts        ← LEGACY SHELL — не се ползва активно

apps/
  dashboard/
    src/app/
      globals.css             ← @import "tailwindcss" + @import "@brainbox/ui/tokens" + Shadcn @theme
  extension/
    src/
      popup/styles/
        index.css             ← @import "tailwindcss" + @import "@brainbox/ui/tokens" + Extension @theme
      content-styles.css      ← Standalone CSS за content script UI (без Tailwind)
      prompt-inject/
        prompt-inject.ts      ← injectStyles() — единственото място за content UI стилове
```

---

## Design Tokens (`packages/ui/tokens/`)

Всички токени се импортират чрез един ред:
```css
@import "@brainbox/ui/tokens";
```

### Цветове — `--ui-color-*`

```css
:root {
  /* Platform identity colors */
  --ui-color-platform-chatgpt:    hsl(142 71% 45%);
  --ui-color-platform-gemini:     hsl(217 91% 60%);
  --ui-color-platform-claude:     hsl(25  95% 53%);
  --ui-color-platform-grok:       hsl(0   0%  100%);
  --ui-color-platform-perplexity: hsl(189 94% 43%);
  --ui-color-platform-lmarena:    hsl(43  96% 56%);
  --ui-color-platform-deepseek:   hsl(217 91% 60%);
  --ui-color-platform-qwen:       hsl(262 83% 58%);

  /* Glass palette */
  --ui-color-glass-bg:     hsl(222 47% 11% / 0.7);
  --ui-color-glass-border: hsl(0   0%  100% / 0.1);
}
```

### Шрифтове — `--ui-font-*`

```css
:root {
  --ui-font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --ui-font-mono: 'JetBrains Mono', 'Menlo', monospace;
}
```

| Контекст | Използван token |
|----------|----------------|
| Dashboard | `--ui-font-mono` (JetBrains Mono = основен) |
| Extension Popup | `--ui-font-sans` (Inter) |
| Content Scripts | system-ui stack inline в `injectStyles()` — не от token |

### Z-Index — `--ui-z-*` (двустепенна скала)

```css
:root {
  /* Standard stack (Dashboard + Extension Popup) — собствен DOM */
  --ui-z-base:       0;
  --ui-z-dnd:        5;
  --ui-z-dropdown: 100;
  --ui-z-sticky:   200;
  --ui-z-modal:    300;   /* Shadcn max */
  --ui-z-toast:    400;

  /* Content script stack — инжектирани в чужд DOM (ChatGPT, Gemini, Claude) */
  --ui-z-content-overlay:      10000;
  --ui-z-content-notification: 10001;
  --ui-z-content-auth:         10000;
  --ui-z-content-menu:        999999;
  --ui-z-content-drag:       1000000;
  --ui-z-content-fullscreen: 9999999;
}
```

> ⚠️ **Content script скалата е умишлено различна.** Тези платформи ползват z-index до ~1000000. Нашият UI трябва да е отгоре.

### Effects — `--ui-effect-*`

```css
:root {
  --ui-effect-glass-blur:      10px;
  --ui-effect-glass-bg-light:  rgba(255, 255, 255, 0.7);
  --ui-effect-glass-bg-dark:   rgba(30, 41, 59, 0.4);
  /* + border, shadow variants — вижда се в packages/ui/tokens/effects.css */

  --ui-effect-glow-chatgpt:    0 0 20px hsl(142 71% 45% / 0.5);
  /* + glow за всяка платформа */
}
```

---

## CSS Custom Properties — Dashboard (Shadcn-style)

Дефинирани в `apps/dashboard/src/app/globals.css` `@theme` блок. Не са споделени — специфични за Dashboard/Shadcn.

```css
@theme {
  --color-background: 0 0% 100%;
  --color-primary: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
  /* ...пълен списък в globals.css */
}

.dark {
  --color-background: 222.2 84% 4.9%;
  /* ...dark overrides */
}
```

---

## Platform Colors

```tsx
// ✅ Пълни class strings — единственият правилен подход за Tailwind
const PLATFORM_CLASSES: Record<string, string> = {
  chatgpt:    'bg-emerald-600 text-white',
  claude:     'bg-orange-400 text-white',
  gemini:     'bg-blue-400 text-slate-900',
  deepseek:   'bg-blue-600 text-white',
  grok:       'bg-sky-500 text-white',
  perplexity: 'bg-cyan-500 text-white',
  qwen:       'bg-orange-600 text-white',
  lmarena:    'bg-purple-600 text-white',
}

// ❌ Никога динамични class strings — не работи в Tailwind
<span className={`bg-${platform}-500`}>
```

---

## Custom Utility Classes

### Dashboard — Glass Morphism

```css
/* В apps/dashboard/src/app/globals.css */
.glass-card {
  background: var(--ui-effect-glass-bg-light);
  backdrop-filter: blur(var(--ui-effect-glass-blur));
  border: 1px solid var(--ui-effect-glass-border-light);
  box-shadow: var(--ui-effect-glass-shadow-light);
}
.dark .glass-card {
  background: var(--ui-effect-glass-bg-dark);
  border-color: var(--ui-effect-glass-border-dark);
  box-shadow: var(--ui-effect-glass-shadow-dark);
}
```

> **Правило:** Използвай `.glass-card` — не дублирай backdrop-blur inline.

### Extension Popup — Glow Effects

```css
/* В apps/extension/src/popup/styles/index.css */
.glow-chatgpt:hover { box-shadow: var(--ui-effect-glow-chatgpt); }
.glow-gemini:hover  { box-shadow: var(--ui-effect-glow-gemini); }
/* ...за всяка платформа */
```

> **Правило:** `.glow-*` класове са **само за Extension popup**. Не ги ползвай в Dashboard.

---

## UI граница: Dashboard vs Extension

### Dashboard (Next.js, Tailwind v4)
```
Rendering:  SSR + Client Hydration
Viewport:   Full browser tab (100vw × 100vh)
Tailwind:   v4 — @import "tailwindcss", @theme блок
Dark mode:  .dark селектор на <html> — реален light/dark toggle
Fonts:      JetBrains Mono (основен) + Inter — чрез next/font/google
Z-index:    Shadcn скала — max z-toast (400) в production
```

### Extension Popup (Vite, Tailwind v4)
```
Rendering:  React + Vite (client-only, без SSR)
Viewport:   Chrome popup — НЕ ползвай h-screen/100vh/100vw
Tailwind:   v4 — @import "tailwindcss", @theme блок
Dark mode:  .dark клас (синхронизирано с Dashboard чрез Chrome storage)
Fonts:      Inter / System UI
```

### Extension Content Script — Prompt Inject
```
Rendering:  Inject в DOM на ChatGPT/Claude/Gemini
CSS:        САМО чрез injectStyles() в prompt-inject.ts
Tailwind:   ЗАБРАНЕН
Dark mode:  @media (prefers-color-scheme: dark) — не .dark клас
```

**Защо content scripts ползват media query вместо .dark клас:**
Content scripts нямат контрол над host page-а. ChatGPT/Gemini не имплементират `.dark` selector по Shadcn convention. Единственият надежден механизъм е системната OS media query.

```typescript
// ✅ Единственият правилен начин — само в prompt-inject.ts
function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    .bb-prompt-menu {
      position: fixed;
      z-index: 999999;        /* = --ui-z-content-menu */
      background: #1e293b;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      .bb-prompt-menu { background: #0f172a; }
    }
  `
  document.head.appendChild(style)
}
// ❌ Никога не добавяй нов .css файл за content scripts
// ❌ Никога не ползвай Tailwind класове в inject UI
// Всички content script класове с bb- prefix (изолация от чуждия CSS)
```

---

## Dark Mode

| Контекст | Стратегия | Причина |
|----------|-----------|---------|
| Dashboard | `.dark` class на `<html>` | Shadcn convention |
| Extension Popup | `.dark` class | Синхронизирано с Dashboard |
| Content Scripts | `@media (prefers-color-scheme: dark)` | Без контрол над host страницата |

```tsx
// Dashboard + Extension Popup — .dark е реален
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
```

---

## ESLint Tier архитектура

| Tier | Файлове | ESLint ниво | Commit поведение |
|------|---------|-------------|-----------------| 
| **Tier 1 — Strict** | Нови `.ts`/`.tsx` файлове | `error` | Блокира commit |
| **Tier 2 — Warn** | Legacy `.js` в Extension | `warn` | Commit минава |
| **Exempt** | `inject-gemini-main.ts`, `logger.ts` | `disable` | MAIN world |

- `NODE_OPTIONS='--max-old-space-size=2048'` е зададен в `lint` скрипта (55+ файла).

---

## Правила за агенти — Checklist

### DASHBOARD_BUILDER (Tailwind v4)

- [ ] Tailwind v4 синтаксис — `@import "tailwindcss"`, `@theme` блок?
- [ ] Ползвам ли `.glass-card` вместо inline backdrop-blur?
- [ ] Platform colors → ползвам ли `PLATFORM_CLASSES` map?
- [ ] Нов цвят/token → в `globals.css` `@theme` или `packages/ui/tokens/colors.css`?
- [ ] `dark:` prefix → добавен там където е нужен?
- [ ] Основният шрифт е JetBrains Mono — не добавяй Inter без нужда?
- [ ] Z-index → следва ли `--ui-z-*` скалата (max `--ui-z-toast` = 400)?
- [ ] Нов компонент → Tier 1 ESLint (0 грешки преди commit)?

### EXTENSION_BUILDER (Tailwind v4 за Popup, нищо за Content)

- [ ] Popup → Tailwind v4 синтаксис (`@import "tailwindcss"`, не `@tailwind`)?
- [ ] Не ползвам `h-screen` / `100vh` / `100vw` в popup?
- [ ] Content script UI → **само чрез `injectStyles()`** в `prompt-inject.ts`?
- [ ] Не добавям нов `.css` файл за content scripts?
- [ ] `bb-` prefix на всички content script класове?
- [ ] Dark mode в content → `@media (prefers-color-scheme: dark)` в `injectStyles()`?
- [ ] Нов `.glow-*` клас → само в `popup/styles/index.css`?
- [ ] Промяна в `.js` файл → Tier 2 ESLint (warnings OK, errors не)?

### QA_EXAMINER

- [ ] Има ли Tailwind класове в `prompt-inject.ts`? (Забранено)
- [ ] Има ли нов `.css` файл за content scripts? (Забранено)
- [ ] Динамични class strings (`bg-${color}-500`)? (Не работи)
- [ ] Нови z-index стойности извън `--ui-z-*` скалата?
- [ ] `no-console` в нови TS файлове? (Tier 1 — error)
- [ ] Има ли `@tailwind` directives (v3 синтаксис) некъде?
- [ ] Импортирани ли са токените: `@import "@brainbox/ui/tokens"`?

---

## История на версиите

| Версия | Дата | Промяна |
|--------|------|---------| 
| 1.0.0 | 2026-02-27 | Първоначален документ |
| 1.1.0 | 2026-02-27 | Верифициран от DOCS_LIBRARIAN |
| 2.0.0 | 2026-02-27 | Реалност + правила + ESLint tier архитектура |
| **3.0.0** | **2026-02-28** | **UI Унификация: Extension → Tailwind v4, `packages/ui/tokens/` централизирани, z-index скала, единна dark mode стратегия** |

---

## Промени в документа

При промяна на UI конфигурацията:
1. Актуализирай засегнатата секция
2. Обнови Checklist-а за съответната роля
3. Bump версията (patch корекции, minor нови секции, major архитектурна промяна)
4. Append в `CHANGES.log`: `[дата] ROLE: UI_SYSTEM.md v[X.Y.Z] — [причина]`

---

*Source of Truth: реален код, верифициран 2026-02-28. Основан на: SENIOR_UI_ARCHITECT унификация v3.0.0 — двата build-а минаха (Dashboard ✅, Extension ✅)*
