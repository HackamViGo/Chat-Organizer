import { chromium } from 'playwright';

const platforms = [
    'https://grok.com',
    'https://www.perplexity.ai'
];

async function checkPlatform(browser, url) {
    console.log(`\nChecking platform: ${url}`);
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => {
        if (msg.text().includes('BrainBox') || msg.text().includes('AuthManager')) {
            console.log(`[CONSOLE][${url}] ${msg.text()}`);
        }
    });

    try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(5000);
        
        const result = await page.evaluate(() => {
            return {
                hasBrainBox: typeof window.BrainBoxUI !== 'undefined',
                brainBoxType: typeof window.BrainBoxUI,
                url: window.location.href,
                localStorage: Object.keys(localStorage).filter(k => k.includes('brainbox'))
            };
        });
        
        console.log(`Result for ${url}:`, JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(`Error checking ${url}:`, e.message);
    } finally {
        await page.close();
    }
}

async function run() {
    console.log('Connecting to existing Chrome on port 9222...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    
    for (const url of platforms) {
        await checkPlatform(browser, url);
    }
    
    await browser.close();
}

run().catch(console.error);
