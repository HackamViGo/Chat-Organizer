/**
 * ChatGPT Platform Adapter
 */

import { BasePlatformAdapter, type Conversation } from './base';
import { normalizeChatGPT } from '../../../lib/normalizers';
import { validateConversation } from '../../../lib/schemas';
import { limiters } from '../../../lib/rate-limiter';
import { logger } from '../../../lib/logger';

export class ChatGPTAdapter extends BasePlatformAdapter {
    readonly platform = 'chatgpt';

    async fetchConversation(id: string): Promise<Conversation> {
        return limiters.chatgpt.schedule(async () => {
            // Get token from storage
            const token = await this.getStorageToken('chatgpt_token');

            // Fetch conversation from ChatGPT API
            const response = await fetch(`https://chatgpt.com/backend-api/conversation/${id}`, {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            // Handle token expiration
            if (response.status === 401) {
                await this.removeStorageKeys(['chatgpt_token']);
                throw new Error('Token expired. Please refresh the page.');
            }

            if (!response.ok) {
                throw new Error(`ChatGPT API error: ${response.status}`);
            }

            // Parse and normalize response
            const data = await response.json();
            const conversation = normalizeChatGPT(data);

            // Validate (optional, for debugging)
            const validation = validateConversation(conversation);
            if (!validation.valid) {
                logger.warn('ChatGPTAdapter', 'Validation warning:', validation.error);
            }

            return conversation;
        });
    }
}
