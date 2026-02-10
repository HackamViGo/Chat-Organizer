import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

test('Extension Service Worker Health Check', async () => {
  const extensionPath = path.resolve(__dirname, '../dist');
  
  const context = await chromium.launchPersistentContext('', {
    headless: false, // Extension loading requires non-headless usually, but we are in a virtual environment
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  // 1. Check Service Worker status
  let backgroundPage = context.serviceWorkers()[0];
  if (!backgroundPage) {
    backgroundPage = await context.waitForEvent('serviceworker');
  }

  expect(backgroundPage).toBeDefined();
  console.log('✅ Service Worker detected');

  // 2. Check for console errors
  const errors: string[] = [];
  context.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Give it some time to initialize
  await new Promise(r => setTimeout(r, 2000));

  // Assert no "onBeforeSendHeaders" or "TypeError" in logs
  const critErrors = errors.filter(e => e.includes('onBeforeSendHeaders') || e.includes('TypeError'));
  
  if (critErrors.length > 0) {
    console.error('❌ Critical errors found in SW console:', critErrors);
  }
  
  expect(critErrors.length).toBe(0);
  console.log('✅ No critical SW errors detected');

  await context.close();
});
