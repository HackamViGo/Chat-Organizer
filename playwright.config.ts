import { defineConfig, devices } from '@playwright/test';
import path from 'path';

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
        headless: false, // Extensions only working in headed mode usually
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Load extension
                launchOptions: {
                    args: [
                        `--disable-extensions-except=${path.join(process.cwd(), 'extension')}`,
                        `--load-extension=${path.join(process.cwd(), 'extension')}`
                    ]
                }
            },
        }
    ],
});
