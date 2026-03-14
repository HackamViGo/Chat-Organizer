import { logger } from '../../shared/logger';
import type { ExtensionMessage, ConversationRecord } from '../../shared/types';

import { extractMessagesFromDOM } from './gemini-dom-extractor';

// Inject MAIN world script upon load
chrome.runtime.sendMessage({ action: 'injectGeminiMainBridge' }).catch(() => {
  logger.warn('Failed to request injection of gemini-main-bridge. Extension context might be invalidated.');
});

// Listen for token from MAIN world
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'BRAINBOX_GEMINI_TOKEN') {
    const runtimeId = chrome?.runtime?.id;
    if (!runtimeId) return;

    chrome.runtime.sendMessage({
      action: 'storeGeminiToken',
      token: event.data.token
    }).catch((e) => {
      logger.warn('Failed to store Gemini token', e);
    });
  }

  // Automation trigger
  if (event.data?.type === 'BRAINBOX_TRIGGER_SAVE') {
    window.dispatchEvent(new CustomEvent('brainbox-trigger-save', {
      detail: { platform: event.data.platform || 'gemini' }
    }));
  }
});

// Listen for the custom event to avoid scope issues
window.addEventListener('brainbox-trigger-save', (event: any) => {
  const platform = event.detail.platform;
  logger.info('Save triggered via DOM event for', platform);

  // Call the internal trigger logic
  triggerSave(platform);
});

async function triggerSave(platform: string) {
  try {
    const url = window.location.href;
    const conversationId = extractConversationId(url) ?? `gemini_${Date.now()}`;
    const title = document.title ?? 'Untitled Chat';

    // DOM extraction is the primary path for Phase 1
    const messages = extractMessagesFromDOM();

    await chrome.runtime.sendMessage({
      action: 'saveToDashboard',
      data: {
        conversationId,
        title,
        url,
        platform,
        timestamp: Date.now(),
        messages,
        synced: false,
        created_at: Date.now(),
        updated_at: Date.now(),
        metadata: { source: 'dom', version: 'v3', automated: true }
      },
      folderId: null
    });

    logger.info('Save flow complete');
  } catch (error) {
    logger.error('Save flow failed:', error);
  }
}

// Listen for save trigger from background (context menu click)
chrome.runtime.onMessage.addListener((request: ExtensionMessage, _sender, sendResponse) => {
  if (request.action !== 'triggerSaveChat') return false;

  logger.info('Received triggerSaveChat');

  // Respond immediately to prevent Chrome message port timeout
  sendResponse({ success: true, message: 'Save initiated' });

  // Async save flow
  triggerSave(request.platform || 'gemini');

  return true; // async response
});

function extractConversationId(url: string): string | null {
  const match = url.match(/\/app\/([a-f0-9]+)/);
  return match ? match[1] : null;
}
