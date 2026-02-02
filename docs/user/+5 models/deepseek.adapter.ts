/**
 * DeepSeek Platform Adapter
 * 
 * Platform: https://chat.deepseek.com
 * Auth: Bearer JWT in Authorization header
 * API: /api/v0/chat_session/get_session
 */

import { BasePlatformAdapter, type Conversation, type Message } from './base';
import { limiters } from '../../../lib/rate-limiter.js';

const DEBUG_MODE = false;

export class DeepSeekAdapter extends BasePlatformAdapter {
    readonly platform = 'deepseek';

    async fetchConversation(sessionId: string, url?: string): Promise<Conversation> {
        return limiters.deepseek.schedule(async () => {
            // Get auth token from storage
            const { deepseek_token } = await this.getStorageValues(['deepseek_token']);

            if (!deepseek_token) {
                throw new Error('DeepSeek token not found. Please refresh the page.');
            }

            // Fetch conversation from DeepSeek API
            const response = await fetch(
                `https://chat.deepseek.com/api/v0/chat_session/get_session?session_id=${sessionId}`,
                {
                    headers: {
                        'Authorization': deepseek_token,
                        'Content-Type': 'application/json',
                        'x-client-version': '1.0.0'
                    },
                    credentials: 'include'
                }
            );

            // Handle token expiration
            if (response.status === 401) {
                await this.removeStorageKeys(['deepseek_token']);
                throw new Error('DeepSeek token expired. Please refresh the page.');
            }

            if (!response.ok) {
                throw new Error(`DeepSeek API error: ${response.status}`);
            }

            // Parse and normalize response
            const data = await response.json();
            const conversation = this.normalizeDeepSeek(data, sessionId);

            // Set URL
            if (url && url.includes('deepseek.com')) {
                conversation.url = url;
            } else {
                conversation.url = `https://chat.deepseek.com/chat/${sessionId}`;
            }

            return conversation;
        });
    }

    /**
     * Normalize DeepSeek API response to standard format
     */
    private normalizeDeepSeek(data: any, sessionId: string): Conversation {
        const messages: Message[] = [];

        // Extract messages from selection_list
        if (data.data?.selection_list) {
            for (const item of data.data.selection_list) {
                messages.push({
                    role: item.role === 'user' ? 'user' : 'assistant',
                    content: item.content || '',
                    timestamp: item.created_at ? new Date(item.created_at).getTime() : Date.now()
                });
            }
        }

        // Extract title (fallback to first user message)
        let title = data.data?.title || data.data?.name || 'Untitled DeepSeek Chat';
        if (title === 'Untitled DeepSeek Chat' && messages.length > 0) {
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
            created_at: data.data?.created_at ? new Date(data.data.created_at).getTime() : Date.now(),
            updated_at: data.data?.updated_at ? new Date(data.data.updated_at).getTime() : Date.now()
        };
    }
}
