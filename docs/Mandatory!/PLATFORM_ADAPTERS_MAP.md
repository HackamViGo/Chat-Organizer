<!-- doc: PLATFORM_ADAPTERS_MAP.md | version: 1.0 | last-updated: 2026-03-03 | author: DOCS_LIBRARIAN -->

# 📄 PLATFORM_ADAPTERS_MAP.md

## Platform Adapters Map

### ChatGPT Adapter
- **File:** apps/extension/src/background/modules/platformAdapters/chatgpt.adapter.ts
- **URL:** chatgpt.com, chat.openai.com
- **Method:** API Interception (backend-api/conversation/)
- **Extracts:** conversationId, messages[]{role, content}, title (via normalizeChatGPT)
- **Normalizes to:** Chat schema (packages/validation/schemas/chat.ts via normalizeChatGPT function)
- **Requires:** Token from storage (`chatgpt_token`)
- **Known issues:** Token expiration (401 error) requires page refresh.

### Claude Adapter
- **File:** apps/extension/src/background/modules/platformAdapters/claude.adapter.ts
- **URL:** claude.ai
- **Method:** API Interception (`api/organizations/{org_id}/chat_conversations/{id}`)
- **Extracts:** conversationId, messages[]{role, content}, title (via normalizeClaude)
- **Normalizes to:** Chat schema (packages/validation/schemas/chat.ts via normalizeClaude function)
- **Requires:** Organization ID (`claude_org_id`), Session Cookie
- **Known issues:** Claude Organization ID not found requires page refresh.

### DeepSeek Adapter
- **File:** apps/extension/src/background/modules/platformAdapters/deepseek.adapter.ts
- **URL:** chat.deepseek.com
- **Method:** API Interception (`api/v0/chat_session/get_session`)
- **Extracts:** sessionId, title, messages[]{role, content}, created_at, updated_at
- **Normalizes to:** Chat schema (packages/validation/schemas/chat.ts - internal normalization)
- **Requires:** Bearer JWT (`deepseek_token`)
- **Known issues:** Token expiration (401 error) requires page refresh.

### Gemini Adapter
- **File:** apps/extension/src/background/modules/platformAdapters/gemini.adapter.ts
- **URL:** gemini.google.com
- **Method:** API Interception (complex `batchexecute` with `f.req` and `at` parameters)
- **Extracts:** conversationId, messages[]{role, content}, title (via normalizeGemini)
- **Normalizes to:** Chat schema (packages/validation/schemas/chat.ts via normalizeGemini function)
- **Requires:** Gemini AT token (`gemini_at_token`), Gemini Dynamic Key (`gemini_dynamic_key`)
- **Known issues:** Token/key expiration (400/403 errors) requires re-sync or opening a conversation. Complex response parsing.

### Grok Adapter
- **File:** apps/extension/src/background/modules/platformAdapters/grok.adapter.ts
- **URL:** x.com/i/grok*, grok.com
- **Method:** API Interception (`api/1.1/grok/history.json`)
- **Extracts:** conversationId, messages[]{sender, message/text, timestamp}, created_at, updated_at
- **Normalizes to:** Chat schema (packages/validation/schemas/chat.ts - internal normalization)
- **Requires:** Session Cookie (`grok_auth_token`), X-CSRF-Token (`grok_csrf_token`)
- **Known issues:** Session expiration (401/403 errors) requires page refresh. Titles are often derived from first user message.

### LM Arena Adapter
- **File:** apps/extension/src/background/modules/platformAdapters/lmarena.adapter.ts
- **URL:** chat.lmsys.org, arena.ai
- **Method:** API Interception (Gradio `/run/predict` endpoint) or DOM Scraping (arena.ai)
- **Extracts:** sessionId, messages[]{role, content}, title
- **Normalizes to:** Chat schema (packages/validation/schemas/chat.ts - internal normalization)
- **Requires:** Gradio Session Hash (`lmarena_session_hash`), Gradio Function Index (`lmarena_fn_index`)
- **Known issues:** Complex Gradio API, requires specific session parameters. Titles often derived from first user message.

### Perplexity Adapter
- **File:** apps/extension/src/background/modules/platformAdapters/perplexity.adapter.ts
- **URL:** www.perplexity.ai
- **Method:** API Interception (`rest/threads/{slug}`)
- **Extracts:** threadSlug, messages[]{role, content, created_at}, title, query
- **Normalizes to:** Chat schema (packages/validation/schemas/chat.ts - internal normalization)
- **Requires:** Session Cookie (`perplexity_session`)
- **Known issues:** API endpoints change frequently. Session expiration (401/403 errors) requires page refresh.

### Qwen Adapter
- **File:** apps/extension/src/background/modules/platformAdapters/qwen.adapter.ts
- **URL:** chat.qwenlm.ai
- **Method:** API Interception (`api/v1/sessions/{id}/messages`)
- **Extracts:** sessionId, messages[]{role, content, timestamp}, title, session_name
- **Normalizes to:** Chat schema (packages/validation/schemas/chat.ts - internal normalization)
- **Requires:** X-Xsrf-Token (`qwen_xsrf_token`), X-App-ID (`qwen_app_id`)
- **Known issues:** Session expiration (401/403 errors) requires page refresh. Titles often derived from session name or first user message.

---

## Comparison Table

| Платформа | Метод | Надеждност | Известни проблеми |
|-----------|-------|-----------|-------------------|
| ChatGPT   | API Interception | High      | Token expiration requires page refresh. |
| Claude    | API Interception | High      | Organization ID missing requires page refresh. |
| DeepSeek  | API Interception | Medium    | Token expiration requires page refresh. |
| Gemini    | API Interception | Medium    | Token/key expiration, complex parsing. |
| Grok      | API Interception | Medium    | Session expiration, titles often inferred. |
| LM Arena  | API Interception/DOM Scraping | Medium    | Complex Gradio API, session data sometimes missing. |
| Perplexity| API Interception | Medium    | API endpoints change frequently, session expiration. |
| Qwen      | API Interception | Medium    | Session expiration, titles often inferred. |
