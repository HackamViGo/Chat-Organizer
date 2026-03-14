import { logger } from '../shared/logger';

import { AuthManager } from './auth-manager';
import { initMessageRouter } from './message-router';
import { initNetworkInterceptor } from './network-interceptor';
import './context-menu'; // Self-registering side-effects

// Init
(async () => {
  await AuthManager.init();
  initMessageRouter();
  initNetworkInterceptor();
  logger.info('Service Worker initialized (Phase 2)');
})();

// Inject MAIN world script for Gemini
chrome.runtime.onMessage.addListener((request, sender, _sendResponse) => {
  if (request.action !== 'injectGeminiMainBridge') return;
  if (!sender.tab?.id) return;

  chrome.scripting.executeScript({
    target: { tabId: sender.tab.id },
    files: ['src/platforms/gemini/gemini-main-bridge.js'],
    world: 'MAIN'
  }).then(() => {
    logger.info(`Successfully injected gemini-main-bridge into tab ${sender.tab?.id}`);
  }).catch((err) => {
    logger.error('Failed to inject gemini-main-bridge:', err);
  });
});
