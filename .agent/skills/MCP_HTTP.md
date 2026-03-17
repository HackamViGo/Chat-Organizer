# Skill: MCP HTTP — API Testing & Validation

## Purpose
Direct HTTP requests to Dashboard API for contract validation,
auth testing, and endpoint smoke checks.

## When to Use
```
✅ Verify backend route exists and responds correctly
✅ Validate request/response schema matches documentation
✅ Test auth refresh flow end-to-end
✅ Smoke check after backend deployment
✅ Debug extension→dashboard communication issues

❌ NOT for production data modification
❌ NOT for load testing
❌ NOT as replacement for proper integration tests
```

## BrainBox API Endpoints

### Base URLs
```
Development:  http://localhost:3000/api
Production:   https://brainbox-alpha.vercel.app

Headers (required for most endpoints):
  Content-Type: application/json
  Authorization: Bearer <access_token>
  X-Extension-Key: <extension_key_from_config>
```

### Health & Auth Checks

#### Check API is alive
```http
GET /api/folders
Authorization: Bearer <token>
X-Extension-Key: <key>

Expected: 200 { folders: [...] }
Failure:  401 → token expired/invalid
          500 → server error
```

#### Test auth refresh
```http
POST /api/auth/refresh
Content-Type: application/json

Body: { "refreshToken": "<refresh_token>" }

Expected: 200 {
  "accessToken": "new-jwt",
  "refreshToken": "new-refresh",
  "expiresAt": 1700000000
}

Failure: 401 → refresh token invalid/expired
```

### Chat Save Contract

#### Save conversation (extension contract)
```http
POST /api/chats
Authorization: Bearer <token>
X-Extension-Key: <key>
Content-Type: application/json

Body: {
  "title": "Test Chat",
  "content": "[USER]: Hello\n\n[ASSISTANT]: Hi there!",
  "messages": [
    {
      "id": "msg-uuid-1",
      "role": "user",
      "content": "Hello",
      "timestamp": 1700000000000,
      "metadata": {}
    },
    {
      "id": "msg-uuid-2",
      "role": "assistant",
      "content": "Hi there!",
      "timestamp": 1700000001000,
      "metadata": { "model": "gemini-pro" }
    }
  ],
  "platform": "gemini",
  "url": "https://gemini.google.com/app/abc123def456",
  "folder_id": null,
  "tags": ["technology"]
}

Expected: 201 { "id": "uuid", "title": "Test Chat", ... }

Validations:
  - title: string, non-empty
  - messages: array with at least 1 item
  - messages[].role: "user" | "assistant" | "system"
  - messages[].content: string, non-empty
  - platform: one of [chatgpt, claude, gemini, grok, perplexity, deepseek, qwen, lmsys]
  - url: valid URL string
  - folder_id: null or valid UUID
  - tags: array of strings, max 3
```

#### Verify saved chat
```http
GET /api/chats
Authorization: Bearer <token>

Expected: 200 { "chats": [...] }
Check: Most recent chat matches what was saved
```

### Prompt Endpoints

#### Get prompts (for context menu)
```http
GET /api/prompts?use_in_context_menu=true
Authorization: Bearer <token>

Expected: 200 { "prompts": [...] }
```

#### Create prompt
```http
POST /api/prompts
Authorization: Bearer <token>
X-Extension-Key: <key>
Content-Type: application/json

Body: {
  "title": "My Prompt",
  "content": "You are a helpful assistant that...",
  "folder_id": null,
  "use_in_context_menu": true
}

Expected: 201 { "id": "uuid", ... }
```

#### Enhance prompt (AI)
```http
POST /api/ai/enhance-prompt
Authorization: Bearer <token>
X-Extension-Key: <key>
Content-Type: application/json

Body: { "prompt": "write code for sorting" }

Expected: 200 { "enhancedPrompt": "improved text..." }
Timeout: May take 3-10 seconds (AI processing)
```

### User Settings
```http
GET /api/user/settings
Authorization: Bearer <token>
X-Extension-Key: <key>

Expected: 200 {
  "settings": {
    "quickAccessFolders": ["folder-uuid-1", "folder-uuid-2"]
  }
}
```

## Contract Validation Checklist

### For every endpoint, verify:
```
1. □ Correct HTTP method (GET/POST/PUT/DELETE)
2. □ Auth header accepted (Bearer token)
3. □ X-Extension-Key header accepted
4. □ Request body matches documented schema
5. □ Response status code is correct (200/201/401/404/500)
6. □ Response body has expected shape
7. □ Error responses include message field
8. □ 401 response when token is missing
9. □ 401 response when token is expired
10. □ CORS headers allow chrome-extension:// origin
```

## Smoke Test Sequence
```
Run these in order to verify full integration:

1. GET /api/auth/session → verify auth works
2. GET /api/folders → verify basic read
3. POST /api/chats → save test chat
4. GET /api/chats → verify chat appears
5. GET /api/prompts → verify prompt sync
6. POST /api/ai/enhance-prompt → verify AI works
7. GET /api/user/settings → verify settings read

If all 7 pass → extension↔dashboard integration is healthy.
```

## Error Response Patterns
```json
// 401 Unauthorized
{ "error": "Invalid or expired token" }

// 400 Bad Request
{ "error": "Missing required field: title" }

// 404 Not Found
{ "error": "Chat not found" }

// 500 Internal Server Error
{ "error": "Database connection failed" }

// 429 Rate Limited
{ "error": "Too many requests", "retryAfter": 60 }
```

## Debugging Tips
```
Problem: 401 but token looks valid
  → Check token expiry (decode JWT at jwt.io)
  → Check X-Extension-Key matches dashboard .env
  → Check CORS: chrome-extension:// must be allowed

Problem: 500 on POST /api/chats
  → Check Supabase is running
  → Check request body matches schema exactly
  → Check user_id is derived from token (not body)
  → Check RLS policies on chats table

Problem: Empty response from GET /api/folders
  → User may have no folders yet
  → Check user_id matches between auth and data

Problem: CORS error
  → Dashboard API routes must set:
    Access-Control-Allow-Origin: *
    Access-Control-Allow-Headers: Authorization, X-Extension-Key, Content-Type
```
