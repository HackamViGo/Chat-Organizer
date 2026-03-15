import { CONFIG } from '@/lib/config'
import { logger } from '@/lib/logger'

/**
 * InstallationManager
 *
 * Handles extension lifecycle events (install, update)
 */
export class InstallationManager {
  private DEBUG_MODE: boolean

  constructor(debug = false) {
    this.DEBUG_MODE = debug
    this.handleInstalled = this.handleInstalled.bind(this)
  }

  initialize() {
    chrome.runtime.onInstalled.addListener(this.handleInstalled)
    logger.debug('install', 'Listening for lifecycle events...')
  }

  private handleInstalled(details: chrome.runtime.InstalledDetails) {
    if (this.DEBUG_MODE) {
      logger.debug('install', 'Event', details.reason)
    }

    switch (details.reason) {
      case 'install':
        this.onFirstInstall()
        break

      case 'update':
        this.onUpdate(details.previousVersion)
        break

      case 'chrome_update':
      case 'shared_module_update':
        // Ignore browser updates
        break
    }
  }

  private onFirstInstall() {
    logger.info('install', 'First install detected')

    chrome.storage.local.get(['BRAINBOX_SESSION', 'accessToken'], (result) => {
      const hasSession = !!(result.BRAINBOX_SESSION || result.accessToken)
      const url = hasSession ? `${CONFIG.DASHBOARD_URL}/` : `${CONFIG.DASHBOARD_URL}/auth/signin`

      chrome.tabs.create({ url })
    })
  }

  private onUpdate(previousVersion?: string) {
    logger.info('install', 'Updated from', previousVersion)

    // Migration logic here
    // Example: Clean up old storage keys
    // chrome.storage.local.remove(['deprecated_key']);
  }
}
