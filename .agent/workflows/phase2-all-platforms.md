---
description: 
---

# BrainBox v3 — Phase 2: All Platforms

Extend Phase 1 to support ChatGPT, Claude, Grok, Perplexity.
Add network-based capture, offline queue, rate limiting.
All platforms follow the same Gemini pattern from Phase 1.

## Step 1 — Update shared/types.ts

Add to existing types:
- Platform: add chatgpt, claude, grok, perplexity
- Message: add attachments?, images?, model?
- PlatformAuth: add chatgpt, claude, grok, perplexity auth shapes
- QueueItem interface
- Update ExtensionMessage union with all new actions

## Step 2 — Implement network-interceptor.ts

- initNetworkInterceptor() using chrome.webRequest.onBeforeSendHeaders
- Capture ChatGPT Bearer token from Authorization header
- Capture Claude org_id from URL pattern /api/organizations/{id}/
- Add to manifest: "webRequest" permission (now we actually use it)
- Add to host_permissions: chatgpt.com, claude.ai

## Step 3 — Update auth-manager.ts

- Replace single geminiToken with PlatformAuth map
- storePlatformAuth<K>(platform, data)
- getPlatformAuth<K>(platform)
- Convenience getters: getChatGPTToken, getClaudeOrgId

## Step 4 — Implement normalizers (shared/normalizers.ts)

In this order:
1. normalizeChatGPT — tree traversal via current_node → parent links
2. normalizeClaude — linear .map() on chat_messages, sender→role
3. normalizeGemini — deepExtract for Phase 2 network path
Keep each normalizer pure (no side effects, no chrome.* calls)

## Step 5 — Implement platform adapters

For ChatGPT:
- GET https://chatgpt.com/backend-api/conversation/{id}
- Authorization: Bearer header
- Rate limit: 60/min
- Returns: normalizeChatGPT(raw)

For Claude:
- GET https://claude.ai/api/organizations/{orgId}/chat_conversations/{id}
- credentials: include (session cookies)
- Rate limit: 30/min
- Returns: normalizeClaude(raw)

## Step 6 — Implement DOM extractors for new platforms

- chatgpt-dom-extractor.ts — [data-message-author-role] selector
- claude-dom-extractor.ts — .human-turn / .assistant-turn selectors
- grok-dom-extractor.ts — [data-role] selector
- perplexity-dom-extractor.ts — query + answer selectors
NOTE: validate selectors against live pages before finalizing

## Step 7 — Implement content bridges (all follow Gemini pattern)

For each platform (chatgpt, claude, grok, perplexity):
1. Listen for triggerSaveChat with platform filter
2. sendResponse immediately (prevent port timeout)
3. Try network fetch first (if auth available)
4. Fall back to DOM extraction
5. Send saveToDashboard with correct platform field

## Step 8 — Implement sync-queue.ts

- add(payload, folderId)
- getAll()
- remove(id)
- flush(saveFn) — max 3 attempts per item
- initOfflineQueueListener — flush on 'online' event

## Step 9 — Update manifest.json

Add content_scripts for: chatgpt.com, claude.ai, grok.com, perplexity.ai
Add host_permissions for all new platforms
Add "webRequest" back to permissions (now used by network-interceptor)

## Step 10 — Update context-menu.ts

detectPlatform(url) helper
Single context menu item works across all 5 platforms
documentUrlPatterns covers all platform URLs

## Step 11 — Update message-router.ts

Add handlers for:
- storeChatGPTToken, storeClaudeOrgId, storeGrokAuth, storePerplexityAuth
- getChatGPTToken, getClaudeOrgId
- flushSyncQueue
Update saveToDashboard to use SyncQueue when auth missing

## Step 12 — Verify

Run: pnpm --filter apps/extension_v3 test
Run: pnpm --filter apps/extension_v3 build
Test each platform:
- ChatGPT: right-click → Save Chat → check network fetch in console
- Claude: right-click → Save Chat → check org_id was captured
- Grok: right-click → Save Chat → DOM extraction
- Perplexity: right-click → Save Chat → DOM extraction
Disconnect network → Save Chat → reconnect → verify queue flushed
