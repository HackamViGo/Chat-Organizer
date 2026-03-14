
const puppeteer = require('puppeteer-core');

async function run() {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    // 1. First, make sure we sync auth on localhost
    console.log('🔄 Syncing extension auth...');
    const dashPage = await browser.newPage();
    await dashPage.goto('http://localhost:3000/extension-auth', { waitUntil: 'networkidle2' });
    // Wait for sync logs
    await new Promise(r => setTimeout(r, 2000));
    await dashPage.close();

    // 2. Find or open Gemini
    let geminiPage = (await browser.pages()).find(p => p.url().includes('gemini.google.com'));

    if (!geminiPage) {
      console.log('🔄 Opening Gemini...');
      geminiPage = await browser.newPage();
      await geminiPage.goto('https://gemini.google.com/app', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log('✅ Target page:', geminiPage.url());

    // 3. Trigger save via postMessage (which our new content script listener will caught)
    console.log('🚀 Triggering BrainBox Save...');
    await geminiPage.evaluate(() => {
        window.postMessage({ type: 'BRAINBOX_TRIGGER_SAVE', platform: 'gemini' }, '*');
    });

    console.log('⏳ Waiting 5s for data processing...');
    await new Promise(r => setTimeout(r, 5000));

    // 4. Verify in Dashboard UI
    console.log('🧐 Checking Dashboard for the new chat...');
    const verifyPage = await browser.newPage();
    await verifyPage.goto('http://localhost:3000/chats', { waitUntil: 'networkidle2' });
    
    // Check if any chat item exists in the sidebar/list
    const chatExists = await verifyPage.evaluate(() => {
        // Look for common Chat List container or items (need to know dashboard structure)
        return document.body.innerText.includes('Untitled Chat') || 
               document.body.innerText.includes('Gemini'); 
    });

    if (chatExists) {
        console.log('🎉 SUCCESS: Chat found in Dashboard!');
    } else {
        console.log('⚠️ Chat not found in initial check. Might be slow or failed.');
    }

    await browser.disconnect();
    process.exit(chatExists ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

run();
