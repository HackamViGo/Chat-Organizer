/**
 * Perplexity Platform Adapter
 * 
 * Platform: https://www.perplexity.ai
 * Auth: Session Cookie + JWT
 * API: /api/predict/get_thread
 */

import { BasePlatformAdapter, type Conversation, type Message } from './base';
import { limiters } from '../../../lib/rate-limiter.js';

const DEBUG_MODE = false;

export class PerplexityAdapter extends BasePlatformAdapter {
    readonly platform = 'perplexity';

    async fetchConversation(threadSlug: string, url?: string, payload?: any): Promise<Conversation> {
        return limiters.perplexity.schedule(async () => {
            // Use scraped data if available (fallback for failed API or 404s)
            if (payload && payload.messages && payload.messages.length > 0) {
                return {
                    id: threadSlug,
                    title: payload.title || 'Perplexity Chat',
                    platform: this.platform,
                    messages: payload.messages,
                    url: url || `https://www.perplexity.ai/search/${threadSlug}`,
                    created_at: Date.now(),
                    updated_at: Date.now()
                };
            }

            // Get session token from storage (optional for some endpoints)
            const { perplexity_session } = await this.getStorageValues(['perplexity_session']);

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'x-api-version': '2024-01-01',
                'User-Agent': 'Mozilla/5.0'
            };

            if (perplexity_session) {
                headers['Authorization'] = `Bearer ${perplexity_session}`;
            }

            // Fetch thread from Perplexity API
            // Note: Perplexity API endpoints change frequently.
            // Try /rest/threads/{slug} which is often used for page hydration
            const response = await fetch(
                `https://www.perplexity.ai/rest/threads/${threadSlug}`,
                {
                    headers,
                    credentials: 'include'
                }
            );

            if (response.status === 401 || response.status === 403) {
                await this.removeStorageKeys(['perplexity_session']);
                throw new Error('Perplexity session expired. Please refresh the page.');
            }

            if (!response.ok) {
                throw new Error(`Perplexity API error: ${response.status}`);
            }

            // Parse and normalize response
            const data = await response.json();
            const conversation = this.normalizePerplexity(data, threadSlug);

            // Set URL
            if (url && url.includes('perplexity.ai')) {
                conversation.url = url;
            } else {
                conversation.url = `https://www.perplexity.ai/search/${threadSlug}`;
            }

            return conversation;
        });
    }

    /**
     * Normalize Perplexity API response to standard format
     */
    private normalizePerplexity(data: any, threadSlug: string): Conversation {
        const messages: Message[] = [];

        // Extract messages from thread
        if (data.thread?.messages) {
            for (const msg of data.thread.messages) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.text || msg.content || '',
                    timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
                });
            }
        }

        // Extract title
        let title = data.thread?.title || data.thread?.query || 'Untitled Perplexity Search';
        if (title === 'Untitled Perplexity Search' && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                title = firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '');
            }
        }

        return {
            id: threadSlug,
            title,
            platform: this.platform,
            messages,
            created_at: data.thread?.created_at ? new Date(data.thread.created_at).getTime() : Date.now(),
            updated_at: data.thread?.updated_at ? new Date(data.thread.updated_at).getTime() : Date.now()
        };
    }
}
