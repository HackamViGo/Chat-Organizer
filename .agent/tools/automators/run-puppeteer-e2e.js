const puppeteer = require('puppeteer-core');

async function run() {
  console.log('Connecting to Chrome...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  
  console.log('Syncing Extension Auth before test...');
  const authPage = await browser.newPage();
  await authPage.goto('http://localhost:3000/extension-auth', {waitUntil: 'networkidle0'});
  console.log('Waiting 3 seconds for token sync...');
  await new Promise(r => setTimeout(r, 3000));
  console.log('Auth Page final URL:', authPage.url());
  await authPage.close();

  const pages = await browser.pages();
  let geminiPage = pages.find(p => p.url().includes('gemini.google.com/app'));
  if (!geminiPage) {
     console.log('Gemini page not found natively. Trying to bring to front and find...');
     geminiPage = await browser.newPage();
     await geminiPage.goto('https://gemini.google.com/app');
  } else {
     await geminiPage.bringToFront();
  }
  
  geminiPage.on('console', msg => console.log('[TAB LOG]', msg.text()));
  
  console.log('Wait 2 seconds for safe load...');
  await new Promise(r => setTimeout(r, 2000));
  await geminiPage.screenshot({path: 'gemini-test-screenshot.png'});
  console.log('Saved gemini-test-screenshot.png');
  
  const targets = browser.targets();
  const extTarget = targets.find(t => t.url().includes('chrome-extension://') && t.type() === 'service_worker') 
                 || targets.find(t => t.url().includes('service-worker.js') || t.url().includes('extension'));
                 
  if (!extTarget) {
     console.error('Extension service worker not found! Active domains:', targets.map(t => t.url()).join('\\n'));
     process.exit(1);
  }
  const sw = await extTarget.worker();
  if(!sw) {
      console.error('Service worker not registered correctly, cannot proceed');
      process.exit(1);
  }
  sw.on('console', msg => console.log('[SW LOG]', msg.text()));
  
  console.log('Triggering Save Chat via extension background...');
  const res = await sw.evaluate(async () => {
     return new Promise((resolve) => {
         chrome.tabs.query({url: '*://gemini.google.com/*'}, (tabs) => {
             const tab = tabs[0];
             if (!tab) return resolve('No active gemini tab found according to chrome.tabs');
             chrome.tabs.sendMessage(tab.id, {
                 action: 'triggerSaveChat',
                 platform: 'gemini',
                 url: tab.url,
                 title: tab.title || 'Automated Chat'
             }, (r) => resolve(r));
         });
     });
  });
  console.log('Extension Context Response:', res);
  
  console.log('Initiated Save. Waiting 5s for dashboard sync...');
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('Opening Dashboard to verify...');
  const dashboardPage = await browser.newPage();
  await dashboardPage.goto('http://localhost:3000/studio', {waitUntil: 'networkidle0', timeout: 30000});
  
  await new Promise(r => setTimeout(r, 3000));
  const savedChats = await dashboardPage.evaluate(() => {
     const elements = document.querySelectorAll('a');
     return Array.from(elements).filter(a => a.href.includes('/chats/') || a.href.includes('/studio')).map(e => e.textContent.trim()).filter(t => t.length > 3);
  });
  
  console.log('Dashboard sidebar items containing chats:');
  console.dir(savedChats.slice(0, 10));
  
  await browser.disconnect();
  console.log('TEST COMPLETE!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
