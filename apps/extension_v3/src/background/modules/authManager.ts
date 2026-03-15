import { CONFIG } from '@/lib/config'
import { encryptToken, decryptToken } from '@/lib/crypto'
import { logger } from '@/lib/logger'

export class AuthManager {
  initialize() {
    this.registerWebRequestListeners()
    logger.info('auth', 'AuthManager initialized')

    chrome.alarms.create('token-refresh-check', { periodInMinutes: 4 })
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'token-refresh-check') this.getDashboardToken()
    })
  }

  private registerWebRequestListeners() {
    // Gemini
    chrome.webRequest.onBeforeRequest.addListener(
      (d) => this.handleGeminiRequest(d),
      { urls: ['https://gemini.google.com/*'] }, ['requestBody']
    )
    // ChatGPT
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (d) => this.captureAuthHeader(d, 'chatgpt_token'),
      { urls: ['https://chatgpt.com/backend-api/*'] }, ['requestHeaders']
    )
    // Claude
    chrome.webRequest.onBeforeRequest.addListener(
      (d) => this.handleClaudeRequest(d),
      { urls: ['https://claude.ai/api/organizations/*'] }, []
    )
    // DeepSeek
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (d) => { this.captureAuthHeader(d, 'deepseek_token'); this.captureHeader(d, 'x-client-version', 'deepseek_version') },
      { urls: ['https://chat.deepseek.com/api/*'] }, ['requestHeaders']
    )
    // Perplexity
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (d) => this.captureAuthHeader(d, 'perplexity_session'),
      { urls: ['https://www.perplexity.ai/api/*'] }, ['requestHeaders']
    )
    // Grok
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (d) => { this.captureHeader(d, 'x-csrf-token', 'grok_csrf_token'); this.captureAuthHeader(d, 'grok_auth_token') },
      { urls: ['https://x.com/i/api/*', 'https://grok.com/api/*'] }, ['requestHeaders']
    )
    // Qwen
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (d) => { this.captureHeader(d, 'x-xsrf-token', 'qwen_xsrf_token'); this.captureHeader(d, 'x-app-id', 'qwen_app_id') },
      { urls: ['https://chat.qwenlm.ai/api/*'] }, ['requestHeaders']
    )
  }

  private captureAuthHeader(details: any, storageKey: string) {
    const h = details.requestHeaders?.find((h: any) => h.name.toLowerCase() === 'authorization')
    if (h?.value?.startsWith('Bearer ')) chrome.storage.local.set({ [storageKey]: h.value })
  }

  private captureHeader(details: any, headerName: string, storageKey: string) {
    const h = details.requestHeaders?.find((h: any) => h.name.toLowerCase() === headerName.toLowerCase())
    if (h?.value) chrome.storage.local.set({ [storageKey]: h.value })
  }

  private handleGeminiRequest(details: any) {
    if (!details.url.includes('batchexecute') || !details.requestBody) return
    try {
      const formData = details.requestBody.formData
      if (formData?.['f.req']) {
        const match = formData['f.req'][0].match(/"([a-zA-Z0-9]{5,6})",\s*"\[/)
        if (match) chrome.storage.local.set({ gemini_dynamic_key: match[1], key_discovered_at: Date.now() })
      }
    } catch {}
  }

  private handleClaudeRequest(details: any) {
    const match = details.url.match(/\/api\/organizations\/([^\/]+)\//)
    if (match?.[1]) chrome.storage.local.set({ claude_org_id: match[1], org_id_discovered_at: Date.now() })
  }

  async setDashboardSession(session: { accessToken?: string; refreshToken?: string; expiresAt?: number; rememberMe?: boolean }) {
    await chrome.storage.local.set({
      accessToken: session.accessToken ? await encryptToken(session.accessToken) : null,
      refreshToken: session.refreshToken ? await encryptToken(session.refreshToken) : null,
      expiresAt: session.expiresAt, rememberMe: session.rememberMe,
    })
  }

  async getDashboardToken(): Promise<string | null> {
    const { accessToken: encrypted, refreshToken: encryptedRefresh } = await chrome.storage.local.get(['accessToken', 'refreshToken'])
    if (!encrypted) return null
    const token = await decryptToken(encrypted)
    if (!token) return null

    const parts = token.split('.')
    if (parts.length !== 3) return token

    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (payload.exp && payload.exp - Date.now() / 1000 < 300) {
        return this.refreshToken(encryptedRefresh)
      }
    } catch {}
    return token
  }

  private async refreshToken(encryptedRefresh: string | null): Promise<string | null> {
    if (!encryptedRefresh) return null
    const refreshToken = await decryptToken(encryptedRefresh)
    if (!refreshToken) return null
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Extension-Key': CONFIG.EXTENSION_KEY },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) { await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt']); return null }
      const data = await res.json()
      if (data.access_token) {
        await chrome.storage.local.set({
          accessToken: await encryptToken(data.access_token),
          refreshToken: data.refresh_token ? await encryptToken(data.refresh_token) : encryptedRefresh,
          expiresAt: data.expires_at ? data.expires_at * 1000 : null,
        })
        return data.access_token
      }
    } catch {}
    return null
  }

  async isSessionValid(): Promise<boolean> {
    const { expiresAt } = await chrome.storage.local.get('expiresAt')
    if (expiresAt && Date.now() > expiresAt) return false
    return !!(await this.getDashboardToken())
  }

  async syncAll() {
    const token = await this.getDashboardToken()
    if (!token) return { isValid: false }
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/folders`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Extension-Key': CONFIG.EXTENSION_KEY },
      })
      if (res.status === 401) { await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt']); return { isValid: false } }
      return { isValid: res.ok }
    } catch { return { isValid: await this.isSessionValid() } }
  }
}
