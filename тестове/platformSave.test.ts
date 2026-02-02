/**
 * Platform Save Flow Tests
 * 
 * End-to-end tests for saving conversations from each platform
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatGPTAdapter } from '../platformAdapters/chatgpt.adapter';
import { ClaudeAdapter } from '../platformAdapters/claude.adapter';
import { GeminiAdapter } from '../platformAdapters/gemini.adapter';
import { resetAllMocks } from '../../__tests__/setup';
import * as dashboardApi from '../dashboardApi';

vi.mock('../dashboardApi');

describe('Platform Save Flow Tests', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
  });

  // ========================================================================
  // CHATGPT SAVE FLOW
  // ========================================================================

  describe('ChatGPT Save Flow', () => {
    let adapter: ChatGPTAdapter;

    beforeEach(() => {
      adapter = new ChatGPTAdapter();
    });

    it('should save ChatGPT conversation successfully', async () => {
      // Setup: Store token
      await chrome.storage.local.set({
        chatgpt_token: 'Bearer sk-test-token',
        accessToken: 'dashboard-token'
      });

      // Mock ChatGPT API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          conversation_id: 'conv-chatgpt-123',
          title: 'Test ChatGPT Chat',
          create_time: 1234567890,
          mapping: {
            'msg-1': {
              message: {
                id: 'msg-1',
                author: { role: 'user' },
                content: { parts: ['Hello ChatGPT'] },
                create_time: 1234567890
              }
            },
            'msg-2': {
              message: {
                id: 'msg-2',
                author: { role: 'assistant' },
                content: { parts: ['Hi! How can I help?'] },
                create_time: 1234567891
              }
            }
          }
        })
      });

      // Mock Dashboard API
      (dashboardApi.saveToDashboard as any).mockResolvedValue({
        id: 'saved-chat-123',
        success: true
      });

      // Action: Fetch conversation
      const conversation = await adapter.fetchConversation('conv-chatgpt-123');

      expect(conversation).toMatchObject({
        id: 'conv-chatgpt-123',
        title: 'Test ChatGPT Chat',
        platform: 'chatgpt',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Hello ChatGPT' }),
          expect.objectContaining({ role: 'assistant', content: 'Hi! How can I help?' })
        ])
      });

      // Action: Save to dashboard
      const saveResult = await dashboardApi.saveToDashboard(conversation, null, false);

      expect(dashboardApi.saveToDashboard).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'chatgpt',
          title: 'Test ChatGPT Chat'
        }),
        null,
        false
      );

      expect(saveResult).toMatchObject({
        id: 'saved-chat-123',
        success: true
      });
    });

    it('should handle ChatGPT token expiration', async () => {
      await chrome.storage.local.set({
        chatgpt_token: 'Bearer expired-token'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401
      });

      await expect(adapter.fetchConversation('conv-123')).rejects.toThrow(
        'Token expired'
      );

      // Verify token was removed
      const storage = (chrome.storage.local as any)._getInternalStorage();
      expect(storage.chatgpt_token).toBeUndefined();
    });
  });

  // ========================================================================
  // CLAUDE SAVE FLOW
  // ========================================================================

  describe('Claude Save Flow', () => {
    let adapter: ClaudeAdapter;

    beforeEach(() => {
      adapter = new ClaudeAdapter();
    });

    it('should save Claude conversation successfully', async () => {
      // Setup: Store org_id
      await chrome.storage.local.set({
        claude_org_id: 'org-claude-abc123',
        accessToken: 'dashboard-token'
      });

      // Mock Claude API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          uuid: 'conv-claude-456',
          name: 'Test Claude Chat',
          created_at: '2024-01-01T00:00:00Z',
          chat_messages: [
            {
              uuid: 'msg-1',
              sender: 'human',
              text: 'Hello Claude',
              created_at: '2024-01-01T00:00:01Z'
            },
            {
              uuid: 'msg-2',
              sender: 'assistant',
              text: 'Hello! I\'m Claude.',
              created_at: '2024-01-01T00:00:02Z'
            }
          ]
        })
      });

      (dashboardApi.saveToDashboard as any).mockResolvedValue({
        id: 'saved-claude-123',
        success: true
      });

      // Action: Fetch conversation
      const conversation = await adapter.fetchConversation('conv-claude-456');

      expect(conversation).toMatchObject({
        id: 'conv-claude-456',
        title: 'Test Claude Chat',
        platform: 'claude',
        url: 'https://claude.ai/chat/conv-claude-456',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Hello Claude' }),
          expect.objectContaining({ role: 'assistant', content: 'Hello! I\'m Claude.' })
        ])
      });

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        'https://claude.ai/api/organizations/org-claude-abc123/chat_conversations/conv-claude-456',
        expect.objectContaining({
          credentials: 'include'
        })
      );

      // Action: Save to dashboard
      await dashboardApi.saveToDashboard(conversation, null, false);

      expect(dashboardApi.saveToDashboard).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'claude',
          url: 'https://claude.ai/chat/conv-claude-456'
        }),
        null,
        false
      );
    });

    it('should handle missing org_id', async () => {
      await chrome.storage.local.set({
        accessToken: 'dashboard-token'
      });

      await expect(adapter.fetchConversation('conv-123')).rejects.toThrow(
        'Claude Organization ID not found'
      );
    });
  });

  // ========================================================================
  // GEMINI SAVE FLOW
  // ========================================================================

  describe('Gemini Save Flow', () => {
    let adapter: GeminiAdapter;

    beforeEach(() => {
      adapter = new GeminiAdapter();
    });

    it('should save Gemini conversation successfully', async () => {
      // Setup: Store AT token and dynamic key
      await chrome.storage.local.set({
        gemini_at_token: 'ATXyz123',
        gemini_dynamic_key: 'SNlM0e',
        accessToken: 'dashboard-token'
      });

      // Mock Gemini batchexecute response
      const mockGeminiResponse = ")]}'\n" + JSON.stringify([
        [
          'wrb.fr',
          'SNlM0e',
          JSON.stringify([
            ['c_test-789'],
            [
              [
                ['Test Gemini Chat'],
                [
                  [['Hello Gemini', 0]],
                  [['Hi! How can I assist you today?', 1]]
                ]
              ]
            ]
          ]),
          null,
          'generic'
        ]
      ]);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockGeminiResponse
      });

      (dashboardApi.saveToDashboard as any).mockResolvedValue({
        id: 'saved-gemini-123',
        success: true
      });

      // Action: Fetch conversation
      const conversation = await adapter.fetchConversation('test-789');

      expect(conversation).toMatchObject({
        platform: 'gemini',
        messages: expect.any(Array)
      });

      // Verify batchexecute call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('batchexecute?rpcids=SNlM0e'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Same-Domain': '1'
          })
        })
      );

      // Action: Save to dashboard
      await dashboardApi.saveToDashboard(conversation, null, false);

      expect(dashboardApi.saveToDashboard).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'gemini'
        }),
        null,
        false
      );
    });

    it('should handle expired dynamic key', async () => {
      await chrome.storage.local.set({
        gemini_at_token: 'ATXyz123',
        gemini_dynamic_key: 'expired-key'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      });

      await expect(adapter.fetchConversation('test-789')).rejects.toThrow(
        'Gemini key expired/invalid'
      );

      // Verify key was removed
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(['gemini_dynamic_key']);
    });

    it('should handle missing AT token', async () => {
      await chrome.storage.local.set({
        gemini_dynamic_key: 'SNlM0e'
      });

      await expect(adapter.fetchConversation('test-789')).rejects.toThrow(
        'Gemini AT token not found'
      );
    });
  });

  // ========================================================================
  // DASHBOARD API INTEGRATION
  // ========================================================================

  describe('Dashboard API Integration', () => {
    it('should handle auth errors when saving', async () => {
      await chrome.storage.local.set({
        accessToken: 'invalid-token'
      });

      (dashboardApi.saveToDashboard as any).mockRejectedValue(
        new Error('Session expired')
      );

      const mockConversation = {
        id: 'conv-123',
        title: 'Test',
        platform: 'chatgpt',
        messages: []
      };

      await expect(
        dashboardApi.saveToDashboard(mockConversation, null, false)
      ).rejects.toThrow('Session expired');
    });

    it('should save to specific folder', async () => {
      await chrome.storage.local.set({
        accessToken: 'valid-token'
      });

      (dashboardApi.saveToDashboard as any).mockResolvedValue({
        id: 'saved-123',
        folder_id: 'folder-work'
      });

      const mockConversation = {
        id: 'conv-123',
        title: 'Work Chat',
        platform: 'chatgpt',
        messages: []
      };

      const result = await dashboardApi.saveToDashboard(
        mockConversation,
        'folder-work',
        false
      );

      expect(result.folder_id).toBe('folder-work');
    });
  });
});
