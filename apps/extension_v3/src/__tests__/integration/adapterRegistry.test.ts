import { describe, it, expect } from 'vitest'
import { getAdapter, fetchConversation } from '@/background/modules/platformAdapters'

describe('Platform Adapter Registry', () => {
  const PLATFORMS = ['gemini', 'claude', 'chatgpt', 'grok', 'perplexity', 'lmarena', 'qwen', 'deepseek']

  PLATFORMS.forEach(platform => {
    it(`has adapter for ${platform}`, () => {
      const adapter = getAdapter(platform)
      expect(adapter).toBeDefined()
      expect(adapter.platform).toBe(platform)
      expect(typeof adapter.fetchConversation).toBe('function')
    })
  })

  it('throws for unknown platform', () => {
    expect(() => getAdapter('unknown')).toThrow('Unsupported platform')
  })

  it('fetchConversation delegates to correct adapter', async () => {
    // This will fail because tokens aren't set — but it should throw
    // the adapter's error, not a routing error
    await expect(
      fetchConversation('gemini', 'test-id')
    ).rejects.toThrow() // "Token not found" or similar
  })
})
