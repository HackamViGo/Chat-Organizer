---
description: 
---

# BrainBox v3 — Phase 3: Prompt Actions Engine

Add tag generation, AI enhance, selection capture, prompt inject, prompt library.
Prerequisite: Phase 2 complete and all 5 platforms saving successfully.

## Step 1 — Update shared/types.ts

Add:
- Prompt interface (id, title, content, tags, createdAt, updatedAt, dashboardId?)
- SelectionCapture interface
- TagResult interface
- EnhanceStyle type (7 styles: clarity, detailed, concise, professional, creative, technical, step-by-step)
- Update ExtensionMessage with: enhancePrompt, getPromptLibrary, savePrompt, injectPrompt, captureSelection, generateTags

## Step 2 — Implement tag-generator.ts (background/)

Pure function, no API calls, works offline:
- BG_STOPWORDS and EN_STOPWORDS sets
- ROLE_WEIGHT map (user: 2.0, assistant: 1.0, system: 0.5)
- bgStem() and enStem() simple suffix strippers
- detectLanguage() — cyrillic vs latin char count
- extractWords() — strips code blocks, URLs, inline code FIRST
- generateTags(title, messages) → TagResult
- TECH_BOOST_TERMS for x1.5 score on technical words

## Step 3 — Integrate tags into save flow

In message-router.ts, case 'saveToDashboard':
- Call generateTags(payload.title, payload.messages)
- Add tags to enrichedPayload before saving
- Tags must appear in DashboardPayload sent to API

## Step 4 — Implement ai-enhancer.ts (shared/)

- STYLE_PROMPTS record for all 7 EnhanceStyle values
- PLATFORM_CONTEXT for platform-aware enhancement
- enhanceWithStyle(text, style, apiKey, platform?) → Promise<string | null>
- Use gemini-1.5-flash model
- temperature: 0.3, maxOutputTokens: 1000
- Return ONLY the improved prompt (enforce in system prompt)

## Step 5 — Implement prompt-library.ts (background/)

- getAll() → Prompt[]
- save(prompt) → Prompt (generates id, timestamps)
- delete(id)
- syncFromDashboard(dashboardUrl, authToken)
- initPeriodicSync() — every 5 minutes

## Step 6 — Implement selection-capture.ts (platforms/universal/)

- mouseup listener with 200ms debounce
- detectCurrentPlatform() from hostname
- Minimum 10 chars to capture
- sendMessage captureSelection to background
- Inject on ALL 5 platform pages

## Step 7 — Implement prompt-injector.ts (platforms/universal/)

Replace execCommand with Selection API:
- injectIntoContentEditable() using window.getSelection() + createTextNode
- injectIntoTextarea() using React-compatible nativeValueSetter
- Support appendToExisting option
- Trigger input + change + keyup events for framework compatibility
- Inject on ALL 5 platform pages

## Step 8 — Implement template engine (shared/template-engine.ts)

- parseTemplateVariables(content) → string[] from {{varName}} syntax
- fillTemplate(template, variables) → string
- PromptTemplate interface with variables[] array
- BUILT_IN_TEMPLATES: explain-concept, code-review (minimum 2)

## Step 9 — Update context-menu.ts

Add:
- "BrainBox: Save Selection" — contexts: ['selection'], all pages
- "BrainBox: Enhance This Prompt" — contexts: ['selection'], all pages
- "BrainBox: Inject Prompt" parent — contexts: ['editable'], platform pages
- refreshInjectMenu(prompts) — rebuilds submenu with up to 10 prompts

## Step 10 — Update manifest.json

Add universal content_scripts:
- selection-capture.js
- prompt-injector.js
Matches: all 5 platform URLs

## Step 11 — Update message-router.ts

Add handlers for:
- enhancePrompt → reads geminiApiKey from storage, calls AIEnhancer
- getPromptLibrary → PromptLibrary.getAll()
- savePrompt → PromptLibrary.save() + refreshInjectMenu()
- captureSelection → store in recentSelections (max 20)
- generateTags → generateTags() utility

## Step 12 — Verify

Run: pnpm --filter apps/extension_v3 test -- src/shared/tag-generator
Run: pnpm --filter apps/extension_v3 test -- src/shared/ai-enhancer
Run: pnpm --filter apps/extension_v3 test -- src/shared/template-engine
Run: pnpm --filter apps/extension_v3 build

Manual tests:
- Select text on any platform → right-click → "Save Selection" → check recentSelections
- Right-click on chat input → "Inject Prompt" → submenu shows saved prompts
- Save a chat → verify tags appear in dashboard
- Context menu → "Enhance This Prompt" → verify Gemini API called (needs API key in settings)
