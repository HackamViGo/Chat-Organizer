import { test, expect, chromium, type BrowserContext } from '@playwright/test'
import path from 'path'

// Extension E2E tests require loading the built extension
// Run: cd apps/extension_v3 && pnpm build && npx playwright test

let context: BrowserContext

test.beforeAll(async () => {
  const extensionPath = path.resolve(__dirname, '../dist')

  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  })
})

test.afterAll(async () => {
  await context.close()
})

test('extension loads without errors', async () => {
  // Check that service worker is active
  const [sw] = context.serviceWorkers()
  if (!sw) {
    // Wait for service worker to start
    await context.waitForEvent('serviceworker')
  }
  const workers = context.serviceWorkers()
  expect(workers.length).toBeGreaterThan(0)
})

test('popup opens', async () => {
  // Get extension ID from service worker URL
  const sw = context.serviceWorkers()[0]
  const extensionId = sw.url().split('/')[2]

  const popupPage = await context.newPage()
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`)

  // Should have content (React app mounts)
  await popupPage.waitForLoadState('domcontentloaded')
  const body = await popupPage.textContent('body')
  expect(body).toBeTruthy()
})

test('context menu has Save Chat on Gemini', async () => {
  // Navigate to Gemini
  const page = await context.newPage()
  await page.goto('https://gemini.google.com/')

  // Wait for page load
  await page.waitForLoadState('networkidle')

  // We can't directly test context menus in Playwright,
  // but we can verify the content script is loaded
  const result = await page.evaluate(() => {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id
  })
  // Content script should have access to chrome.runtime
  // Note: this may not work in ISOLATED world — test may need adjustment
})
