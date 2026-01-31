/**
 * Claude Adapter Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeAdapter } from '../claude.adapter';

describe('ClaudeAdapter', () => {
    let adapter: ClaudeAdapter;

    beforeEach(() => {
        adapter = new ClaudeAdapter();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchConversation', () => {
        it('should fetch conversation successfully', async () => {
            // Mock storage with org ID
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
                claude_org_id: 'org-abc123'
            });

            // Mock Claude API response
            const mockResponse = {
                uuid: 'conv-456',
                name: 'Test Claude Chat',
                created_at: '2024-01-01T00:00:00Z',
                chat_messages: [
                    {
                        uuid: 'msg-1',
                        sender: 'human',
                        text: 'Hello Claude'
                    },
                    {
                        uuid: 'msg-2',
                        sender: 'assistant',
                        text: 'Hello! How can I help?'
                    }
                ]
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse
            });

            const result = await adapter.fetchConversation('conv-456');

            expect(result).toBeDefined();
            expect(result.id).toBe('conv-456');
            expect(result.platform).toBe('claude');
            expect(result.url).toBe('https://claude.ai/chat/conv-456');
            expect(fetch).toHaveBeenCalledWith(
                'https://claude.ai/api/organizations/org-abc123/chat_conversations/conv-456',
                expect.objectContaining({
                    credentials: 'include'
                })
            );
        }, 10000); // Increased timeout

        it('should use provided URL when available', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({
                claude_org_id: 'org-abc123'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    uuid: 'conv-456',
                    name: 'Test',
                    chat_messages: []
                })
            });

            const result = await adapter.fetchConversation('conv-456', 'https://claude.ai/chat/conv-456?custom=param');
            expect(result.url).toBe('https://claude.ai/chat/conv-456?custom=param');
        }, 10000); // Increased timeout

        it('should throw error when org_id is missing', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({});

            try {
                await adapter.fetchConversation('conv-456');
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).toContain('Claude Organization ID not found');
            }
        }, 10000); // Increased timeout
    });
});
