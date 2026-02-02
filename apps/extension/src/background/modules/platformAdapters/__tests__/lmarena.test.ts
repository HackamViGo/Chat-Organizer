/**
 * LMSYS Chatbot Arena Adapter Tests
 * 
 * Tests:
 * - Gradio session handling
 * - Complex response parsing
 * - Multiple data format handling
 * - fn_index parameter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LMArenaAdapter } from '../lmarena.adapter';
import { resetAllMocks } from '../../../../__tests__/setup';

describe('LMArenaAdapter', () => {
    let adapter: LMArenaAdapter;

    beforeEach(() => {
        resetAllMocks();
        adapter = new LMArenaAdapter();
    });

    describe('fetchConversation', () => {
        it('should fetch conversation with Gradio session', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'gradio-session-abc123',
                lmarena_fn_index: '7'
            });

            const mockResponse = {
                data: [
                    [
                        'User message 1',
                        'Bot response 1',
                        'User message 2',
                        'Bot response 2'
                    ]
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('arena-session-123');

            expect(result).toMatchObject({
                id: 'arena-session-123',
                platform: 'lmarena',
                messages: [
                    {
                        role: 'user',
                        content: 'User message 1'
                    },
                    {
                        role: 'assistant',
                        content: 'Bot response 1'
                    },
                    {
                        role: 'user',
                        content: 'User message 2'
                    },
                    {
                        role: 'assistant',
                        content: 'Bot response 2'
                    }
                ]
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://chat.lmsys.org/run/predict',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        fn_index: 7,
                        data: ['arena-session-123'],
                        session_hash: 'gradio-session-abc123'
                    })
                })
            );
        });

        it('should use default fn_index if not stored', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'gradio-session-abc123'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ data: [[]] })
            });

            await adapter.fetchConversation('session-123');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"fn_index":0')
                })
            );
        });

        it('should handle missing session hash', async () => {
            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('LMSYS Arena session not found');
        });

        it('should parse messages array format', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'session-hash'
            });

            const mockResponse = {
                data: [
                    {
                        messages: [
                            {
                                role: 'user',
                                content: 'Message from array format'
                            },
                            {
                                is_user: false,
                                text: 'Bot response from array format'
                            }
                        ]
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.messages).toEqual([
                expect.objectContaining({
                    role: 'user',
                    content: 'Message from array format'
                }),
                expect.objectContaining({
                    role: 'assistant',
                    content: 'Bot response from array format'
                })
            ]);
        });

        it('should handle is_user flag for role detection', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'session-hash'
            });

            const mockResponse = {
                data: [
                    {
                        messages: [
                            {
                                is_user: true,
                                text: 'User message'
                            },
                            {
                                is_user: false,
                                text: 'Bot message'
                            }
                        ]
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.messages[0].role).toBe('user');
            expect(result.messages[1].role).toBe('assistant');
        });

        it('should generate title from first user message', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'session-hash'
            });

            const mockResponse = {
                data: [[
                    'Compare GPT-4 and Claude for creative writing tasks',
                    'Response about models'
                ]]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.title).toBe('Compare GPT-4 and Claude for creative writing task...');
        });

        it('should default to generic title if no messages', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'session-hash'
            });

            const mockResponse = {
                data: [[]]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.title).toBe('Chatbot Arena Conversation');
        });

        it('should set custom URL when provided', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'session-hash'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ data: [[]] })
            });

            const customUrl = 'https://chat.lmsys.org/?session=session-123&mode=battle';
            const result = await adapter.fetchConversation('session-123', customUrl);

            expect(result.url).toBe(customUrl);
        });

        it('should handle empty conversation data', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'session-hash'
            });

            const mockResponse = {
                data: []
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.messages).toEqual([]);
        });

        it('should handle nested array format with odd number of messages', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'session-hash'
            });

            const mockResponse = {
                data: [[
                    'User message 1',
                    'Bot response 1',
                    'User message 2'
                    // No bot response for last message
                ]]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            expect(result.messages).toHaveLength(3);
            expect(result.messages[2].role).toBe('user');
            expect(result.messages[2].content).toBe('User message 2');
        });
    });

    describe('extractGradioSession', () => {
        it('should extract session from window.gradio_config', () => {
            // Mock window.gradio_config
            (global as any).window = {
                gradio_config: {
                    session_hash: 'test-session-hash',
                    fn_index: 5
                }
            };

            const result = LMArenaAdapter.extractGradioSession();

            expect(result).toEqual({
                session_hash: 'test-session-hash',
                fn_index: '5'
            });
        });

        it('should return null if gradio_config not present', () => {
            (global as any).window = {};

            const result = LMArenaAdapter.extractGradioSession();

            expect(result).toBeNull();
        });

        it('should handle extraction errors gracefully', () => {
            (global as any).window = {
                gradio_config: {
                    get session_hash() {
                        throw new Error('Access denied');
                    }
                }
            };

            const result = LMArenaAdapter.extractGradioSession();

            expect(result).toBeNull();
        });
    });

    describe('error handling', () => {
        it('should handle network errors', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'session-hash'
            });

            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('Network error');
        });

        it('should handle API errors', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'session-hash'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500
            });

            await expect(
                adapter.fetchConversation('session-123')
            ).rejects.toThrow('LMSYS Arena API error: 500');
        });

        it('should handle malformed Gradio response', async () => {
            await chrome.storage.local.set({
                lmarena_session_hash: 'session-hash'
            });

            const mockResponse = {
                // Completely unexpected format
                unexpected: 'structure'
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('session-123');

            // Should handle gracefully
            expect(result.messages).toEqual([]);
        });
    });
});
