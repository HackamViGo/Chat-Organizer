import { describe, it, expect } from 'vitest'
import {
  PLATFORMS, ROLES, createConversation, createMessage,
  type Conversation, type Message, type Platform, type Role
} from '@/lib/schemas'

describe('schemas', () => {
  describe('PLATFORMS', () => {
    it('has all 8 platforms', () => {
      expect(Object.keys(PLATFORMS)).toHaveLength(8)
      expect(PLATFORMS.GEMINI).toBe('gemini')
      expect(PLATFORMS.CHATGPT).toBe('chatgpt')
      expect(PLATFORMS.CLAUDE).toBe('claude')
      expect(PLATFORMS.GROK).toBe('grok')
      expect(PLATFORMS.PERPLEXITY).toBe('perplexity')
      expect(PLATFORMS.DEEPSEEK).toBe('deepseek')
      expect(PLATFORMS.QWEN).toBe('qwen')
      expect(PLATFORMS.LMSYS).toBe('lmsys')
    })
  })

  describe('ROLES', () => {
    it('has user, assistant, system', () => {
      expect(ROLES.USER).toBe('user')
      expect(ROLES.ASSISTANT).toBe('assistant')
      expect(ROLES.SYSTEM).toBe('system')
    })
  })

  describe('createConversation', () => {
    it('creates with required fields', () => {
      const conv = createConversation({
        id: 'test-123',
        platform: PLATFORMS.GEMINI,
        title: 'Test Chat',
      })
      expect(conv.id).toBe('test-123')
      expect(conv.platform).toBe('gemini')
      expect(conv.title).toBe('Test Chat')
      expect(conv.messages).toEqual([])
      expect(conv.created_at).toBeGreaterThan(0)
      expect(conv.updated_at).toBeGreaterThan(0)
    })

    it('uses default title if empty', () => {
      const conv = createConversation({
        id: 'x', platform: PLATFORMS.CHATGPT, title: '',
      })
      expect(conv.title).toBe('Untitled Conversation')
    })

    it('preserves provided messages', () => {
      const msg = createMessage({ role: ROLES.USER, content: 'Hello' })
      const conv = createConversation({
        id: 'x', platform: PLATFORMS.CLAUDE, title: 'T',
        messages: [msg],
      })
      expect(conv.messages).toHaveLength(1)
      expect(conv.messages[0].content).toBe('Hello')
    })
  })

  describe('createMessage', () => {
    it('creates with required fields', () => {
      const msg = createMessage({ role: ROLES.USER, content: 'Hi' })
      expect(msg.role).toBe('user')
      expect(msg.content).toBe('Hi')
      expect(msg.id).toBeTruthy()
      expect(msg.timestamp).toBeGreaterThan(0)
    })

    it('uses provided id', () => {
      const msg = createMessage({ id: 'custom-id', role: ROLES.ASSISTANT, content: 'Hey' })
      expect(msg.id).toBe('custom-id')
    })

    it('includes metadata', () => {
      const msg = createMessage({
        role: ROLES.ASSISTANT, content: 'Test',
        metadata: { model: 'gemini-pro' },
      })
      expect(msg.metadata?.model).toBe('gemini-pro')
    })
  })
})
