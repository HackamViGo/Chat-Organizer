/**
 * Claude Platform Adapter
 */

import { BasePlatformAdapter, type Conversation } from './base';
import { normalizeClaude } from '../../../lib/normalizers.js';
import { limiters } from '../../../lib/rate-limiter.js';

export class ClaudeAdapter extends BasePlatformAdapter {
    readonly platform = 'claude';

    async fetchConversation(id: string, providedUrl?: string): Promise<Conversation> {
        return limiters.claude.schedule(async () => {
            // Get organization ID from storage
            const { claude_org_id } = await this.getStorageValues(['claude_org_id']);

            if (!claude_org_id) {
                throw new Error('Claude Organization ID not found. Please refresh the page.');
            }

            // Fetch conversation from Claude API
            const response = await fetch(
                `https://claude.ai/api/organizations/${claude_org_id}/chat_conversations/${id}`,
                {
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status}`);
            }

            // Parse and normalize response
            const data = await response.json();
            const conversation = normalizeClaude(data) as any;

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
