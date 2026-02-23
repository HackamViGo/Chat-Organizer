const { chromium } = require('playwright');
(async () => {
    // Attempt to use system chromium or fallback
    const browser = await chromium.launch({ headless: true }).catch(async () => {
        console.log('Chromium launch failed, trying with executable path...');
        return await chromium.launch({ 
            headless: true,
            executablePath: '/usr/bin/google-chrome' // Common path on linux
        });
    });
    
    try {
        const page = await browser.newPage();
        console.log('Navigating to http://localhost:3000...');
        await page.goto('http://localhost:3000', { timeout: 10000 });
        
        // Wait for hydration
        await page.waitForTimeout(2000);
        
        console.log('Checking Sidebar classes...');
        const sidebar = await page.locator('aside').first();
        const initialClasses = await sidebar.getAttribute('class');
        console.log('Initial Classes:', initialClasses);
        
        console.log('Toggling Theme...');
        const themeButton = page.locator('button[aria-label*="mode"]').first();
        if (await themeButton.isVisible()) {
            await themeButton.click();
            await page.waitForTimeout(500);
            const afterClasses = await sidebar.getAttribute('class');
            console.log('After Toggle Classes:', afterClasses);
            
            if (initialClasses !== afterClasses) {
                console.log('SUCCESS: Sidebar theme classes changed!');
            } else {
                console.log('WARNING: Sidebar theme classes did not change.');
            }
        } else {
            console.log('ERROR: Theme toggle button not found.');
        }

    } catch (e) {
        console.log('Verification failed:', e.message);
    } finally {
        await browser.close();
    }
})();
