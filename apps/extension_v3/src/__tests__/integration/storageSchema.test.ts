import { describe, it, expect, beforeEach } from 'vitest'
import { setStorageData, getStorageData, resetAllMocks } from '../setup'

describe('Storage Schema Consistency', () => {
  beforeEach(() => resetAllMocks())

  const AUTH_KEYS = ['accessToken', 'refreshToken', 'expiresAt', 'rememberMe']
  const GEMINI_KEYS = ['gemini_at_token', 'gemini_dynamic_key']
  const CHATGPT_KEYS = ['chatgpt_token']
  const CLAUDE_KEYS = ['claude_org_id']
  const CACHE_KEYS = ['brainbox_folders_cache', 'brainbox_user_settings_cache', 'brainbox_prompts_cache']
  const SYSTEM_KEYS = ['brainbox_sync_queue', 'API_BASE_URL', 'DASHBOARD_URL', 'EXTENSION_VERSION']

  it('auth keys are isolated', async () => {
    setStorageData({
      accessToken: 'enc-token',
      refreshToken: 'enc-refresh',
      expiresAt: Date.now() + 3600000,
    })

    const data = await chrome.storage.local.get(AUTH_KEYS)
    expect(data.accessToken).toBeTruthy()
    expect(data.refreshToken).toBeTruthy()
    expect(data.expiresAt).toBeGreaterThan(0)
  })

  it('platform tokens dont collide', async () => {
    setStorageData({
      gemini_at_token: 'gem-token',
      chatgpt_token: 'Bearer gpt-token',
      claude_org_id: 'org-123',
    })

    const gemini = await chrome.storage.local.get(GEMINI_KEYS)
    const chatgpt = await chrome.storage.local.get(CHATGPT_KEYS)
    const claude = await chrome.storage.local.get(CLAUDE_KEYS)

    expect(gemini.gemini_at_token).toBe('gem-token')
    expect(chatgpt.chatgpt_token).toBe('Bearer gpt-token')
    expect(claude.claude_org_id).toBe('org-123')
  })

  it('sync queue is array', async () => {
    setStorageData({ brainbox_sync_queue: [] })
    const data = await chrome.storage.local.get(['brainbox_sync_queue'])
    expect(Array.isArray(data.brainbox_sync_queue)).toBe(true)
  })

  it('removing auth keys doesnt affect platform tokens', async () => {
    setStorageData({
      accessToken: 'token',
      gemini_at_token: 'gem',
    })

    await chrome.storage.local.remove(['accessToken'])
    const data = getStorageData()
    expect(data.accessToken).toBeUndefined()
    expect(data.gemini_at_token).toBe('gem')
  })
})
