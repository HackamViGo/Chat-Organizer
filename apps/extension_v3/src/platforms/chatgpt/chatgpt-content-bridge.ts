import { logger } from '../../shared/logger';
import type { ExtensionMessage, DashboardPayload } from '../../shared/types';

import { ChatGPTAdapter } from './chatgpt-adapter';
import { extractMessagesFromDOM } from './chatgpt-dom-extractor';

chrome.runtime.onMessage.addListener((request: ExtensionMessage, _sender, sendResponse) => {
  if (request.action !== 'triggerSaveChat' || request.platform !== 'chatgpt') return false;

  logger.info('Received triggerSaveChat for ChatGPT');
  sendResponse({ success: true, message: 'Save initiated' });

  (async () => {
    try {
      const url = window.location.href;
      const conversationId = extractConversationId(url) || `chatgpt_${Date.now()}`;

      // 1. Вземаме токен от background
      const { token } = await chrome.runtime.sendMessage({ action: 'getChatGPTToken' });
      
      let payload: DashboardPayload | null = null;
      
      // 2. Fetch-ваме данните през API (ако има токен)
      if (token && conversationId && !conversationId.startsWith('chatgpt_')) {
        payload = await ChatGPTAdapter.fetchConversation(conversationId, token);
      }

      // 3. Fallback към DOM extraction
      if (!payload) {
        logger.info('Using DOM extraction for ChatGPT');
        const messages = extractMessagesFromDOM();
        payload = {
          conversationId,
          title: document.title,
          messages,
          platform: 'chatgpt',
          url,
          created_at: Date.now(),
          updated_at: Date.now(),
          metadata: { source: 'dom', version: 'v3' }
        };
      }

      // 4. Записваме в Dashboard
      await chrome.runtime.sendMessage({
        action: 'saveToDashboard',
        data: {
          ...payload,
          title: request.title || payload.title,
          url: url
        }
      });

      logger.info('ChatGPT save flow complete');
    } catch (error) {
      logger.error('ChatGPT save flow failed:', error);
    }
  })();

  return true;
});

function extractConversationId(url: string): string | null {
  const match = url.match(/\/c\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}
