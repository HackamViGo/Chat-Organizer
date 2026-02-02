/**
 * Grok Adapter Tests (X.com)
 * 
 * Tests:
 * - Dual token authentication (CSRF + OAuth)
 * - Conversation history fetching
 * - Sender role mapping (1=user, 2=bot)
 * - Error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrokAdapter } from '../grok.adapter';
import { resetAllMocks } from '../../../../__tests__/setup';

describe('GrokAdapter', () => {
    let adapter: GrokAdapter;

    beforeEach(() => {
        resetAllMocks();
        adapter = new GrokAdapter();
    });

    describe('fetchConversation', () => {
        it('should fetch conversation with both tokens', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf-token-xyz',
                grok_auth_token: 'Bearer twitter-oauth-token'
            });

            const mockResponse = {
                conversation_id: 'grok-conv-123',
                created_at: 1706788800, // Unix timestamp
                updated_at: 1706788900,
                items: [
                    {
                        sender: 1, // user
                        message: 'Hello Grok',
                        timestamp: 1706788800
                    },
                    {
                        sender: 2, // bot
                        text: 'Hello! I\'m Grok, powered by xAI.',
                        timestamp: 1706788850
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('grok-conv-123');

            expect(result).toMatchObject({
                id: 'grok-conv-123',
                platform: 'grok',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello Grok'
                    },
                    {
                        role: 'assistant',
                        content: 'Hello! I\'m Grok, powered by xAI.'
                    }
                ]
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://x.com/i/api/1.1/grok/history.json',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer twitter-oauth-token',
                        'x-csrf-token': 'csrf-token-xyz',
                        'x-twitter-auth-type': 'OAuth2Session'
                    }),
                    body: JSON.stringify({
                        conversation_id: 'grok-conv-123'
                    })
                })
            );
        });

        it('should handle missing CSRF token', async () => {
            await chrome.storage.local.set({
                grok_auth_token: 'Bearer token'
            });

            await expect(
                adapter.fetchConversation('conv-123')
            ).rejects.toThrow('Grok authentication tokens not found');
        });

        it('should handle missing auth token', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf-token'
            });

            await expect(
                adapter.fetchConversation('conv-123')
            ).rejects.toThrow('Grok authentication tokens not found');
        });

        it('should handle 401 session expiration', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'expired-csrf',
                grok_auth_token: 'expired-auth'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401
            });

            await expect(
                adapter.fetchConversation('conv-123')
            ).rejects.toThrow('Grok session expired');

            // Verify both tokens removed
            const storage = (chrome.storage.local as any)._getInternalStorage();
            expect(storage.grok_csrf_token).toBeUndefined();
            expect(storage.grok_auth_token).toBeUndefined();
        });

        it('should handle 403 forbidden', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf',
                grok_auth_token: 'auth'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 403
            });

            await expect(
                adapter.fetchConversation('conv-123')
            ).rejects.toThrow('Grok session expired');
        });

        it('should map sender roles correctly', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf',
                grok_auth_token: 'auth'
            });

            const mockResponse = {
                items: [
                    { sender: 1, message: 'User message' },
                    { sender: 2, message: 'Bot message' },
                    { sender: 1, message: 'Another user message' }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('conv-123');

            expect(result.messages).toEqual([
                expect.objectContaining({ role: 'user', content: 'User message' }),
                expect.objectContaining({ role: 'assistant', content: 'Bot message' }),
                expect.objectContaining({ role: 'user', content: 'Another user message' })
            ]);
        });

        it('should generate title from first user message', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf',
                grok_auth_token: 'auth'
            });

            const mockResponse = {
                items: [
                    {
                        sender: 1,
                        message: 'Tell me about SpaceX Starship and its recent test flights'
                    },
                    {
                        sender: 2,
                        message: 'Response about Starship'
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('conv-123');

            expect(result.title).toBe('Tell me about SpaceX Starship and its recent test ...');
        });

        it('should default to generic title if no user messages', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf',
                grok_auth_token: 'auth'
            });

            const mockResponse = {
                items: []
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('conv-123');

            expect(result.title).toBe('Grok Conversation');
        });

        it('should handle Unix timestamps correctly', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf',
                grok_auth_token: 'auth'
            });

            const unixTimestamp = 1706788800;
            const mockResponse = {
                created_at: unixTimestamp,
                updated_at: unixTimestamp + 100,
                items: [
                    {
                        sender: 1,
                        message: 'Test',
                        timestamp: unixTimestamp
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('conv-123');

            expect(result.created_at).toBe(unixTimestamp * 1000); // Converted to ms
            expect(result.updated_at).toBe((unixTimestamp + 100) * 1000);
            expect(result.messages[0].timestamp).toBe(unixTimestamp * 1000);
        });

        it('should handle text field fallback', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf',
                grok_auth_token: 'auth'
            });

            const mockResponse = {
                items: [
                    {
                        sender: 1,
                        text: 'Text field instead of message'
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('conv-123');

            expect(result.messages[0].content).toBe('Text field instead of message');
        });

        it('should set custom URL when provided', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf',
                grok_auth_token: 'auth'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ items: [] })
            });

            const customUrl = 'https://x.com/i/grok?conversation_id=conv-123&mode=fun';
            const result = await adapter.fetchConversation('conv-123', customUrl);

            expect(result.url).toBe(customUrl);
        });
    });

    describe('error handling', () => {
        it('should handle network errors', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf',
                grok_auth_token: 'auth'
            });

            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            await expect(
                adapter.fetchConversation('conv-123')
            ).rejects.toThrow('Network error');
        });

        it('should handle rate limiting (429)', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf',
                grok_auth_token: 'auth'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429
            });

            await expect(
                adapter.fetchConversation('conv-123')
            ).rejects.toThrow('Grok API error: 429');
        });
    });
});
