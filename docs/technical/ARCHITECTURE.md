# BrainBox Architecture

> [!IMPORTANT]
> # ⚖️ АРХИТЕКТУРЕН ЗАКОН (Meta-Architect v3.1)
> Тази архитектура е **ЖИВА** и се управлява единствено чрез [SKILL.md](file:///home/stefanov/Projects/Chat%20Organizer%20Cursor/.agent/skills/meta_architect/SKILL.md). Всеки опит за промяна без `Audit -> Knowledge -> State` цикъл ще бъде автоматично ревертиран.
**Version**: 3.0.0 (2026-02-06)

## 🔭 High-Level Overview

BrainBox is a **monorepo** built with **Turborepo** comprising two main applications and shared packages:

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
    end
    
    User -->|Interact| CS
    User -->|Manage| Page
    
    CS -.->|Import| Utils
    Page -.->|Import| Utils
    API -.->|Import| Validation
```

---

## 🖥️ Dashboard (`apps/dashboard`)

The dashboard is the command center for managing the prompt library.

### Key Components
- **`actions.tsx` (Server Actions)**: Handles server-side mutations.
- **`DataProvider.tsx`**: Orchestrates parallel data fetching (`Promise.allSettled`) to eliminate waterfalls.
- **`ChatCard.tsx`**: Decomposed into `ChatActions` and `ChatBadges` for maintainability.

### State Management
We use **Zustand** for global client state, ensuring atomic updates and minimal re-renders via `useShallow`.

**Core Stores**:
- **`useChatStore`**: Manages chat lists, selection logic, and optimistic updates.
- **`useFolderStore`**: Handles folder hierarchy and nesting logic.
- **`usePromptStore`**: manages prompt templates.

---

## 🧩 Chrome Extension (`apps/extension`)

The extension injects a "brain" into AI web interfaces.

### Security Model
- **Content Security Policy (CSP)**: Strictly locked down. `script-src 'self'` prevents unauthorized code execution.
- **`brainbox_master.ts`**: The central controller for injection logic. It uses a **Regex Filter** to strictly match allowed URLs before executing sensitive logic.
- **Global Error Boundary**: Wraps injection points to prevent Extension errors from crashing the host page.

### Content Scripts
- **Platform-Specific**: Dedicated scripts for ChatGPT, Claude, Gemini, etc. (e.g., `content-chatgpt.ts`).
- **`prompt-inject.ts`**: Universal script for injecting the context menu into valid text areas.

---

## 📦 Shared Layer (`packages/`)

### `@brainbox/shared`
- **Constants**: Limits, UI colors, and configuration.
- **Utils**: Helper functions (e.g., `cn`, `formatDate`).
- **Types**: Shared TypeScript interfaces to ensure contract alignment between Dashboard and Extension.

### `@brainbox/validation`
- **Zod Schemas**: Single source of truth for data validation.
- Used by:
  - **API Routes**: To validate request bodies.
  - **Frontend Forms**: To validate user input.

---

## 🛡️ Data Flow & Security

1.  **Authentication**: Handled via Supabase Auth (SSR for Dashboard, Client SDK for Extension).
2.  **API Security**: All API routes validate `user_id` from the session token before accessing data.
3.  **RLS (Row Level Security)**: Postgres tables are protected by RLS polices ensuring users can only access their own data.
