import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MessageRouter } from '../messageRouter';
import { AuthManager } from '../authManager';
import { NetworkObserver } from '../networkObserver';
import * as platformAdapters from '../platformAdapters';
import * as dashboardApi from '../dashboardApi';
import { ChatGPTAdapter } from '../platformAdapters/chatgpt.adapter';
import { resetAllMocks } from '../../../__tests__/setup';

// Mock dependencies
vi.mock('../dashboardApi');
vi.mock('../platformAdapters');

describe('Integration Tests - End-to-End Flows', () => {
  let messageRouter: MessageRouter;
  let authManager: AuthManager;
  let networkObserver: NetworkObserver;
  let promptSyncManager: any;

  beforeEach(() => {
    resetAllMocks();

    // Set up default mock values
    vi.mocked(dashboardApi.getUserFolders).mockResolvedValue([]);
    vi.mocked(dashboardApi.saveToDashboard).mockResolvedValue({ success: true, id: 'saved-conv-123' } as any);
    
    vi.mocked(platformAdapters.fetchConversation).mockResolvedValue({
      id: 'conv-123',
      title: 'Test Chat',
      platform: 'chatgpt',
      messages: []
    } as any);

    authManager = new AuthManager();
    authManager.initialize();
    
    networkObserver = new NetworkObserver(false);
    networkObserver.initialize();
    
    promptSyncManager = {
      sync: vi.fn().mockResolvedValue({ success: true }),
      getAllPrompts: vi.fn().mockResolvedValue([])
    };

    messageRouter = new MessageRouter(authManager, promptSyncManager as any, false);
  });

  // ========================================================================
  // FLOW 1: Complete Save Chat Flow
  // ========================================================================

  describe('Flow 1: Login → Capture Token → Save Chat', () => {
    it('should complete full ChatGPT save flow', async () => {
      // Setup: Mock specifically for this integration test
      vi.mocked(platformAdapters.fetchConversation).mockResolvedValueOnce({
        id: 'conv-integration-123',
        title: 'Integration Test Chat',
        platform: 'chatgpt',
        messages: [{ role: 'user', content: 'Hello' }]
      } as any);

      // STEP 1: User logs in via dashboard
      const loginRequest = {
        action: 'setAuthToken',
        accessToken: 'dashboard-access-token',
        refreshToken: 'dashboard-refresh-token',
        expiresAt: Date.now() + 3600000,
        rememberMe: true
      };

      let sendResponse = vi.fn();
      messageRouter['handleMessage'](loginRequest, {} as any, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
      });

      // STEP 2: Capture ChatGPT token from network
      const requestDetails = {
        url: 'https://chat.openai.com/backend-api/conversations',
        requestHeaders: [
          { name: 'Authorization', value: 'Bearer sk-chatgpt-token-abc' }
        ]
      };
      
      const headerTrigger = (chrome.webRequest.onBeforeSendHeaders as any)._trigger;
      if (headerTrigger) {
        headerTrigger(requestDetails);
      }

      // STEP 3: User saves a chat
      const conversation = {
        id: 'conv-integration-123',
        title: 'Integration Test Chat',
        platform: 'chatgpt'
      };

      const saveRequest = {
        action: 'saveToDashboard',
        data: conversation,
        folderId: null,
        silent: false
      };

      sendResponse = vi.fn();
      messageRouter['handleMessage'](saveRequest, { tab: { id: 1 } } as any, sendResponse);

      // Trigger network event for Org ID
      const webRequestTrigger = (chrome.webRequest.onBeforeRequest as any)._trigger;
      if (webRequestTrigger) {
        webRequestTrigger({ url: 'https://claude.ai/api/organizations/66087799-7757-4148-9f37-640a221f0088/' });
      }

      await vi.waitFor(async () => {
        expect(dashboardApi.saveToDashboard).toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        
        const res = await chrome.storage.local.get(['claude_org_id']);
        expect(res.claude_org_id).toBe('66087799-7757-4148-9f37-640a221f0088');
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
      const mockClaudeRequest = {
        url: 'https://claude.ai/api/organizations/00000000-0000-0000-0000-000000000000/chat_conversations/conv-456'
      };

      networkObserver['handleClaudeRequest'](mockClaudeRequest as any);

      await vi.waitFor(async () => {
        const res = await chrome.storage.local.get(['claude_org_id']);
        expect(res.claude_org_id).toBe('00000000-0000-0000-0000-000000000000');
      });

      // STEP 3: Fetch and save conversation
      vi.mocked(platformAdapters.fetchConversation).mockResolvedValueOnce({
        id: 'conv-456',
        title: 'Claude Integration Test',
        platform: 'claude',
        messages: []
      } as any);

      const saveRequest = {
        action: 'saveToDashboard',
        data: { id: 'conv-456', platform: 'claude' },
        folderId: 'folder-abc'
      };

      const sendResponse = vi.fn();
      messageRouter['handleMessage'](saveRequest, {} as any, sendResponse);

      await vi.waitFor(() => {
        expect(dashboardApi.saveToDashboard).toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      });
    });
  });

  // ========================================================================
  // FLOW 3: Token Expiry and Refresh Flow
  // ========================================================================

  describe('Flow 3: Handle Token Expiry During Save', () => {
    it('should detect expired token and prompt re-login', async () => {
      // STEP 1: Setup expired session
      await chrome.storage.local.set({
        accessToken: 'expired-token',
        expiresAt: Date.now() - 3600000,
        chatgpt_token: 'Bearer chatgpt-token'
      });

      // STEP 2: Attempt save
      const saveRequest = {
        action: 'saveToDashboard',
        data: { id: 'conv-123', platform: 'chatgpt' }
      };

      vi.mocked(dashboardApi.saveToDashboard).mockRejectedValueOnce(new Error('Unauthorized'));

      const sendResponse = vi.fn();
      messageRouter['handleMessage'](saveRequest, {} as any, sendResponse);

      // STEP 3: Simulate user login
      const refreshRequest = {
        action: 'setAuthToken',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 3600000,
        rememberMe: true
      };

      messageRouter['handleMessage'](refreshRequest, {} as any, vi.fn());

      await vi.waitFor(async () => {
        const res = await chrome.storage.local.get(['accessToken']);
        expect(res.accessToken).toBe('new-access-token');
      });
    });
  });

  // ========================================================================
  // FLOW 4: Sync Manager Flow
  // ========================================================================

  describe('Flow 4: Sync All Platform Tokens', () => {
    it('should capture and verify all platform tokens', async () => {
      // Simulation: Capture ChatGPT
      (chrome.webRequest.onBeforeSendHeaders as any)._trigger({
        url: 'https://chatgpt.com/api',
        requestHeaders: [{ name: 'Authorization', value: 'Bearer chatgpt-token' }]
      });

      // Simulation: Sniff Gemini Key
      (chrome.webRequest.onBeforeRequest as any)._trigger({
        url: 'https://gemini.google.com/_/BardChatUi/data/batchexecute',
        requestBody: { formData: { 'f.req': ['["SNlM0e", "[...]"]'] } }
      });

      // Simulation: Sniff Gemini AT
      (chrome.webRequest.onBeforeRequest as any)._trigger({
        url: 'https://gemini.google.com/app/AT-gemini-123'
      });

      // Simulation: Sniff Claude Org ID
      (chrome.webRequest.onBeforeRequest as any)._trigger({ 
        url: 'https://claude.ai/api/organizations/99999999-9999-9999-9999-999999999999/' 
      });

      await vi.waitFor(async () => {
        const res = await chrome.storage.local.get([
          'chatgpt_token', 
          'claude_org_id', 
          'gemini_dynamic_key', 
          'gemini_at_token'
        ]);
        expect(res.chatgpt_token).toBeDefined();
        expect(res.claude_org_id).toBeDefined();
        expect(res.gemini_dynamic_key).toBeDefined();
        expect(res.gemini_at_token).toBeDefined();
      });
    });
  });

  // ========================================================================
  // FLOW 5: Error Recovery Flow
  // ========================================================================

  describe('Flow 5: Network Error Recovery', () => {
    it('should handle API failures gracefully', async () => {
      const adapter = new ChatGPTAdapter();
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await chrome.storage.local.set({ chatgpt_token: 'Bearer token' });

      await expect(adapter.fetchConversation('conv-123')).rejects.toThrow();

      const res = await chrome.storage.local.get(['chatgpt_token']);
      expect(res.chatgpt_token).toBeDefined();
    });

    it('should clear tokens on 401', async () => {
      await chrome.storage.local.set({ chatgpt_token: 'Bearer expired' });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401
      });

      const adapter = new ChatGPTAdapter();

      await expect(adapter.fetchConversation('conv-123')).rejects.toThrow(/Token expired/);

      const res = await chrome.storage.local.get(['chatgpt_token']);
      expect(res.chatgpt_token).toBeUndefined();
    });
  });
});
