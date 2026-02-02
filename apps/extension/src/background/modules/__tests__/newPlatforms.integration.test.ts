/**
 * New Platforms Integration Tests
 * 
 * End-to-end tests for:
 * - Token capture for all new platforms
 * - Complete save flow
 * - Multi-platform token sync
 * - Error recovery
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepSeekAdapter } from '../platformAdapters/deepseek.adapter';
import { PerplexityAdapter } from '../platformAdapters/perplexity.adapter';
import { GrokAdapter } from '../platformAdapters/grok.adapter';
import { QwenAdapter } from '../platformAdapters/qwen.adapter';
import { LMArenaAdapter } from '../platformAdapters/lmarena.adapter';
import { getAdapter, isPlatformSupported, getSupportedPlatforms } from '../platformAdapters/index';
import { resetAllMocks } from '../../../__tests__/setup';
import * as dashboardApi from '../dashboardApi';

vi.mock('../dashboardApi');

describe('New Platforms Integration Tests', () => {
    beforeEach(() => {
        resetAllMocks();
        vi.clearAllMocks();
    });

    // ========================================================================
    // PLATFORM REGISTRY
    // ========================================================================

    describe('Platform Registry', () => {
        it('should register all new platforms', () => {
            const supportedPlatforms = getSupportedPlatforms();

            expect(supportedPlatforms).toContain('deepseek');
            expect(supportedPlatforms).toContain('perplexity');
            expect(supportedPlatforms).toContain('grok');
            expect(supportedPlatforms).toContain('qwen');
            expect(supportedPlatforms).toContain('lmarena');
        });

        it('should detect platform support', () => {
            expect(isPlatformSupported('deepseek')).toBe(true);
            expect(isPlatformSupported('perplexity')).toBe(true);
            expect(isPlatformSupported('grok')).toBe(true);
            expect(isPlatformSupported('qwen')).toBe(true);
            expect(isPlatformSupported('lmarena')).toBe(true);
            expect(isPlatformSupported('unsupported')).toBe(false);
        });

        it('should return correct adapters', () => {
            expect(getAdapter('deepseek')).toBeInstanceOf(DeepSeekAdapter);
            expect(getAdapter('perplexity')).toBeInstanceOf(PerplexityAdapter);
            expect(getAdapter('grok')).toBeInstanceOf(GrokAdapter);
            expect(getAdapter('qwen')).toBeInstanceOf(QwenAdapter);
            expect(getAdapter('lmarena')).toBeInstanceOf(LMArenaAdapter);
        });

        it('should throw for unsupported platforms', () => {
            expect(() => getAdapter('unknown')).toThrow('Unsupported platform: unknown');
        });

        it('should have 8 total platforms', () => {
            const platforms = getSupportedPlatforms();
            expect(platforms).toHaveLength(8); // 3 original + 5 new
        });
    });

    // ========================================================================
    // COMPLETE SAVE FLOW - DeepSeek
    // ========================================================================

    describe('DeepSeek Complete Flow', () => {
        it('should complete full save flow', async () => {
            // Setup: Store token
            await chrome.storage.local.set({
                deepseek_token: 'Bearer deepseek-token',
                accessToken: 'dashboard-token'
            });

            // Mock DeepSeek API
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    data: {
                        session_id: 'deepseek-session-123',
                        title: 'DeepSeek Integration Test',
                        selection_list: [
                            {
                                role: 'user',
                                content: 'Test message',
                                created_at: '2026-02-01T10:00:00Z'
                            }
                        ]
                    }
                })
            });

            // Mock Dashboard API
            (dashboardApi.saveToDashboard as any).mockResolvedValue({
                id: 'saved-deepseek-123',
                success: true
            });

            const adapter = getAdapter('deepseek');
            const conversation = await adapter.fetchConversation('deepseek-session-123');

            expect(conversation.platform).toBe('deepseek');
            expect(conversation.messages).toHaveLength(1);

            const saveResult = await dashboardApi.saveToDashboard(conversation, null, false);

            expect(dashboardApi.saveToDashboard).toHaveBeenCalledWith(
                expect.objectContaining({
                    platform: 'deepseek',
                    title: 'DeepSeek Integration Test'
                }),
                null,
                false
            );

            expect(saveResult.success).toBe(true);
        });
    });

    // ========================================================================
    // COMPLETE SAVE FLOW - Perplexity
    // ========================================================================

    describe('Perplexity Complete Flow', () => {
        it('should save Perplexity search thread', async () => {
            await chrome.storage.local.set({
                perplexity_session: 'perplexity-jwt',
                accessToken: 'dashboard-token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    thread: {
                        slug: 'perplexity-thread-456',
                        query: 'AI integration test',
                        messages: [
                            {
                                role: 'user',
                                text: 'Query text'
                            }
                        ]
                    }
                })
            });

            (dashboardApi.saveToDashboard as any).mockResolvedValue({
                id: 'saved-perplexity-456',
                success: true
            });

            const adapter = getAdapter('perplexity');
            const conversation = await adapter.fetchConversation('perplexity-thread-456');

            await dashboardApi.saveToDashboard(conversation, null, false);

            expect(dashboardApi.saveToDashboard).toHaveBeenCalledWith(
                expect.objectContaining({
                    platform: 'perplexity'
                }),
                null,
                false
            );
        });
    });

    // ========================================================================
    // COMPLETE SAVE FLOW - Grok
    // ========================================================================

    describe('Grok Complete Flow', () => {
        it('should save Grok conversation with dual tokens', async () => {
            await chrome.storage.local.set({
                grok_csrf_token: 'csrf-token',
                grok_auth_token: 'Bearer oauth-token',
                accessToken: 'dashboard-token'
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    conversation_id: 'grok-conv-789',
                    items: [
                        {
                            sender: 1,
                            message: 'Grok test'
                        }
                    ]
                })
            });

            (dashboardApi.saveToDashboard as any).mockResolvedValue({
                id: 'saved-grok-789',
                success: true
            });

            const adapter = getAdapter('grok');
            const conversation = await adapter.fetchConversation('grok-conv-789');

            await dashboardApi.saveToDashboard(conversation, null, false);

            expect(dashboardApi.saveToDashboard).toHaveBeenCalledWith(
                expect.objectContaining({
                    platform: 'grok'
                }),
                null,
                false
            );
        });
    });

    // ========================================================================
    // MULTI-PLATFORM TOKEN SYNC
    // ========================================================================

    describe('Multi-Platform Token Sync', () => {
        it('should store tokens from all new platforms simultaneously', async () => {
            // Simulate tokens being captured
            await chrome.storage.local.set({
                deepseek_token: 'Bearer deepseek',
                perplexity_session: 'perplexity-jwt',
                grok_csrf_token: 'grok-csrf',
                grok_auth_token: 'grok-auth',
                qwen_xsrf_token: 'qwen-xsrf',
                lmarena_session_hash: 'arena-session'
            });

            const storage = (chrome.storage.local as any)._getInternalStorage();

            expect(storage.deepseek_token).toBeDefined();
            expect(storage.perplexity_session).toBeDefined();
            expect(storage.grok_csrf_token).toBeDefined();
            expect(storage.grok_auth_token).toBeDefined();
            expect(storage.qwen_xsrf_token).toBeDefined();
            expect(storage.lmarena_session_hash).toBeDefined();
        });

        it('should fetch conversations from multiple platforms', async () => {
            // Setup tokens for all platforms
            await chrome.storage.local.set({
                deepseek_token: 'Bearer deepseek',
                perplexity_session: 'perplexity',
                grok_csrf_token: 'csrf',
                grok_auth_token: 'auth',
                qwen_xsrf_token: 'qwen',
                lmarena_session_hash: 'arena'
            });

            // Mock all platform APIs
            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        data: { session_id: 'ds', selection_list: [] }
                    })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        thread: { slug: 'pp', messages: [] }
                    })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        items: []
                    })
                });

            // Fetch from multiple platforms
            const deepseek = await getAdapter('deepseek').fetchConversation('ds');
            const perplexity = await getAdapter('perplexity').fetchConversation('pp');
            const grok = await getAdapter('grok').fetchConversation('grok');

            expect(deepseek.platform).toBe('deepseek');
            expect(perplexity.platform).toBe('perplexity');
            expect(grok.platform).toBe('grok');
        });
    });

    // ========================================================================
    // ERROR RECOVERY ACROSS PLATFORMS
    // ========================================================================

    describe('Error Recovery', () => {
        it('should handle token expiration on all platforms', async () => {
            const platforms = ['deepseek', 'perplexity', 'grok', 'qwen', 'lmarena'];

            for (const platform of platforms) {
                // Setup expired tokens
                if (platform === 'grok') {
                    await chrome.storage.local.set({
                        grok_csrf_token: 'expired',
                        grok_auth_token: 'expired'
                    });
                } else if (platform === 'lmarena') {
                    await chrome.storage.local.set({
                        lmarena_session_hash: 'expired'
                    });
                } else {
                    await chrome.storage.local.set({
                        [`${platform}_token`]: 'expired',
                        [`${platform}_session`]: 'expired',
                        [`${platform}_xsrf_token`]: 'expired'
                    });
                }

                global.fetch = vi.fn().mockResolvedValue({
                    ok: false,
                    status: 401
                });

                const adapter = getAdapter(platform);

                await expect(
                    adapter.fetchConversation('test-id')
                ).rejects.toThrow();
            }
        });

        it('should handle network errors gracefully', async () => {
            const platforms = ['deepseek', 'perplexity', 'grok', 'qwen', 'lmarena'];

            for (const platform of platforms) {
                // Setup valid tokens
                await chrome.storage.local.set({
                    deepseek_token: 'Bearer token',
                    perplexity_session: 'token',
                    grok_csrf_token: 'csrf',
                    grok_auth_token: 'auth',
                    qwen_xsrf_token: 'xsrf',
                    lmarena_session_hash: 'session'
                });

                global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

                const adapter = getAdapter(platform);

                await expect(
                    adapter.fetchConversation('test-id')
                ).rejects.toThrow('Network error');
            }
        });
    });

    // ========================================================================
    // RATE LIMITING
    // ========================================================================

    describe('Rate Limiting', () => {
        it('should apply rate limits to all platforms', async () => {
            // This test verifies rate limiters exist
            const { limiters } = await import('../../../lib/rate-limiter');

            expect(limiters.deepseek).toBeDefined();
            expect(limiters.perplexity).toBeDefined();
            expect(limiters.grok).toBeDefined();
            expect(limiters.qwen).toBeDefined();
            expect(limiters.lmarena).toBeDefined();
        });
    });
});
