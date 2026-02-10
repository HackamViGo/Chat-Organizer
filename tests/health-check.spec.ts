import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const pathToExtension = path.join(process.cwd(), 'apps/extension/dist');

test.describe('Extension Health Check', () => {
    let context: BrowserContext;

    test.beforeEach(async () => {
        context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`,
            ],
        });
    });

    test.afterEach(async () => {
        await context.close();
    });

    test('Service Worker should be active and clean of CORS errors', async ({ page }) => {
        console.log('⏳ Waiting for Service Worker...');
        
        // Wait for SW to appear
        let sw = context.serviceWorkers()[0];
        if (!sw) {
            sw = await context.waitForEvent('serviceworker');
        }
        
        expect(sw).toBeDefined();
        console.log('👷 Service Worker found:', sw.url());

        // Wait for it to be ready
        await page.waitForTimeout(2000);

        // 1. Check for double loading (using evaluation)
        const initCount = await sw.evaluate(() => {
            return (self as any).__BRAINBOX_INIT_COUNT__ || 0;
        });
        
        console.log('📊 Initialization Count:', initCount);
        expect(initCount).toBe(1);

        // 2. HMR Client Fetch Test (Internal check for CORS)
        const fetchResult = await sw.evaluate(async () => {
            try {
                const res = await fetch('http://localhost:5173/@vite/client');
                return { success: res.ok, status: res.status };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        });

        console.log('🧪 HMR Client Fetch Test:', fetchResult);
        expect(fetchResult.success).toBe(true);

        // 3. Verify listeners
        const hasListeners = await sw.evaluate(() => {
            return typeof chrome !== 'undefined' && 
                   chrome.webRequest && 
                   chrome.webRequest.onBeforeSendHeaders.hasListeners();
        });
        
        console.log('🕵️ WebRequest Listeners:', hasListeners);
        expect(hasListeners).toBe(true);
        
        console.log('✅ Clean State Confirmed');
    });
});
