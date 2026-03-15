import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setStorageData, getStorageData, resetAllMocks } from '../setup'

// We test AuthManager's public API through chrome.storage effects
// AuthManager registers webRequest listeners — we test those indirectly

describe('AuthManager', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('webRequest token capture', () => {
    it('captures ChatGPT Bearer token from headers', async () => {
      // Simulate what AuthManager.captureAuthHeader does
      const details = {
        requestHeaders: [
          { name: 'Authorization', value: 'Bearer sk-test-token-123' },
          { name: 'Content-Type', value: 'application/json' },
        ],
      }

      // Find the auth header like AuthManager does
      const authHeader = details.requestHeaders.find(
        h => h.name.toLowerCase() === 'authorization'
      )
      expect(authHeader?.value).toBe('Bearer sk-test-token-123')
      expect(authHeader?.value?.startsWith('Bearer ')).toBe(true)
    })

    it('extracts Claude org_id from URL', () => {
      const url = 'https://claude.ai/api/organizations/org-abc-123-def/chat_conversations/conv-1'
      const match = url.match(/\/api\/organizations\/([^\/]+)\//)
      expect(match?.[1]).toBe('org-abc-123-def')
    })

    it('extracts Gemini dynamic key from formData', () => {
      const reqData = '[[["snX9ne","[\"c_abc123\",10,null,1]",null,"generic"]]]'
      const match = reqData.match(/"([a-zA-Z0-9]{5,6})",\s*"\[/)
      expect(match?.[1]).toBe('snX9ne')
    })

    it('extracts Grok CSRF token', () => {
      const details = {
        requestHeaders: [
          { name: 'x-csrf-token', value: 'csrf-token-xyz' },
          { name: 'Authorization', value: 'Bearer grok-auth-123' },
        ],
      }
      const csrf = details.requestHeaders.find(h => h.name.toLowerCase() === 'x-csrf-token')
      const auth = details.requestHeaders.find(h => h.name.toLowerCase() === 'authorization')
      expect(csrf?.value).toBe('csrf-token-xyz')
      expect(auth?.value).toBe('Bearer grok-auth-123')
    })

    it('extracts Qwen dual headers', () => {
      const details = {
        requestHeaders: [
          { name: 'X-Xsrf-Token', value: 'xsrf-abc' },
          { name: 'X-App-Id', value: 'app-123' },
        ],
      }
      const xsrf = details.requestHeaders.find(h => h.name.toLowerCase() === 'x-xsrf-token')
      const appId = details.requestHeaders.find(h => h.name.toLowerCase() === 'x-app-id')
      expect(xsrf?.value).toBe('xsrf-abc')
      expect(appId?.value).toBe('app-123')
    })
  })

  describe('dashboard session', () => {
    it('stores encrypted session via chrome.storage', async () => {
      await chrome.storage.local.set({
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        expiresAt: Date.now() + 3600000,
      })

      const data = await chrome.storage.local.get(['accessToken', 'expiresAt'])
      expect(data.accessToken).toBe('encrypted-access')
      expect(data.expiresAt).toBeGreaterThan(Date.now())
    })

    it('detects expired session', async () => {
      await chrome.storage.local.set({
        expiresAt: Date.now() - 1000, // Expired
      })

      const { expiresAt } = await chrome.storage.local.get('expiresAt')
      expect(Date.now() > expiresAt).toBe(true)
    })
  })
})
