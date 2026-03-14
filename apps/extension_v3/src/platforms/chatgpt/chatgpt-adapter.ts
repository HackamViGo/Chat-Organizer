import { Normalizers } from '../../shared/normalizers';
import { DashboardPayload } from '../../shared/types';

export const ChatGPTAdapter = {
  async fetchConversation(conversationId: string, bearerToken: string): Promise<DashboardPayload | null> {
    try {
      const response = await fetch(`https://chatgpt.com/backend-api/conversation/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) return null;
      
      const rawData = await response.json();
      return Normalizers.chatgpt(rawData);
    } catch (error) {
      console.error('ChatGPTAdapter error:', error);
      return null;
    }
  }
};
