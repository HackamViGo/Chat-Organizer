import { logger } from '../../shared/logger';
import type { ExtensionMessage, DashboardPayload } from '../../shared/types';

import { GrokAdapter } from './grok-adapter';
import { extractMessagesFromDOM } from './grok-dom-extractor';

chrome.runtime.onMessage.addListener((request: ExtensionMessage, _sender, sendResponse) => {
  if (request.action !== 'triggerSaveChat' || request.platform !== 'grok') return false;

  logger.info('Received triggerSaveChat for Grok');
  sendResponse({ success: true, message: 'Save initiated' });

  (async () => {
    try {
      const url = window.location.href;
      const conversationId = extractConversationId(url) || `grok_${Date.now()}`;

      let payload: DashboardPayload | null = null;

      // 1. Пробваме през Adapter (ако е възможно)
      if (conversationId && !conversationId.startsWith('grok_')) {
        payload = await GrokAdapter.fetchConversation(conversationId);
      }

      // 2. Fallback към DOM extraction
      if (!payload) {
        logger.info('Using DOM extraction for Grok');
        const messages = extractMessagesFromDOM();
        payload = {
          conversationId,
          title: document.title,
          messages,
          platform: 'grok',
          url,
          created_at: Date.now(),
          updated_at: Date.now(),
          metadata: { source: 'dom', version: 'v3' }
        };
      }

      await chrome.runtime.sendMessage({
        action: 'saveToDashboard',
        data: {
          ...payload,
          title: request.title || payload.title,
          url: url
        }
      });

      logger.info('Grok save flow complete');
    } catch (error) {
      logger.error('Grok save flow failed:', error);
    }
  })();

  return true;
});

function extractConversationId(url: string): string | null {
  const match = url.match(/\/chat\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}
