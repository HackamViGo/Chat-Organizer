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

export function validateConversation(conv: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!conv || typeof conv !== 'object') {
    return { valid: false, errors: ['Conversation must be an object'] }
  }
  const c = conv as Record<string, unknown>
  if (!c.id || typeof c.id !== 'string') errors.push('Missing or invalid id')
  if (!c.platform || typeof c.platform !== 'string') errors.push('Missing or invalid platform')
  if (!c.title || typeof c.title !== 'string') errors.push('Missing or invalid title')
  if (!Array.isArray(c.messages)) errors.push('messages must be an array')
  if (typeof c.created_at !== 'number') errors.push('Missing or invalid created_at')
  return { valid: errors.length === 0, errors }
}

