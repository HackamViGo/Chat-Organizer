# THE WHOLE PICTURE - Системен Одит на BrainBox Монорепо

**Дата на одит:** 2026-02-10T01:46:41+02:00  
**Версия на монорепо:** 3.1.0  
**Package Manager:** pnpm@10.28.2

---

## 1. ВЕРСИОНЕН ОДИТ (Version Mismatch Detection)

### Критични Библиотеки - Сравнителна Таблица

| Library | Root Version | Extension Version | Dashboard Version | Status |
|---------|--------------|-------------------|-------------------|--------|
| **react** | ^18.3.1 | ^18.3.1 | ^18.3.1 | ✅ ALIGNED |
| **react-dom** | ^18.3.1 | ^18.3.1 | ^18.3.1 | ✅ ALIGNED |
| **typescript** | ~5.8.2 | ~5.8.2 | ~5.8.2 | ✅ ALIGNED |
| **vite** | ❌ N/A | ^5.4.0 | ❌ N/A | ⚠️ EXTENSION ONLY |
| **zod** | ^3.25.76 | ❌ N/A | ^3.25.76 | ⚠️ ROOT + DASHBOARD |
| **tailwindcss** | ^3.4.17 | ^3.4.19 | ^3.4.17 | 🔴 **MISMATCH** |
| **postcss** | ^8.5.1 | ^8.5.6 | ^8.5.1 | 🔴 **MISMATCH** |
| **vitest** | ❌ N/A | ^2.0.0 | ❌ N/A | ⚠️ EXTENSION ONLY |

### Критични Разминавания

> [!CAUTION]
> **🔴 TAILWINDCSS VERSION MISMATCH**
> - Root: `^3.4.17`
> - Extension: `^3.4.19`
> - Dashboard: `^3.4.17`
> 
> Extension използва по-нова версия, което може да причини стилови несъответствия.

> [!CAUTION]
> **🔴 POSTCSS VERSION MISMATCH**
> - Root: `^8.5.1`
> - Extension: `^8.5.6`
> - Dashboard: `^8.5.1`
> 
> Extension използва по-нова версия, което може да причини CSS processing разлики.

### Допълнителни Наблюдения

- **@types/react**: Root (^18.3.18), Extension (^18.3.27), Dashboard (^18.3.18) - 🔴 **MISMATCH**
- **@types/react-dom**: Root (^18.3.5), Extension (^18.3.7), Dashboard (^18.3.5) - 🔴 **MISMATCH**
- **autoprefixer**: Root (^10.4.20), Extension (^10.4.24), Dashboard (^10.4.20) - 🔴 **MISMATCH**

---

## 2. ФИЗИЧЕСКО КАРТОГРАФИРАНЕ НА WORKSPACE ВРЪЗКИТЕ

### pnpm-workspace.yaml Конфигурация

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Физически Packages в `packages/`

| Package | Physical Path | package.json | Workspace Status |
|---------|---------------|--------------|------------------|
| **assets** | ✅ EXISTS | ✅ EXISTS | ✅ VALID |
| **database** | ✅ EXISTS | ✅ EXISTS | ✅ VALID |
| **shared** | ✅ EXISTS | ✅ EXISTS | ✅ VALID |
| **validation** | ✅ EXISTS | ✅ EXISTS | ✅ VALID |
| **config** | ✅ EXISTS | 🔴 **MISSING** | 🔴 **INVALID** |

### Критични Несъответствия

> [!WARNING]
> **🔴 GHOST PACKAGE: packages/config**
> 
> - **Knowledge Graph**: Има node `package-config` (priority: 2)
> - **Physical Reality**: Директорията `packages/config/` съществува
> - **Workspace Reality**: НЯМА `package.json` файл
> 
> **Последици:**
> - Не може да се използва като workspace dependency
> - Импортите към `@brainbox/config` ще фейлват
> - pnpm няма да го разпознае като package

### Apps Структура

| App | Physical Path | package.json | Workspace Status |
|-----|---------------|--------------|------------------|
| **dashboard** | ✅ EXISTS | ✅ EXISTS | ✅ VALID |
| **extension** | ✅ EXISTS | ✅ EXISTS | ✅ VALID |

---

## 3. IMPORT TRACE АНАЛИЗ (Deep Dive)

### Platform Adapters Import Patterns

Сканирани файлове: `apps/extension/src/background/modules/platformAdapters/*.adapter.ts`

#### Workspace Imports (@brainbox/*)

```
РЕЗУЛТАТ: 0 workspace imports намерени
```

#### Relative Imports (../)

**Всички adapters използват САМО relative imports:**

```typescript
// chatgpt.adapter.ts
import { BasePlatformAdapter, type Conversation } from './base';
import { normalizeChatGPT } from '../../../lib/normalizers';
import { validateConversation } from '../../../lib/schemas';
import { limiters } from '../../../lib/rate-limiter';
import { logger } from '../../../lib/logger';

// gemini.adapter.ts
import { BasePlatformAdapter, type Conversation } from './base';
import { normalizeGemini } from '../../../lib/normalizers';
import { limiters } from '../../../lib/rate-limiter';
import { logger } from '../../../lib/logger';

// deepseek.adapter.ts, perplexity.adapter.ts, grok.adapter.ts, qwen.adapter.ts, lmarena.adapter.ts
import { BasePlatformAdapter, type Conversation, type Message } from './base';
import { limiters } from '../../../lib/rate-limiter.js';
```

### Ghost Imports Анализ

> [!IMPORTANT]
> **КРИТИЧНО: Adapters НЕ използват workspace packages**
> 
> - Всички imports са relative (`../../../lib/*`)
> - НЯМА импорти от `@brainbox/shared`
> - НЯМА импорти от `@brainbox/validation`
> 
> **Потенциален проблем:**
> - Ако `lib/` файловете трябва да са в `@brainbox/shared`, има архитектурно разминаване
> - Relative imports заобикалят workspace dependency resolution

### Test Files Import Patterns

```typescript
// Някои тестове използват path alias:
import { resetAllMocks } from '@/__tests__/setup';

// Други използват relative:
import { resetAllMocks } from '../../../../__tests__/setup';
```

**Заключение:** Inconsistent import style в тестовете.

---

## 4. КОНФИГУРАЦИОНЕН ОДИТ

### TypeScript Path Mappings

#### apps/extension/tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@brainbox/shared": ["../../packages/shared"],
      "@brainbox/shared/schemas": ["../../packages/shared/schemas.js"],
      "@brainbox/shared/logic/*": ["../../packages/shared/src/logic/*"],
      "@brainbox/shared/*": ["../../packages/shared/*"],
      "@/*": ["./src/*"]
    }
  }
}
```

**Наблюдения:**
- ✅ Дефинирани са mappings за `@brainbox/shared`
- ✅ Дефиниран е alias `@/*` за `./src/*`
- 🔴 **НО:** Adapters НЕ използват тези mappings (виж Import Trace)

#### apps/dashboard/tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@brainbox/database": ["../../packages/database"],
      "@brainbox/validation": ["../../packages/validation"],
      "@brainbox/shared": ["../../packages/shared"],
      "@brainbox/shared/*": ["../../packages/shared/src/*"]
    }
  }
}
```

**Наблюдения:**
- ✅ Дефинирани са mappings за всички workspace packages
- ✅ Дефиниран е alias `@/*` за `./src/*`

### Vite Configuration Hardcoded Paths

#### apps/extension/vite.config.ts

```typescript
resolve: {
  alias: {
    '@': resolve(__dirname, './src'),
  },
},
```

**Критични Hardcoded Values:**

```typescript
// Line 10
const dashboardUrl = env.VITE_DASHBOARD_URL || 'http://localhost:3000';

// Line 105
content = content.replace(/http:\/\/localhost:3000/g, env.VITE_DASHBOARD_URL || 'https://brainbox.ai');

// Line 127
__DASHBOARD_URL__: JSON.stringify(env.VITE_DASHBOARD_URL || 'http://localhost:3000'),
```

> [!WARNING]
> **HARDCODED PATHS DETECTED**
> 
> - `http://localhost:3000` - 3 occurrences
> - `https://brainbox.ai` - 1 occurrence (fallback)
> - Alias `@` hardcoded to `./src`

### Path Mapping Comparison

| Mapping | Extension | Dashboard | Match |
|---------|-----------|-----------|-------|
| `@/*` | `./src/*` | `./src/*` | ✅ ALIGNED |
| `@brainbox/shared` | ✅ DEFINED | ✅ DEFINED | ✅ ALIGNED |
| `@brainbox/database` | ❌ N/A | ✅ DEFINED | ⚠️ DASHBOARD ONLY |
| `@brainbox/validation` | ❌ N/A | ✅ DEFINED | ⚠️ DASHBOARD ONLY |

---

## 5. ИНВЕНТАРИЗАЦИЯ НА ПАРАЗИТИТЕ

### Паразитни node_modules Директории

```
TOTAL: 5 паразитни node_modules намерени
```

| Location | Type | Status |
|----------|------|--------|
| `./packages/shared/node_modules` | 🔴 PARASITE | Workspace package НЕ трябва да има собствени node_modules |
| `./packages/validation/node_modules` | 🔴 PARASITE | Workspace package НЕ трябва да има собствени node_modules |
| `./packages/database/node_modules` | 🔴 PARASITE | Workspace package НЕ трябва да има собствени node_modules |
| `./apps/extension/node_modules` | 🔴 PARASITE | App НЕ трябва да има собствени node_modules |
| `./apps/dashboard/node_modules` | 🔴 PARASITE | App НЕ трябва да има собствени node_modules |

> [!CAUTION]
> **🚨 КРИТИЧНО: 5 ПАРАЗИТНИ node_modules ДИРЕКТОРИИ**
> 
> **Причини:**
> - pnpm workspace не работи правилно
> - Локални `npm install` или `pnpm install` изпълнени в под-директории
> - Hoisting не функционира
> 
> **Последици:**
> - Дублирани dependencies
> - Version conflicts
> - Увеличен размер на проекта
> - Бавни build времена

### Локални pnpm-lock.yaml Файлове

```
РЕЗУЛТАТ: 1 pnpm-lock.yaml намерен (само в root)
```

✅ **ДОБРА НОВИНА:** Няма локални lock файлове в под-директории.

---

## 6. ЗАКЛЮЧЕНИЯ И ПРЕПОРЪКИ

### Критични Проблеми (Priority 1)

1. **🔴 5 Паразитни node_modules**
   - **Действие:** Изтриване на всички node_modules в `packages/` и `apps/`
   - **Команда:** `rm -rf packages/*/node_modules apps/*/node_modules`
   - **След това:** `pnpm install` в root

2. **🔴 packages/config Липсва package.json**
   - **Действие:** Или създай `package.json` или премахни от Knowledge Graph
   - **Последици:** Импорти към `@brainbox/config` ще фейлват

3. **🔴 Version Mismatches**
   - **tailwindcss:** Extension (3.4.19) vs Root/Dashboard (3.4.17)
   - **postcss:** Extension (8.5.6) vs Root/Dashboard (8.5.1)
   - **Действие:** Align версиите в extension/package.json

### Средни Проблеми (Priority 2)

4. **⚠️ Adapters НЕ използват workspace imports**
   - Всички imports са relative (`../../../lib/*`)
   - Дефинираните path mappings в tsconfig.json не се използват
   - **Въпрос:** Трябва ли `lib/` да е част от `@brainbox/shared`?

5. **⚠️ Inconsistent Import Styles в тестовете**
   - Някои използват `@/__tests__/setup`
   - Други използват `../../../../__tests__/setup`
   - **Действие:** Standardize на path alias

### Ниски Проблеми (Priority 3)

6. **ℹ️ Hardcoded paths в vite.config.ts**
   - `http://localhost:3000` hardcoded на 3 места
   - **Препоръка:** Extract в константа или config file

---

## 7. СТАТИСТИКА

- **Total Packages:** 4 (assets, database, shared, validation)
- **Ghost Packages:** 1 (config - няма package.json)
- **Total Apps:** 2 (dashboard, extension)
- **Parasite node_modules:** 5
- **Version Mismatches:** 5 (tailwindcss, postcss, @types/react, @types/react-dom, autoprefixer)
- **Workspace Imports in Adapters:** 0
- **Relative Imports in Adapters:** 100%

---

**Край на одит.**
