import { CONFIG } from '@/lib/config'
import { encryptToken, decryptToken } from '@/lib/crypto'
import { logger } from '@/lib/logger'

/**
 * AuthManager
 *
 * Responsible for:
 * 1. Listening to network requests to capture tokens (ChatGPT, Claude, Gemini).
 * 2. Managing auth state in chrome.storage.local.
 * 3. Validating Dashboard sessions.
 */
export class AuthManager {
  private tokens: {
    chatgpt: string | null
    gemini_at: string | null
    gemini_key: string | null
    claude_session: string | null
    claude_org_id: string | null

    // New platforms
    deepseek: string | null
    deepseek_version: string | null
    perplexity_session: string | null
    grok_csrf: string | null
    grok_auth: string | null
    qwen_xsrf: string | null
    qwen_app_id: string | null
    lmarena_session: string | null
    lmarena_fn_index: string | null
  }
  private DEBUG_MODE: boolean

  constructor() {
    this.tokens = {
      chatgpt: null,
      gemini_at: null,
      gemini_key: null,
      claude_session: null,
      claude_org_id: null,

      deepseek: null,
      deepseek_version: null,
      perplexity_session: null,
      grok_csrf: null,
      grok_auth: null,
      qwen_xsrf: null,
      qwen_app_id: null,
      lmarena_session: null,
      lmarena_fn_index: null,
    }
    this.DEBUG_MODE = false // Disabled for production

    // Bind methods to ensure 'this' context
    this.handleChatGPTHeaders = this.handleChatGPTHeaders.bind(this)
    this.handleClaudeRequest = this.handleClaudeRequest.bind(this)
    this.handleGeminiRequest = this.handleGeminiRequest.bind(this)

    // New Platform Handlers
    this.handleDeepSeekHeaders = this.handleDeepSeekHeaders.bind(this)
    this.handlePerplexityHeaders = this.handlePerplexityHeaders.bind(this)
    this.handleGrokHeaders = this.handleGrokHeaders.bind(this)
    this.handleQwenHeaders = this.handleQwenHeaders.bind(this)
  }

  initialize() {
    this.registerListeners()
    this.loadTokensFromStorage()
    logger.info('auth', 'Initialized and listening')

    // S2-3 Auto Refresh Token Check
    chrome.alarms.create('token-refresh-check', { periodInMinutes: 4 })
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'token-refresh-check') {
        this.getDashboardToken()
      }
    })
  }

  registerListeners() {
    // --- ChatGPT ---
    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.handleChatGPTHeaders as any,
      { urls: ['https://chatgpt.com/backend-api/*'] },
      ['requestHeaders']
    )

    // --- Claude ---
    chrome.webRequest.onBeforeRequest.addListener(
      this.handleClaudeRequest as any,
      { urls: ['https://claude.ai/api/organizations/*'] },
      []
    )

    // --- Gemini ---
    chrome.webRequest.onBeforeRequest.addListener(
      this.handleGeminiRequest as any,
      { urls: ['https://gemini.google.com/*', 'http://gemini.google.com/*'] },
      ['requestBody']
    )

    // --- DeepSeek ---
    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.handleDeepSeekHeaders as any,
      { urls: ['https://chat.deepseek.com/api/*'] },
      ['requestHeaders']
    )

    // --- Perplexity ---
    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.handlePerplexityHeaders as any,
      { urls: ['https://www.perplexity.ai/api/*'] },
      ['requestHeaders']
    )

    // --- Grok ---
    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.handleGrokHeaders as any,
      { urls: ['https://x.com/i/api/*', 'https://grok.com/api/*'] },
      ['requestHeaders']
    )

    // --- Qwen ---
    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.handleQwenHeaders as any,
      { urls: ['https://chat.qwenlm.ai/api/*'] },
      ['requestHeaders']
    )
  }

  async loadTokensFromStorage() {
    const result = await chrome.storage.local.get([
      'chatgpt_token',
      'gemini_at_token',
      'gemini_dynamic_key',
      'claude_org_id',
      'deepseek_token',
      'deepseek_version',
      'perplexity_session',
      'grok_csrf_token',
      'grok_auth_token',
      'qwen_xsrf_token',
      'qwen_app_id',
      'lmarena_session_hash',
      'lmarena_fn_index',
    ])

    this.tokens.chatgpt = result.chatgpt_token || null
    this.tokens.gemini_at = result.gemini_at_token || null
    this.tokens.gemini_key = result.gemini_dynamic_key || null
    this.tokens.claude_org_id = result.claude_org_id || null
    this.tokens.deepseek = result.deepseek_token || null
    this.tokens.deepseek_version = result.deepseek_version || null
    this.tokens.perplexity_session = result.perplexity_session || null
    this.tokens.grok_csrf = result.grok_csrf_token || null
    this.tokens.grok_auth = result.grok_auth_token || null
    this.tokens.qwen_xsrf = result.qwen_xsrf_token || null
    this.tokens.qwen_app_id = result.qwen_app_id || null
    this.tokens.lmarena_session = result.lmarena_session_hash || null
    this.tokens.lmarena_fn_index = result.lmarena_fn_index || null
  }

  // ========================================================================
  // Handlers
  // ========================================================================

  handleChatGPTHeaders(details: any) {
    const authHeader = details.requestHeaders?.find(
      (h: any) => h.name.toLowerCase() === 'authorization'
    )

    if (authHeader && authHeader.value?.startsWith('Bearer ')) {
      const token = authHeader.value
      if (this.tokens.chatgpt !== token) {
        this.tokens.chatgpt = token
        chrome.storage.local.set({ chatgpt_token: token })
        logger.debug('auth', 'ChatGPT token updated')
      }
    }
  }

  handleClaudeRequest(details: any) {
    if (details.url.includes('/api/organizations/')) {
      try {
        // Pattern: "/api/organizations/([^/]+)/"
        const match = details.url.match(/\/api\/organizations\/([^\/]+)\//)
        if (match && match[1]) {
          const orgId = match[1]
          if (this.tokens.claude_org_id !== orgId) {
            this.tokens.claude_org_id = orgId
            chrome.storage.local.set({
              claude_org_id: orgId,
              org_id_discovered_at: Date.now(),
            })
            logger.debug('auth', 'Claude Org ID updated', orgId)
          }
        }
      } catch (error) {
        logger.error('auth', 'Claude extraction error', error)
      }
    }
  }

  handleGeminiRequest(details: any) {
    // Implementation from service-worker.js

    // 1. Capture AT Token from URL
    if (details.url.includes('/app/')) {
      try {
        const url = new URL(details.url)
        const pathParts = url.pathname.split('/')
        const atToken = pathParts[pathParts.length - 1]
        if (atToken && atToken.startsWith('AT-')) {
          if (this.tokens.gemini_at !== atToken) {
            this.tokens.gemini_at = atToken
            chrome.storage.local.set({ gemini_at_token: atToken })
            logger.debug('auth', 'Gemini AT Token updated', atToken)
          }
        }
      } catch (e) {
        // ignore URL parsing errors
      }
    }

    // 2. Capture Dynamic Key from batchexecute
    if (!details.url.includes('batchexecute') || !details.requestBody) return

    try {
      const formData = details.requestBody.formData
      if (formData && formData['f.req']) {
        const reqData = formData['f.req'][0]

        // Spec Pattern: /"([a-zA-Z0-9]{5,6})",\s*"\[/
        const specPattern = /"([a-zA-Z0-9]{5,6})",\s*"\[/
        const match = reqData.match(specPattern)

        if (match) {
          const key = match[1]
          if (this.tokens.gemini_key !== key) {
            this.tokens.gemini_key = key
            chrome.storage.local.set({
              gemini_dynamic_key: key,
              key_discovered_at: Date.now(),
            })
            logger.debug('auth', 'Gemini Dynamic Key updated', key)
          }
        }
      }
    } catch (error) {
      logger.error('auth', 'Gemini extraction error', error)
    }
  }
  /**
   * Generic dispatcher for platform headers (Grok, Perplexity, DeepSeek, Qwen)
   */
  handlePlatformHeaders(details: any) {
    if (details.url.includes('deepseek.com')) {
      this.handleDeepSeekHeaders(details)
    } else if (details.url.includes('perplexity.ai')) {
      this.handlePerplexityHeaders(details)
    } else if (details.url.includes('x.com') || details.url.includes('grok.com')) {
      this.handleGrokHeaders(details)
    } else if (details.url.includes('qwenlm.ai')) {
      this.handleQwenHeaders(details)
    }
  }

  handleDeepSeekHeaders(details: any) {
    const authHeader = details.requestHeaders?.find(
      (h: any) => h.name.toLowerCase() === 'authorization'
    )

    if (authHeader && authHeader.value?.startsWith('Bearer ')) {
      const token = authHeader.value
      if (this.tokens.deepseek !== token) {
        this.tokens.deepseek = token
        chrome.storage.local.set({ deepseek_token: token })
        logger.debug('auth', 'DeepSeek token updated')
      }
    }

    const dsVersionHeader = details.requestHeaders?.find(
      (h: any) => h.name.toLowerCase() === 'x-client-version'
    )
    if (dsVersionHeader && details.url.includes('deepseek.com')) {
      if (this.tokens.deepseek_version !== dsVersionHeader.value) {
        this.tokens.deepseek_version = dsVersionHeader.value
        chrome.storage.local.set({ deepseek_version: dsVersionHeader.value })
        logger.debug('auth', 'DeepSeek version header updated')
      }
    }
  }

  handlePerplexityHeaders(details: any) {
    const authHeader = details.requestHeaders?.find(
      (h: any) => h.name.toLowerCase() === 'authorization'
    )

    if (authHeader && authHeader.value?.startsWith('Bearer ')) {
      const token = authHeader.value
      if (this.tokens.perplexity_session !== token) {
        this.tokens.perplexity_session = token
        chrome.storage.local.set({ perplexity_session: token })
        logger.debug('auth', 'Perplexity token updated')
      }
    }

    // Capture session cookies specifically for Perplexity (web API fallback)
    const cookieHeader = details.requestHeaders?.find((h: any) => h.name.toLowerCase() === 'cookie')
    if (cookieHeader && details.url.includes('perplexity.ai') && !authHeader) {
      if (this.tokens.perplexity_session !== cookieHeader.value) {
        this.tokens.perplexity_session = cookieHeader.value
        chrome.storage.local.set({ perplexity_session: cookieHeader.value })
        logger.debug('auth', 'Perplexity session cookie captured')
      }
    }
  }

  handleGrokHeaders(details: any) {
    const csrfHeader = details.requestHeaders?.find(
      (h: any) => h.name.toLowerCase() === 'x-csrf-token'
    )
    const authHeader = details.requestHeaders?.find(
      (h: any) => h.name.toLowerCase() === 'authorization'
    )

    let updated = false

    if (csrfHeader && this.tokens.grok_csrf !== csrfHeader.value) {
      this.tokens.grok_csrf = csrfHeader.value
      chrome.storage.local.set({ grok_csrf_token: csrfHeader.value })
      updated = true
    }

    if (authHeader && this.tokens.grok_auth !== authHeader.value) {
      this.tokens.grok_auth = authHeader.value
      chrome.storage.local.set({ grok_auth_token: authHeader.value })
      updated = true
    }

    if (updated) {
      logger.debug('auth', 'Grok tokens updated')
    }
  }

  handleQwenHeaders(details: any) {
    const xsrfHeader = details.requestHeaders?.find(
      (h: any) => h.name.toLowerCase() === 'x-xsrf-token'
    )
    const appIdHeader = details.requestHeaders?.find(
      (h: any) => h.name.toLowerCase() === 'x-app-id'
    )

    let updated = false

    if (xsrfHeader && this.tokens.qwen_xsrf !== xsrfHeader.value) {
      this.tokens.qwen_xsrf = xsrfHeader.value
      chrome.storage.local.set({ qwen_xsrf_token: xsrfHeader.value })
      updated = true
    }

    if (appIdHeader && this.tokens.qwen_app_id !== appIdHeader.value) {
      this.tokens.qwen_app_id = appIdHeader.value
      chrome.storage.local.set({ qwen_app_id: appIdHeader.value })
      updated = true
    }

    if (updated) {
      logger.debug('auth', 'Qwen tokens updated')
    }
  }

  // ========================================================================
  // Public API
  // ========================================================================

  async setDashboardSession(session: any) {
    const encryptedAccess = session.accessToken ? await encryptToken(session.accessToken) : null
    const encryptedRefresh = session.refreshToken ? await encryptToken(session.refreshToken) : null

    await chrome.storage.local.set({
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt: session.expiresAt,
      rememberMe: session.rememberMe,
    })
    logger.debug('auth', 'Dashboard session updated')
  }

  async getDashboardToken(): Promise<string | null> {
    const { accessToken: encryptedToken, refreshToken: encryptedRefresh } =
      await chrome.storage.local.get(['accessToken', 'refreshToken'])
    if (!encryptedToken) return null

    const token = await decryptToken(encryptedToken)
    if (!token) return null

    const tokenParts = token.split('.')
    if (tokenParts.length !== 3) return token

    try {
      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')))
      const exp = payload.exp
      if (exp && exp - Date.now() / 1000 < 300) {
        logger.debug('auth', 'Token expiring soon, refreshing...')
        const refreshToken = encryptedRefresh ? await decryptToken(encryptedRefresh) : null
        if (!refreshToken) throw new Error('No refresh token')

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Extension-Key': CONFIG.EXTENSION_KEY,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.access_token) {
            const newEncryptedToken = await encryptToken(data.access_token)
            const newEncryptedRefresh = data.refresh_token
              ? await encryptToken(data.refresh_token)
              : encryptedRefresh
            await chrome.storage.local.set({
              accessToken: newEncryptedToken,
              refreshToken: newEncryptedRefresh,
              expiresAt: data.expires_at ? data.expires_at * 1000 : null,
            })
            return data.access_token
          }
        }

        // Failed to refresh
        await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt', 'userEmail'])
        chrome.runtime.sendMessage({ type: 'AUTH_EXPIRED' })
        return null
      }
    } catch (e) {
      logger.error('auth', 'Token check failed', e)
    }

    return token
  }

  async isSessionValid() {
    const { expiresAt } = await chrome.storage.local.get('expiresAt')

    // If we have an expiry timestamp and it's in the past, session is invalid
    if (expiresAt && Date.now() > expiresAt) {
      return false
    }

    const accessToken = await this.getDashboardToken()
    return !!accessToken
  }

  /**
   * Actively sync and verify all tokens
   */
  async syncAll() {
    logger.debug('auth', 'Starting full token sync...')

    // 1. Refresh internal state from storage
    await this.loadTokensFromStorage()

    // 2. Verify Dashboard Session via Ping
    const accessToken = await this.getDashboardToken()
    if (!accessToken) return { isValid: false, tokens: this.tokens }

    try {
      // Using a simple fetch to verify token validity

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/folders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Extension-Key': CONFIG.EXTENSION_KEY,
        },
      })

      if (response.status === 401) {
        // Token is dead, cleanup
        await chrome.storage.local.remove(['accessToken', 'refreshToken', 'userEmail', 'expiresAt'])
        return { isValid: false, tokens: this.tokens }
      }

      return {
        isValid: response.ok,
        tokens: this.tokens,
      }
    } catch (e) {
      logger.error('auth', 'Sync ping failed', e)
      // If offline, trust storage if not expired
      const valid = await this.isSessionValid()
      return { isValid: valid, tokens: this.tokens }
    }
  }

  async getHeader(platform: any) {
    // Return necessary headers for a platform request
    // This abstracts token retrieval for the API handlers
    // TODO: Implement cleaner interface for API calls
  }
}
