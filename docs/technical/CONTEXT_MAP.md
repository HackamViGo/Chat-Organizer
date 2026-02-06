# Context Map Documentation

**Project**: BrainBox AI Chat Organizer  
**Version**: v2.2.0  
**Architecture**: Chrome Extension (Manifest V3) + Next.js PWA (App Router)  
**Generated**: 2026-02-03  
**Authority**: Meta-Architect (Priority 1 - Boundary Definition)

---

## ⚠️ CRITICAL NOTICE FOR AI AGENTS

**PURPOSE**: This document prevents "code blur" between Extension and PWA by defining strict ownership boundaries.

**AGENTS MUST**:
1. **Read this FIRST** before starting any task
2. **Limit scope** to 5-10 relevant files (not 500)
3. **Respect No-Go Zones** (explicit approval required)
4. **Follow Entry Points** for new features

**VIOLATION OF BOUNDARIES** = Architecture degradation + merge conflicts + security risks

---

## 1. Project Topology Overview (v2.1.3)

```mermaid
graph TB
    subgraph Extension["🧩 apps/extension (Vite)"]
        SW[service-worker.ts<br/>Entry Point]
        MASTER[brainbox_master.ts<br/>Traffic Coordinator]
        subgraph SW_Modules["📦 SW Modules"]
            MO[NetworkObserver.ts]
            MR[MessageRouter.ts]
            DA[dashboardApi.ts]
            AM[authManager.ts]
            SM[syncManager.ts]
            CM[cacheManager.ts]
            IM[installationManager.ts]
        end
        CS_PLAT[Content Scripts<br/>(10+ Scripts / 8 Platforms)]
        CS_AUTH[content-dashboard-auth.js<br/>Token Bridge]
        NORM[platformAdapters/<br/>Platform Parsers (v2.1.2)]
        
        MASTER -->|Regex Guard| CS_PLAT
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
        PKG_ASSETS[packages/assets]
        
        PKG_DB -.->|Database Types| PKG_SHARED
        PKG_VAL -.->|Validation| Extension
        PKG_VAL -.->|Validation| Dashboard
        PKG_ASSETS -.->|UI Icons/Assets| Extension
        PKG_ASSETS -.->|UI Icons/Assets| Dashboard
    end
    
    CS_PLAT -->|Captures Data| NORM
    NORM -->|Uses Shared Types| PKG_SHARED
    NORM -->|Sends via| SW
    
    SW -->|Delegates to| SW_Modules
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
| **Auth: Token Bridge** | Extension | `apps/extension/src/content/content-dashboard-auth.js` | Read-only from Dashboard session | ⚠️ YES |
| **Auth: Token Manager** | Extension | `apps/extension/src/background/modules/authManager.ts` | Handles storage & refresh | ⚠️ YES |
| **Database Types** | Shared | `packages/shared/src/types/database.ts` | Auto-generated from Supabase | ⚠️ YES |
| **Validation Schemas** | Validation | `packages/validation/src/index.ts` | Zod Schemas for API/UI | ⚠️ YES |
| **Extension Schemas** | Shared | `packages/shared/src/types/index.ts` | Shared logic for Ext/PWA | ⚠️ YES |
| **API: Chat Sync** | Dashboard | `apps/dashboard/src/app/api/chats/route.ts` | Dual auth (Bearer/cookies) | NO |
| **Platform Capture** | Extension | `apps/extension/src/content/` | Isolated content scripts | NO |
| **Normalization** | Extension | `apps/extension/src/background/modules/platformAdapters/` | Must output canonical schema | ⚠️ YES |
| **Bridge: Ext→API** | Extension | `apps/extension/src/background/modules/dashboardApi.ts` | Token interceptors | ⚠️ YES |
| **Sync Logic** | Extension | `apps/extension/src/background/modules/syncManager.ts` | Retail & Retry logic | YES |
| **Config Source** | Extension | `apps/extension/src/lib/config.js` | Configuration Master | ⚠️ YES |
| **Shared Assets** | Shared Assets | `packages/assets/src/index.ts` | Unified AI Provider Branding | NO |


### 2.1 Shared Packages (The Bridges)

1.  **`@brainbox/database`**:
    *   **Content**: `database.types.ts` (Supabase generated).
    *   **Rule**: Never edit manually. Run `supabase gen types` and update here.
    *   **Consumers**: Dashboard API, Dashboard Components.

2.  **`@brainbox/validation`**:
    *   **Content**: Zod schemas (`createChatSchema`, `promptSchema`, etc.).
    *   **Rule**: Single source of truth for data integrity.
    *   **Consumers**: Dashboard API (backend validation), Dashboard UI (form validation).

3.  **`@brainbox/shared`**:
    *   **Content**: Logic/Schemas shared between Extension and Dashboard.
    *   **Rule**: Code that must exist in both build environments.
    *   **Consumers**: Extension, Dashboard.

4.  **`@brainbox/assets`**:
    *   **Content**: Centralized provider icons and UI assets.
    *   **Rule**: Store high-res branding assets here for global project consistency.
    *   **Consumers**: Extension (Popup), Dashboard (ChatCards).

---

## 3. Communication Rules (Extension <-> Dashboard)

### 3.1 Strict API-Only Contract
The Extension **NEVER** imports code directly from `apps/dashboard`.
The Dashboard **NEVER** imports code directly from `apps/extension`.

**Allowed Communication Channels**:
1.  **HTTP API**: Extension calls `POST https://brainbox.ai/api/chats`.
2.  **Shared Packages**: Both import from `packages/*` (via `@brainbox/*` alias).
3.  **Message Passing**: Content scripts <-> Background <-> Dashboard (via Auth Bridge).

### 3.2 Token Flow (The Handshake)
1.  User logs in on Dashboard (`/extension-auth`).
2.  `content-dashboard-auth.js` detects session.
3.  Sends token to `service-worker.js`.
4.  `AuthManager` (service-worker) saves to `chrome.storage.local`.
5.  All subsequent API requests use `Authorization: Bearer <token>`.

### 3.3 Configuration Flow (No Hardcoded URLs)
1.  **Source**: `apps/extension/src/lib/config.js` defines `API_BASE_URL` and `DASHBOARD_URL`.
2.  **Init**: `service-worker.ts` imports config and saves it to `chrome.storage.local` on startup.
3.  **Consumption**: Content scripts (e.g., `prompt-inject.js`) read config from `chrome.storage.local` asynchronously.
4.  **Rule**: NEVER hardcode URLs in content scripts; always read from storage.

---

## 4. No-Go Zones & Entry Points

Refer to previous documentation for detailed file lists.
**Key Update**: When adding a new field to `chats`:
1.  Update Supabase Schema.
2.  Regenerate `@brainbox/database`.
3.  Update `@brainbox/validation`.
4.  Update Extension Normalizers.
5.  Update Dashboard UI.

---

## 5. Agent Scope Strategy
**Before starting:**
1.  Identify if task is **Extension**, **Dashboard**, or **Shared**.
2.  If **Shared**, you MUST check `packages/`.
3.  Verity `turbo build` passes after changes.

---
**Version**: v2.2.0
