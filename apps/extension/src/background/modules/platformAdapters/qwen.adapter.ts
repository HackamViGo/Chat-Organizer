/**
 * Qwen Platform Adapter (Alibaba)
 * 
 * Platform: https://chat.qwenlm.ai
 * Auth: X-Xsrf-Token or Bearer
 * API: /api/v1/sessions/{id}/messages
 */

import { BasePlatformAdapter, type Conversation, type Message } from './base';
import { limiters } from '../../../lib/rate-limiter.js';

const DEBUG_MODE = false;

export class QwenAdapter extends BasePlatformAdapter {
    readonly platform = 'qwen';

    async fetchConversation(sessionId: string, url?: string, payload?: any): Promise<Conversation> {
        return limiters.qwen.schedule(async () => {
            // Use scraped data if provided (fallback)
            if (payload && payload.messages && payload.messages.length > 0) {
                return {
                    id: sessionId,
                    title: payload.title || 'Qwen Conversation',
                    platform: this.platform,
                    messages: payload.messages,
                    url: url || `https://chat.qwen.ai/c/${sessionId}`,
                    created_at: Date.now(),
                    updated_at: Date.now()
                };
            }

            // Get auth tokens from storage
            const { qwen_xsrf_token, qwen_app_id } = await this.getStorageValues([
                'qwen_xsrf_token',
                'qwen_app_id'
            ]);

            if (!qwen_xsrf_token) {
                throw new Error('Qwen auth token not found. Please refresh the page.');
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Xsrf-Token': qwen_xsrf_token
            };

            if (qwen_app_id) {
                headers['x-app-id'] = qwen_app_id;
            }

            // Fetch messages from Qwen API
            const response = await fetch(
                `https://chat.qwenlm.ai/api/v1/sessions/${sessionId}/messages`,
                {
                    headers,
                    credentials: 'include'
                }
            );

            // Handle auth errors
            if (response.status === 401 || response.status === 403) {
                await this.removeStorageKeys(['qwen_xsrf_token']);
                throw new Error('Qwen session expired. Please refresh the page.');
            }

            if (!response.ok) {
                throw new Error(`Qwen API error: ${response.status}`);
            }

            // Parse and normalize response
            const data = await response.json();
            const conversation = this.normalizeQwen(data, sessionId);

            // Set URL
            if (url && url.includes('qwenlm.ai')) {
                conversation.url = url;
            } else {
                conversation.url = `https://chat.qwenlm.ai/chat/${sessionId}`;
            }

            return conversation;
        });
    }

    /**
     * Normalize Qwen API response to standard format
     */
    private normalizeQwen(data: any, sessionId: string): Conversation {
        const messages: Message[] = [];

        // Extract messages from messages array
        if (data.messages) {
            for (const msg of data.messages) {
                messages.push({
                    id: crypto.randomUUID(),
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content || '',
                    timestamp: msg.timestamp ? msg.timestamp * 1000 : Date.now()
                });
            }
        }

        // Extract title
        let title = data.title || data.session_name || 'Untitled Qwen Chat';
        if (title === 'Untitled Qwen Chat' && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                title = firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
            }
        }

        return {
            id: sessionId,
            title,
            platform: this.platform,
            messages,
            created_at: data.created_at ? data.created_at * 1000 : Date.now(),
            updated_at: data.updated_at ? data.updated_at * 1000 : Date.now()
        };
    }
}
