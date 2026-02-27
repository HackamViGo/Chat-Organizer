// BrainBox AI Chat Organizer - Service Worker
// Manifest V3 Background Script

import { PromptSyncManager } from '@brainbox/shared/logic/promptSync'

import { AuthManager } from './modules/authManager'
import { DynamicMenus } from './modules/dynamicMenus'
import { InstallationManager } from './modules/installationManager'
import { MessageRouter } from './modules/messageRouter'
import { NetworkObserver } from './modules/networkObserver'
import { SyncManager } from './modules/syncManager'

import { CONFIG } from '@/lib/config'
import { logger } from '@/lib/logger'
// import { TabManager } from './modules/tabManager'; // Optional for future use

const DEBUG_MODE = false
logger.info('worker', 'Service Worker Starting...')

self.onerror = function (message, source, lineno, colno, error) {
  logger.error('worker', `Global Error: ${message}`, error)
}

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

// 1. Core Managers
const authManager = new AuthManager()
const promptSyncManager = new PromptSyncManager(CONFIG.DASHBOARD_URL)

// 2. Feature Modules
const dynamicMenus = new DynamicMenus(promptSyncManager)
const networkObserver = new NetworkObserver(DEBUG_MODE)
const installationManager = new InstallationManager(DEBUG_MODE)
// const tabManager = new TabManager(DEBUG_MODE); // Optional

// 3. Communication Router
const messageRouter = new MessageRouter(authManager, promptSyncManager, DEBUG_MODE)

// ============================================================================
// START ALL MODULES
// ============================================================================

authManager.initialize()
promptSyncManager.initialize()

// Trigger sync queue processing on startup
chrome.storage.local.get(['accessToken'], ({ accessToken }) => {
  SyncManager.initialize(accessToken)
})

dynamicMenus.initialize()
networkObserver.initialize()
installationManager.initialize()
// tabManager.initialize(); // Optional

messageRouter.listen()

// ============================================================================
// CONFIGURATION SYNC
// ============================================================================

chrome.storage.local.set({
  API_BASE_URL: CONFIG.API_BASE_URL,
  DASHBOARD_URL: CONFIG.DASHBOARD_URL,
  EXTENSION_VERSION: CONFIG.VERSION,
})

logger.info('worker', 'All modules initialized')
