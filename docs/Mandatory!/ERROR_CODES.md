<!-- doc: ERROR_CODES.md | version: 1.0 | last-updated: 2026-02-28 -->
# 🛑 ERROR_CODES.md

To standardize error detection globally across `apps/dashboard`, `apps/extension`, and custom logic inside `packages/shared`, rely on the established error codes defined below.

## Authentication & Authorization

| Code | HTTP Status | Description | Action/Resolution |
|------|-------------|-------------|--------|
| `AUTH_001` | 401 | Missing Token | Provide a valid Bearer JWT. Flow redirects user to `/login` |
| `AUTH_002` | 401 | Invalid or Expired Token | Clear invalid tokens and trigger an auth refresh |
| `AUTH_003` | 403 | RLS Policy Violation | Ensure `user_id` constraints match the entity requested |

## Input Validation

| Code | HTTP Status | Description | Action/Resolution |
|------|-------------|-------------|--------|
| `VAL_001` | 400 | Missing Required Fields | Check payload against `packages/validation/schemas` |
| `VAL_002` | 400 | Invalid Format | Specifically occurs when UUID fields fail parsed parsing checks |
| `VAL_003` | 400 | Payload Too Large | Payload size exceeds configured proxy or NextJS limits |

## Extension Sync Issues

| Code | Context | Description | Action/Resolution |
|------|---------|-------------|--------|
| `EXT_001` | `postMessage` | Disconnected Client | Usually indicates background worker paused. Requires tab refresh |
| `EXT_002` | `DOM` | Element Hook Failed | Extension UI injection target changed in the external DOM. Check origin application updates |

## AI Processing Failures

| Code | HTTP Status | Description | Action/Resolution |
|------|-------------|-------------|--------|
| `AI_001` | 503 | Rate Limit Exceeded | API quota exceeded. Fallback to cached responses or alert user |
| `AI_002` | 500 | Engine Unreachable | Provider API (Gemini/OpenAI) is down. Retry with exponential backoff |
| `AI_003` | 400 | Token Limit Overflow | Context length too large. Trim input array sizes |

*(This log is dynamically appended based on newly tracked errors during sprints. See `SECURITY.md` for mitigation strategies.)*
