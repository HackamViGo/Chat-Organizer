/**
 * DeepSeek Adapter Tests
 * 
 * Tests:
 * - Token capture from network requests
 * - Conversation fetching
 * - API response normalization
 * - Error handling (401, network errors)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepSeekAdapter } from '../deepseek.adapter';
import { resetAllMocks } from '../../../__tests__/setup';

describe('DeepSeekAdapter', () => {
    let adapter: DeepSeekAdapter;

    beforeEach(() => {
        resetAllMocks();
        adapter = new DeepSeekAdapter();
    });

    describe('fetchConversation', () => {
        it('should fetch conversation successfully', async () => {
            await chrome.storage.local.set({
                deepseek_token: 'Bearer deepseek-jwt-token-123'
            });

            const mockResponse = {
                data: {
                    session_id: 'session-deepseek-123',
                    title: 'DeepSeek Test Chat',
                    created_at: '2026-02-01T10:00:00Z',
                    updated_at: '2026-02-01T10:30:00Z',
                    selection_list: [
                        {
                            role: 'user',
                            content: 'Hello DeepSeek',
                            created_at: '2026-02-01T10:00:00Z'
                        },
                        {
                            role: 'assistant',
                            content: 'Hello! How can I help you today?',
                            created_at: '2026-02-01T10:01:00Z'
                        }
                    ]
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-deepseek-123');

            expect(result).toMatchObject({
                id: 'session-deepseek-123',
                title: 'DeepSeek Test Chat',
                platform: 'deepseek',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello DeepSeek',
                        timestamp: expect.any(Number)
                    },
                    {
                        role: 'assistant',
                        content: 'Hello! How can I help you today?',
                        timestamp: expect.any(Number)
                    }
                ]
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://chat.deepseek.com/api/v0/chat_session/get_session?session_id=session-deepseek-123',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer deepseek-jwt-token-123',
                        'x-client-version': '1.0.0'
                    })
                })
            );
        });

        it('should handle missing token', async () => {
            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('DeepSeek token not found');
        });

        it('should handle 401 token expiration', async () => {
            await chrome.storage.local.set({
                deepseek_token: 'Bearer expired-token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401
            });

            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('DeepSeek token expired');

            // Verify token removed
            const storage = (chrome.storage.local as any)._getInternalStorage();
            expect(storage.deepseek_token).toBeUndefined();
        });

        it('should use first user message as title if title missing', async () => {
            await chrome.storage.local.set({
                deepseek_token: 'Bearer token'
            });

            const mockResponse = {
                data: {
                    session_id: 'session-123',
                    selection_list: [
                        {
                            role: 'user',
                            content: 'This is a very long message that should be truncated to fifty characters',
                            created_at: '2026-02-01T10:00:00Z'
                        }
                    ]
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.title).toBe('This is a very long message that should be trunca...');
            expect(result.title.length).toBeLessThanOrEqual(53); // 50 + '...'
        });

        it('should set custom URL when provided', async () => {
            await chrome.storage.local.set({
                deepseek_token: 'Bearer token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    data: {
                        session_id: 'session-123',
                        selection_list: []
                    }
                })
            });

            const customUrl = 'https://chat.deepseek.com/chat/session-123?param=value';
            const result = await adapter.fetchConversation('session-123', customUrl);

            expect(result.url).toBe(customUrl);
        });

        it('should handle API errors', async () => {
            await chrome.storage.local.set({
                deepseek_token: 'Bearer token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500
            });

            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('DeepSeek API error: 500');
        });

        it('should handle network errors', async () => {
            await chrome.storage.local.set({
                deepseek_token: 'Bearer token'
            });

            global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('Network timeout');
        });
    });

    describe('normalization', () => {
        it('should normalize empty conversation', async () => {
            await chrome.storage.local.set({
                deepseek_token: 'Bearer token'
            });

            const mockResponse = {
                data: {
                    session_id: 'empty-session',
                    title: 'Empty Chat',
                    selection_list: []
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('empty-session');

            expect(result.messages).toEqual([]);
            expect(result.title).toBe('Empty Chat');
        });

        it('should handle missing timestamps', async () => {
            await chrome.storage.local.set({
                deepseek_token: 'Bearer token'
            });

            const mockResponse = {
                data: {
                    session_id: 'session-123',
                    selection_list: [
                        {
                            role: 'user',
                            content: 'Message without timestamp'
                        }
                    ]
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.messages[0].timestamp).toBeGreaterThan(0);
        });
    });
});
