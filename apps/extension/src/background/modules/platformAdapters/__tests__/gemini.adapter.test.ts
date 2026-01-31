/**
 * Gemini Adapter Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiAdapter } from '../gemini.adapter';

describe('GeminiAdapter', () => {
    let adapter: GeminiAdapter;

    beforeEach(() => {
        adapter = new GeminiAdapter();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchConversation', () => {
        it('should fetch conversation successfully', async () => {
            // Mock storage with AT token and dynamic key
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
                gemini_at_token: 'ATXyz123',
                gemini_dynamic_key: 'SNlM0e'
            });

            // Mock Gemini API response (complex format)
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
                                    [['Hi! How can I assist?', 1]]
                                ]
                            ]
                        ]
                    ]),
                    null,
                    'generic'
                ]
            ]);

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: async () => mockGeminiResponse
            });

            const result = await adapter.fetchConversation('test-789');

            expect(result).toBeDefined();
            expect(result.platform).toBe('gemini');
            expect(fetch).toHaveBeenCalledWith(
                'https://gemini.google.com/u/0/_/BardChatUi/data/batchexecute?rpcids=SNlM0e',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'X-Same-Domain': '1'
                    })
                })
            );
        });

        it('should handle 403 key expiration', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
                gemini_at_token: 'ATXyz123',
                gemini_dynamic_key: 'SNlM0e'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                text: async () => 'Forbidden'
            });

            await expect(adapter.fetchConversation('test-789')).rejects.toThrow(
                'Gemini key expired/invalid'
            );

            expect(chrome.storage.local.remove).toHaveBeenCalledWith(['gemini_dynamic_key']);
        });

        it('should throw error when AT token is missing', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
                gemini_dynamic_key: 'SNlM0e'
            });

            await expect(adapter.fetchConversation('test-789')).rejects.toThrow(
                'Gemini AT token not found'
            );
        });

        it('should throw error when dynamic key is missing', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
                gemini_at_token: 'ATXyz123'
            });

            await expect(adapter.fetchConversation('test-789')).rejects.toThrow(
                'Gemini dynamic key not found'
            );
        });
    });
});
