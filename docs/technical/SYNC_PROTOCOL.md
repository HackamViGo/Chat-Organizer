# Sync Protocol Documentation

**Project**: BrainBox AI Chat Organizer  
**Version**: 2.1.3
**Stack**: Chrome Extension (Manifest V3) ↔ Next.js PWA  
**Author**: Meta-Architect  
**Date**: 2026-02-03

---

## 1. Overview

### High-Level Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Extension as Chrome Extension<br/>(Service Worker)
    participant ContentScript as Content Script<br/>(10+ Scripts)
    participant Dashboard as Next.js Dashboard
    participant Supabase as Supabase Database

    User->>Dashboard: Login via OAuth/Email
    Dashboard->>Supabase: Authenticate user
    Supabase-->>Dashboard: Returns session + access_token
    Dashboard->>Extension: Send tokens via content-dashboard-auth.js
    Extension->>Extension: Store tokens in chrome.storage.local

    User->>ContentScript: Right-click -> "Save Chat to BrainBox"
    ContentScript->>Extension: chrome.runtime.sendMessage({action: 'triggerSaveChat'})
    Extension->>Extension: Fetch conversation via platform active listener
    Extension->>Dashboard: POST /api/chats (with Bearer token)
    Dashboard->>Supabase: Verify token + upsert chat
    Supabase-->>Dashboard: Return chat record
    Dashboard-->>Extension: Success response
    Extension-->>ContentScript: Show success toast notification
```

---

## 2. Authentication Bridge

### 2.1 Token Flow: Dashboard → Extension

**Problem**: Chrome extensions cannot access HTTPOnly cookies from web pages.
**Solution**: Explicit token transfer via `content-dashboard-auth.js` on `/extension-auth` page.

#### Implementation

```mermaid
flowchart LR
    A[User logs in<br/>at /extension-auth] --> B{Auth successful?}
    B -->|Yes| C[content-dashboard-auth.js<br/>Extractions access_token]
    C --> D[chrome.runtime.sendMessage<br/>action: 'setAuthToken']
    D --> E[AuthManager stores<br/>in chrome.storage.local]
    E --> F[Extension authenticated]
    B -->|No| G[Show error UI]
```

#### Code Reference

**Extension (Service Worker)**:
`apps/extension/src/background/service-worker.ts` delegates to `AuthManager` modules.

**Dashboard (Auth Page)**:
`apps/dashboard/src/app/extension-auth/page.tsx` exposes session to content script (securely).

---

## 3. Message Passing Interface

### 3.1 Architecture

```mermaid
graph TD
    A[Content Script<br/>Isolated Context] -->|chrome.runtime.sendMessage| B[Service Worker<br/>Background Context]
    B -->|chrome.tabs.sendMessage| A
    B -->|fetch with Bearer token| C[Dashboard API<br/>HTTPS]
    C -->|JSON response| B
```

### 3.2 Message Types

| Action | Sender | Handler | Purpose |
|--------|--------|---------|---------|
| `setAuthToken` | Auth Content Script | Service Worker | Store Supabase session |
| `triggerSaveChat` | Context Menu | Service Worker | Initiate conversation capture |
| `saveToDashboard` | Platform Content Script | Service Worker | **[DEPRECATED]** Legacy manual save |
| `fetchPrompts` | Content Script | Service Worker | Get user prompts (CSP bypass) |
| `injectPrompt` | Context Menu | Content Script | Insert text into model textarea |

---

## 4. Real-time Dashboard Sync

### 4.1 Supabase Realtime
The Dashboard uses `DataProvider.tsx` to subscribe to database changes.

1.  **Subscription**: `supabase.channel('public:chats').on('postgres_changes', ...)`
2.  **Optimistic UI**: Zustand stores update immediately on local actions.
3.  **Cross-Tab Sync**: Changes made in Extension or another tab reflect instantly.

## 5. Data Schemas

### 4.1 Chat Sync Payload

**Constraint**: Must match `@brainbox/validation` schema.

```typescript
// See packages/validation/src/index.ts (re-exports chat schemas)
interface CreateChatInput {
    title: string;
    content: string;
    messages: any[];
    platform: string;
    url: string;
    folder_id?: string;
}
```

---

## 6. Security Considerations

### 5.1 Token Exposure
- **Storage**: `chrome.storage.local` (local only, no sync).
- **Lifetime**: Handled by Supabase expiration. Extension auto-refreshes if possible or prompts re-login.

### 5.2 Content Security Policy (CSP)
- **Manifest V3**: No inline scripts. logic isolated in Service Worker.

---
**Version**: v.2.1.3
