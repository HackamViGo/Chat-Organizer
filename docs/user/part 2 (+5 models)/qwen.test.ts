/**
 * Qwen Adapter Tests (Alibaba)
 * 
 * Tests:
 * - X-Xsrf-Token authentication
 * - Optional x-app-id header
 * - Session/messages fetching
 * - Error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QwenAdapter } from '../qwen.adapter';
import { resetAllMocks } from '../../../__tests__/setup';

describe('QwenAdapter', () => {
    let adapter: QwenAdapter;

    beforeEach(() => {
        resetAllMocks();
        adapter = new QwenAdapter();
    });

    describe('fetchConversation', () => {
        it('should fetch conversation with XSRF token', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'xsrf-token-abc123'
            });

            const mockResponse = {
                title: 'Qwen Test Chat',
                session_name: 'Alternative Title',
                created_at: 1706788800,
                updated_at: 1706788900,
                messages: [
                    {
                        role: 'user',
                        content: 'Hello Qwen',
                        timestamp: 1706788800
                    },
                    {
                        role: 'assistant',
                        content: 'Hello! How can I assist you?',
                        timestamp: 1706788850
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-qwen-123');

            expect(result).toMatchObject({
                id: 'session-qwen-123',
                title: 'Qwen Test Chat',
                platform: 'qwen',
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: 'Hello Qwen'
                    })
                ])
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://chat.qwenlm.ai/api/v1/sessions/session-qwen-123/messages',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Xsrf-Token': 'xsrf-token-abc123'
                    })
                })
            );
        });

        it('should include x-app-id when available', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'xsrf-token',
                qwen_app_id: 'app-id-xyz'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ messages: [] })
            });

            await adapter.fetchConversation('session-123');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'x-app-id': 'app-id-xyz'
                    })
                })
            );
        });

        it('should work without x-app-id', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'xsrf-token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ messages: [] })
            });

            await adapter.fetchConversation('session-123');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.not.objectContaining({
                        'x-app-id': expect.any(String)
                    })
                })
            );
        });

        it('should handle missing XSRF token', async () => {
            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('Qwen auth token not found');
        });

        it('should handle 401 token expiration', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'expired-token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401
            });

            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('Qwen session expired');

            // Verify token removed
            const storage = (chrome.storage.local as any)._getInternalStorage();
            expect(storage.qwen_xsrf_token).toBeUndefined();
        });

        it('should fallback to session_name if title missing', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'token'
            });

            const mockResponse = {
                session_name: 'Session Name Fallback',
                messages: []
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.title).toBe('Session Name Fallback');
        });

        it('should use first user message as title if no title/name', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'token'
            });

            const mockResponse = {
                messages: [
                    {
                        role: 'user',
                        content: 'Explain quantum entanglement in simple terms'
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.title).toBe('Explain quantum entanglement in simple terms');
        });

        it('should truncate long titles', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'token'
            });

            const mockResponse = {
                messages: [
                    {
                        role: 'user',
                        content: 'This is a very long message that should be truncated to exactly fifty characters or less'
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.title).toMatch(/\.\.\.$/); // Ends with ...
            expect(result.title.length).toBeLessThanOrEqual(53);
        });

        it('should handle Unix timestamps', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'token'
            });

            const unixTime = 1706788800;
            const mockResponse = {
                created_at: unixTime,
                updated_at: unixTime + 100,
                messages: [
                    {
                        role: 'user',
                        content: 'Test',
                        timestamp: unixTime
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.created_at).toBe(unixTime * 1000);
            expect(result.updated_at).toBe((unixTime + 100) * 1000);
            expect(result.messages[0].timestamp).toBe(unixTime * 1000);
        });

        it('should set custom URL when provided', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ messages: [] })
            });

            const customUrl = 'https://chat.qwenlm.ai/chat/session-123?lang=zh';
            const result = await adapter.fetchConversation('session-123', customUrl);

            expect(result.url).toBe(customUrl);
        });

        it('should normalize empty conversation', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'token'
            });

            const mockResponse = {
                title: 'Empty Session',
                messages: []
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.messages).toEqual([]);
            expect(result.title).toBe('Empty Session');
        });
    });

    describe('error handling', () => {
        it('should handle network errors', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'token'
            });

            global.fetch = vi.fn().mockRejectedValue(new Error('Connection timeout'));

            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('Connection timeout');
        });

        it('should handle 403 forbidden', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 403
            });

            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('Qwen session expired');
        });

        it('should handle 500 server errors', async () => {
            await chrome.storage.local.set({
                qwen_xsrf_token: 'token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500
            });

            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('Qwen API error: 500');
        });
    });
});
