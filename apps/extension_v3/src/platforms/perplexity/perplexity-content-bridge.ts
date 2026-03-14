import { logger } from '../../shared/logger';
import type { ExtensionMessage, DashboardPayload } from '../../shared/types';

import { PerplexityAdapter } from './perplexity-adapter';
import { extractMessagesFromDOM } from './perplexity-dom-extractor';

chrome.runtime.onMessage.addListener((request: ExtensionMessage, _sender, sendResponse) => {
  if (request.action !== 'triggerSaveChat' || request.platform !== 'perplexity') return false;

  logger.info('Received triggerSaveChat for Perplexity');
  sendResponse({ success: true, message: 'Save initiated' });

  (async () => {
    try {
      const url = window.location.href;
      const slug = extractSlug(url) || `perp_${Date.now()}`;

      let payload: DashboardPayload | null = null;

      // 1. Пробваме през Adapter
      if (slug && !slug.startsWith('perp_')) {
        payload = await PerplexityAdapter.fetchThread(slug);
      }

      // 2. Fallback към DOM extraction
      if (!payload) {
        logger.info('Using DOM extraction for Perplexity');
        const messages = extractMessagesFromDOM();
        payload = {
          conversationId: slug,
          title: document.title,
          messages,
          platform: 'perplexity',
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

      logger.info('Perplexity save flow complete');
    } catch (error) {
      logger.error('Perplexity save flow failed:', error);
    }
  })();

  return true;
});

function extractSlug(url: string): string | null {
  const match = url.match(/\/search\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
