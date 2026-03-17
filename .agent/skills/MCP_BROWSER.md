# Skill: MCP Browser/Playwright — Visual Testing

## Purpose
Load extension in real browser, test UI interactions, verify visual state.

## Setup
```typescript
// Playwright config for extension testing
import { chromium } from '@playwright/test'

const context = await chromium.launchPersistentContext('', {
  headless: false,  // REQUIRED for extensions
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
})
```

## Extension-Specific Patterns

### Get Extension ID
```typescript
const sw = context.serviceWorkers()[0]
  || await context.waitForEvent('serviceworker')
const extensionId = sw.url().split('/')[2]
```

### Navigate to Popup
```typescript
const page = await context.newPage()
await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`)
```

### Test Context Menu (Limitation)
```
Playwright cannot directly interact with Chrome context menus.
Workaround:
  1. Navigate to AI platform
  2. Verify content script loaded
  3. Simulate the message that context menu would send:
     await page.evaluate(() => {
       chrome.runtime.sendMessage({ action: 'triggerSaveChat' })
     })
  4. Verify outcome (check storage or API call)
```

### Test on AI Platforms
```typescript
test('gemini page loads with extension', async () => {
  const page = await context.newPage()
  await page.goto('https://gemini.google.com/')
  await page.waitForLoadState('networkidle')
  
  // Extension should have injected content script
  // Verify by checking for side effects
  // (e.g., Service Worker received storeGeminiToken)
})
```

## Limitations
```
❌ Cannot test in headless mode (extension requirement)
❌ Cannot inspect chrome.storage from Playwright directly
❌ Cannot interact with native Chrome UI (context menus, notifications)
❌ Cannot test Service Worker console logs directly

Workarounds:
  ✅ Use page.evaluate() to read extension state
  ✅ Use API mocks to verify network calls
  ✅ Use storage inspection via chrome.storage.local.get()
  ✅ Screenshot comparison for UI verification
```

## When to Use
```
✅ Verifying extension loads without errors
✅ Testing popup UI renders
✅ Testing content script injection on platforms
✅ End-to-end save flow (with test credentials)
✅ Visual regression testing

❌ NOT for unit testing logic
❌ NOT for testing normalizers
❌ NOT for testing background modules in isolation
```
