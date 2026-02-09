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
      expect(storage.accessToken).toBe(session.accessToken);
      expect(storage.refreshToken).toBe(session.refreshToken);
      expect(storage.expiresAt).toBe(session.expiresAt);
      expect(storage.rememberMe).toBe(true);
    });

    it('should validate valid session', async () => {
      await chrome.storage.local.set({
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000 // Future expiry
      });

      const isValid = await authManager.isSessionValid();
      expect(isValid).toBe(true);
    });

    it('should reject expired session', async () => {
      await chrome.storage.local.set({
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000 // Past expiry
      });

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
      await chrome.storage.local.set({
        accessToken: 'token-without-expiry'
      });

      const isValid = await authManager.isSessionValid();
      expect(isValid).toBe(true);
    });
  });

  // ========================================================================
  // SYNC ALL TOKENS
  // ========================================================================

  describe('syncAll()', () => {
    it('should verify dashboard token with API ping', async () => {
      await chrome.storage.local.set({
        accessToken: 'valid-token'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      const result = await authManager.syncAll();

      expect(result.isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/folders'),
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer valid-token' }
        })
      );
    });

    it('should cleanup on 401 response', async () => {
      await chrome.storage.local.set({
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        userEmail: 'user@example.com'
      });

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
      await chrome.storage.local.set({
        accessToken: 'token',
        expiresAt: Date.now() + 3600000
      });

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await authManager.syncAll();

      // Should fall back to storage validation
      expect(result.isValid).toBe(true);
    });
  });

  // ========================================================================
  // AUTH LIFECYCLE STRESS TESTS
  // ========================================================================

  describe('Auth Lifecycle Stress Tests', () => {
    it('Handshake Test: should accept tokens from Dashboard origin via message', async () => {
      const authData = {
        accessToken: 'dash-access-token',
        refreshToken: 'dash-refresh-token',
        expiresAt: Date.now() + 3600000,
        rememberMe: true
      };

      await authManager.setDashboardSession(authData);

      const storage = (chrome.storage.local as any)._getInternalStorage();
      expect(storage.accessToken).toBe(authData.accessToken);
      expect(storage.refreshToken).toBe(authData.refreshToken);
      expect(storage.expiresAt).toBe(authData.expiresAt);
      
      const isValid = await authManager.isSessionValid();
      expect(isValid).toBe(true);
    });

    it('Persistence Test: should restore state after simulated restart', async () => {
      // 1. Setup initial state in storage
      await chrome.storage.local.set({
        accessToken: 'persistent-token',
        refreshToken: 'persistent-refresh',
        expiresAt: Date.now() + 86400000,
        chatgpt_token: 'Bearer cg-persistent'
      });

      // 2. Kill current manager and spawn new one (Restart)
      const newAuthManager = new AuthManager();
      await newAuthManager.loadTokensFromStorage();

      // 3. Verify state recovery
      const isValid = await newAuthManager.isSessionValid();
      expect(isValid).toBe(true);
      
      // Verify internal state (tokens property is private, but we can verify via syncAll or similar)
      const syncResult = await newAuthManager.syncAll();
      expect(syncResult.tokens.chatgpt).toBe('Bearer cg-persistent');
    });

    it('Refresh Test: should report invalid session and cleanup on 401 (Simulated Refresh)', async () => {
      await chrome.storage.local.set({
        accessToken: 'dying-token',
        refreshToken: 'refresh-me'
      });
      await authManager.loadTokensFromStorage();

      // Mock 401 response for syncAll (Simulating failed refresh/dead token)
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401
      });

      const syncResult = await authManager.syncAll();
      expect(syncResult.isValid).toBe(false);

      // Storage should be scrubbed
      const storage = (chrome.storage.local as any)._getInternalStorage();
      expect(storage.accessToken).toBeUndefined();
      expect(storage.refreshToken).toBeUndefined();
    });

    it('Refresh Test: should trust storage if fetch fails but token not expired (Offline mode)', async () => {
        await chrome.storage.local.set({
          accessToken: 'offline-token',
          expiresAt: Date.now() + 3600000
        });
        await authManager.loadTokensFromStorage();
  
        // Mock network error
        global.fetch = vi.fn().mockRejectedValue(new Error('No internet'));
  
        const syncResult = await authManager.syncAll();
        expect(syncResult.isValid).toBe(true); // Should trust storage in offline mode
      });
  });
});
