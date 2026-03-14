import { logger } from '../../shared/logger';
import type { ExtensionMessage, DashboardPayload } from '../../shared/types';

import { ClaudeAdapter } from './claude-adapter';
import { extractMessagesFromDOM } from './claude-dom-extractor';

chrome.runtime.onMessage.addListener((request: ExtensionMessage, _sender, sendResponse) => {
  if (request.action !== 'triggerSaveChat' || request.platform !== 'claude') return false;

  logger.info('Received triggerSaveChat for Claude');
  sendResponse({ success: true, message: 'Save initiated' });

  (async () => {
    try {
      const url = window.location.href;
      const conversationId = extractConversationId(url) || `claude_${Date.now()}`;

      // 1. Вземаме orgId от background
      const { orgId } = await chrome.runtime.sendMessage({ action: 'getClaudeOrgId' });
      
      let payload: DashboardPayload | null = null;

      // 2. Fetch-ваме данните през API
      if (orgId && conversationId && !conversationId.startsWith('claude_')) {
        payload = await ClaudeAdapter.fetchConversation(orgId, conversationId);
      }

      // 3. Fallback към DOM extraction
      if (!payload) {
        logger.info('Using DOM extraction for Claude');
        const messages = extractMessagesFromDOM();
        payload = {
          conversationId,
          title: document.title,
          messages,
          platform: 'claude',
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

      logger.info('Claude save flow complete');
    } catch (error) {
      logger.error('Claude save flow failed:', error);
    }
  })();

  return true;
});

function extractConversationId(url: string): string | null {
  const match = url.match(/\/chat\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}
