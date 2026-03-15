import { PromptSyncManager } from '@brainbox/shared/logic/promptSync'
import { AuthManager } from './modules/authManager'
import { DynamicMenus } from './modules/dynamicMenus'
import { InstallationManager } from './modules/installationManager'
import { MessageRouter } from './modules/messageRouter'
import { NetworkObserver } from './modules/networkObserver'
import { SyncManager } from './modules/syncManager'
import { CONFIG } from '@/lib/config'
import { logger } from '@/lib/logger'

logger.info('worker', 'BrainBox v3 starting...')

const authManager = new AuthManager()
const promptSyncManager = new PromptSyncManager(CONFIG.DASHBOARD_URL)
const dynamicMenus = new DynamicMenus(promptSyncManager)
const networkObserver = new NetworkObserver(false)
const installationManager = new InstallationManager(false)
const messageRouter = new MessageRouter(authManager, promptSyncManager)

authManager.initialize()
promptSyncManager.initialize()
dynamicMenus.initialize()
networkObserver.initialize()
installationManager.initialize()
messageRouter.listen()

chrome.storage.local.get(['accessToken'], ({ accessToken }) => { SyncManager.initialize(accessToken) })
chrome.storage.local.set({ API_BASE_URL: CONFIG.API_BASE_URL, DASHBOARD_URL: CONFIG.DASHBOARD_URL, EXTENSION_VERSION: CONFIG.VERSION })

logger.info('worker', 'All modules initialized')
