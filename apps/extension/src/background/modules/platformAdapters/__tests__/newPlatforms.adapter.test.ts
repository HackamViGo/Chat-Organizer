/**
 * New Platforms Adapter Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrokAdapter, PerplexityAdapter, DeepSeekAdapter, QwenAdapter } from '../index';

describe('New Platform Adapters', () => {
    
    describe('GrokAdapter', () => {
        let adapter: GrokAdapter;
        beforeEach(() => { adapter = new GrokAdapter(); });

        it('should fetch conversation successfully', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({ 
                grok_auth_token: 'Bearer test-grok',
                grok_csrf_token: 'test-csrf'
            });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ 
                    id: 'grok-123', 
                    title: 'Grok Chat',
                    messages: [{ role: 'user', text: 'Hello' }] 
                })
            });

            const result = await adapter.fetchConversation('grok-123');
            expect(result.id).toBe('grok-123');
            expect(result.platform).toBe('grok');
        });
    });

    describe('PerplexityAdapter', () => {
        let adapter: PerplexityAdapter;
        beforeEach(() => { adapter = new PerplexityAdapter(); });

        it('should fetch conversation successfully', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({ perplexity_session: 'test-pplx' });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ 
                    thread: {
                        slug: 'pplx-123',
                        title: 'Pplx Title',
                        messages: []
                    }
                })
            });

            const result = await adapter.fetchConversation('pplx-123');
            expect(result.id).toBe('pplx-123');
            expect(result.platform).toBe('perplexity');
        });
    });

    describe('DeepSeekAdapter', () => {
        let adapter: DeepSeekAdapter;
        beforeEach(() => { adapter = new DeepSeekAdapter(); });

        it('should fetch conversation successfully', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({ deepseek_token: 'Bearer test-ds' });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ 
                    chat_session: {
                        id: 'ds-123',
                        title: 'DS Title'
                    },
                    messages: []
                })
            });

            const result = await adapter.fetchConversation('ds-123');
            expect(result.id).toBe('ds-123');
            expect(result.platform).toBe('deepseek');
        });
    });

    describe('QwenAdapter', () => {
        let adapter: QwenAdapter;
        beforeEach(() => { adapter = new QwenAdapter(); });

        it('should fetch conversation successfully', async () => {
            vi.mocked(chrome.storage.local.get as any).mockResolvedValue({ 
                qwen_xsrf_token: 'test-xsrf'
            });
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ 
                    data: {
                        id: 'qwen-123',
                        title: 'Qwen Title',
                        messages: []
                    }
                })
            });

            const result = await adapter.fetchConversation('qwen-123');
            expect(result.id).toBe('qwen-123');
            expect(result.platform).toBe('qwen');
        });
    });
});
