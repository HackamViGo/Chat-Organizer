/**
 * ChatGPT Adapter Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatGPTAdapter } from '../chatgpt.adapter';

describe('ChatGPTAdapter', () => {
    let adapter: ChatGPTAdapter;

    beforeEach(() => {
        adapter = new ChatGPTAdapter();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchConversation', () => {
        it('should fetch conversation successfully', async () => {
            // Mock storage token
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
                chatgpt_token: 'Bearer test-token-123'
            });

            // Mock ChatGPT API response
            const mockResponse = {
                id: 'conv-123',
                title: 'Test Conversation',
                create_time: 1234567890,
                mapping: {
                    'msg-1': {
                        message: {
                            id: 'msg-1',
                            author: { role: 'user' },
                            content: { parts: ['Hello'] }
                        }
                    },
                    'msg-2': {
                        message: {
                            id: 'msg-2',
                            author: { role: 'assistant' },
                            content: { parts: ['Hi there!'] }
                        }
                    }
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('conv-123');

            expect(result).toBeDefined();
            expect(result.id).toBe('conv-123');
            expect(result.platform).toBe('chatgpt');
            expect(result.title).toBe('Test Conversation');
            expect(fetch).toHaveBeenCalledWith(
                'https://chatgpt.com/backend-api/conversation/conv-123',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token-123'
                    })
                })
            );
        });

        it('should handle 401 token expiration', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
                chatgpt_token: 'Bearer expired-token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401
            });

            await expect(adapter.fetchConversation('conv-123')).rejects.toThrow(
                'Token expired. Please refresh the page.'
            );

            expect(chrome.storage.local.remove).toHaveBeenCalledWith(['chatgpt_token']);
        });

        it('should throw error when token is missing', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

            await expect(adapter.fetchConversation('conv-123')).rejects.toThrow(
                'Token not found: chatgpt_token'
            );
        });
    });
});
