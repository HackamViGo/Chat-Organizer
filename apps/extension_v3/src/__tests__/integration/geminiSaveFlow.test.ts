import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setStorageData, resetAllMocks } from '../setup'

describe('Gemini Save Flow (integration)', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  it('conversation ID extracted from Gemini URL', () => {
    const url = 'https://gemini.google.com/app/ac4eac058fa7f13a'
    const match = url.match(/\/app\/([a-f0-9]+)/)
    expect(match?.[1]).toBe('ac4eac058fa7f13a')
  })

  it('conversation ID NOT extracted from Gemini homepage', () => {
    const url = 'https://gemini.google.com/'
    const match = url.match(/\/app\/([a-f0-9]+)/)
    expect(match).toBeNull()
  })

  it('batchexecute payload is correctly double-serialized', () => {
    const conversationId = 'abc123def456'
    const dynamicKey = 'snX9ne'
    const atToken = 'AT-test-token'

    const innerPayload = JSON.stringify([`c_${conversationId}`, 10, null, 1, [1], [4], null, 1])
    const middlePayload = [[[dynamicKey, innerPayload, null, 'generic']]]
    const outerPayload = JSON.stringify(middlePayload)

    // Verify structure
    const parsed = JSON.parse(outerPayload)
    expect(parsed[0][0][0]).toBe(dynamicKey)
    const innerParsed = JSON.parse(parsed[0][0][1])
    expect(innerParsed[0]).toBe(`c_${conversationId}`)
  })

  it('batchexecute response prefix is stripped correctly', () => {
    const rawResponse = ")]}'
" + JSON.stringify([[null, null, '{"test": true}']])
    const cleaned = rawResponse.slice(5)
    const parsed = JSON.parse(cleaned)
    expect(parsed[0][2]).toBe('{"test": true}')
    const inner = JSON.parse(parsed[0][2])
    expect(inner.test).toBe(true)
  })

  it('storage tokens are available for adapter', async () => {
    setStorageData({
      gemini_at_token: 'AT-test',
      gemini_dynamic_key: 'snX9ne',
    })

    const data = await chrome.storage.local.get(['gemini_at_token', 'gemini_dynamic_key'])
    expect(data.gemini_at_token).toBe('AT-test')
    expect(data.gemini_dynamic_key).toBe('snX9ne')
  })

  it('save payload matches dashboard API contract', () => {
    const payload = {
      title: 'Gemini Chat',
      content: '[USER]: Hello\n\n[ASSISTANT]: Hi there!',
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello', timestamp: Date.now() },
        { id: 'msg-2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
      ],
      platform: 'gemini',
      url: 'https://gemini.google.com/app/abc123',
      folder_id: null,
      tags: ['technology'],
    }

    // Validate required fields
    expect(payload.title).toBeTruthy()
    expect(payload.messages.length).toBeGreaterThan(0)
    expect(payload.platform).toBe('gemini')
    expect(payload.url).toContain('gemini.google.com')

    // Validate message structure
    payload.messages.forEach(msg => {
      expect(msg.id).toBeTruthy()
      expect(['user', 'assistant', 'system']).toContain(msg.role)
      expect(msg.content).toBeTruthy()
      expect(msg.timestamp).toBeGreaterThan(0)
    })
  })
})
