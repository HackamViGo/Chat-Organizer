const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    console.log('--- Checking http://localhost:5173 ---');
    try {
      await page.goto('http://localhost:5173', { timeout: 5000 });
      console.log('SUCCESS: Connected to http://localhost:5173');
    } catch (e) {
      console.log('FAILED: Cannot connect to http://localhost:5173 - ' + e.message);
    }
    
    console.log('--- Checking http://localhost:3000 ---');
    try {
       await page.goto('http://localhost:3000', { timeout: 5000 });
       console.log('SUCCESS: Connected to http://localhost:3000');
    } catch (e) {
       console.log('FAILED: Cannot connect to http://localhost:3000 - ' + e.message);
    }

    console.log('--- Checking http://localhost:3001 ---');
    try {
       await page.goto('http://localhost:3001', { timeout: 5000 });
       console.log('SUCCESS: Connected to http://localhost:3001');
    } catch (e) {
       console.log('FAILED: Cannot connect to http://localhost:3001 - ' + e.message);
    }

  } finally {
    await browser.close();
  }
})();
