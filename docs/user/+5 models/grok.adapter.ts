/**
 * Grok Platform Adapter (X.com)
 * 
 * Platform: https://x.com/i/grok
 * Auth: Session Cookie + x-csrf-token
 * API: /i/api/1.1/grok/history.json
 */

import { BasePlatformAdapter, type Conversation, type Message } from './base';
import { limiters } from '../../../lib/rate-limiter.js';

const DEBUG_MODE = false;

export class GrokAdapter extends BasePlatformAdapter {
    readonly platform = 'grok';

    async fetchConversation(conversationId: string, url?: string): Promise<Conversation> {
        return limiters.grok.schedule(async () => {
            // Get auth tokens from storage
            const { grok_csrf_token, grok_auth_token } = await this.getStorageValues([
                'grok_csrf_token',
                'grok_auth_token'
            ]);

            if (!grok_csrf_token || !grok_auth_token) {
                throw new Error('Grok authentication tokens not found. Please refresh the page.');
            }

            // Fetch conversation history
            const response = await fetch(
                'https://x.com/i/api/1.1/grok/history.json',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': grok_auth_token,
                        'x-csrf-token': grok_csrf_token,
                        'x-twitter-auth-type': 'OAuth2Session'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        conversation_id: conversationId
                    })
                }
            );

            // Handle auth errors
            if (response.status === 401 || response.status === 403) {
                await this.removeStorageKeys(['grok_csrf_token', 'grok_auth_token']);
                throw new Error('Grok session expired. Please refresh the page.');
            }

            if (!response.ok) {
                throw new Error(`Grok API error: ${response.status}`);
            }

            // Parse and normalize response
            const data = await response.json();
            const conversation = this.normalizeGrok(data, conversationId);

            // Set URL
            if (url && url.includes('x.com/i/grok')) {
                conversation.url = url;
            } else {
                conversation.url = `https://x.com/i/grok?conversation_id=${conversationId}`;
            }

            return conversation;
        });
    }

    /**
     * Normalize Grok API response to standard format
     */
    private normalizeGrok(data: any, conversationId: string): Conversation {
        const messages: Message[] = [];

        // Extract messages from items
        if (data.items) {
            for (const item of data.items) {
                // sender: 1 = user, 2 = bot (Grok)
                const role = item.sender === 1 ? 'user' : 'assistant';
                
                messages.push({
                    role,
                    content: item.message || item.text || '',
                    timestamp: item.timestamp ? item.timestamp * 1000 : Date.now()
                });
            }
        }

        // Extract title (Grok doesn't provide titles, use first user message)
        let title = 'Grok Conversation';
        if (messages.length > 0) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                title = firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
            }
        }

        return {
            id: conversationId,
            title,
            platform: this.platform,
            messages,
            created_at: data.created_at ? data.created_at * 1000 : Date.now(),
            updated_at: data.updated_at ? data.updated_at * 1000 : Date.now()
        };
    }
}
