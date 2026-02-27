/**
 * NetworkObserver
 *
 * Captures Claude organization ID from network requests
 */
import { logger } from '@/lib/logger'

export class NetworkObserver {
  private DEBUG_MODE: boolean

  constructor(debug = false) {
    this.DEBUG_MODE = debug
    this.handleClaudeRequest = this.handleClaudeRequest.bind(this)
  }

  initialize() {
    try {
      if (!chrome.webRequest?.onBeforeRequest) {
        logger.warn('network', 'chrome.webRequest API not available')
        return
      }

      chrome.webRequest.onBeforeRequest.addListener(this.handleClaudeRequest, {
        urls: ['https://claude.ai/api/organizations/*'],
      })

      logger.debug('network', 'Listening for Claude org_id...')
    } catch (e) {
      logger.error('network', 'Setup failed', e)
    }
  }

  private handleClaudeRequest(details: chrome.webRequest.WebRequestBodyDetails) {
    try {
      const match = details.url.match(/organizations\/([a-f0-9-]+)/i)
      if (!match?.[1]) return

      const orgId = match[1]

      // Avoid excessive writes
      chrome.storage.local.get(['claude_org_id'], (result) => {
        if (result.claude_org_id !== orgId) {
          if (this.DEBUG_MODE) {
            logger.debug('network', 'Captured Claude Org ID', orgId)
          }
          chrome.storage.local.set({ claude_org_id: orgId })
        }
      })
    } catch (e) {
      // Silent fail
    }
  }
}
