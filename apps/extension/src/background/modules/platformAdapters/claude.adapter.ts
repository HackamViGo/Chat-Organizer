/**
 * Claude Platform Adapter
 */

import { BasePlatformAdapter, type Conversation } from './base';
import { normalizeClaude } from '../../../lib/normalizers.js';
import { limiters } from '../../../lib/rate-limiter.js';
import { logger } from '../../../lib/logger';

export class ClaudeAdapter extends BasePlatformAdapter {
    readonly platform = 'claude';

    async fetchConversation(id: string, providedUrl?: string): Promise<Conversation> {
        return limiters.claude.schedule(async () => {
            // Get organization ID from storage
            const { claude_org_id } = await this.getStorageValues(['claude_org_id']);

            if (!claude_org_id) {
                logger.error('Claude', 'Organization ID not found');
                throw new Error('Claude Organization ID not found. Please refresh the page.');
            }

            logger.debug('Claude', `Fetching conversation: ${id} for org: ${claude_org_id}`);

            // Fetch conversation from Claude API
            const response = await fetch(
                `https://claude.ai/api/organizations/${claude_org_id}/chat_conversations/${id}`,
                {
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                logger.error('Claude', `API error: ${response.status}`, response.statusText);
                throw new Error(`Claude API error: ${response.status}`);
            }

            // Parse and normalize response
            const data = await response.json();
            logger.debug('Claude', 'Raw response parsed', { 
                messageCount: data.chat_messages?.length,
                uuid: data.uuid,
                name: data.name
            });

            const conversation = normalizeClaude(data);

            // Set URL
            if (providedUrl && providedUrl.includes('claude.ai')) {
                conversation.url = providedUrl;
            } else {
                conversation.url = `https://claude.ai/chat/${id}`;
            }

            return conversation;
        });
    }
}
