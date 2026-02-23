/**
 * AuthManager Test Suite
 * 
 * Tests:
 * - Token capture from ChatGPT, Claude, Gemini
 * - Session validation
 * - Token expiry handling
 * - Dashboard session management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthManager } from '../authManager';
import { resetAllMocks } from '@/__tests__/setup';

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    resetAllMocks();
    authManager = new AuthManager();
  });

  // ========================================================================
  // INITIALIZATION TESTS
  // ========================================================================

  describe('initialize()', () => {
    it('should register all network listeners', () => {
      authManager.initialize();

      expect(chrome.webRequest.onBeforeSendHeaders.addListener).toHaveBeenCalledTimes(5); // ChatGPT + DeepSeek + Perplexity + Grok + Qwen
      expect(chrome.webRequest.onBeforeRequest.addListener).toHaveBeenCalledTimes(2); // Claude + Gemini
    });

    it('should load tokens from storage on init', async () => {
      await chrome.storage.local.set({
        chatgpt_token: 'Bearer test-token',
        claude_org_id: 'org-123',
        gemini_at_token: 'AT-xyz'
      });

      await authManager.initialize();
      await authManager.loadTokensFromStorage();

      const storage = (chrome.storage.local as any)._getInternalStorage();
      expect(storage.chatgpt_token).toBe('Bearer test-token');
      expect(storage.claude_org_id).toBe('org-123');
    });
  });

  // ========================================================================
  // CHATGPT TOKEN CAPTURE
  // ========================================================================

  describe('ChatGPT Token Capture', () => {
    it('should capture Bearer token from Authorization header', () => {
      authManager.initialize();

      const mockDetails = {
        requestHeaders: [
          { name: 'Authorization', value: 'Bearer sk-test-token-123' },
          { name: 'Content-Type', value: 'application/json' }
        ]
      };

      authManager.handleChatGPTHeaders(mockDetails);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        chatgpt_token: 'Bearer sk-test-token-123'
      });
    });

    it('should ignore non-Bearer tokens', () => {
      authManager.initialize();

      const mockDetails = {
        requestHeaders: [
          { name: 'Authorization', value: 'Basic username:password' }
        ]
      };

      authManager.handleChatGPTHeaders(mockDetails);

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should not update if token is the same', async () => {
      await chrome.storage.local.set({ chatgpt_token: 'Bearer same-token' });
      await authManager.loadTokensFromStorage();

      const mockDetails = {
        requestHeaders: [
          { name: 'Authorization', value: 'Bearer same-token' }
        ]
      };

      vi.clearAllMocks();
      authManager.handleChatGPTHeaders(mockDetails);

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // CLAUDE ORG ID CAPTURE
  // ========================================================================

  describe('Claude Org ID Capture', () => {
    it('should extract org ID from API URL', () => {
      authManager.initialize();

      const mockDetails = {
        url: 'https://claude.ai/api/organizations/a1b2c3d4-e5f6-7890-abcd-ef1234567890/chat_conversations/conv-123'
      };

      authManager.handleClaudeRequest(mockDetails);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        claude_org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        org_id_discovered_at: expect.any(Number)
      });
    });

    it('should handle invalid URLs gracefully', () => {
      authManager.initialize();

      const mockDetails = {
        url: 'https://claude.ai/api/other-endpoint'
      };

      authManager.handleClaudeRequest(mockDetails);

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should not update if org ID is the same', async () => {
      const orgId = 'org-existing';
      await chrome.storage.local.set({ claude_org_id: orgId });
      await authManager.loadTokensFromStorage();

      const mockDetails = {
        url: `https://claude.ai/api/organizations/${orgId}/chats`
      };

      vi.clearAllMocks();
      authManager.handleClaudeRequest(mockDetails);

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // GEMINI DYNAMIC KEY CAPTURE
  // ========================================================================

  describe('Gemini Dynamic Key Capture', () => {
    it('should extract dynamic key from batchexecute request', () => {
      authManager.initialize();

      const mockDetails = {
        url: 'https://gemini.google.com/u/0/_/BardChatUi/data/batchexecute',
        requestBody: {
          formData: {
            'f.req': ['[["SNlM0e","[\\"test\\"]",null,"generic"]]']
          }
        }
      };

      authManager.handleGeminiRequest(mockDetails);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        gemini_dynamic_key: 'SNlM0e',
        key_discovered_at: expect.any(Number)
      });
    });

    it('should handle various key formats (5-6 chars)', () => {
      authManager.initialize();

      const testCases = [
        { key: 'abcde', expected: 'abcde' },
        { key: 'XyZ123', expected: 'XyZ123' },
        { key: 'SNlM0e', expected: 'SNlM0e' }
      ];

      testCases.forEach(({ key, expected }) => {
        const mockDetails = {
          url: 'https://gemini.google.com/batchexecute',
          requestBody: {
            formData: {
              'f.req': [`[["${key}","[\\"test\\"]",null,"generic"]]`]
            }
          }
        };

        vi.clearAllMocks();
        authManager.handleGeminiRequest(mockDetails);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          gemini_dynamic_key: expected,
          key_discovered_at: expect.any(Number)
        });
      });
    });

    it('should ignore non-batchexecute URLs', () => {
      authManager.initialize();

      const mockDetails = {
        url: 'https://gemini.google.com/other-endpoint',
        requestBody: { formData: {} }
      };

      authManager.handleGeminiRequest(mockDetails);

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // DASHBOARD SESSION MANAGEMENT
  // ========================================================================

  describe('Dashboard Session', () => {
    it('should store session tokens correctly', async () => {
      const session = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        rememberMe: true
      };

      await authManager.setDashboardSession(session);
      
      const storage = (chrome.storage.local as any)._getInternalStorage();
      // Tokens should be encrypted (not equal to plain text)
      expect(storage.accessToken).not.toBe(session.accessToken);
      expect(storage.refreshToken).not.toBe(session.refreshToken);
      
      // But getDashboardToken should decrypt them correctly
      const token = await authManager.getDashboardToken();
      expect(token).toBe(session.accessToken);
      
      expect(storage.expiresAt).toBe(session.expiresAt);
      expect(storage.rememberMe).toBe(true);
    });

    it('should validate valid session', async () => {
      const session = {
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000 
      };
      await authManager.setDashboardSession(session);

      const isValid = await authManager.isSessionValid();
      expect(isValid).toBe(true);
    });

    it('should reject expired session', async () => {
      const session = {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000 
      };
      await authManager.setDashboardSession(session);

      const isValid = await authManager.isSessionValid();
      expect(isValid).toBe(false);
    });

    it('should reject missing token', async () => {
      await chrome.storage.local.set({
        expiresAt: Date.now() + 3600000
      });

      const isValid = await authManager.isSessionValid();
      expect(isValid).toBe(false);
    });

    it('should accept session without expiry', async () => {
      const session = {
        accessToken: 'token-without-expiry'
      };
      await authManager.setDashboardSession(session);

      const isValid = await authManager.isSessionValid();
      expect(isValid).toBe(true);
    });
  });

  // ========================================================================
  // SYNC ALL TOKENS
  // ========================================================================

  describe('syncAll()', () => {
    it('should verify dashboard token with API ping', async () => {
      const session = { accessToken: 'valid-token' };
      await authManager.setDashboardSession(session);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      const result = await authManager.syncAll();

      expect(result.isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/folders'),
        expect.objectContaining({
          headers: { 
            'Authorization': 'Bearer valid-token',
            'X-Extension-Key': expect.any(String)
          }
        })
      );
    });

    it('should cleanup on 401 response', async () => {
      const session = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token'
      };
      await authManager.setDashboardSession(session);
      await chrome.storage.local.set({ userEmail: 'user@example.com' });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401
      });

      const result = await authManager.syncAll();

      expect(result.isValid).toBe(false);
      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        'accessToken',
        'refreshToken',
        'userEmail',
        'expiresAt'
      ]);
    });

    it('should handle network errors gracefully', async () => {
      const session = {
        accessToken: 'token',
        expiresAt: Date.now() + 3600000
      };
      await authManager.setDashboardSession(session);

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await authManager.syncAll();

      // Should fall back to storage validation
      expect(result.isValid).toBe(true);
    });
  });

  // ========================================================================
  // GENERIC PLATFORM TOKEN CAPTURE (Grok, Perplexity, DeepSeek, Qwen)
  // ========================================================================

  describe('Generic Platform Token Capture', () => {
    const testPlatforms = [
      { 
        name: 'Grok', 
        url: 'https://grok.com/api/v1/chat', 
        token: 'Bearer grok-test', 
        header: 'Authorization',
        storageKey: 'grok_auth_token' 
      },
      { 
        name: 'Perplexity', 
        url: 'https://www.perplexity.ai/api/v1/chat', 
        token: 'Bearer pplx-test', 
        header: 'Authorization',
        storageKey: 'perplexity_session' 
      },
      { 
        name: 'DeepSeek', 
        url: 'https://chat.deepseek.com/api/v1/chat', 
        token: 'Bearer ds-test', 
        header: 'Authorization',
        storageKey: 'deepseek_token' 
      },
      { 
        name: 'Qwen', 
        url: 'https://chat.qwenlm.ai/api/v1/chat', 
        token: 'xsrf-test', 
        header: 'X-Xsrf-Token',
        storageKey: 'qwen_xsrf_token' 
      }
    ];

    testPlatforms.forEach(({ name, url, token, header, storageKey }) => {
      it(`should capture ${name} token from ${header} header`, () => {
        authManager.initialize();
        const mockDetails = {
          url,
          requestHeaders: [{ name: header, value: token }]
        } as any;

        authManager.handlePlatformHeaders(mockDetails);
        expect(chrome.storage.local.set).toHaveBeenCalledWith({ [storageKey]: token });
      });
    });

    it('should ignore tokens for unknown domains', () => {
      authManager.initialize();
      const mockDetails = {
        url: 'https://unknown-domain.com/api',
        requestHeaders: [{ name: 'Authorization', value: 'Bearer unknown-token' }]
      } as any;

      authManager.handlePlatformHeaders(mockDetails);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });
});
