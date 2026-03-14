import { Normalizers } from '../../shared/normalizers';
import { DashboardPayload } from '../../shared/types';

export const ClaudeAdapter = {
  async fetchConversation(orgId: string, conversationId: string): Promise<DashboardPayload | null> {
    try {
      const response = await fetch(`https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}?include_chat_messages=true`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) return null;
      
      const rawData = await response.json();
      return Normalizers.claude(rawData);
    } catch (error) {
      console.error('ClaudeAdapter error:', error);
      return null;
    }
  }
};
