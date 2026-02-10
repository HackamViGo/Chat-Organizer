# Context Map Documentation

**Project**: BrainBox AI Chat Organizer  
**Version**: v3.1.0  
**Generated**: 2026-02-11  

---

## 1. Project Topology Overview (v3.1.0)


```mermaid
graph TB
    subgraph Extension["🧩 apps/extension (Vite)"]
        SW[service-worker.ts<br/>Entry Point]
        UI[prompt-inject.ts<br/>Universal UI & Scraper]
        G_MAIN[inject-gemini-main.ts<br/>Main World Bridge]
        subgraph SW_Modules["📦 SW Modules"]
            MO[networkObserver.ts]
            MR[messageRouter.ts]
            DA[dashboardApi.ts]
            AM[authManager.ts]
            SM[syncManager.ts]
            CM[cacheManager.ts]
            IM[installationManager.ts]
            DM[dynamicMenus.ts]
            TM[tabManager.ts]
        end
        CS_AUTH[content-dashboard-auth.ts<br/>Token Bridge]
        NORM[platformAdapters/<br/>Platform Parsers (v3.1.0)]
        
        UI -->|Fetch/Save| SW
        G_MAIN -->|Token Relay| UI
        EXT_SHARED["@brainbox/shared<br/>(Imported via Workspace)"]
    end
    
    subgraph Dashboard["🌐 apps/dashboard (Next.js)"]
        API[src/app/api/<br/>API Routes]
        STORE[src/store/<br/>Zustand + useShallow]
        LIB_AUTH[src/lib/supabase/<br/>Supabase Client]
        MIDDLEWARE[src/middleware.ts<br/>Auth Guard]
        
        PWA_DB["@brainbox/shared<br/>(Imported via Workspace)"]
        PWA_VAL["@brainbox/validation<br/>(Imported via Workspace)"]
    end
    
    subgraph SharedBridges["🌉 Shared Bridges (Monorepo Packages)"]
        PKG_DB[packages/database]
        PKG_VAL[packages/validation]
        PKG_SHARED[packages/shared]
        PKG_CONFIG[packages/config]
        PKG_ASSETS[packages/assets]
        
        PKG_DB -.->|Database Types| PKG_SHARED
        PKG_CONFIG -.->|Shared Config| Extension
        PKG_CONFIG -.->|Shared Config| Dashboard
        PKG_VAL -.->|Validation| Extension
        PKG_VAL -.->|Validation| Dashboard
        PKG_ASSETS -.->|UI Icons/Assets| Extension
        PKG_ASSETS -.->|UI Icons/Assets| Dashboard
    end
    
    UI -->|Captures Data| SW
    SW -->|Delegates to| SW_Modules
    SW_Modules -->|Normalization| NORM
    DA -->|POST /api/chats| API
    SW -.->|Bearer Token| CS_AUTH
    
    API -->|Validates with| PKG_VAL
    API -->|Enforces Types| PKG_SHARED
    API -->|Persists to| Supabase[(Supabase PostgreSQL)]
    
    style SW fill:#ffd700,stroke:#333,stroke-width:3px
    style API fill:#4169e1,stroke:#333,stroke-width:3px
    style SharedBridges fill:#e6e6fa,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
```

---

## 2. Responsibility Matrix

**Format**: `Functionality` → `Owner` (Package/File) → `Access Rule`

| Functionality | Owner | File Path/Package | Access Rule | Identity-Locked |
|---------------|-------|-------------------|-------------|-----------------|
| **Auth: Supabase Session** | Dashboard | `apps/dashboard/src/lib/supabase/client.ts` | Single Source of Truth | ⚠️ YES |
| **Auth: Token Bridge** | Extension | `apps/extension/src/content/content-dashboard-auth.ts` | Read-only from Dashboard session | ⚠️ YES |
| **Auth: Token Manager** | Extension | `apps/extension/src/background/modules/authManager.ts` | Handles storage & refresh (via RELEVANT_API_REGEX) | ⚠️ YES |
| **Database Types** | Shared | `packages/shared/src/types/database.ts` | Auto-generated from Supabase | ⚠️ YES |
| **Validation Schemas** | Validation | `packages/validation/index.ts` | Zod Schemas for API/UI | ⚠️ YES |
| **Extension Schemas** | Shared | `packages/shared/src/types/index.ts` | Shared logic for Ext/PWA | ⚠️ YES |
| **API: Chat Sync** | Dashboard | `apps/dashboard/src/app/api/chats/route.ts` | Dual auth (Bearer/cookies) | NO |
| **Platform Capture** | Extension | `apps/extension/src/content/` | Isolated content scripts | NO |
| **Normalization** | Extension | `apps/extension/src/background/modules/platformAdapters/` | Must output canonical schema | ⚠️ YES |
| **Bridge: Ext→API** | Extension | `apps/extension/src/background/modules/dashboardApi.ts` | Token interceptors | ⚠️ YES |
| **Sync Logic** | Extension | `apps/extension/src/background/modules/syncManager.ts` | Retail & Retry logic | YES |
| **Tab Management** | Extension | `apps/extension/src/background/modules/tabManager.ts` | Tracks AI platform tabs | NO |
| **Config Source** | Config | `packages/config/` | Centralized project config | ⚠️ YES |
| **Shared Assets** | Shared Assets | `packages/assets/src/index.ts` | Unified AI Provider Branding | NO |

---

## 3. Communication Bridge (Monorepo Packages)

1.  **`@brainbox/database`**: Съдържа суровите дефиниции на таблиците.
2.  **`@brainbox/validation`**: Единствен източник на истина за валидация (Zod).
3.  **`@brainbox/shared`**: Типове и помощни функции, използвани в цялото monorepo.
4.  **`@brainbox/config`**: Споделени конфигурации за Tailwind, PostCSS, TS и модели.
5.  **`@brainbox/assets`**: Централизирани икони и брандинг активи.

---

## 4. Communication Rules (Extension <-> Dashboard)

### 4.1 Strict API-Only Contract
Разширението **НИКОГА** не импортира код директно от `apps/dashboard`. Комуникацията става само през:
1.  **HTTP API**: `Authorization: Bearer <token>`.
2.  **Shared Packages**: Импорти чрез `@brainbox/*`.
3.  **Message Passing**: През защитения токен бридж.

---
*Документът е актуализиран на 11.02.2026.*
