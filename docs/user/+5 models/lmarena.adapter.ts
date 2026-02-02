/**
 * LMSYS Chatbot Arena Adapter
 * 
 * Platform: https://chat.lmsys.org
 * Auth: Gradio Session ID (usually anonymous)
 * API: Gradio /run/predict endpoint
 * Note: Complex due to Gradio framework internals
 */

import { BasePlatformAdapter, type Conversation, type Message } from './base';
import { limiters } from '../../../lib/rate-limiter.js';

const DEBUG_MODE = false;

export class LMArenaAdapter extends BasePlatformAdapter {
    readonly platform = 'lmarena';

    async fetchConversation(sessionId: string, url?: string): Promise<Conversation> {
        return limiters.lmarena.schedule(async () => {
            // Get Gradio session info from storage
            const { lmarena_session_hash, lmarena_fn_index } = await this.getStorageValues([
                'lmarena_session_hash',
                'lmarena_fn_index'
            ]);

            if (!lmarena_session_hash) {
                throw new Error('LMSYS Arena session not found. Please refresh the page.');
            }

            // Construct Gradio API request
            const fnIndex = lmarena_fn_index || '0'; // Default function index

            const response = await fetch(
                `https://chat.lmsys.org/run/predict`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fn_index: parseInt(fnIndex),
                        data: [sessionId],
                        session_hash: lmarena_session_hash
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`LMSYS Arena API error: ${response.status}`);
            }

            // Parse Gradio response
            const data = await response.json();
            const conversation = this.normalizeLMArena(data, sessionId);

            // Set URL
            if (url && url.includes('chat.lmsys.org')) {
                conversation.url = url;
            } else {
                conversation.url = `https://chat.lmsys.org/?session=${sessionId}`;
            }

            return conversation;
        });
    }

    /**
     * Normalize LMSYS Arena/Gradio response to standard format
     */
    private normalizeLMArena(data: any, sessionId: string): Conversation {
        const messages: Message[] = [];

        // Gradio returns data in data[0] typically
        const conversationData = data.data?.[0] || data;

        // Try to extract messages from various Gradio formats
        if (Array.isArray(conversationData)) {
            // Format 1: Array of [user_msg, bot_msg] pairs
            for (let i = 0; i < conversationData.length; i += 2) {
                if (conversationData[i]) {
                    messages.push({
                        role: 'user',
                        content: conversationData[i],
                        timestamp: Date.now()
                    });
                }
                if (conversationData[i + 1]) {
                    messages.push({
                        role: 'assistant',
                        content: conversationData[i + 1],
                        timestamp: Date.now()
                    });
                }
            }
        } else if (conversationData?.messages) {
            // Format 2: Object with messages array
            for (const msg of conversationData.messages) {
                messages.push({
                    role: msg.role || (msg.is_user ? 'user' : 'assistant'),
                    content: msg.content || msg.text || '',
                    timestamp: Date.now()
                });
            }
        }

        // Extract title (Arena doesn't have titles usually)
        let title = 'Chatbot Arena Conversation';
        if (messages.length > 0) {
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
            created_at: Date.now(),
            updated_at: Date.now()
        };
    }

    /**
     * LMSYS Arena specific: Extract session from window.gradio_config if available
     * This method is called from content script
     */
    static extractGradioSession(): { session_hash?: string; fn_index?: string } | null {
        try {
            // This runs in content script context
            const config = (window as any).gradio_config;
            if (config) {
                return {
                    session_hash: config.session_hash,
                    fn_index: config.fn_index?.toString()
                };
            }
        } catch (e) {
            console.error('[LMArena] Failed to extract Gradio config:', e);
        }
        return null;
    }
}
