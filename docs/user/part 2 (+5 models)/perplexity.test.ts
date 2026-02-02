/**
 * Perplexity Adapter Tests
 * 
 * Tests:
 * - Session token handling (optional auth)
 * - Thread fetching
 * - Response normalization
 * - Error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerplexityAdapter } from '../perplexity.adapter';
import { resetAllMocks } from '../../../__tests__/setup';

describe('PerplexityAdapter', () => {
    let adapter: PerplexityAdapter;

    beforeEach(() => {
        resetAllMocks();
        adapter = new PerplexityAdapter();
    });

    describe('fetchConversation', () => {
        it('should fetch conversation with session token', async () => {
            await chrome.storage.local.set({
                perplexity_session: 'perplexity-jwt-abc123'
            });

            const mockResponse = {
                thread: {
                    slug: 'thread-perplexity-xyz',
                    title: 'Perplexity Search Query',
                    query: 'What is quantum computing?',
                    created_at: '2026-02-01T12:00:00Z',
                    updated_at: '2026-02-01T12:05:00Z',
                    messages: [
                        {
                            role: 'user',
                            text: 'What is quantum computing?',
                            created_at: '2026-02-01T12:00:00Z'
                        },
                        {
                            role: 'assistant',
                            content: 'Quantum computing uses quantum mechanics...',
                            created_at: '2026-02-01T12:01:00Z'
                        }
                    ]
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('thread-perplexity-xyz');

            expect(result).toMatchObject({
                id: 'thread-perplexity-xyz',
                title: 'Perplexity Search Query',
                platform: 'perplexity',
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: 'What is quantum computing?'
                    })
                ])
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://www.perplexity.ai/api/predict/get_thread?thread_slug=thread-perplexity-xyz',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer perplexity-jwt-abc123'
                    })
                })
            );
        });

        it('should work without session token (public searches)', async () => {
            const mockResponse = {
                thread: {
                    slug: 'public-thread',
                    query: 'Public query',
                    messages: [
                        {
                            role: 'user',
                            text: 'Public question'
                        }
                    ]
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('public-thread');

            expect(result.id).toBe('public-thread');
            
            // Should not include Authorization header
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.not.objectContaining({
                        'Authorization': expect.any(String)
                    })
                })
            );
        });

        it('should handle 401/403 session expiration', async () => {
            await chrome.storage.local.set({
                perplexity_session: 'expired-token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401
            });

            await expect(
                adapter.fetchConversation('thread-123')
            ).rejects.toThrow('Perplexity session expired');

            // Verify token removed
            const storage = (chrome.storage.local as any)._getInternalStorage();
            expect(storage.perplexity_session).toBeUndefined();
        });

        it('should fallback to query as title if title missing', async () => {
            const mockResponse = {
                thread: {
                    slug: 'thread-123',
                    query: 'What is machine learning in healthcare applications?',
                    messages: []
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('thread-123');

            expect(result.title).toBe('What is machine learning in healthcare applic...');
        });

        it('should use first user message as title if no title/query', async () => {
            const mockResponse = {
                thread: {
                    slug: 'thread-123',
                    messages: [
                        {
                            role: 'user',
                            text: 'Explain neural networks'
                        }
                    ]
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('thread-123');

            expect(result.title).toBe('Explain neural networks');
        });

        it('should handle custom URL', async () => {
            const mockResponse = {
                thread: {
                    slug: 'thread-123',
                    messages: []
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const customUrl = 'https://www.perplexity.ai/search/thread-123?pro=true';
            const result = await adapter.fetchConversation('thread-123', customUrl);

            expect(result.url).toBe(customUrl);
        });

        it('should normalize message with text field', async () => {
            const mockResponse = {
                thread: {
                    slug: 'thread-123',
                    messages: [
                        {
                            role: 'user',
                            text: 'Text field message'
                        }
                    ]
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('thread-123');

            expect(result.messages[0].content).toBe('Text field message');
        });

        it('should normalize message with content field', async () => {
            const mockResponse = {
                thread: {
                    slug: 'thread-123',
                    messages: [
                        {
                            role: 'assistant',
                            content: 'Content field message'
                        }
                    ]
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('thread-123');

            expect(result.messages[0].content).toBe('Content field message');
        });
    });

    describe('error handling', () => {
        it('should handle network errors', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

            await expect(
                adapter.fetchConversation('thread-123')
            ).rejects.toThrow('Connection refused');
        });

        it('should handle malformed response', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ invalid: 'structure' })
            });

            const result = await adapter.fetchConversation('thread-123');

            expect(result.messages).toEqual([]);
            expect(result.title).toBe('Untitled Perplexity Search');
        });
    });
});
