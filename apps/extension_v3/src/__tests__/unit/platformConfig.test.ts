import { describe, it, expect } from 'vitest'
import { PLATFORM_CONFIG, getAllPlatformUrls, type PlatformId } from '@/lib/platformConfig'

describe('platformConfig', () => {
  it('has all 8 platforms', () => {
    const platforms = Object.keys(PLATFORM_CONFIG)
    expect(platforms).toHaveLength(8)
    expect(platforms).toContain('gemini')
    expect(platforms).toContain('chatgpt')
    expect(platforms).toContain('claude')
    expect(platforms).toContain('grok')
    expect(platforms).toContain('perplexity')
    expect(platforms).toContain('deepseek')
    expect(platforms).toContain('qwen')
    expect(platforms).toContain('lmarena')
  })

  it('every platform has urlPatterns', () => {
    Object.values(PLATFORM_CONFIG).forEach(config => {
      expect(config.urlPatterns.length).toBeGreaterThan(0)
      config.urlPatterns.forEach(url => {
        expect(url).toMatch(/^https?:/)
      })
    })
  })

  it('every platform has storageKeys', () => {
    Object.values(PLATFORM_CONFIG).forEach(config => {
      expect(Object.keys(config.storageKeys).length).toBeGreaterThan(0)
    })
  })

  it('getAllPlatformUrls returns flat array', () => {
    const urls = getAllPlatformUrls()
    expect(urls.length).toBeGreaterThan(8)
    expect(urls).toContain('https://gemini.google.com/*')
    expect(urls).toContain('https://chatgpt.com/*')
    expect(urls).toContain('https://claude.ai/*')
  })

  it('no duplicate URLs across platforms', () => {
    const urls = getAllPlatformUrls()
    const unique = new Set(urls)
    expect(unique.size).toBe(urls.length)
  })
})
