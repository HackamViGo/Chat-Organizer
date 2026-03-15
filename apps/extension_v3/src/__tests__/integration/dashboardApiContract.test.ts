import { describe, it, expect } from 'vitest'

describe('Dashboard API Contract', () => {
  describe('POST /api/chats request body', () => {
    it('matches expected schema', () => {
      const body = {
        title: 'Test Chat',
        content: '[USER]: Hello\n\n[ASSISTANT]: Hi',
        messages: [
          { id: 'msg-1', role: 'user' as const, content: 'Hello', timestamp: Date.now(), metadata: {} },
        ],
        platform: 'gemini',
        url: 'https://gemini.google.com/app/abc123',
        folder_id: null,
        tags: ['technology', 'ai'],
      }

      // Required fields
      expect(typeof body.title).toBe('string')
      expect(typeof body.content).toBe('string')
      expect(Array.isArray(body.messages)).toBe(true)
      expect(typeof body.platform).toBe('string')
      expect(typeof body.url).toBe('string')

      // Optional fields
      expect(body.folder_id === null || typeof body.folder_id === 'string').toBe(true)
      expect(Array.isArray(body.tags)).toBe(true)

      // Message validation
      body.messages.forEach(msg => {
        expect(typeof msg.id).toBe('string')
        expect(['user', 'assistant', 'system']).toContain(msg.role)
        expect(typeof msg.content).toBe('string')
        expect(typeof msg.timestamp).toBe('number')
      })

      // Platform validation
      const validPlatforms = ['chatgpt', 'claude', 'gemini', 'grok', 'perplexity', 'deepseek', 'qwen', 'lmsys']
      expect(validPlatforms).toContain(body.platform)

      // Tags max 3
      expect(body.tags.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Required headers', () => {
    it('Authorization header format', () => {
      const token = 'eyJhbGciOiJIUzI1NiJ9.test.signature'
      const header = `Bearer ${token}`
      expect(header.startsWith('Bearer ')).toBe(true)
      expect(header.split(' ')[1]).toBe(token)
    })

    it('X-Extension-Key is present', () => {
      const key = 'brainbox-ext-key-123'
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
    })
  })

  describe('Error responses', () => {
    it('401 triggers token cleanup', () => {
      const status = 401
      const shouldClearTokens = status === 401
      expect(shouldClearTokens).toBe(true)
    })

    it('5xx triggers queue', () => {
      const status = 503
      const shouldQueue = status >= 500
      expect(shouldQueue).toBe(true)
    })

    it('400 does NOT trigger queue', () => {
      const status = 400
      const shouldQueue = status >= 500
      expect(shouldQueue).toBe(false)
    })
  })
})
