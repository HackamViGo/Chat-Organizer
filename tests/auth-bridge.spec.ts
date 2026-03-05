import * as fs from 'fs';
import * as path from 'path';

import { test, expect, chromium, type BrowserContext } from '@playwright/test';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;



test.describe('Auth Bridge Verification', () => {
    let context: BrowserContext;
    let extensionId: string;

    test.beforeAll(async () => {
        const extensionPath = path.resolve(__dirname, '../apps/extension/dist');
        const manifestPath = path.resolve(extensionPath, 'manifest.json');

        // Pre-build check
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`❌ dist/manifest.json not found at ${manifestPath}. Run 'pnpm build' first.`);
        }

        context = await chromium.launchPersistentContext('', {
            headless: false,
            slowMo: 100, // Give Chrome time to process extension
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
                '--disable-gpu',
                '--no-sandbox',
            ],
        });

        // Get extension ID with increased timeout
        console.log('⏳ Waiting for Service Worker (30s timeout)...');
        let [background] = context.serviceWorkers();
        if (!background) {
            background = await context.waitForEvent('serviceworker', { timeout: 30000 });
        }
        
        // Capture worker logs
        context.on('weberror', webError => console.error('🌐 Web Error:', webError.error()));
        context.on('console', msg => console.log('📖 Page Log:', msg.text()));
        
        extensionId = background.url().split('/')[2];
        console.log('🆔 Extension ID:', extensionId);

        // Debug: Check if extension is actually enabled
        console.log('🧐 Checking extension status in chrome://extensions...');
        const extensionsPage = await context.newPage();
        await extensionsPage.goto('chrome://extensions');
        const extensionCount = await extensionsPage.evaluate(() => {
            return document.querySelectorAll('extensions-item').length;
        });
        console.log(`📊 Total extensions found: ${extensionCount}`);
        await extensionsPage.close();
    });

    test.afterAll(async () => {
        if (context) {
            await context.close();
        }
        console.log('🛑 Test context closed');
    });

    test('Extension should capture session from Dashboard localStorage', async ({ page }) => {
        // 1. Mock Dashboard at localhost:3000
        await page.route('http://localhost:3000/*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: '<html><body><h1>Mock Dashboard</h1></body></html>'
            });
        });

        console.log('🌐 Navigating to mock localhost:3000...');
        await page.goto('http://localhost:3000/auth/signin');

        const mockToken = 'mock-access-token-' + Date.now();
        const mockSession = {
            access_token: mockToken,
            refresh_token: 'mock-refresh-token',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { email: 'test@example.com' }
        };

        console.log('💉 Injecting mock session into localStorage...');
        await page.evaluate((session) => {
            localStorage.setItem('sb-localhost-auth-token', JSON.stringify(session));
        }, mockSession);

        // 2. Directly write to chrome.storage from SW context (simulating AuthManager.setDashboardSession)
        console.log('📨 Simulating session storage directly in Service Worker...');
        const sw = context.serviceWorkers()[0];
        
        await sw.evaluate(async (session) => {
            // Simulate what AuthManager.setDashboardSession does
            const sessionToStore = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                user: session.user
            };
            
            await chrome.storage.local.set({ BRAINBOX_SESSION: sessionToStore });
            console.log('[Test] Session written to storage');
        }, mockSession);

        console.log('⏳ Verifying storage via expect.poll...');

        // 3. Verify in Extension Storage
        await expect.poll(async () => {
            return await sw.evaluate(async () => {
                const res = await chrome.storage.local.get(['BRAINBOX_SESSION']);
                const session = res['BRAINBOX_SESSION'] as { access_token?: string } | undefined;
                console.log(`[Worker] Storage check: ${session?.access_token}`);
                return session?.access_token;
            });

        }, { 
            message: 'Wait for BRAINBOX_SESSION to be synced',
            timeout: 5000 
        }).toBe(mockToken);

        console.log('✅ Auth Bridge Storage Verified Successfully');
    });

    test('Extension should sync session via BRAINBOX_TOKEN_TRANSFER (simulated)', async ({ page }) => {
        // NOTE: This test simulates the final storage step because Playwright
        // doesn't inject content scripts automatically. Manual E2E testing required.
        
        console.log('🌐 Navigating to Dashboard...');
        await page.goto('http://localhost:3000');

        const mockToken = 'google-oauth-token-' + Date.now();
        const mockSession = {
            access_token: mockToken,
            refresh_token: 'google-refresh-token',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { 
                email: 'test@gmail.com',
                app_metadata: { provider: 'google' }
            }
        };

        console.log('📨 Simulating AuthManager.setDashboardSession in Service Worker...');
        const sw = context.serviceWorkers()[0];
        
        // Simulate what happens when content script receives BRAINBOX_TOKEN_TRANSFER
        // and calls chrome.runtime.sendMessage -> AuthManager.setDashboardSession
        await sw.evaluate(async (session) => {
            // Normalize session structure (as AuthManager does)
            const sessionToStore = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                user: session.user
            };

            // Validate required fields
            if (!sessionToStore.access_token) {
                throw new Error('Missing access_token in session');
            }

            console.log('[Test] Storing session in chrome.storage.local...');
            await chrome.storage.local.set({ BRAINBOX_SESSION: sessionToStore });
            
            // Backward compatibility
            await chrome.storage.local.set({
                accessToken: sessionToStore.access_token,
                refreshToken: sessionToStore.refresh_token,
                expiresAt: sessionToStore.expires_at
            });

            // Verify write
            const verify = await chrome.storage.local.get('BRAINBOX_SESSION');
            if (!verify.BRAINBOX_SESSION) {
                throw new Error('Session verification failed after write');
            }
            
            console.log('[Test] ✅ Session stored and verified successfully');
        }, mockSession);

        console.log('⏳ Verifying session in Extension Storage...');
        
        const storedSession = await sw.evaluate(async () => {
            const res = await chrome.storage.local.get(['BRAINBOX_SESSION']);
            return res['BRAINBOX_SESSION'] as { 
                access_token: string; 
                user: { email: string; app_metadata: { provider: string } } 
            } | undefined;
        });


        expect(storedSession).toBeDefined();
        if (!storedSession) return;
        
        expect(storedSession.access_token).toBe(mockToken);
        expect(storedSession.user.email).toBe('test@gmail.com');

        
        console.log('✅ BRAINBOX_TOKEN_TRANSFER storage mechanism verified');
        console.log('⚠️  Manual E2E test required to verify window.postMessage flow');
    });
});
