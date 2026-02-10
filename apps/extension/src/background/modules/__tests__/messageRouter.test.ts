/**
 * MessageRouter Test Suite
 * 
 * Tests all message actions:
 * - Auth: setAuthToken, checkDashboardSession, syncAll
 * - Prompts: fetchPrompts, syncPrompts
 * - Gemini: injectGeminiMainScript, storeGeminiToken
 * - Folders: getUserFolders
 * - Conversations: getConversation, saveToDashboard
 * - Misc: openLoginPage
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies BEFORE any other imports
vi.mock('../authManager');
vi.mock('../dashboardApi', () => ({
  __esModule: true,
  getUserFolders: vi.fn(),
  saveToDashboard: vi.fn(),
  getUserSettings: vi.fn(),
  enhancePrompt: vi.fn()
}));

vi.mock('../platformAdapters', () => ({
  __esModule: true,
  fetchConversation: vi.fn(),
  getAdapter: vi.fn()
}));

vi.mock('@brainbox/shared/logic/promptSync', () => ({
  __esModule: true,
  PromptSyncManager: vi.fn().mockImplementation(() => ({
    sync: vi.fn().mockResolvedValue({ success: true }),
    getAllPrompts: vi.fn().mockResolvedValue([])
  }))
}));

import { MessageRouter } from '../messageRouter';
import { AuthManager } from '../authManager';
import { resetAllMocks } from '@/__tests__/setup';
import * as dashboardApi from '../dashboardApi';
import * as platformAdapters from '../platformAdapters';

console.debug('[DEBUG] platformAdapters mock state:', typeof platformAdapters.fetchConversation);

describe('MessageRouter', () => {
  let messageRouter: MessageRouter;
  let mockAuthManager: any;
  let mockPromptSync: any;
  let mockSender: chrome.runtime.MessageSender;
  let sendResponse: any;

  beforeEach(() => {
    resetAllMocks();

    // Reset and configure dashboardApi mocks
    vi.mocked(dashboardApi.getUserFolders).mockReset().mockResolvedValue([]);
    vi.mocked(dashboardApi.saveToDashboard).mockReset().mockResolvedValue({ id: 'chat-123' });
    
    // Reset and configure platformAdapters mocks
    vi.mocked(platformAdapters.fetchConversation).mockReset().mockResolvedValue({
      id: 'conv-123',
      title: 'Test Chat',
      platform: 'chatgpt',
      messages: []
    } as any);

    mockAuthManager = {
      setDashboardSession: vi.fn().mockResolvedValue(undefined),
      isSessionValid: vi.fn().mockResolvedValue(true),
      checkAuth: vi.fn().mockResolvedValue(true),
      getAuthToken: vi.fn().mockResolvedValue('fake-token'),
      syncAll: vi.fn().mockResolvedValue({ isValid: true, tokens: {} })
    };

    mockPromptSync = {
      sync: vi.fn().mockResolvedValue({ success: true }),
      getAllPrompts: vi.fn().mockResolvedValue([
        { id: '1', title: 'Test Prompt', content: 'Test' }
      ])
    };

    messageRouter = new MessageRouter(mockAuthManager, mockPromptSync, true);
    
    mockSender = {
      id: chrome.runtime.id,
      tab: { id: 123, windowId: 1 } as any
    };

    sendResponse = vi.fn();
  });

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  describe('listen()', () => {
    it('should register message listener', () => {
      messageRouter.listen();

      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // AUTH ACTIONS
  // ========================================================================

  describe('setAuthToken', () => {
    it('should store tokens and trigger prompt sync', async () => {
      const request = {
        action: 'setAuthToken',
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: Date.now() + 3600000,
        rememberMe: true
      };

      const result = (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      expect(result).toBe(true); // Async response

      await vi.waitFor(() => {
        expect(mockAuthManager.setDashboardSession).toHaveBeenCalledWith({
          accessToken: 'access-123',
          refreshToken: 'refresh-456',
          expiresAt: request.expiresAt,
          rememberMe: true
        });
        expect(mockPromptSync.sync).toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
      });
    });

    it('should handle auth errors', async () => {
      mockAuthManager.setDashboardSession.mockRejectedValue(new Error('Auth failed'));

      const request = {
        action: 'setAuthToken',
        accessToken: 'invalid'
      };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith({
          success: false,
          error: 'Auth failed'
        });
      });
    });
  });

  describe('checkDashboardSession', () => {
    it('should return session validity', async () => {
      const request = { action: 'checkDashboardSession' };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(mockAuthManager.checkAuth).toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          isValid: true
        });
      });
    });
  });

  describe('syncAll', () => {
    it('should sync auth and prompts', async () => {
      const request = { action: 'syncAll' };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(mockAuthManager.syncAll).toHaveBeenCalled();
        expect(mockPromptSync.sync).toHaveBeenCalledWith(true);
        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          isValid: true,
          tokens: {}
        });
      });
    });
  });

  // ========================================================================
  // PROMPT ACTIONS
  // ========================================================================

  describe('fetchPrompts', () => {
    it('should return all prompts', async () => {
      const request = { action: 'fetchPrompts' };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(mockPromptSync.getAllPrompts).toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ id: '1', title: 'Test Prompt' })
          ])
        });
      });
    });
  });

  describe('syncPrompts', () => {
    it('should trigger prompt sync', async () => {
      const request = { action: 'syncPrompts' };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(mockPromptSync.sync).toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
      });
    });
  });

  // ========================================================================
  // GEMINI ACTIONS
  // ========================================================================

  describe('injectGeminiMainScript', () => {
    it('should inject script into active tab', async () => {
      const request = { action: 'injectGeminiMainScript' };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
          target: { tabId: 123 },
          world: 'MAIN',
          files: ['src/content/inject-gemini-main.ts']
        });
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
      });
    });

    it('should handle missing tab gracefully', async () => {
      const request = { action: 'injectGeminiMainScript' };
      const senderNoTab = {};

      (messageRouter as any).handleMessage(request, senderNoTab, sendResponse);

      await vi.waitFor(() => {
        expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
      });
    });
  });

  describe('storeGeminiToken', () => {
    it('should store token in storage', async () => {
      const request = {
        action: 'storeGeminiToken',
        token: 'AT-gemini-token-xyz'
      };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          gemini_at_token: 'AT-gemini-token-xyz'
        });
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
      });
    });

    it('should handle missing token', async () => {
      const request = { action: 'storeGeminiToken' };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(chrome.storage.local.set).not.toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
      });
    });
  });

  // ========================================================================
  // CONVERSATION ACTIONS
  // ========================================================================

  describe('getConversation', () => {
    it('should fetch conversation from platform', async () => {
      const request = {
        action: 'getConversation',
        platform: 'chatgpt',
        conversationId: 'conv-123',
        url: 'https://chatgpt.com/c/conv-123'
      };

      const platformAdapters = await import('../platformAdapters');

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(platformAdapters.fetchConversation).toHaveBeenCalledWith(
          'chatgpt',
          'conv-123',
          'https://chatgpt.com/c/conv-123',
          undefined
        );
        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({ id: 'conv-123' })
        });
      });
    });
  });

  describe('saveToDashboard', () => {
    it('should save conversation to dashboard', async () => {
      const dashboardApi = await import('../dashboardApi');

      const request = {
        action: 'saveToDashboard',
        data: {
          id: 'conv-123',
          title: 'Test Chat',
          messages: [],
          platform: 'chatgpt'
        },
        folderId: 'folder-1',
        silent: false
      };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(dashboardApi.saveToDashboard).toHaveBeenCalledWith(
          request.data,
          'folder-1',
          false
        );
        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          result: { id: 'chat-123' }
        });
      });
    });

    it('should handle token expiry and trigger re-auth flow', async () => {
      vi.mocked(dashboardApi.saveToDashboard).mockRejectedValueOnce(new Error('Unauthorized'));

      const request = {
        action: 'saveToDashboard',
        data: { id: 'conv-123', platform: 'chatgpt' }
      };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ 
          success: false,
          error: 'Unauthorized'
        }));
      });
    });
  });

  // ========================================================================
  // FOLDER ACTIONS
  // ========================================================================

  describe('getUserFolders', () => {
    it('should fetch user folders', async () => {
      const dashboardApi = await import('../dashboardApi');
      dashboardApi.getUserFolders = vi.fn().mockResolvedValue([
        { id: '1', name: 'Work' },
        { id: '2', name: 'Personal' }
      ]);

      const request = { action: 'getUserFolders' };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(dashboardApi.getUserFolders).toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          folders: expect.arrayContaining([
            expect.objectContaining({ name: 'Work' })
          ])
        });
      });
    });
  });

  // ========================================================================
  // MISC ACTIONS
  // ========================================================================

  describe('openLoginPage', () => {
    it('should open login page in new tab', async () => {
      const request = { action: 'openLoginPage' };

      (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      await vi.waitFor(() => {
        expect(chrome.tabs.create).toHaveBeenCalledWith({
          url: expect.stringContaining('/auth/signin?redirect=/extension-auth')
        });
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
      });
    });
  });

  // ========================================================================
  // UNKNOWN ACTIONS
  // ========================================================================

  describe('Unknown action', () => {
    it('should return false for unknown actions', () => {
      const request = { action: 'unknownAction' };

      const result = (messageRouter as any).handleMessage(request, mockSender, sendResponse);

      expect(result).toBe(false);
      expect(sendResponse).not.toHaveBeenCalled();
    });
  });
});
