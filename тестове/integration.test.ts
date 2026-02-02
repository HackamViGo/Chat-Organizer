/**
 * Integration Tests - End-to-End Flows
 * 
 * Tests complete user journeys:
 * 1. Login → Save Chat → Verify Storage
 * 2. Login → Create Prompt → Inject Prompt
 * 3. Token Expiry → Re-auth → Resume Action
 * 4. Network Observer → Platform Adapter → Dashboard API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthManager } from '../authManager';
import { MessageRouter } from '../messageRouter';
import { NetworkObserver } from '../networkObserver';
import { ChatGPTAdapter } from '../platformAdapters/chatgpt.adapter';
import { resetAllMocks } from '../../__tests__/setup';
import * as dashboardApi from '../dashboardApi';

vi.mock('../dashboardApi');

describe('Integration Tests - End-to-End Flows', () => {
  let authManager: AuthManager;
  let networkObserver: NetworkObserver;
  let messageRouter: MessageRouter;

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();

    authManager = new AuthManager();
    networkObserver = new NetworkObserver(false);
    
    const mockPromptSync = {
      sync: vi.fn().mockResolvedValue({ success: true }),
      getAllPrompts: vi.fn().mockResolvedValue([])
    };

    messageRouter = new MessageRouter(authManager, mockPromptSync as any, false);
  });

  // ========================================================================
  // FLOW 1: Complete Save Chat Flow
  // ========================================================================

  describe('Flow 1: Login → Capture Token → Save Chat', () => {
    it('should complete full ChatGPT save flow', async () => {
      // STEP 1: User logs in via dashboard
      const loginRequest = {
        action: 'setAuthToken',
        accessToken: 'dashboard-access-token',
        refreshToken: 'dashboard-refresh-token',
        expiresAt: Date.now() + 3600000,
        rememberMe: true
      };

      let sendResponse = vi.fn();
      messageRouter['handleMessage'](loginRequest, { tab: { id: 1 } } as any, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
      });

      // Verify tokens stored
      let storage = (chrome.storage.local as any)._getInternalStorage();
      expect(storage.accessToken).toBe('dashboard-access-token');

      // STEP 2: ChatGPT token captured from network
      authManager.initialize();
      
      const mockChatGPTRequest = {
        requestHeaders: [
          { name: 'Authorization', value: 'Bearer sk-chatgpt-token-abc' }
        ]
      };

      authManager.handleChatGPTHeaders(mockChatGPTRequest);

      await vi.waitFor(() => {
        storage = (chrome.storage.local as any)._getInternalStorage();
        expect(storage.chatgpt_token).toBe('Bearer sk-chatgpt-token-abc');
      });

      // STEP 3: User triggers save from context menu
      global.fetch = vi.fn()
        // First call: Fetch conversation from ChatGPT
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            conversation_id: 'conv-integration-123',
            title: 'Integration Test Chat',
            create_time: Date.now(),
            mapping: {
              'msg-1': {
                message: {
                  id: 'msg-1',
                  author: { role: 'user' },
                  content: { parts: ['Test message'] },
                  create_time: Date.now()
                }
              }
            }
          })
        });

      (dashboardApi.saveToDashboard as any).mockResolvedValue({
        id: 'saved-conv-123',
        success: true
      });

      const getConvRequest = {
        action: 'getConversation',
        platform: 'chatgpt',
        conversationId: 'conv-integration-123'
      };

      sendResponse = vi.fn();
      messageRouter['handleMessage'](getConvRequest, { tab: { id: 1 } } as any, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            id: 'conv-integration-123',
            platform: 'chatgpt'
          })
        });
      });

      // STEP 4: Conversation saved to dashboard
      const conversation = sendResponse.mock.calls[0][0].data;
      
      const saveRequest = {
        action: 'saveToDashboard',
        data: conversation,
        folderId: null,
        silent: false
      };

      sendResponse = vi.fn();
      messageRouter['handleMessage'](saveRequest, { tab: { id: 1 } } as any, sendResponse);

      await vi.waitFor(() => {
        expect(dashboardApi.saveToDashboard).toHaveBeenCalledWith(
          expect.objectContaining({
            platform: 'chatgpt',
            title: 'Integration Test Chat'
          }),
          null,
          false
        );

        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          result: { id: 'saved-conv-123', success: true }
        });
      });
    });
  });

  // ========================================================================
  // FLOW 2: Claude Network Observer → Save
  // ========================================================================

  describe('Flow 2: Claude Org ID Discovery → Save Chat', () => {
    it('should capture org_id and save Claude chat', async () => {
      // STEP 1: Setup auth
      await authManager.setDashboardSession({
        accessToken: 'dashboard-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        rememberMe: false
      });

      // STEP 2: Network observer captures org_id
      networkObserver.initialize();

      const mockClaudeRequest = {
        url: 'https://claude.ai/api/organizations/org-claude-xyz789/chat_conversations/conv-456'
      };

      networkObserver['handleClaudeRequest'](mockClaudeRequest as any);

      await vi.waitFor(() => {
        const storage = (chrome.storage.local as any)._getInternalStorage();
        expect(storage.claude_org_id).toBe('org-claude-xyz789');
      });

      // STEP 3: Fetch and save conversation
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          uuid: 'conv-456',
          name: 'Claude Integration Test',
          created_at: new Date().toISOString(),
          chat_messages: [
            {
              uuid: 'msg-1',
              sender: 'human',
              text: 'Hello',
              created_at: new Date().toISOString()
            }
          ]
        })
      });

      (dashboardApi.saveToDashboard as any).mockResolvedValue({
        id: 'saved-claude-456',
        success: true
      });

      const getConvRequest = {
        action: 'getConversation',
        platform: 'claude',
        conversationId: 'conv-456',
        url: 'https://claude.ai/chat/conv-456'
      };

      const sendResponse = vi.fn();
      messageRouter['handleMessage'](getConvRequest, { tab: { id: 1 } } as any, sendResponse);

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://claude.ai/api/organizations/org-claude-xyz789/chat_conversations/conv-456',
          expect.anything()
        );

        expect(sendResponse).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            platform: 'claude',
            url: 'https://claude.ai/chat/conv-456'
          })
        });
      });
    });
  });

  // ========================================================================
  // FLOW 3: Token Expiry → Re-auth → Retry
  // ========================================================================

  describe('Flow 3: Handle Token Expiry During Save', () => {
    it('should detect expired token and prompt re-login', async () => {
      // STEP 1: Setup expired session
      await chrome.storage.local.set({
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000, // Past
        chatgpt_token: 'Bearer chatgpt-token'
      });

      // STEP 2: Attempt to save (should fail)
      (dashboardApi.saveToDashboard as any).mockRejectedValue(
        new Error('Session expired')
      );

      const saveRequest = {
        action: 'saveToDashboard',
        data: {
          id: 'conv-123',
          title: 'Test',
          platform: 'chatgpt',
          messages: []
        },
        folderId: null,
        silent: false
      };

      const sendResponse = vi.fn();
      messageRouter['handleMessage'](saveRequest, { tab: { id: 1 } } as any, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith({
          success: false,
          error: 'Session expired'
        });
      });

      // STEP 3: Re-authenticate
      const loginRequest = {
        action: 'setAuthToken',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 3600000,
        rememberMe: true
      };

      const loginResponse = vi.fn();
      messageRouter['handleMessage'](loginRequest, { tab: { id: 1 } } as any, loginResponse);

      await vi.waitFor(() => {
        expect(loginResponse).toHaveBeenCalledWith({ success: true });
      });

      // STEP 4: Retry save (should succeed)
      (dashboardApi.saveToDashboard as any).mockResolvedValue({
        id: 'saved-conv-123',
        success: true
      });

      const retryResponse = vi.fn();
      messageRouter['handleMessage'](saveRequest, { tab: { id: 1 } } as any, retryResponse);

      await vi.waitFor(() => {
        expect(retryResponse).toHaveBeenCalledWith({
          success: true,
          result: { id: 'saved-conv-123', success: true }
        });
      });
    });
  });

  // ========================================================================
  // FLOW 4: Multi-Platform Token Sync
  // ========================================================================

  describe('Flow 4: Sync All Platform Tokens', () => {
    it('should capture and verify all platform tokens', async () => {
      authManager.initialize();
      networkObserver.initialize();

      // ChatGPT token
      authManager.handleChatGPTHeaders({
        requestHeaders: [
          { name: 'Authorization', value: 'Bearer chatgpt-token' }
        ]
      });

      // Claude org_id
      networkObserver['handleClaudeRequest']({
        url: 'https://claude.ai/api/organizations/org-123/chats'
      } as any);

      // Gemini tokens
      authManager.handleGeminiRequest({
        url: 'https://gemini.google.com/batchexecute',
        requestBody: {
          formData: {
            'f.req': ['[["SNlM0e","[\\"test\\"]",null,"generic"]]']
          }
        }
      });

      await chrome.storage.local.set({
        gemini_at_token: 'AT-gemini-123'
      });

      // Dashboard token
      await authManager.setDashboardSession({
        accessToken: 'dashboard-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        rememberMe: false
      });

      // Trigger syncAll
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      const result = await authManager.syncAll();

      expect(result.isValid).toBe(true);

      // Verify all tokens present
      const storage = (chrome.storage.local as any)._getInternalStorage();
      expect(storage.chatgpt_token).toBeDefined();
      expect(storage.claude_org_id).toBeDefined();
      expect(storage.gemini_dynamic_key).toBeDefined();
      expect(storage.gemini_at_token).toBeDefined();
      expect(storage.accessToken).toBeDefined();
    });
  });

  // ========================================================================
  // FLOW 5: Error Recovery
  // ========================================================================

  describe('Flow 5: Network Error Recovery', () => {
    it('should handle API failures gracefully', async () => {
      await authManager.setDashboardSession({
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        rememberMe: false
      });

      // Simulate network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      const adapter = new ChatGPTAdapter();
      await chrome.storage.local.set({ chatgpt_token: 'Bearer token' });

      await expect(
        adapter.fetchConversation('conv-123')
      ).rejects.toThrow();

      // Verify token still present (not cleared on network error)
      const storage = (chrome.storage.local as any)._getInternalStorage();
      expect(storage.chatgpt_token).toBeDefined();
    });

    it('should clear tokens on 401', async () => {
      await chrome.storage.local.set({ chatgpt_token: 'Bearer expired' });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401
      });

      const adapter = new ChatGPTAdapter();

      await expect(
        adapter.fetchConversation('conv-123')
      ).rejects.toThrow('Token expired');

      // Verify token cleared
      const storage = (chrome.storage.local as any)._getInternalStorage();
      expect(storage.chatgpt_token).toBeUndefined();
    });
  });
});
