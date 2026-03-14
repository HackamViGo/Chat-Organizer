---
description: 
---

# BrainBox v3 — Phase 4: DeepSeek, Qwen, LM Arena + Attachments

Add 3 new platforms and enrich all saves with attachments, images, model metadata.
Add Stale-While-Revalidate caching for dashboard data.
Prerequisite: Phase 3 complete.

## Step 1 — Update shared/types.ts

Add to Platform type: 'deepseek' | 'qwen' | 'lmarena'

Add new interfaces:
- Attachment (id, fileName, fileType, fileSize?, url?, base64?, storageRef?)
- MessageImage (id, url, alt?, width?, height?, isGenerated)
- ModelMetadata (platform, modelId, modelLabel?, capturedAt)
- CacheEntry<T> (data, cachedAt, staleAfterMs)

Update Message: add attachments?, images?, model?
Update DashboardPayload: add modelMetadata?, metadata.hasAttachments?, metadata.hasImages?

Update PlatformAuth:
- deepseek: { bearerToken, capturedAt }
- qwen: { xsrfToken, appId?, capturedAt }
- lmarena: { sessionHash, capturedAt }

Update ExtensionMessage:
- storeDeepSeekToken, storeQwenAuth, storeLMArenaSession
- captureModelMetadata, getModelMetadata
- injectLMArenaMainBridge
- getDeepSeekToken, getQwenAuth, getLMArenaSession

## Step 2 — Implement normalizers for new platforms (shared/normalizers.ts)

Add to existing normalizers.ts:

normalizeDeepSeek(raw):
- raw.data.selection_list → Message[]
- role is already 'user'/'assistant' — map directly
- created_at is ISO string → new Date().getTime()

normalizeQwen(raw):
- raw.messages → Message[]
- timestamp is UNIX seconds → multiply by 1000

normalizeLMArena(raw):
- Handle BOTH formats:
  a) Legacy: data[0] is string[] → alternate user/assistant by index
  b) New: data[0] is {is_user, message}[] → map is_user to role
- Title from first user message slice(0, 60)

## Step 3 — Update existing normalizers with attachments

Update normalizeClaude:
- Map msg.attachments[] → Attachment[]
- Map msg.files[] → Attachment[]
- Include in returned Message objects

Update normalizeChatGPT:
- Extract msg.metadata?.model_slug → detectedModel
- Set message.model = detectedModel for assistant messages
- Map msg.content.attachments[] → Attachment[]

## Step 4 — Implement platform adapters (new platforms)

deepseek-adapter.ts:
- GET https://chat.deepseek.com/api/v0/chat_session/get_session?session_id={id}
- Headers: Authorization Bearer, x-client-version: 1.0.0
- credentials: include
- Rate limit: 30/min
- Returns normalizeDeepSeek(raw)

qwen-adapter.ts:
- GET https://chat.qwenlm.ai/api/v1/sessions/{id}/messages
- Headers: X-Xsrf-Token, x-app-id (optional)
- credentials: include
- Rate limit: 30/min
- Returns normalizeQwen(raw)

lmarena-adapter.ts:
- POST https://chat.lmsys.org/run/predict
- Body: { fn_index: 0, data: [sessionId], session_hash: sessionHash }
- Rate limit: 20/min
- Returns normalizeLMArena(raw)

## Step 5 — Implement lmarena-main-bridge.ts (MAIN world — same pattern as Gemini)

IIFE, compiled separately:
- Reads window.gradio_config?.session_hash
- window.postMessage({ type: 'BRAINBOX_LMARENA_SESSION', sessionHash })
- Retry with setInterval, max 20 attempts
- clearInterval on success

## Step 6 — Implement content bridges (all follow Gemini pattern)

deepseek-content-bridge.ts:
- URL pattern: /chat/s/{session_id}
- Get token via getDeepSeekToken message
- Network fetch first, DOM fallback

qwen-content-bridge.ts:
- URL pattern: /c/{session_id}
- Get auth via getQwenAuth message
- Network fetch first, DOM fallback

lmarena-content-bridge.ts:
- Inject MAIN world bridge on load (injectLMArenaMainBridge)
- Listen for BRAINBOX_LMARENA_SESSION from window
- Forward sessionHash to background via storeLMArenaSession
- On triggerSaveChat: get sessionHash, fetch via adapter, DOM fallback

## Step 7 — Implement DOM extractors (fallback for new platforms)

deepseek-dom-extractor.ts — [data-message-id] or [class*="message-content"]
qwen-dom-extractor.ts — [data-role] or [class*="user/assistant-message"]
lmarena-dom-extractor.ts — .message.svelte-* or [data-testid="bot/user"]
NOTE: All selectors need live validation — mark with TODO comments

## Step 8 — Update network-interceptor.ts

Add DeepSeek capture:
- URL pattern: chat.deepseek.com/api/
- Extract Authorization: Bearer header
- Store via AuthManager.storePlatformAuth('deepseek', ...)

Add Qwen capture:
- URL pattern: chat.qwenlm.ai/api/
- Extract X-Xsrf-Token header
- Extract x-app-id header (optional)
- Store via AuthManager.storePlatformAuth('qwen', ...)

## Step 9 — Implement attachment-handler.ts (background/)

- prepareAttachments(attachments) — marks storageRef as undefined (dashboard decides)
- extractImagesFromElement(el) — finds <img> tags, skips SVG icons
- toBase64IfSmall(url) — fetch + FileReader, max 500KB
- isGeneratedImageUrl(url) — checks known CDN domains (DALL-E, Gemini, etc.)

## Step 10 — Implement SWR cache in dashboard-api.ts

Add SWRCache object:
- get<T>(key) → CacheEntry<T> | null
- set<T>(key, data, staleAfterMs)
- isStale(entry) → boolean
- CACHE_PREFIX = 'swr_cache_'
- DEFAULT_STALE_MS = 5 minutes

Add swrFetch<T>(key, fetchFn, staleAfterMs):
- Fresh → return immediately
- Stale → return stale data + revalidate async (fire and forget)
- No cache → fetch + cache + return

Use swrFetch for:
- getFolders() — staleAfterMs: 10 minutes
- getSettings() — staleAfterMs: 30 minutes
Do NOT cache saveConversation (write operation)

## Step 11 — Update manifest.json

Add to host_permissions:
- https://chat.deepseek.com/*
- https://chat.qwenlm.ai/*
- https://chat.lmsys.org/*

Add content_scripts for all 3 new platforms

Add to web_accessible_resources:
- lmarena-main-bridge.js for chat.lmsys.org

Configure lmarena-main-bridge as separate IIFE bundle in vite.config.ts

## Step 12 — Update message-router.ts

Add token storage handlers: storeDeepSeekToken, storeQwenAuth, storeLMArenaSession
Add token getter handlers: getDeepSeekToken, getQwenAuth, getLMArenaSession
Add model metadata handlers: captureModelMetadata, getModelMetadata
Add injectLMArenaMainBridge handler (same pattern as injectGeminiMainBridge)

## Step 13 — Verify

Run: pnpm --filter apps/extension_v3 test -- src/shared/normalizers
Run: pnpm --filter apps/extension_v3 test -- src/background/dashboard-api
Run: pnpm --filter apps/extension_v3 build

Check dist/ — verify lmarena-main-bridge.js exists alongside gemini-main-bridge.js

Manual tests:
- DeepSeek: open chat → right-click → Save Chat → verify network fetch (check bearer token captured)
- Qwen: open chat → right-click → Save Chat → verify XSRF token captured
- LM Arena: open chat → wait for session_hash capture → right-click → Save Chat
- Claude: save chat with PDF attachment → verify attachment in dashboard payload
- ChatGPT: save GPT-4o chat → verify model: 'gpt-4o' in messages
- SWR: open popup twice → second open should NOT make folders API call
