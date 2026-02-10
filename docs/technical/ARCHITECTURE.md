# BrainBox Architecture

> [!IMPORTANT]
> # ⚖️ АРХИТЕКТУРЕН ЗАКОН (Meta-Architect v3.1)
> Тази архитектура е **ЖИВА** и се управлява единствено чрез [SKILL.md](file:///home/stefanov/Projects/Chat%20Organizer%20Cursor/.agent/skills/meta_architect/SKILL.md). Всеки опит за промяна без `Audit -> Knowledge -> State` цикъл ще бъде автоматично ревертиран.

**Version**: 3.1.0 (2026-02-10)

## 🔭 High-Level Overview

BrainBox е **monorepo**, изградено с **Turborepo**, включващо две основни приложения и споделени пакети:

```mermaid
graph TD
    User((User))
    
    subgraph "Chrome Extension (Vite)"
        CS[Content Scripts]
        SW[Service Worker]
        Popup[Popup UI]
        CS -->|Messages| SW
        SW -->|API| Supabase
    end
    
    subgraph "Dashboard (Next.js)"
        Page[Pages / Components]
        Store[Zustand Stores]
        API[API Routes]
        Page -->|Select| Store
        Store -->|Fetch| API
        API -->|Query| Supabase
    end
    
    subgraph "Shared (@brainbox/*)"
        Utils[@brainbox/shared]
        Validation[@brainbox/validation]
        Database[@brainbox/database]
        Assets[@brainbox/assets]
        Config[@brainbox/config]
    end
    
    User -->|Interact| CS
    User -->|Manage| Page
    
    CS -.->|Import| Utils
    Page -.->|Import| Utils
    API -.->|Import| Validation
```

---

## 🖥️ Dashboard (`apps/dashboard`)

Командният център за управление на чатове, промпти и папки.

### Key Components
- **`actions.tsx` (Server Actions)**: Обработка на мутации от страна на сървъра.
- **`DataProvider.tsx`**: Координира паралелно извличане на данни (`Promise.allSettled`) и Realtime абонаменти към Supabase.
- **`ChatCard.tsx`**: Декомпозиран на `ChatActions` и `ChatBadges` за висока поддръжка.

### State Management (Zustand)
Използва се **Zustand** за глобално състояние на клиента с `useShallow` за оптимизация.

**Core Stores**:
- **`useChatStore`**: Списък с чатове, логика за избор и оптимистични ъпдейти.
- **`useFolderStore`**: Йерархия на папките и логика за вгнездяване.
- **`usePromptStore`**: Управление на шаблони за промпти.
- **`useImageStore`**: Галерия и управление на изображения.
- **`useListStore`**: Списъци със задачи и управление на елементи.

---

## 🧩 Chrome Extension (`apps/extension`)

Инжектира логика ("мозък") в AI уеб интерфейси.

### Security & Traffic Control
- **`brainbox_master.ts`**: Централен координатор. Използва `RELEVANT_API_REGEX` за филтриране на мрежовия трафик и IndexedDB (`BrainBoxGeminiMaster`) за локално кеширане на сурови данни.
- **Content Security Policy (CSP)**: Стриктно заключена (`script-src 'self'`). Производственият билд автоматично премахва `localhost` препратките.

### Background Service Worker
Организиран в модули в `src/background/modules/`:
- **`authManager.ts`**: Управление на сесии и токен бридж.
- **`syncManager.ts`**: Логика за повторни опити (retry) и фонова синхронизация.
- **`dashboardApi.ts`**: Interceptor за комуникация с Dashboard API.
- **`messageRouter.ts`**: Централен рутер за съобщения между частите на разширението.
- **`platformAdapters/`**: Специфични адаптери за нормализиране на данни от 8+ платформи.

### Platforms Support (8+)
Базирано на специфични Content Scripts (`src/content/`):
- **ChatGPT, Claude, Gemini, DeepSeek, Grok, Perplexity, Qwen, LMArena**.

---

## 📦 Shared Layer (`packages/`)

### `@brainbox/shared`
- **Types**: Канонични интерфейси (`Chat`, `Prompt`, `Folder`, `User`).
- **Constants**: Лимити, UI цветове и конфигурации.
- **Services**: Споделени API клиенти и утилити (`cn`, `formatDate`).

### `@brainbox/validation`
- **Zod Schemas**: Единствен източник на истина за валидност на данните.
- Използва се в API маршрутите и формите на фронтенда.

### `@brainbox/database`
- **Supabase Types**: Автоматично генерирани типове от базата данни.

### `@brainbox/config`
- Споделени конфигурации за Tailwind, PostCSS, TypeScript и модели (`models.json`).

---

## 🛡️ Data Flow & Security

1.  **Authentication**: Supabase Auth (SSR за Dashboard, Client SDK за Extension чрез Token Bridge).
2.  **API Security**: Валидация на `user_id` чрез JWT сесийни токени.
3.  **RLS (Row Level Security)**: Postgres политики гарантират достъп само до собствени данни.
4.  **Network Observation**: Разширението прехваща `batchexecute` (Gemini) и други API заявки за пасивно събиране на данни.
