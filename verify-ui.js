const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        
        console.log('--- Checking Ports ---');
        const ports = [5173, 3000, 3001, 3002, 3003];
        for (const port of ports) {
            try {
                const response = await page.goto(`http://127.0.0.1:${port}`, { timeout: 2000 });
                console.log(`[127.0.0.1:${port}] ${response ? 'SUCCESS' : 'NO RESPONSE'}`);
            } catch (e) {
                console.log(`[127.0.0.1:${port}] FAILED: ${e.message}`);
            }
            try {
                const response = await page.goto(`http://localhost:${port}`, { timeout: 2000 });
                console.log(`[localhost:${port}] ${response ? 'SUCCESS' : 'NO RESPONSE'}`);
            } catch (e) {
                console.log(`[localhost:${port}] FAILED: ${e.message}`);
            }
        }

        console.log('\n--- Checking Theme Logic ---');
        // We know dashboard is on 3003 (from previous logs)
        try {
            await page.goto('http://localhost:3003');
            // Wait for hydration
            await page.waitForTimeout(2000);
            
            const sidebarClass = await page.evaluate(() => document.querySelector('aside')?.className);
            console.log('Sidebar Classes (Initial):', sidebarClass);
            
            // Toggle theme
            await page.click('button[aria-label*="mode"]');
            await page.waitForTimeout(500);
            
            const sidebarClassAfter = await page.evaluate(() => document.querySelector('aside')?.className);
            console.log('Sidebar Classes (After Toggle):', sidebarClassAfter);
            
            if (sidebarClass !== sidebarClassAfter) {
                console.log('SUCCESS: Theme class changed in sidebar');
            } else {
                console.log('WARNING: Theme class did NOT change in sidebar');
            }
        } catch (e) {
            console.log('Theme Test FAILED:', e.message);
        }

    } finally {
        await browser.close();
    }
})();
