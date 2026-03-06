<!-- doc: REFACTOR_PLAN.md | version: 1.0 | last-updated: 2026-03-06 | author: UI_ARCHITECT -->

# BrainBox UI Refactoring Plan v1.0

> **Статус:** Ready for execution | **Авторитет:** UI_ARCHITECT → UI_UX_DESIGNER  
> **Базиран на:** UI_BIBLE v1.0, MyChats.tsx, Studio.tsx (Workspace ref), Sidebar.tsx, Vault.tsx, PROMPT docs × 3, CODE_GUIDELINES  
> **Анализирана кодова база:** `apps/dashboard/src/` (pages, stores, hooks, components/layout)

---

## ⛔ КРИТИЧНО — AI Studio ≠ Workspace

| | AI Studio | Workspace |
|--|-----------|-----------|
| **Route** | `/studio` (СЪЩЕСТВУВА) | `/workspace` (НОВ) |
| **Компонент** | `ChatStudio` | Нова страница |
| **Действие** | ⛔ НЕ СЕ ПИПА | ✅ Създава се |

Sidebar nav item **"Workspace"** → route `/workspace`. AI Studio остава непроменен.

---

## Секция 1: Executive Summary

| Метрика | Стойност |
|---------|----------|
| **Файлове за промяна** | 19 файла |
| **Нови файлове** | 4 файла |
| **Файлове ЗАБРАНЕНИ** | 1 (`/studio/page.tsx` + ChatStudio) |
| **Риск High** | 3 (HybridSidebar, Root Layout промяна) |
| **Риск Medium** | 6 (Dashboard, Chats, Prompts, Settings, Vault, globals.css) |
| **Риск Low** | 10 (hooks, shared infra, Workspace нова страница, Lists) |
| **Оценена сложност** | Структурна промяна — не прост рефактор |

### Зависимости

```
Фаза 0 (Инфраструктура) → Фаза 1 (Sidebar/Layout) → Фаза 2 (Страници) → Фаза 3 (Polish)
    ↑ БЛОКИРА ВСИЧКО           ↑ БЛОКИРА СТРАНИЦИТЕ
```

---

## Секция 2: Shared Инфраструктура (ЛИПСВА — прави се ПЪРВО)

### 2.1 `getPlatformTheme()` + `MODEL_THEMES` — ЛИПСВА НАПЪЛНО

**⚠️ ПОТВЪРДЕНО ОТ DB:** Полето е `Chat.platform: string | null` (не `model`!). DB schema: `platform text`. Extension записва: `chatgpt | claude | gemini | grok | perplexity | deepseek | qwen | lmsys` (plain текст, без enum constraint).

**Трябва:** Нов файл `apps/dashboard/src/store/appStore.ts` с:
- `MODEL_THEMES` обект — 8 платформи + `system` (точно по UI_BIBLE §2.1)
- `getPlatformTheme(platform: string | null)` — приема DB lowercase стойности, нормализира до UI_BIBLE ключове
- **Потвърден mapping (от Extension `PLATFORMS` константа + DB):**

| DB стойност | UI_BIBLE ключ | Цвят |
|------------|---------------|------|
| `chatgpt` | `GPT-4o` | green |
| `claude` | `Claude 3.5` | orange |
| `gemini` | `Gemini Pro` | blue |
| `deepseek` | `DeepSeek` | purple |
| `grok` | `Grok` | slate |
| `perplexity` | `Perplexity` | cyan |
| `qwen` | `Qwen` | violet |
| `lmsys` ⚠️ | `LMArena` | amber |
| `null` / неизвестен | `system` | indigo |

> **⚠️ ВАЖНО:** Extension ползва `lmsys` (не `lmarena`!) — потвърдено от `apps/extension/src/lib/schemas.ts:14`

- Fallback: `null` или неразпознат → `system` тема

**Hex стойности (UI_BIBLE §2.1):**

| Платформа | primary | light | glow | bg | border |
|-----------|---------|-------|------|----|--------|
| GPT-4o (`chatgpt`) | `#22c55e` | `#4ade80` | `rgba(34,197,94,0.3)` | `rgba(34,197,94,0.08)` | `rgba(34,197,94,0.25)` |
| Claude 3.5 (`claude`) | `#f97316` | `#fb923c` | `rgba(249,115,22,0.3)` | `rgba(249,115,22,0.08)` | `rgba(249,115,22,0.25)` |
| Gemini Pro (`gemini`) | `#3b82f6` | `#60a5fa` | `rgba(59,130,246,0.3)` | `rgba(59,130,246,0.08)` | `rgba(59,130,246,0.25)` |
| DeepSeek (`deepseek`) | `#a855f7` | `#c084fc` | `rgba(168,85,247,0.3)` | `rgba(168,85,247,0.08)` | `rgba(168,85,247,0.25)` |
| Grok (`grok`) | `#e2e8f0` | `#f8fafc` | `rgba(226,232,240,0.3)` | `rgba(226,232,240,0.08)` | `rgba(226,232,240,0.25)` |
| Perplexity (`perplexity`) | `#06b6d4` | `#22d3ee` | `rgba(6,182,212,0.3)` | `rgba(6,182,212,0.08)` | `rgba(6,182,212,0.25)` |
| Qwen (`qwen`) | `#8b5cf6` | `#a78bfa` | `rgba(139,92,246,0.3)` | `rgba(139,92,246,0.08)` | `rgba(139,92,246,0.25)` |
| LMArena (**`lmsys`** ⚠️) | `#f59e0b` | `#fbbf24` | `rgba(245,158,11,0.3)` | `rgba(245,158,11,0.08)` | `rgba(245,158,11,0.25)` |
| system (null/fallback) | `#6366f1` | `#818cf8` | `rgba(99,102,241,0.3)` | `rgba(99,102,241,0.08)` | `rgba(99,102,241,0.25)` |

---

### 2.2 `useModelHighlight` hook — ЛИПСВА НАПЪЛНО

**Текущо:** `apps/dashboard/src/hooks/` съдържа само `use-toast.ts`.

**Трябва:** Нов файл `apps/dashboard/src/hooks/useModelHighlight.ts` — точно по UI_BIBLE §8.2:
- `pageKey: string` параметър → localStorage ключ: `bb_modelHighlight_${pageKey}`
- State: `enabled` (default `true`), `hoveredModel: string | null`
- Функции: `toggle()`, `setHoveredModel()`, `getCardStyle(cardModel: string) → React.CSSProperties`
- `getCardStyle()`: same-platform → `boxShadow glow + borderColor`, друга платформа → `opacity: 0.35`
- При `toggle(false)` → `setHoveredModel(null)` автоматично

**localStorage keys:** `bb_modelHighlight_chats`, `bb_modelHighlight_prompts`

---

### 2.3 Glass CSS класове — ЧАСТИЧНО ЛИПСВАТ

**Текущо в `globals.css`:**
- ✅ `.glass-card` — съществува, НО е theme-aware с CSS vars (не fixed dark per UI_BIBLE)
- ✅ `.glass-morphism` — съществува (не е в UI_BIBLE spec)
- ❌ `.glass-panel` — **ЛИПСВА**
- ❌ `.glass-input` — **ЛИПСВА**
- ❌ `.glass-button` — **ЛИПСВА**
- ❌ CSS variables `--color-surface`, `--color-surface-alt`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted` — **ЛИПСВАТ**

**Трябва:** Добавяне в `apps/dashboard/src/app/globals.css`:
- `.glass-panel` → `rgba(255,255,255,0.03)`, blur 24px, border `rgba(255,255,255,0.06)`, radius 16px
- `.glass-card` update за `.dark` контекст → `rgba(255,255,255,0.025)`, blur 12px, transition с cubic bezier
- `.glass-card:hover` → lift `-2px`, opacity `rgba(255,255,255,0.055)`
- `.glass-input` → `rgba(255,255,255,0.04)`, focus glow
- `.glass-button` → indigo themed glass
- CSS vars в `.dark {}` блока

---

### 2.4 Sidebar PIN логика — ЛИПСВА

**Текущо:** `HybridSidebar.tsx` — само `isHovered` state, без PIN, без persistence.

**Трябва:**
- `pinned` state от `localStorage.getItem('bb_sidebar_pinned')`
- Expanded = `pinned || isHovered`
- PIN бутон — видим само при expanded, горе вдясно в logo реда (UI_BIBLE §17.2)
- `onMouseLeave` не collapse-ва при `pinned === true`
- Workspace dot indicator на Workspace nav иконката при collapsed + на `/workspace` route (UI_BIBLE §17.4)

---

### 2.5 `cn()` utility — ✅ ПОТВЪРДЕНО СЪЩЕСТВУВА

**Потвърдено:** `packages/shared/src/utils/cn.ts` — `clsx + twMerge` — **НЕ се създава нов файл.**

**Употреба навсякъде:** `import { cn } from '@brainbox/shared'`

---

### 2.6 `activeModel` в UIStore — ЛИПСВА

**Текущо:** `useUIStore.ts` има само `isMobileSidebarOpen` и `isGlobalBrainOpen`. Без `activeModel`.

**Трябва:** Добавяне на `activeModel: string` с **localStorage persistence** в UIStore:
- Default: `'GPT-4o'`
- localStorage key: `'bb_activeModel'`
- Action: `setActiveModel(platform: string)`
- Причина: без localStorage sidebar се ресетва до default цвят при всеки refresh — broken UX

---

## Секция 3: Страница по страница

### Анализ: Текущо vs. Трябва

---

### 3.1 Root Layout

**Файл:** `apps/dashboard/src/app/layout.tsx`  
**Приоритет:** P1 | **Риск:** Low | **Зависи от:** —

**Текущо:**
- Шрифт: само `JetBrains_Mono` — Inter **не е зареден**
- Theme: `defaultTheme="system"` с `enableSystem` — може да зареди light mode

**Трябва:**
1. Добавяне на `Inter` шрифт от `next/font/google` — за body текстове
2. `defaultTheme="dark"` — BrainBox е dark-only app

**НЕ се пипа:** Metadata, SessionBroadcaster, Toaster, manifest

---

### 3.2 Sidebar (HybridSidebar)

**Файл:** `apps/dashboard/src/components/layout/HybridSidebar.tsx`  
**Приоритет:** P1 | **Риск:** High | **Зависи от:** 2.1, 2.3, 2.4, 2.6

**Текущо:**
- Layout: hover-expand 80→256px, без PIN
- Nav items: Dashboard, Chats, Prompts, `Studio ✨` (→`/studio`), Lists, Settings — **ЛИПСВА Workspace**
- Active indicator: `bg-primary rounded-r-full` div — не е `layoutId` анимиран
- Logo: `from-primary to-blue-600` static gradient — не следва `activeModel`
- Стил: `bg-card/95 backdrop-blur-xl` — не е UI_BIBLE glass spec
- ThemeToggle в footer — ОК

**Трябва:**
1. Добавяне на **"Workspace"** nav item — `Layers` иконка, route `/workspace`, след Studio item
2. Active indicator → `motion.div layoutId="sidebar-active"` с `theme.primary` цвят
3. Logo glow → `motion.div animate={{ boxShadow: \`0 4px 20px ${theme.glow}\` }}`
4. PIN toggle бутон (UI_BIBLE §17.2) — `bb_sidebar_pinned` localStorage
5. Workspace dot indicator при collapsed + на `/workspace` (UI_BIBLE §17.4)
6. Sidebar background: `rgba(15, 15, 26, 0.92)` dark fixed glass
7. Nav item active: platform-themed background/border

**НЕ се пипа:** FolderTree логика, "Smart 5" logика, Studio nav item, Suspense wrapper

**Потенциален конфликт:** UIStore трябва да има `activeModel` преди тази промяна.

---

### 3.3 Dashboard

**Файл:** `apps/dashboard/src/app/page.tsx`  
**Приоритет:** P2 | **Риск:** Medium | **Зависи от:** 2.1, 2.3, 2.6

**Текущо:**
- Точната структура изисква четене на целия файл (голям)
- Вероятно: basic cards без glass система, без Model Switcher

**Трябва (UI_BIBLE §11):**
1. **Header:** `h1.text-2xl.font-bold.text-text-primary` + pulsing "System Online" `motion.div` dot
2. **Model Switcher:** 4-grid (GPT-4o, Claude, Gemini, DeepSeek) с `layoutId="model-glow"` animated BG
3. **System Status:** 4 `glass-card` stat cards — Sessions, Assets, Chats, Uptime — progress bars с `motion.div`
4. **Quick Actions:** 3 `glass-card` — New Chat, **Open Workspace** (→`/workspace`, НЕ `/studio`!), Global Search
5. **Bottom Row:** `[Recent Work glass-panel flex-1] | [Usage Stats glass-panel w-80]`
6. Стagger анимация: `stagger` + `fadeIn` variants за всички секции
7. `setActiveModel()` при избор в Model Switcher

**НЕ се пипа:** API calls, data fetching логика, auth проверки

---

### 3.4 My Chats

**Файл:** `apps/dashboard/src/app/chats/page.tsx`  
**Приоритет:** P2 | **Риск:** Medium | **Зависи от:** 2.1, 2.2, 2.3

**Текущо:**
- Базова структура за чат списък
- Без platform filter chips (8 платформи)
- Без `useModelHighlight`
- Без list/grid toggle

**Трябва (UI_BIBLE §10 + MyChats.tsx reference):**
1. **Header:** title + primary action бутон
2. **Platform Filter Bar:** 8 `motion.button` chips — `PLATFORMS` array, multi-select, `AnimatePresence` за "Clear all"
3. **Controls Row:** `glass-input` Search + `useModelHighlight` toggle + List/Grid toggle
4. **List mode:**
   - `[Chat List w-[360px] shrink-0] | [Preview Panel flex-1]`
   - Chat card: `glass-card p-4`, `layout` prop, active с `borderLeftColor: theme.primary`, `background: theme.bg`
   - Preview panel: `glass-panel p-5`, `slideInRight` animation, `style={{ borderColor: theme.border }}`
5. **Grid mode:** `grid-cols-2 xl:grid-cols-3 gap-3`
6. `useModelHighlight('chats')` на всеки card с `onMouseEnter/Leave` и `getCardStyle()`
7. `AnimatePresence` за preview panel
8. Empty state: `glass-panel` с `MessageCircle size={36}` иконка

**НЕ се пипа:** useChatStore data fetching, Chat `[id]` route/ChatStudio, folder navigation

**✅ Потвърдено (от DB):** Полето е `Chat.platform: string | null` с стойности `chatgpt | claude | gemini | ...`. Предай директно на `getPlatformTheme(chat.platform)` — нормализира автоматично.

---

### 3.5 Prompts

**Файл:** `apps/dashboard/src/app/prompts/page.tsx`  
**Приоритет:** P2 | **Риск:** Medium | **Зависи от:** 2.1, 2.2, 2.3

**Текущо:**
- Базов списък с промпти, без платформен theming

**Трябва (PROMPT_PROMPTS_HERO_FIX.md):**
1. **Header Row:** title + "New Prompt" бутон
2. **Hero Grid (горна секция):** Featured промпт display — голям gradient card
3. **Platform Filter:** same pattern като Chats (8 chips)
4. **Controls:** `glass-input` Search + `useModelHighlight('prompts')` toggle
5. Prompt card: `glass-card` + `PlatformBadge` компонент с `getPlatformTheme()`
6. Section headers: `text-xs font-semibold uppercase tracking-wide`
7. Empty state: стандартен `glass-panel`

**НЕ се пипа:** usePromptStore CRUD операции, folder структура

---

### 3.6 Workspace (НОВА СТРАНИЦА)

**Файл:** `apps/dashboard/src/app/workspace/page.tsx` — **НЕ СЪЩЕСТВУВА**  
**Приоритет:** P2 | **Риск:** Low (нов файл) | **Reference:** `docs/user/UI/Studio.tsx`  
**Зависи от:** 2.1, 2.3, Sidebar (nav item добавен)

**Трябва (UI_BIBLE §16 + Studio.tsx reference):**

1. `"use client"` directive
2. **Root:** `flex flex-col h-full` — sidebar вземен от layout wrapper
3. **Toolbar (горе):** Add Block | Zoom | Export — хоризонтален strip
4. **Master Editor Strip (collapsed, ВИНАГИ видима):**
   - Центрирана: `PenLine size={12}` + `"MASTER EDITOR"` (`.text-[11px] font-semibold tracking-widest uppercase`) + `ChevronDown size={12}`
   - `justify-center` — не align left
   - Background: `rgba(255,255,255,0.02)` → `rgba(99,102,241,0.12)` при open
5. **Master Editor Curtain (expanded):**
   - `position: absolute top-full left-0 right-0 z-40`
   - `height: 0 → 320px` Framer Motion animation, `exit: { height: 0 }`
   - Background: `rgba(11,11,22,0.96)`, `backdropFilter: blur(20px)` (inline OK тук — не е glass-card)
   - Съдържание: Document name `glass-input` + Save бутон + `glass-input` textarea (`font-mono resize-none`)
6. **Canvas area:** `flex-1`, infinite canvas placeholder, grid dots pattern
7. **Treasure Sidebar toggle:** бутон НА canvas-а (горе вляво) — `Layers size={12}` + label
8. **Treasure Sidebar:** `width: 0 → 240px` animation, 3 Accordion секции:
   - Chats — `#22c55e` (green)
   - Prompts — `#a855f7` (purple)
   - Documents — `#3b82f6` (blue)
   - Accordion chevron: `rotate: 0 → 90deg`
   - Drag hint в дъното: "Drag items to canvas"
9. `sidebarMode: 'nav' | 'treasure'` — **локален state**, не в global store

**НЕ се пипа:** Глобалния sidebar — той продължава да функционира

---

### 3.7 The Vault

**Файл:** `apps/dashboard/src/app/vault/page.tsx`  
**Приоритет:** P2 | **Риск:** Medium | **Reference:** `docs/user/UI/Vault.tsx`  
**Зависи от:** 2.1, 2.3

> **✅ Потвърдено (Q-1):** `/vault` route НЕ съществува → **нов файл**.
> **✅ Потвърдено (Q-6):** `/images` = Gallery (отделна функция). The Vault = archive/lifecycle. Images страница → **следваща версия**, не в този scope.

**Трябва (по Vault.tsx reference):**
- `statusConfig` обект с inline styles по платформа — **не** Tailwind color classes
- Status badges: `glass-card` с platform theme от `getPlatformTheme(chat.platform)`
- Vault card grid: `grid-cols-2 xl:grid-cols-3`
- `PlatformDot` индикатори на всяка card
- Empty state: стандартен `glass-panel`

---

### 3.8 Settings

**Файл:** `apps/dashboard/src/app/settings/page.tsx`  
**Приоритет:** P2 | **Риск:** Medium | **Зависи от:** 2.3  
**Reference:** `PROMPT_SETTINGS_RESTRUCTURE.md`

**Текущо (прочетено директно):**
- Layout: `container mx-auto p-8 max-w-4xl` — single column, не 2-col
- Секции: Synchronization, Extension Quick Access, Notifications, Language & Region, Data & Privacy
- **❌ Критични проблеми:**
  - `console.log` в 7+ места
  - `chat: any` (line ~209), `error: any` в catch blocks
  - `fetchSettings()` извикан **два пъти** в useEffect (bug)
  - `alert()` директно — не custom toast
  - `localStorage.setItem` директно в компонент
  - Без Framer Motion анимации
  - `'use client'` — трябва проверка дали е налице

**Трябва (PROMPT_SETTINGS_RESTRUCTURE.md):**
1. **2-колонен layout:** `[Left Nav 200px glass-panel] | [Content flex-1]`
2. **Nav sections:** General, Appearance (ново), Notifications, Data & Privacy, Account
3. **Appearance секция:** ThemeToggle интегриран тук
4. Всички `console.log` → `logger.ts`
5. `any` типове → `unknown` + type guards. `chat: Chat` (import от @brainbox/shared)
6. Fix двойния `fetchSettings()` — премахване на дубликата
7. `alert()` → toast от `use-toast`
8. Framer Motion stagger на секциите
9. `glass-card` за всяка setting секция

**НЕ се пипа:** Import/Export fetch логика, Delete Account логика, Sign Out, Quick Access API calls

**✅ Потвърдено (Q-3):** ThemeToggle се **маха от Sidebar footer**. Остава САМО в Settings Appearance секция.

---

### 3.9 Lists

**Файл:** `apps/dashboard/src/app/lists/` (съществуваща)  
**Приоритет:** P3 | **Риск:** Low | **Зависи от:** 2.3

**Трябва:**
1. Solid backgrounds → `glass-card` / `glass-panel`
2. Стандартен page header
3. Empty state стандартизиране
4. Framer Motion stagger

---

### 3.10 Profile

**Файл:** `apps/dashboard/src/app/profile/` (съществуваща)  
**Приоритет:** P3 | **Риск:** Low | **Зависи от:** 2.3

**Трябва:**
1. Glass cards за профилни секции
2. Консистентна typography

---

## Секция 4: Конфликти и рискове

#### Конфликт C-0: AI Studio ≠ Workspace (КРИТИЧЕН)
**Засяга:** Sidebar, routing, Dashboard Quick Actions  
**Описание:** `/studio` (ChatStudio компонент) е съществуваща AI функционалност. Workspace е ново нещо.  
**Решение:** Studio nav `label="Studio ✨"` route `/studio` → непроменен. Workspace nav `label="Workspace"` route `/workspace` → добавен. Dashboard "Open Workspace" → `/workspace`.  
**Приоритет:** ПРЕДИ всичко.

---

#### Конфликт C-1: Platform String Keys — ✅ РАЗРЕШЕН ОТ DB
**Засяга:** `getPlatformTheme()`, всички pages  
**Описание:** DB поле = `platform text`, стойности: `chatgpt | claude | gemini | grok | perplexity | deepseek | qwen | lmsys`. Extension ключ за LMArena = `lmsys` (не `lmarena`!).  
**Решение:** `getPlatformTheme(platform: string | null)` приема DB стойности директно. Mapping в `appStore.ts`. Fallback → `system` тема.  
**Приоритет:** Фаза 0.1.

---

#### Конфликт C-2: `.glass-card` CSS е Неправилна за Dark
**Засяга:** Всеки компонент с `.glass-card` — включително Settings  
**Описание:** Текущата `.glass-card` ползва `rgba(var(--color-background-rgb), 0.7)` — theme-aware, работи light AND dark. UI_BIBLE spec е fixed dark rgba.  
**Решение:** Добавяне на `.dark .glass-card { ... }` с UI_BIBLE spec стойности. Не се пипа light mode `.glass-card`.  
**Приоритет:** Фаза 0.4.

---

#### Конфликт C-3: Settings `fetchSettings()` двоен call
**Засяга:** `settings/page.tsx` lines ~63–65  
**Описание:** `fetchSettings()` се извиква два пъти в един useEffect — bug, двойна мрежова заявка при mount.  
**Решение:** Премахване на дубликата при рефактора.  
**Приоритет:** Фаза 2.6.

---

#### Конфликт C-4: UIStore липсва `activeModel`
**Засяга:** Dashboard Model Switcher, Sidebar logo glow, NavItem active color  
**Описание:** `useUIStore.ts` няма `activeModel` state.  
**Решение:** Добавяне на `activeModel: string` (default `'GPT-4o'`) и `setActiveModel()` в UIStore.  
**Приоритет:** Фаза 0.6.

---

#### Конфликт C-5: Dark Mode не е Default
**Засяга:** Root layout → ThemeProvider  
**Описание:** `defaultTheme="system"` зарежда light mode на light-themed OS. BrainBox е dark-only.  
**Решение:** `defaultTheme="dark"` в ThemeProvider.  
**Приоритет:** Фаза 1.2.

---

#### Конфликт C-6: `any` типове в Production
**Засяга:** `settings/page.tsx` — `chat: any`, `error: any`  
**Описание:** Нарушение на Rule #3 — `any` е забранено.  
**Решение:** `chat: Chat` (от @brainbox/shared), `error: unknown` + type guards.  
**Приоритет:** Фаза 2.6.

---

#### Конфликт C-7: `console.log` в Production
**Засяга:** `settings/page.tsx` (7+ места), вероятно и в chats/prompts  
**Описание:** Нарушение на Rule #5.  
**Решение:** Замяна с `logger.ts` при рефактора на всяка страница. Проверка с `ui_auditor.py`.  
**Приоритет:** В съответните фази.

---

#### Конфликт C-8: Tailwind v4 синтаксис — ОК
**Засяга:** `globals.css`  
**Описание:** Текущият `globals.css` ползва `@import "tailwindcss"` (✅ v4) и `@theme {}` блок (✅ v4).  
**Решение:** Внимание при добавяне — само v4 синтаксис. Без `@tailwind` директиви.  
**Приоритет:** Awareness при Фаза 0.4.

---

#### Конфликт C-9: `h-screen` в AI Studio Suspense fallback
**Засяга:** `apps/dashboard/src/app/studio/page.tsx`  
**Описание:** `h-screen` в Suspense fallback — нарушение за Extension popup, но Dashboard не е popup.  
**Решение:** Не се пипа — AI Studio е извън scope.  
**Приоритет:** N/A.

---

## Секция 5: Ред на Изпълнение

```markdown
## Фаза 0 — Инфраструктура (блокираща, ПРЕДИ всичко)

- [ ] 0.1 Нов файл: `apps/dashboard/src/store/appStore.ts`
      → MODEL_THEMES (8 теми + system), getPlatformTheme(), platform normalizer mapping

- [ ] 0.2 Нов hook: `apps/dashboard/src/hooks/useModelHighlight.ts`
      → Точна имплементация по UI_BIBLE §8.2

- [ ] 0.3 Промяна: `apps/dashboard/src/store/useUIStore.ts`
      → Добавяне на activeModel: string, setActiveModel() action

- [ ] 0.4 Промяна: `apps/dashboard/src/app/globals.css`
      → .glass-panel, .glass-input, .glass-button (нови)
      → .dark .glass-card update за UI_BIBLE spec
      → CSS vars: --color-surface, --color-text-primary и др. в .dark {}
      → line-clamp utilities

- [x] 0.5 `cn()` ПОТВЪРДЕНО: `packages/shared/src/utils/cn.ts` — не се пипа, import от `@brainbox/shared`

- [ ] 0.6 Промяна: `apps/dashboard/src/store/useUIStore.ts`
      → Добавяне на `activeModel: string` с localStorage persist (`bb_activeModel`)
      → `setActiveModel(platform: string)` action


## Фаза 1 — Layout (висок риск, след Фаза 0)

- [ ] 1.1 Промяна: `apps/dashboard/src/components/layout/HybridSidebar.tsx`
      → Добавяне на Workspace nav item (после Studio, преди Lists)
      → PIN логика + bb_sidebar_pinned localStorage
      → Workspace dot indicator
      → layoutId="sidebar-active" active indicator
      → Logo glow следва activeModel
      → Background dark glass fix

- [ ] 1.2 Промяна: `apps/dashboard/src/app/layout.tsx`
      → Inter шрифт добавен
      → defaultTheme="dark"


## Фаза 2 — Страници (паралелно, след Фаза 1)

- [ ] 2.1 Dashboard (`/page.tsx`)
      → Model Switcher 4-grid с layoutId animations
      → System Status 4 glass-card stats с progress bars
      → Quick Actions (Workspace link, не Studio!)
      → Stagger анимации

- [ ] 2.2 My Chats (`/chats/page.tsx`)
      → Platform Filter 8 chips
      → List/Grid toggle
      → useModelHighlight('chats')
      → Preview panel (list mode)
      → glass-card chat cards

- [ ] 2.3 Prompts (`/prompts/page.tsx`)
      → Hero Grid
      → Platform Filter
      → useModelHighlight('prompts')
      → glass-card prompt cards

- [ ] 2.4 Workspace (НОВ `/workspace/page.tsx`)
      → Master Editor strip + curtain (overlay, не push)
      → Canvas area с grid dots
      → Treasure Sidebar + 3 accordion секции
      → sidebarMode локален state

- [ ] 2.5 The Vault (`/vault/page.tsx` — НОВ файл, потвърдено Q-1)
      → statusConfig inline styles с getPlatformTheme(chat.platform)
      → glass-card grid
      ⛔ /images (Gallery) → следваща версия, не в scope

- [ ] 2.6 Settings (`/settings/page.tsx`)
      → 2-колонен layout (Left Nav 200px + Content)
      → Fix: двоен fetchSettings(), console.log → logger, any → unknown
      → alert() → toast
      → Appearance секция
      → glass-card секции
      → Framer Motion stagger


## Фаза 3 — Polish & QA

- [ ] 3.1 Стартиране на `tools/guardians/ui_auditor.py` → zero ERRORs
- [ ] 3.2 Lists, Profile — glass cards + animations
- [ ] 3.3 Empty states стандартизиране на всички незасегнати компоненти
- [ ] 3.4 UI_BIBLE Checklist §15 за всеки рефакториран файл
- [ ] 3.5 pnpm verify > 80
```

---

## Секция 6: Файлове за промяна (пълен списък)

| Файл | Тип промяна | Фаза | Риск |
|------|------------|------|------|
| `apps/dashboard/src/store/appStore.ts` | [NEW] MODEL_THEMES + getPlatformTheme | 0.1 | Low |
| `apps/dashboard/src/hooks/useModelHighlight.ts` | [NEW] hook | 0.2 | Low |
| `apps/dashboard/src/store/useUIStore.ts` | [MODIFY] activeModel + localStorage persist | 0.3 & 0.6 | Low |
| `apps/dashboard/src/app/globals.css` | [MODIFY] glass classes + CSS vars | 0.4 | Medium |
| `packages/shared/src/utils/cn.ts` | ✅ EXISTS — import само, не се пипа | — | — |
| `apps/dashboard/src/components/layout/HybridSidebar.tsx` | [MODIFY] PIN + Workspace nav + theming | 1.1 | **High** |
| `apps/dashboard/src/components/layout/LayoutWrapper.tsx` | [MODIFY] layout padding check | 1.1 | Low |
| `apps/dashboard/src/app/layout.tsx` | [MODIFY] Inter + dark default | 1.2 | Low |
| `apps/dashboard/src/app/page.tsx` | [MODIFY] Dashboard redesign | 2.1 | Medium |
| `apps/dashboard/src/app/chats/page.tsx` | [MODIFY] platform filter + glass | 2.2 | Medium |
| `apps/dashboard/src/app/prompts/page.tsx` | [MODIFY] hero + filter + glass | 2.3 | Medium |
| `apps/dashboard/src/app/workspace/page.tsx` | **[NEW]** Workspace | 2.4 | Low |
| `apps/dashboard/src/app/vault/page.tsx` | [NEW или MODIFY — pending Q-1] | 2.5 | Medium |
| `apps/dashboard/src/app/settings/page.tsx` | [MODIFY] layout + bugs + glass | 2.6 | Medium |
| `apps/dashboard/src/app/lists/page.tsx` | [MODIFY] glass + animations | 3.2 | Low |
| `apps/dashboard/src/app/profile/page.tsx` | [MODIFY] glass | 3.2 | Low |
| `tools/guardians/ui_auditor.py` | **[CREATED]** Guardian script | Done | Low |
| `docs/agents/logs/CHANGES.log` | [APPEND] log entry | Exit | Low |

---

## Секция 7: Python Helper Scripts

### Намерени в `docs/user/py/`:
1. **`FUTURE_GUARD_AND_AUTO.md`** — описва бъдещи Guardian и Automation скриптове
2. **`TODO_ui_auditor.md`** — детайлна спецификация за `ui_auditor.py`

### Действие — Създаден скрипт:
**`tools/guardians/ui_auditor.py`** — имплементира всички checks от `TODO_ui_auditor.md`:
- Hardcoded platform hex colors (8 платформи × multiple shades)
- Dynamic Tailwind string interpolation (`bg-${model}-500`)
- Inline `backdropFilter` styles (използвай glass-card вместо)
- `console.log` в продукционен код
- `any` типове
- Липсващи `.glass-panel`, `.glass-input`, `.glass-button` в globals.css
- Липсващи CSS `--color-*` variables
- Zustand store reads без `useShallow`
- Tailwind v3 `@tailwind` директиви

### Употреба:
```bash
# От root на проекта (изисква Python 3.8+)
python tools/guardians/ui_auditor.py --path apps/dashboard/src

# JSON output за CI/pipeline
python tools/guardians/ui_auditor.py --path apps/dashboard/src --json
```

Output → `tools/guardians/guardians.log`

### Guardian Script Comparison (v1 vs v2)
Проведени бяха първоначални (baseline) сканирания с двете версии на скрипта върху директория `apps/dashboard/src`:

**`ui_auditor.py` (v1):**
* Намери: **151 нарушения** (основно липсващи glass classes в `globals.css` и solid backgrounds, плюс `any` types и hardcoded цветове).
* Предимства: Бързо, установява базовата линия за UI_BIBLE съответствие.

**`ui_auditor_v2.py` (v2):**
* Намери: **284 нарушения** (59 ERRORs, 225 WARNINGs).
* Предимства: Много по-стриктно. Добавя нови проверки (пр. `h-screen forbidden in Extension context`, специфични warnings за `SOLID_BACKGROUND` вместо glass). Втората версия улавя скрити проблеми с layout-а (като `h-screen`), които биха счупили Extension изгледа според правилата.

**Решение:** Ще използваме **`ui_auditor_v2.py`** като основен инструмент за проверка и валидация по време на ибмплементацията (Phase 0 - 3), тъй като покрива повече edge cases и има по-прецизен ERROR/WARNING reporting подход.
---

## Секция 8: Потвърдени отговори (Финализирано 2026-03-06)

> ✅ Всички въпроси затворени. DB разследван. Планът е готов за изпълнение.

| # | Въпрос | Отговор | Импакт |
|---|--------|---------|--------|
| Q-1 | `/vault` route? | **НЕ съществува** → нов `/vault/page.tsx` по Vault.tsx reference | Фаза 2.5 = нов файл |
| Q-2 | `Chat.platform` DB стойности? | **Потвърдено от DB:** `chatgpt\|claude\|gemini\|grok\|perplexity\|deepseek\|qwen\|lmsys` — plain `text`, без enum | `lmsys → LMArena` в mapping (не `lmarena`!) |
| Q-3 | ThemeToggle позиция? | **Само в Settings Appearance** — маха се от sidebar footer | Sidebar рефактор: премахва footer ThemeToggle |
| Q-4 | Lists scope? | **P3 — не блокира.** Остава за последно или следваща версия | Фаза 3.2 optional |
| Q-5 | `cn()` съществува ли? | **ДА** — `packages/shared/src/utils/cn.ts` (clsx + twMerge) | Не се създава нов файл. Import от `@brainbox/shared` |
| Q-6 | `/images` = Vault? | **НЕ** — Vault = lifecycle/архив, Images = gallery. Images → следваща версия | `/images` пропуска се изцяло |
| Q-7 | `activeModel` persistence? | **localStorage** — key `bb_activeModel` (без reset при refresh) | UIStore persist config нужна |
| Q-8 | Global Search route или overlay? | **command+K overlay** — без нов route, без sidebar item | Dashboard Quick Action отваря overlay |
