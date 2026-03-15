import type { PromptSyncManager } from '@brainbox/shared/logic/promptSync'
import type { AuthManager } from './authManager'
import * as dashboardApi from './dashboardApi'
import * as platformAdapters from './platformAdapters'
import { CONFIG } from '@/lib/config'
import { logger } from '@/lib/logger'

export class MessageRouter {
  constructor(private authManager: AuthManager, private promptSyncManager: PromptSyncManager) {}

  listen() {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => this.route(req, sender, sendResponse))
  }

  private route(req: { action: string;[k: string]: unknown }, sender: chrome.runtime.MessageSender, reply: (r?: unknown) => void): boolean {
    switch (req.action) {
      case 'setAuthToken':
        this.authManager.setDashboardSession({
          accessToken: req.accessToken as string, refreshToken: req.refreshToken as string,
          expiresAt: req.expiresAt as number, rememberMe: req.rememberMe as boolean,
        }).then(() => { this.promptSyncManager.sync(); reply({ success: true }) })
          .catch(e => reply({ success: false, error: e.message }))
        return true

      case 'checkDashboardSession':
        this.authManager.isSessionValid()
          .then(isValid => reply({ success: true, isValid }))
          .catch(e => reply({ success: false, error: e.message }))
        return true

      case 'syncAll':
        Promise.all([this.authManager.syncAll(), this.promptSyncManager.sync(true)])
          .then(([auth]) => reply({ success: true, ...auth }))
          .catch(e => reply({ success: false, error: e.message }))
        return true

      case 'injectGeminiMainScript':
        this.injectGemini(sender.tab?.id); reply({ success: true }); return true

      case 'storeGeminiToken':
        if (req.token) chrome.storage.local.set({ gemini_at_token: req.token as string })
        reply({ success: true }); return true

      case 'getConversation':
        platformAdapters.fetchConversation(req.platform as string, req.conversationId as string, req.url as string, req.payload)
          .then(data => reply({ success: true, data }))
          .catch(e => reply({ success: false, error: e.message }))
        return true

      case 'saveToDashboard':
        dashboardApi.saveToDashboard(req.data as any, (req.folderId as string) || null, !!req.silent)
          .then(result => reply({ success: true, result }))
          .catch(e => reply({ success: false, error: e.message }))
        return true

      case 'getUserFolders':
        dashboardApi.getUserFolders()
          .then(folders => reply({ success: true, folders }))
          .catch(e => reply({ success: false, error: e.message }))
        return true

      case 'fetchPrompts':
        this.promptSyncManager.getAllPrompts()
          .then(data => reply({ success: true, data }))
          .catch(e => reply({ success: false, error: e.message }))
        return true

      case 'syncPrompts':
        this.promptSyncManager.sync()
          .then(r => reply(r)).catch(e => reply({ success: false, error: e.message }))
        return true

      case 'createPrompt':
        dashboardApi.createPrompt(req.promptData)
          .then(data => reply({ success: true, data }))
          .catch(e => reply({ success: false, error: e.message }))
        return true

      case 'openLoginPage':
        chrome.tabs.create({ url: `${CONFIG.API_BASE_URL}/auth/signin?redirect=/extension-auth` })
        reply({ success: true }); return true

      case 'contentScriptReady':
        reply({ success: true }); return true

      default: return false
    }
  }

  private async injectGemini(tabId?: number) {
    if (!tabId) return
    try {
      await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['src/content/inject-gemini-main.js'] })
    } catch (e) { logger.error('router', 'Gemini injection failed', e) }
  }
}
