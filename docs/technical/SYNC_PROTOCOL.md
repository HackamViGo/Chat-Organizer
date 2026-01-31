# Sync Protocol Documentation

**Project**: BrainBox AI Chat Organizer  
**Version**: 2.1.0-beta (Monorepo Migration)  
**Stack**: Chrome Extension (Manifest V3) ↔ Next.js PWA  
**Author**: Meta-Architect  
**Date**: 2026-01-31

---

## 1. Overview

### High-Level Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Extension as Chrome Extension<br/>(Service Worker)
    participant ContentScript as Content Script<br/>(ChatGPT/Claude/Gemini)
    participant Dashboard as Next.js Dashboard
    participant Supabase as Supabase Database

    User->>Dashboard: Login via OAuth/Email
    Dashboard->>Supabase: Authenticate user
    Supabase-->>Dashboard: Returns session + access_token
    Dashboard->>Extension: Send tokens via content-dashboard-auth.js
    Extension->>Extension: Store tokens in chrome.storage.local

    User->>ContentScript: Clicks "Save Chat" button
    ContentScript->>Extension: chrome.runtime.sendMessage({action: 'saveToDashboard'})
    Extension->>Extension: Fetch conversation via platform API
    Extension->>Dashboard: POST /api/chats (with Bearer token)
    Dashboard->>Supabase: Verify token + upsert chat
    Supabase-->>Dashboard: Return chat record
    Dashboard-->>Extension: Success response
    Extension-->>ContentScript: Show success notification
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
    D --> E[Service worker stores<br/>in chrome.storage.local]
    E --> F[Extension authenticated]
    B -->|No| G[Show error UI]
```

#### Code Reference

**Extension (Service Worker)**:
`apps/extension/src/background/service-worker.js` listens for `setAuthToken`.

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
| `saveToDashboard` | Platform Content Script | Service Worker | Sync conversation |
| `fetchPrompts` | Content Script | Service Worker | Get user prompts (CSP bypass) |

---

## 4. Data Schemas

### 4.1 Chat Sync Payload

**Constraint**: Must match `@brainbox/validation` schema.

```typescript
// See @brainbox/validation/src/chat.ts
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

## 5. Security Considerations

### 5.1 Token Exposure
- **Storage**: `chrome.storage.local` (local only, no sync).
- **Lifetime**: Handled by Supabase expiration. Extension auto-refreshes if possible or prompts re-login.

### 5.2 Content Security Policy (CSP)
- **Manifest V3**: No inline scripts. logic isolated in Service Worker.

---
**Version**: v.2.1.0-beta
