const puppeteer = require('puppeteer-core');

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const targets = browser.targets();
  const extTarget = targets.find(t => t.url().includes('chrome-extension://'));
  if (!extTarget) { console.error('Service worker not found in CDP'); process.exit(1); }
  
  const extUrl = extTarget.url();
  const extId = new URL(extUrl).hostname;
  
  const popupPage = await browser.newPage();
  await popupPage.goto(`chrome-extension://${extId}/src/popup/index.html`, {waitUntil: 'domcontentloaded'});
  const debugInfo = await popupPage.evaluate(async () => {
     try {
       const token = await new Promise(r => chrome.storage.local.get('dashboardAuthToken', res => r(res.dashboardAuthToken)));
       const db = await new Promise(r => chrome.storage.local.get('brainbox_sync_queue', res => r(res.brainbox_sync_queue)));
       const gemLogs = await new Promise(r => chrome.storage.local.get(null, res => r(Object.keys(res))));
       
       return {
         hasToken: !!token,
         tokenSnippet: token ? token.substring(0, 20) + '...' : null,
         syncQueueLength: db ? db.length : 0,
         syncQueue: db,
         allKeys: gemLogs
       };
     } catch(e) {
       return e.message;
     }
  });

  console.dir(debugInfo, {depth: null});
  await browser.disconnect();
  process.exit(0);

  console.dir(debugInfo, {depth: null});
  
  // also check if any network requests to /api/conversations failed
  // we can't easily intercept past requests, but we know if it's queued.

  await browser.disconnect();
  process.exit(0);
}

run().catch(console.error);
