---
description: 
---

# BrainBox v3 — Optimizations (Sprint 1 & 2)

Implement P0 and P1 optimizations from OPTIMIZATION_PLAN.md.
Prerequisite: All 4 phases complete and working.

## SPRINT 1 — P0 (Foundation)

### Save: Deduplication

Create shared/dedup.ts:
- isDuplicate(conversationId, platform) → checks chrome.storage.local key `saved_{platform}_{id}`
- markAsSaved(conversationId, platform, dashboardId) → stores result

In message-router.ts, case 'saveToDashboard':
- Call isDuplicate BEFORE saving
- If duplicate: sendResponse({ success: false, error: 'duplicate', existingId })
- If not duplicate: save, then call markAsSaved with returned dashboardId

### Save: Status badge (no DOM)

In message-router.ts after successful save:
- chrome.action.setBadgeText({ text: '✓', tabId: sender.tab.id })
- chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId: sender.tab.id })
- setTimeout 3000ms → chrome.action.setBadgeText({ text: '' })

On save error:
- chrome.action.setBadgeText({ text: '!', tabId: sender.tab.id })
- chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId: sender.tab.id })
- setTimeout 3000ms → clear

### Enhance: Multiple styles

Create shared/enhance-styles.ts:
- EnhanceStyle type: 'clarity' | 'detailed' | 'concise' | 'professional' | 'creative' | 'technical' | 'step-by-step'
- STYLE_PROMPTS record with a system prompt for each style
- PLATFORM_CONTEXT record for platform-aware enhancement
- enhanceWithStyle(text, style, apiKey, platform?) function

Update ai-enhancer.ts to use STYLE_PROMPTS from enhance-styles.ts
Update message-router.ts enhancePrompt case to accept style param

### Enhance: History and undo

Create shared/enhance-history.ts:
- EnhanceHistoryEntry interface (id, original, enhanced, style, platform, appliedAt, accepted)
- add(entry) — stores in chrome.storage.local 'enhanceHistory', max 50 entries
- getRecent(limit) → EnhanceHistoryEntry[]
- getSuccessfulStyles(platform) → EnhanceStyle[] sorted by accept rate

Update message-router.ts:
- After enhancePrompt returns result, store in history with accepted: false
- Add new action 'markEnhanceAccepted' → sets accepted: true for given id

### Inject: Replace execCommand

Update platforms/universal/prompt-injector.ts:
- injectIntoContentEditable() using window.getSelection() + createTextNode
  - el.focus()
  - createRange + selectNodeContents for replace mode
  - createTextNode(text) + insertNode
  - Move cursor after inserted text
  - Dispatch: input, change, InputEvent with data
- injectIntoTextarea() using nativeValueSetter
  - Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
  - setSelectionRange to end
  - Dispatch: input, change, keyup events

Add appendToExisting option:
- ContentEditable: place cursor at end, prepend '\n\n' to text
- Textarea: append to existing value with '\n\n' separator

Test on: ChatGPT, Claude, Gemini — all 3 must accept text injection reliably

### Inject: Template variables

Create shared/template-engine.ts:
- parseTemplateVariables(content) → string[]
- fillTemplate(template, variables) → string
- renderTemplate(content, context) — with {{#if}} conditional support (safe, no eval)
- BUILT_IN_TEMPLATES array (minimum: explain-concept, code-review, translate, summarize)

## SPRINT 2 — P1 (Core Features)

### Save: Quick search in popup

Create shared/search-index.ts:
- SearchableConversation interface
- updateSearchIndex(conv) — prepend to 'conversationIndex', max 200 entries
- searchLocalCache(query) → SearchableConversation[] top 10

Call updateSearchIndex in message-router.ts after successful saveToDashboard

In popup — add search input that calls searchLocalCache on keyup with debounce 200ms
Show results as clickable list (opens dashboard URL in new tab)

### Save: Export

Create background/exporter.ts:
- exportConversation(conversation, format: 'json' | 'markdown' | 'txt') → string
- Markdown format: title + platform + date + URL + messages with 👤/🤖 prefixes
- downloadExport(conversationId, format) using chrome.downloads.download

Add to popup: export button with format selector (JSON / Markdown / TXT)
Add to context menu: "BrainBox: Export Chat" for all platforms

### Enhance: Streaming response

Add to ai-enhancer.ts:
- enhancePromptStream(text, style, apiKey) → AsyncGenerator<string>
- Uses streamGenerateContent endpoint
- Reads response.body as ReadableStream
- Yields text chunks as they arrive

In popup enhance UI: show streaming text as it builds up
Only finalize history entry when stream completes

### Enhance: Platform-aware

In enhance-styles.ts add PLATFORM_CONTEXT:
- chatgpt: "Optimize for ChatGPT - role-playing, step-by-step, explicit format"
- claude: "Optimize for Claude - XML tags, explicit reasoning, structured thinking"
- gemini: "Optimize for Gemini - specific, factual, multimodal context"
- deepseek: "Optimize for DeepSeek - technical precision, reasoning chains"

Pass current platform from content bridge to enhancePrompt message

### Inject: Keyboard shortcut

Add to manifest.json commands:
```json
"commands": {
  "quick-inject": {
    "suggested_key": { "default": "Ctrl+Shift+P", "mac": "Command+Shift+P" },
    "description": "Open BrainBox Prompt Quick-Pick"
  }
}
```

In service-worker.ts:
- chrome.commands.onCommand listener for 'quick-inject'
- Send 'openQuickPick' to active tab

In prompt-injector.ts:
- Listen for 'openQuickPick'
- Show inline overlay with searchable prompt list
- Arrow keys to navigate, Enter to inject, Escape to close

## Verify Sprint 1

Run: pnpm --filter apps/extension_v3 test
Run: pnpm --filter apps/extension_v3 build

Manual:
- Save same chat twice → second save shows duplicate warning
- Save chat → ✓ badge appears for 3 seconds on extension icon
- Right-click selection → Enhance → choose 'detailed' style → verify different output than 'clarity'
- Inject prompt in Claude → verify Selection API used (check DevTools, no execCommand)
- Create template with {{topic}} → fill variable → inject

## Verify Sprint 2

Manual:
- Type in popup search → results appear from local index without API call
- Context menu → Export Chat → Markdown file downloads
- Enhance with streaming → text appears progressively in popup
- Ctrl+Shift+P on ChatGPT → quick-pick overlay appears
