<!-- doc: API_REFERENCE.md | version: 1.0 | last-updated: 2026-02-28 -->
# 🔌 API_REFERENCE.md

## Overview
The API endpoints documented here are maintained inside the standard Next.js `app/api/` route segment within the `dashboard` package. All endpoints operate securely server-side and validate the Bearer JWT from the caller (most frequently the Chrome Extension or Dashboard UI client methods).

### Authentication
Requests matching `/api/*` expect a JWT issued by Supabase in the `Authorization` header.
```
Authorization: Bearer <token>
```
If the token is missing, malformed, or expired, requests yield a `401 Unauthorized`.

---

## Extension Integration Endpoints

These endpoints are commonly consumed by the Chrome extension via `fetch` API bridging `window.postMessage`.

### `POST /api/chat`
Creates a brand new chat capturing conversation history or specific web page contexts.

- **Payload:**
  ```json
  {
     "url": "https://claude.ai/chat/...",
     "title": "Discussing System Architecture",
     "platform": "claude.ai",
     "messages": [ { "role": "user", "content": "..." }, { "role": "assistant", "content": "..." } ],
     "summary": "User discusses system architecture..."
  }
  ```
- **Responses:**
  - `200 OK`: `{"id": "uuid", "message": "Saved successfully"}`
  - `400 Bad Request`: `{"error": "Validation failed"}`

---

## User Data Endpoints

### `GET /api/user/prompts`
Retrieves a list of prompts scoped to the currently authenticated user.

- **Responses:**
  - `200 OK`: Array of Prompt objects (as defined in `packages/shared/src/types`).

### `GET /api/user/folders`
Retrieves a hierarchical array of folder nodes.

- **Responses:**
  - `200 OK`: Array of Folder objects with resolved type attributes.

*Notes*: The Dashboard mostly relies on direct Supabase RPCs and SDK capabilities to fetch data implicitly. Explicit HTTP endpoints are generally meant to bridge the gap for external clients like the Extension plugin script context.
