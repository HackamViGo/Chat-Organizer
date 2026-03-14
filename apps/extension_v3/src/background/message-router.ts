import { logger } from '../shared/logger';
import { Storage } from '../shared/storage';
import type { ExtensionMessage } from '../shared/types';

import { AuthManager } from './auth-manager';
import { DashboardAPI } from './dashboard-api';
import { NotificationManager } from './notifications';
import { SyncQueue } from './sync-queue';

export function initMessageRouter() {
  chrome.runtime.onMessage.addListener((
    request: ExtensionMessage,
    _sender,
    sendResponse
  ) => {
    switch (request.action) {
      // Token storage
      case 'storeGeminiToken':
        AuthManager.storePlatformAuth('gemini', { atToken: request.token, capturedAt: Date.now() });
        sendResponse({ success: true });
        return false;

      case 'storeChatGPTToken':
        AuthManager.storePlatformAuth('chatgpt', { bearerToken: request.token, capturedAt: Date.now() });
        sendResponse({ success: true });
        return false;

      case 'storeClaudeOrgId':
        AuthManager.storePlatformAuth('claude', { orgId: request.orgId, capturedAt: Date.now() });
        sendResponse({ success: true });
        return false;

      case 'storeGrokAuth':
        AuthManager.storePlatformAuth('grok', {
          csrfToken: request.csrfToken,
          sessionCookie: request.sessionCookie,
          capturedAt: Date.now()
        });
        sendResponse({ success: true });
        return false;

      case 'storeDashboardAuth':
        (async () => {
          await Storage.set('dashboardAuthToken', request.accessToken);
          if (request.refreshToken) await Storage.set('dashboardRefreshToken', request.refreshToken);
          if (request.expiresAt) await Storage.set('dashboardTokenExpiresAt', request.expiresAt);
          logger.info('Dashboard auth stored successfully');
          sendResponse({ success: true });
        })();
        return true;

      case 'storePerplexityAuth':
        AuthManager.storePlatformAuth('perplexity', {
          csrfToken: request.csrfToken,
          sessionCookie: request.sessionCookie,
          capturedAt: Date.now()
        });
        sendResponse({ success: true });
        return false;

      // Token getters (за content bridges)
      case 'getChatGPTToken':
        (async () => {
          const token = await AuthManager.getChatGPTToken();
          sendResponse({ token });
        })();
        return true;

      case 'getClaudeOrgId':
        (async () => {
          const orgId = await AuthManager.getClaudeOrgId();
          sendResponse({ orgId });
        })();
        return true;

      case 'saveToDashboard':
        (async () => {
          logger.info('Saving to dashboard...', request.data.conversationId);
          const authToken = await DashboardAPI.getUserAuthToken();

          if (!authToken) {
            // Не е логнат — добави в queue, не губи данните
            logger.warn('Not authenticated, queuing save');
            await SyncQueue.add(request.data, request.folderId ?? null);
            sendResponse({ success: false, error: 'Not authenticated, queued' });
            return;
          }

          const result = await DashboardAPI.saveConversation(
            request.data,
            request.folderId ?? null,
            authToken
          );

          if (result.success) {
            logger.info('Successfully saved conversation:', result.id);
            NotificationManager.notifySaveSuccess();
          } else if (result.error?.includes('Queued')) {
            logger.info('Save queued:', result.error);
            NotificationManager.notifyQueued();
          } else {
            logger.warn('Failed to save:', result.error);
            NotificationManager.notifySaveError();
          }
          sendResponse(result);
        })();
        return true;

      // Queue flush
      case 'flushSyncQueue':
        (async () => {
          const authToken = await DashboardAPI.getUserAuthToken();
          if (!authToken) {
            sendResponse({ success: false });
            return;
          }
          await SyncQueue.flush(async (payload, folderId) =>
            DashboardAPI.saveConversation(payload, folderId, authToken)
          );
          sendResponse({ success: true });
        })();
        return true;

      case 'getAuthStatus':
        (async () => {
          const token = await DashboardAPI.getUserAuthToken();
          sendResponse({ authenticated: !!token });
        })();
        return true;

      case 'injectGeminiMainBridge':
        // Handled directly in service-worker.ts for simplicity
        return false;

      default:
        return false;
    }
  });

  logger.info('Message router initialized');
}
