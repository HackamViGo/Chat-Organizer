import { describe, it, expect, vi } from 'vitest'
import { limiters } from '@/lib/rate-limiter'

describe('rate-limiter', () => {
  it('has limiters for all platforms + dashboard', () => {
    expect(limiters.chatgpt).toBeDefined()
    expect(limiters.claude).toBeDefined()
    expect(limiters.gemini).toBeDefined()
    expect(limiters.deepseek).toBeDefined()
    expect(limiters.perplexity).toBeDefined()
    expect(limiters.grok).toBeDefined()
    expect(limiters.qwen).toBeDefined()
    expect(limiters.lmarena).toBeDefined()
    expect(limiters.dashboard).toBeDefined()
  })

  it('schedules and executes function', async () => {
    const fn = vi.fn().mockResolvedValue('result')
    const result = await limiters.dashboard.schedule(fn)
    expect(fn).toHaveBeenCalledOnce()
    expect(result).toBe('result')
  })

  it('propagates errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(limiters.dashboard.schedule(fn)).rejects.toThrow('fail')
  })
})
