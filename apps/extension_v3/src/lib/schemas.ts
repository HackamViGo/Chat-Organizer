import { type Message } from '@brainbox/shared'

export const PLATFORMS = {
  CHATGPT: 'chatgpt', CLAUDE: 'claude', GEMINI: 'gemini',
  GROK: 'grok', PERPLEXITY: 'perplexity', DEEPSEEK: 'deepseek',
  QWEN: 'qwen', LMSYS: 'lmsys',
} as const

export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS]

export const ROLES = {
  USER: 'user', ASSISTANT: 'assistant', SYSTEM: 'system',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
export type { Message }

export interface Conversation {
  id: string
  platform: Platform
  title: string
  messages: Message[]
  url?: string
  created_at: number
  updated_at?: number
  metadata?: Record<string, unknown>
}

export function createConversation(
  data: Pick<Conversation, 'id' | 'platform' | 'title'> & Partial<Conversation>
): Conversation {
  return {
    created_at: Date.now(), updated_at: Date.now(),
    messages: [], metadata: {}, ...data,
    title: data.title || 'Untitled Conversation',
  }
}

export function createMessage(data: {
  id?: string; role: Role; content: string;
  timestamp?: number; metadata?: Record<string, unknown>
}): Message {
  return {
    id: data.id || crypto.randomUUID(), role: data.role,
    content: data.content, timestamp: data.timestamp || Date.now(),
    metadata: data.metadata || {},
  }
}
