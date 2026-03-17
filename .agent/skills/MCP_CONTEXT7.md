# Skill: MCP Context7 — Documentation Lookup

## Purpose
Real-time documentation lookup for libraries and frameworks.
Replaces guessing and hallucination with verified API references.

## When to Use
```
ALWAYS use Context7 before:
  ✅ Using a Chrome Extension API you're unsure about
  ✅ Implementing a Vite/CRXJS config option
  ✅ Writing Supabase RLS policies
  ✅ Using a React 18 hook pattern
  ✅ Writing Playwright test assertions
  ✅ Configuring Vitest

NEVER guess:
  ❌ chrome.webRequest event signatures
  ❌ Manifest V3 permission requirements
  ❌ Supabase auth methods
  ❌ Tailwind v4 syntax (different from v3!)
```

## Usage Pattern
```
Step 1: Resolve library ID
  use_mcp_tool context7 resolve-library-id { "libraryName": "chrome-extension-mv3" }

Step 2: Get documentation
  use_mcp_tool context7 get-library-docs {
    "context7CompatibleLibraryID": "/library-id",
    "topic": "webRequest onBeforeSendHeaders",
    "tokens": 5000
  }
```

## Common Lookups for BrainBox

### Chrome Extension APIs
```
Library: "chrome-extension" or "chrome-types"
Topics:
  - "chrome.webRequest.onBeforeSendHeaders"
  - "chrome.storage.local get set"
  - "chrome.scripting.executeScript world MAIN"
  - "chrome.contextMenus.create"
  - "chrome.alarms.create periodInMinutes"
  - "chrome.runtime.onMessage addListener sendResponse"
  - "chrome.tabs.sendMessage"
  - "manifest v3 content_scripts run_at"
  - "manifest v3 web_accessible_resources"
  - "manifest v3 permissions host_permissions"
```

### Vite + CRXJS
```
Library: "@crxjs/vite-plugin"
Topics:
  - "crx manifest configuration"
  - "content script hmr"
  - "web accessible resources"
  - "service worker build"

Library: "vite"
Topics:
  - "resolve alias configuration"
  - "build rollupOptions input"
  - "define config plugins"
```

### Supabase
```
Library: "supabase-js"
Topics:
  - "auth getSession"
  - "auth refreshSession"
  - "rpc call"
  - "insert upsert"
  - "row level security policies"
  - "realtime subscribe"
```

### React 18
```
Library: "react"
Topics:
  - "useEffect cleanup"
  - "useSyncExternalStore"
  - "Suspense with data fetching"
  - "concurrent features"
```

### Vitest
```
Library: "vitest"
Topics:
  - "vi.mock global"
  - "vi.fn mockResolvedValue"
  - "beforeEach setup"
  - "coverage v8 provider"
  - "workspace config"
```

### Playwright
```
Library: "playwright"
Topics:
  - "browser context extensions"
  - "chromium launchPersistentContext"
  - "page evaluate"
  - "service workers"
  - "test fixtures"
```

### Tailwind v4
```
Library: "tailwindcss"
Topics:
  - "css import syntax v4"
  - "@theme block"
  - "design tokens"
  - "dark mode"
```

## Error Handling
```
If Context7 returns no results:
  1. Try alternative library name (e.g., "chrome" vs "chrome-extension")
  2. Broaden the topic (e.g., "webRequest" instead of "onBeforeSendHeaders")
  3. Fall back to general knowledge BUT mark it:
     "⚠️ Context7 unavailable — using cached knowledge"
```

## Caching Strategy
```
After a successful lookup:
  - Store the key finding in your response
  - Reference it if the same topic comes up again in the session
  - Don't re-query for the same API in the same task
```
