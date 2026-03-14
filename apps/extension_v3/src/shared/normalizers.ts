/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Message, DashboardPayload } from './types';

export const Normalizers = {
  chatgpt(rawData: any): DashboardPayload {
    const messages: Message[] = [];
    let currentNodeId = rawData.current_node;

    if (currentNodeId && rawData.mapping[currentNodeId]) {
      while (currentNodeId) {
        const node = rawData.mapping[currentNodeId];
        if (node.message) {
          this._processChatGPTMessage(node.message, messages);
        }
        currentNodeId = node.parent;
      }
      messages.reverse();
    }

    return {
      conversationId: rawData.conversation_id || rawData.id,
      title: rawData.title || 'ChatGPT Chat',
      platform: 'chatgpt',
      messages,
      url: `https://chatgpt.com/c/${rawData.conversation_id || rawData.id}`,
      created_at: (rawData.create_time || Date.now() / 1000) * 1000,
      updated_at: (rawData.update_time || Date.now() / 1000) * 1000,
      metadata: { source: 'network', version: 'v3' }
    };
  },

  claude(rawData: any): DashboardPayload {
    const messages = (rawData.chat_messages || []).map((msg: any) => ({
      id: msg.uuid,
      role: msg.sender === 'human' ? 'user' : 'assistant',
      content: msg.text,
      timestamp: new Date(msg.created_at).getTime(),
      attachments: msg.attachments?.map((a: any) => a.url)
    }));

    return {
      conversationId: rawData.uuid,
      title: rawData.name || 'Claude Chat',
      platform: 'claude',
      messages,
      url: `https://claude.ai/chat/${rawData.uuid}`,
      created_at: new Date(rawData.created_at).getTime(),
      updated_at: new Date(rawData.updated_at).getTime(),
      metadata: { source: 'network', version: 'v3' }
    };
  },

  grok(rawData: any): DashboardPayload {
    const rawItems = rawData.items || [];
    const messages: Message[] = rawItems.map((item: any) => ({
      id: item.id || `grok_${Date.now()}_${Math.random()}`,
      role: item.sender === 1 ? 'user' : 'assistant',
      content: item.message,
      timestamp: Date.now()
    }));

    return {
      conversationId: rawData.conversation_id || `grok_${Date.now()}`,
      title: messages.length > 0 ? messages[0].content.substring(0, 50) : 'Grok Chat',
      platform: 'grok',
      messages,
      url: `https://grok.com/chat/${rawData.conversation_id || ''}`,
      created_at: Date.now(),
      updated_at: Date.now(),
      metadata: { source: 'network', version: 'v3' }
    };
  },

  perplexity(rawData: any): DashboardPayload {
    const thread = rawData.thread || {};
    const messages: Message[] = (thread.messages || []).map((msg: any) => ({
      id: msg.id || `perp_${Date.now()}_${Math.random()}`,
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text,
      timestamp: Date.now()
    }));

    return {
      conversationId: thread.slug || `perp_${Date.now()}`,
      title: thread.title || 'Perplexity Thread',
      platform: 'perplexity',
      messages,
      url: `https://www.perplexity.ai/search/${thread.slug || ''}`,
      created_at: Date.now(),
      updated_at: Date.now(),
      metadata: { source: 'network', version: 'v3' }
    };
  },

  gemini(rawData: any, conversationId: string): DashboardPayload {
    const extracted = this._extractGeminiMessages(rawData);
    const messages: Message[] = extracted.map((msg: any, idx: number) => ({
      id: msg.id || `gemini_msg_${idx}`,
      role: msg.role,
      content: msg.text,
      timestamp: msg.timestamp || Date.now(),
      images: msg.images,
      attachments: msg.attachments
    }));

    return {
      conversationId,
      title: this._extractGeminiTitle(rawData) || 'Gemini Chat',
      platform: 'gemini',
      messages,
      url: `https://gemini.google.com/app/${conversationId}`,
      created_at: Date.now(),
      updated_at: Date.now(),
      metadata: { source: 'network', version: 'v3' }
    };
  },

  _processChatGPTMessage(msg: any, targetArray: Message[]) {
    if (!msg.content || !msg.content.parts) return;
    const content = msg.content.parts.join('\n');
    if (!content.trim()) return;

    targetArray.push({
      id: msg.id,
      role: msg.author.role === 'user' ? 'user' : 'assistant',
      content,
      timestamp: msg.create_time * 1000,
      attachments: msg.metadata?.attachments?.map((a: any) => a.id)
    });
  },

  _extractGeminiMessages(data: any, depth = 0): any[] {
    const messages: any[] = [];
    if (depth > 10 || !data) return messages;

    if (Array.isArray(data)) {
      for (const item of data) {
        if (Array.isArray(item) && item.length > 0) {
          const first = item[0];
          if (typeof first === 'string' && first.match(/^[cr]c?_[a-zA-Z0-9_-]+$/)) {
            messages.push(...this._extractGeminiMessages(item, depth + 1));
          } else if (typeof first === 'string' && !this._isTechnicalData(first)) {
            const msg = this._parseGeminiMessageArray(item);
            if (msg) messages.push(msg);
          } else {
            messages.push(...this._extractGeminiMessages(item, depth + 1));
          }
        } else {
          messages.push(...this._extractGeminiMessages(item, depth + 1));
        }
      }
    }
    return messages;
  },

  _isTechnicalData(text: string): boolean {
    if (!text || text.length < 15) return true;
    if (text.match(/^[cr]c?_[a-zA-Z0-9_-]+$/)) return true;
    if (text.match(/^[0-9a-f]{20,}$/i)) return true;
    return false;
  },

  _parseGeminiMessageArray(arr: any[]): any {
    const text = arr[0];
    if (typeof text !== 'string' || this._isTechnicalData(text)) return null;

    const images: string[] = [];
    this._extractImagesFromArray(arr, images);

    return {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      role: this._determineGeminiRole(text),
      text: text.trim(),
      images,
      timestamp: Date.now()
    };
  },

  _extractImagesFromArray(arr: any, images: string[], depth = 0) {
    if (depth > 5 || !Array.isArray(arr)) return;
    for (const item of arr) {
      if (typeof item === 'string' && item.match(/^https?:\/\/.*(googleusercontent|gstatic).*\/image/)) {
        images.push(item);
      } else if (Array.isArray(item)) {
        this._extractImagesFromArray(item, images, depth + 1);
      }
    }
  },

  _determineGeminiRole(text: string): 'user' | 'assistant' {
    const trimmed = text.trim();
    if (trimmed.length < 100 && (trimmed.includes('?') || trimmed.match(/^(Продължи|Генерирай|Направи|Създай|Show|Tell|Show|Tell)/i))) {
      return 'user';
    }
    return 'assistant';
  },

  _extractGeminiTitle(data: any): string | null {
    const str = JSON.stringify(data);
    const match = str.match(/"title":\s*"([^"]+)"/);
    return match ? match[1] : null;
  }
};
