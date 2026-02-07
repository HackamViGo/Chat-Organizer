// BrainBox AI Chat Organizer - Service Worker
// Manifest V3 Background Script

import { CONFIG } from '@/lib/config';
import { logger } from '@/lib/logger';
import { AuthManager } from './modules/authManager';
import { PromptSyncManager } from '@brainbox/shared/logic/promptSync';
import { DynamicMenus } from './modules/dynamicMenus';
import { MessageRouter } from './modules/messageRouter';
import { NetworkObserver } from './modules/networkObserver';
import { InstallationManager } from './modules/installationManager';
import { SyncManager } from './modules/syncManager';

logger.info('Worker', '🚀 Service Worker Starting...');

self.onerror = function(message, source, lineno, colno, error) {
    logger.error('Worker', '❌ Global Error: ' + message, error);
};

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

// 1. Core Managers
const authManager = new AuthManager();
const promptSyncManager = new PromptSyncManager(CONFIG.DASHBOARD_URL);

// 2. Feature Modules
const dynamicMenus = new DynamicMenus(promptSyncManager);
const networkObserver = new NetworkObserver(false);
const installationManager = new InstallationManager(false);

// 3. Communication Router
const messageRouter = new MessageRouter(
    authManager,
    promptSyncManager,
    false
);

// ============================================================================
// START ALL MODULES
// ============================================================================

authManager.initialize();
promptSyncManager.initialize();

// Trigger sync queue processing on startup
chrome.storage.local.get(['accessToken'], ({ accessToken }) => {
    SyncManager.initialize(accessToken);
});

dynamicMenus.initialize();
networkObserver.initialize();
installationManager.initialize();

messageRouter.listen();

// ============================================================================
// CONFIGURATION SYNC
// ============================================================================

chrome.storage.local.set({ 
    API_BASE_URL: CONFIG.API_BASE_URL,
    DASHBOARD_URL: CONFIG.DASHBOARD_URL,
    EXTENSION_VERSION: CONFIG.VERSION
});

logger.info('Worker', '✅ All modules initialized');

