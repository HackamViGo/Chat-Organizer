# Skill: Extension Testing

## 1. Test Architecture

### Three Layers
```text
┌─────────────────────────────────┐
│ E2E (Playwright)                │ ← Real browser, real extension
│ Load extension, navigate,        │
│ right-click, verify save        │
├─────────────────────────────────┤
│ Integration (Vitest)            │ ← Chrome API mocks, real logic
│ Test adapter registry,          │
│ save flow, storage schema       │
├─────────────────────────────────┤
│ Unit (Vitest)                   │ ← Pure functions, no browser
│ Normalizers, schemas,           │
│ rate limiter, URL patterns      │
└─────────────────────────────────┘
```

### What to Test Where

**Unit Tests (fast, no mocks needed):**
- ✅ `normalizers.ts`: Every normalize function with sample data.
- ✅ `schemas.ts`: `createConversation`, `createMessage`.
- ✅ `platformConfig.ts`: URL patterns, storage keys.
- ✅ `rate-limiter.ts`: Scheduling, throttling.
- ✅ **URL regex patterns**: Per-platform ID extraction.
- ✅ **Tag generation**: `getOptimizedTags`.

**Integration Tests (With Chrome API mocks):**
- ✅ `authManager`: Token capture patterns (regex matching).
- ✅ `messageRouter`: Action routing, response contracts.
- ✅ `platformAdapters`: Registry, adapter resolution.
- ✅ **Storage schema**: Key isolation, no collisions.
- ✅ **Save flow**: Full chain from ID extraction to API payload.
- ✅ **Dashboard API contract**: Request/response schema validation.

**E2E Tests (Real browser):**
- ✅ Extension loads without errors.
- ✅ Popup opens and renders.
- ✅ Content script injects on AI platforms.
- ✅ Context menu appears on right-click.
- ✅ Save Chat flow end-to-end (requires test account).

---

## 2. Chrome API Mock Setup

### File: `src/__tests__/setup.ts`

```typescript
import { vi, beforeEach } from 'vitest'

// ============================================
// STORAGE MOCK (Simulates chrome.storage.local)
// ============================================
const storageData: Record<string, unknown> = {}

const storageMock = {
  local: {
    get: vi.fn((keys) => {
      if (keys === null) return Promise.resolve({ ...storageData })
      const arr = typeof keys === 'string' ? [keys] : keys
      const result: Record<string, unknown> = {}
      arr.forEach(k => { if (storageData[k] !== undefined) result[k] = storageData[k] })
      return Promise.resolve(result)
    }),
    set: vi.fn((items) => {
      Object.assign(storageData, items)
      return Promise.resolve()
    }),
    remove: vi.fn((keys) => {
      const arr = typeof keys === 'string' ? [keys] : keys
      arr.forEach(k => delete storageData[k])
      return Promise.resolve()
    }),
  },
  onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
}

// ============================================
// RUNTIME MOCK
// ============================================
const runtimeMock = {
  id: 'test-extension-id',
  sendMessage: vi.fn(() => Promise.resolve({ success: true })),
  onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
  onInstalled: { addListener: vi.fn() },
  lastError: null,
}

// ============================================
// OTHER MOCKS
// ============================================
const tabsMock = {
  create: vi.fn(() => Promise.resolve({ id: 1 })),
  sendMessage: vi.fn(() => Promise.resolve({ success: true })),
  query: vi.fn(() => Promise.resolve([{ id: 1, url: 'https://gemini.google.com/app/abc123' }])),
}

const contextMenusMock = {
  create: vi.fn(),
  removeAll: vi.fn((cb) => cb?.()),
  onClicked: { addListener: vi.fn() },
}

const webRequestMock = {
  onBeforeRequest: { addListener: vi.fn() },
  onBeforeSendHeaders: { addListener: vi.fn() },
}

const alarmsMock = {
  create: vi.fn(),
  get: vi.fn(() => Promise.resolve(null)),
  onAlarm: { addListener: vi.fn() },
}

const scriptingMock = {
  executeScript: vi.fn(() => Promise.resolve([{ result: true }])),
}

// ============================================
// GLOBAL CHROME OBJECT
// ============================================
globalThis.chrome = {
  storage: storageMock,
  runtime: runtimeMock,
  tabs: tabsMock,
  contextMenus: contextMenusMock,
  webRequest: webRequestMock,
  alarms: alarmsMock,
  scripting: scriptingMock,
  notifications: { create: vi.fn() },
} as any

// ============================================
// HELPERS (export for use in tests)
// ============================================
export function resetStorage() {
  Object.keys(storageData).forEach(k => delete storageData[k])
}

export function setStorageData(data: Record<string, unknown>) {
  Object.assign(storageData, data)
}

export function getStorageData() {
  return { ...storageData }
}

export function resetAllMocks() {
  resetStorage()
  vi.clearAllMocks()
}

beforeEach(() => resetAllMocks())
```

## 3. Unit Test Patterns

### Testing Normalizers
```typescript
describe('normalizeChatGPT', () => {
  it('reconstructs linear path from tree', () => {
    const raw = {
      id: 'conv-1',
      title: 'Test',
      current_node: 'node-2',
      mapping: {
        'root': { message: null, parent: null },
        'node-1': {
          message: { id: 'm1', author: { role: 'user' }, content: { parts: ['Hi'] }, create_time: 100 },
          parent: 'root',
        },
        'node-2': {
          message: { id: 'm2', author: { role: 'assistant' }, content: { parts: ['Hello!'] }, create_time: 200 },
          parent: 'node-1',
        },
      },
    }
    const result = normalizeChatGPT(raw)
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].role).toBe('user')
    expect(result.messages[1].role).toBe('assistant')
  })
})
```

### Testing URL Patterns
```typescript
describe('URL extraction', () => {
  const cases = [
    { platform: 'gemini', url: 'https://gemini.google.com/app/abc123', regex: /\/app\/([a-f0-9]+)/, expected: 'abc123' },
    { platform: 'chatgpt', url: 'https://chatgpt.com/c/uuid-here', regex: /\/c\/([a-f0-9-]+)/, expected: 'uuid-here' },
  ]

  cases.forEach(({ platform, url, regex, expected }) => {
    it(`extracts ${platform} ID`, () => {
      const match = url.match(regex)
      expect(match?.[1]).toBe(expected)
    })
  })
})
```

### Testing Token Capture Patterns
```typescript
describe('token capture regex', () => {
  it('extracts Gemini dynamic key', () => {
    const formData = '[[["snX9ne","[...]",null,"generic"]]]'
    const match = formData.match(/"([a-zA-Z0-9]{5,6})",\s*"\[/)
    expect(match?.[1]).toBe('snX9ne')
  })

  it('extracts Claude org_id from URL', () => {
    const url = 'https://claude.ai/api/organizations/org-123/chat_conversations/conv-1'
    const match = url.match(/\/organizations\/([^\/]+)\//)
    expect(match?.[1]).toBe('org-123')
  })
})
```

## 4. Integration Test Patterns

### Testing Storage Schema
```typescript
describe('storage isolation', () => {
  it('platform tokens dont collide', async () => {
    setStorageData({
      gemini_at_token: 'gem-token',
      chatgpt_token: 'Bearer gpt-token',
    })
    const data = await chrome.storage.local.get(['gemini_at_token', 'chatgpt_token'])
    expect(data.gemini_at_token).toBe('gem-token')
    expect(data.chatgpt_token).toBe('Bearer gpt-token')
  })

  it('removing auth doesnt affect platform tokens', async () => {
    setStorageData({ accessToken: 'enc', gemini_at_token: 'gem' })
    await chrome.storage.local.remove(['accessToken'])
    const data = getStorageData()
    expect(data.accessToken).toBeUndefined()
    expect(data.gemini_at_token).toBe('gem')
  })
})
```

### Testing API Contract
```typescript
describe('dashboard API contract', () => {
  it('save payload has required fields', () => {
    const payload = {
      title: 'Test', 
      content: '[USER]: Hi', 
      messages: [{ id: 'm1', role: 'user', content: 'Hi', timestamp: Date.now() }],
      platform: 'gemini', 
      url: 'https://gemini.google.com/app/abc', 
      folder_id: null, 
      tags: ['tech'],
    }
    expect(payload.title).toBeTruthy()
    expect(payload.messages.length).toBeGreaterThan(0)
    expect(['chatgpt','claude','gemini','grok','perplexity','deepseek','qwen','lmsys']).toContain(payload.platform)
    expect(payload.tags.length).toBeLessThanOrEqual(3)
  })
})
```

## 5. E2E Test Patterns (Playwright)

### Loading Extension
```typescript
import { chromium, type BrowserContext } from '@playwright/test'

let context: BrowserContext

test.beforeAll(async () => {
  const extPath = path.resolve(__dirname, '../dist')
  context = await chromium.launchPersistentContext('', {
    headless: false,  // Extensions require headed mode
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
    ],
  })
})
```

### Testing Extension Loads
```typescript
test('service worker starts', async () => {
  let sw = context.serviceWorkers()[0]
  if (!sw) sw = await context.waitForEvent('serviceworker')
  expect(sw).toBeTruthy()
  expect(sw.url()).toContain('service-worker')
})
```

### Testing Popup
```typescript
test('popup renders', async () => {
  const sw = context.serviceWorkers()[0]
  const extId = sw.url().split('/')[2]
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extId}/src/popup/index.html`)
  await page.waitForLoadState('domcontentloaded')
  const body = await page.textContent('body')
  expect(body).toBeTruthy()
})
```

## 6. Test Configuration

### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/popup/**', 'src/types/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@brainbox/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
```

### Running Tests
```bash
pnpm test              # All tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
pnpm test -- --run src/__tests__/unit/normalizers.test.ts  # Single file

# E2E (requires build)
pnpm build && pnpm test:e2e
```

## 7. Common Testing Mistakes

- ❌ **Testing `chrome.storage` directly without mock**: `setup.ts` must run before every test.
- ❌ **Testing content scripts in node environment**: Content scripts touch DOM — use `jsdom` or E2E.
- ❌ **Asserting on timer-dependent behavior**: Use `vi.useFakeTimers()` for `setTimeout`/`setInterval`.
- ❌ **Not resetting mocks between tests**: `beforeEach(() => resetAllMocks())` in `setup.ts`.
- ❌ **Testing Service Worker lifecycle in unit tests**: SW lifecycle is browser-level — use E2E.
- ❌ **Hardcoding URLs in tests**: Use constants from `platformConfig.ts`.