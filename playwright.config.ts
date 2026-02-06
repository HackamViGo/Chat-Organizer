import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const extensionPath = path.join(process.cwd(), 'apps/extension/dist');

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    expect: {
        timeout: 5000
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: 'html',
    use: {
        trace: 'on-first-retry',
        headless: false,
        launchOptions: {
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`
            ]
        }
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
            },
        }
    ],
});
