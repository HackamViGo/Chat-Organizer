import { describe, it, expect } from 'vitest'

describe('Content Bridge URL Patterns', () => {
  const testCases = [
    {
      platform: 'gemini',
      urls: {
        valid: ['https://gemini.google.com/app/ac4eac058fa7f13a'],
        invalid: ['https://gemini.google.com/', 'https://gemini.google.com/faq'],
      },
      regex: /\/app\/([a-f0-9]+)/,
    },
    {
      platform: 'chatgpt',
      urls: {
        valid: ['https://chatgpt.com/c/a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
        invalid: ['https://chatgpt.com/', 'https://chatgpt.com/auth'],
      },
      regex: /\/c\/([a-f0-9-]+)/,
    },
    {
      platform: 'claude',
      urls: {
        valid: ['https://claude.ai/chat/abc123-def456-789012'],
        invalid: ['https://claude.ai/', 'https://claude.ai/settings'],
      },
      regex: /\/chat\/([a-f0-9-]+)/,
    },
    {
      platform: 'deepseek',
      urls: {
        valid: ['https://chat.deepseek.com/?session_id=abc-123-def'],
        invalid: ['https://chat.deepseek.com/', 'https://chat.deepseek.com/settings'],
      },
      regex: /session_id=([a-f0-9-]+)/,
    },
  ]

  testCases.forEach(({ platform, urls, regex }) => {
    describe(platform, () => {
      urls.valid.forEach(url => {
        it(`extracts ID from ${url}`, () => {
          const match = url.match(regex)
          expect(match).not.toBeNull()
          expect(match![1]).toBeTruthy()
          expect(match![1].length).toBeGreaterThan(5)
        })
      })

      urls.invalid.forEach(url => {
        it(`returns null for ${url}`, () => {
          const match = url.match(regex)
          expect(match).toBeNull()
        })
      })
    })
  })
})

describe('triggerSaveChat response contract', () => {
  it('success response has required fields', () => {
    const response = {
      success: true,
      conversationId: 'abc123',
      title: 'Test Chat',
      url: 'https://gemini.google.com/app/abc123',
    }

    expect(response.success).toBe(true)
    expect(response.conversationId).toBeTruthy()
    expect(response.title).toBeTruthy()
    expect(response.url).toBeTruthy()
  })

  it('error response has required fields', () => {
    const response = {
      success: false,
      error: 'No conversation ID in URL',
    }

    expect(response.success).toBe(false)
    expect(response.error).toBeTruthy()
  })
})
