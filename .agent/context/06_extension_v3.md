# 06 — Extension V3 Architecture

Read this for ANY work on `apps/extension_v3`.

## Non-negotiable Rules
- **Background-first** — all logic in service worker. Content scripts are thin bridges only.
- **No DOM pollution** — no UI injected into platforms. Badge + popup only.
- **Modular per platform** — each platform is isolated. No cross-platform imports.
- **Gemini pattern** — all platforms follow: `content-bridge → adapter → normalizer → saveToDashboard`

## File Structure
```
apps/extension_v3/src/
├── background/        ← service-worker, message-router, auth-manager, dashboard-api, context-menu
├── platforms/
│   ├── gemini/        ← gemini-main-bridge (MAIN world), gemini-content-bridge, gemini-dom-extractor
│   ├── chatgpt/
│   ├── claude/
│   ├── grok/
│   ├── perplexity/
│   ├── deepseek/
│   ├── qwen/
│   ├── lmarena/
│   └── universal/     ← prompt-injector, selection-capture (all platforms)
└── shared/            ← types, storage, logger, config, dedup, tag-generator, ai-enhancer, template-engine
```

## Data Flow (Save)
```
context-menu click
→ triggerSaveChat
→ content-bridge: network fetch (if token) → DOM fallback
→ normalizer (pure, no side effects)
→ tag-generator (local, BG+EN, no API)
→ saveToDashboard → dashboard-api
→ sync-queue if offline (max 3 retries)
```

## Token Capture
| Platform | Method |
|----------|--------|
| Gemini | MAIN world → window.WIZ_global_data['SNlM0e'] |
| ChatGPT | webRequest → Authorization Bearer |
| Claude | webRequest → org_id from URL |
| DeepSeek | webRequest → Authorization Bearer |
| Qwen | webRequest → X-Xsrf-Token |
| LM Arena | MAIN world → window.gradio_config.session_hash |
| Grok | DOM only |
| Perplexity | DOM only |

## MAIN World Bridges
- `gemini-main-bridge.ts` + `lmarena-main-bridge.ts` → compiled as separate IIFE bundles.
- Must be in `web_accessible_resources` in `manifest.json`.
- Communicate via `window.postMessage` only.

## Rate Limits
| Platform | Limit |
|----------|-------|
| ChatGPT | 60/min |
| Claude | 30/min |
| DeepSeek | 30/min |
| Qwen | 30/min |
| Gemini | 20/min |
| Grok | 20/min |
| Perplexity | 20/min |
| LM Arena | 20/min |

## Key Shared Utilities
- `logger.ts` → `logger.info(area, msg, data?)`
- `tag-generator.ts` → pure, local, BG+EN, no API
- `ai-enhancer.ts` → Gemini 1.5 Flash, 7 styles, needs API key
- `template-engine.ts` → `{{variable}}`, `{{#if}}` (no eval)
- `dedup.ts` → prevents duplicate saves
- `sync-queue.ts` → offline queue, max 3 attempts

## Implementation Order
```
/config-consolidation → /phase1-gemini-save → /phase2-all-platforms
→ /phase3-prompt-actions → /phase4-deepseek-qwen-lmarena → /optimizations-sprint1-2
```
Each phase → run `Ctrl+Shift+B → "Verify ALL"` before next phase.
