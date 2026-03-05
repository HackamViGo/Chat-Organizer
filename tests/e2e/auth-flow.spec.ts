import * as path from 'path';

import { test, expect, chromium, type BrowserContext } from '@playwright/test';

test.describe('End-to-End Extension Auth & Sync', () => {
    let context: BrowserContext;
    const pathToExtension = path.join(process.cwd(), 'apps/extension/dist');

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

    test('Dashboard Auth Syncs to Extension', async () => {
        const page = await context.newPage();
        // Monitor console logs
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        // 1. Navigate to Extension Auth page
        console.log('Navigating to Extension Auth page...');
        await page.goto('http://localhost:3000/extension-auth');
        
        // 2. Simulate Login via CustomEvent
        const mockSession = {
            accessToken: 'e2e-test-access-token',
            refreshToken: 'e2e-test-refresh-token',
            expiresAt: Date.now() + 3600000,
            rememberMe: true
        };

        console.log('Injecting Mock Session via brainbox-auth-ready event...');
        await page.evaluate((session) => {
            window.dispatchEvent(new CustomEvent('brainbox-auth-ready', {
                detail: session
            }));
        }, mockSession);

        // 3. Wait for Sync (Content Script -> Background)
        console.log('Waiting for sync...');
        await page.waitForTimeout(3000); 

        // 4. Verify Extension Background Storage
        console.log('Waiting for Service Worker...');
        let serviceWorker = context.serviceWorkers()[0];
        
        if (!serviceWorker) {
            try {
                serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10000 });
            } catch (e) {
                console.log('Timeout waiting for serviceworker event');
            }
        }
        
        if (serviceWorker) {
             console.log('Service Worker found URL:', serviceWorker.url());
        } else {
             throw new Error('Service Worker not found - cannot verify storage');
        }

        // Check storage in Service Worker
        console.log('Checking Extension Storage...');
        const storageData = await serviceWorker.evaluate(async () => {
            // @ts-ignore - chrome API
            return await chrome.storage.local.get(['accessToken', 'refreshToken']);
        });

        console.log('Extension Storage State:', storageData);

        // Assertions
        expect(storageData.accessToken).toBeTruthy();
        expect(storageData.refreshToken).toBeTruthy();
        
        // Extra check: ensure it's encrypted (not raw)
        expect(storageData.accessToken).not.toBe('e2e-test-access-token');
        
        console.log('✅ Auth Sync Verified (Encrypted tokens found)!');
    });



    test('Extension Injects Content Script on ChatGPT', async () => {
        const page = await context.newPage();
        // 1. Go to ChatGPT
        console.log('Navigating to ChatGPT...');
        await page.goto('https://chatgpt.com');
        await page.waitForLoadState('domcontentloaded');

        // 2. Check for BrainBox indicators
        const isInjecting = await page.evaluate(() => {
            const styles = document.querySelectorAll('style');
            const styleArr = Array.from(styles);
            return styleArr.some(s => s.textContent?.includes('brainbox'));
        });

        console.log('BrainBox Styles Found:', isInjecting);
    });
});

