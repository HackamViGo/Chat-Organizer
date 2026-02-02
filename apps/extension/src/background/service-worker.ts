// BrainBox AI Chat Organizer - Service Worker
// Manifest V3 Background Script

import { CONFIG } from '../lib/config.js';
import { AuthManager } from './modules/authManager';
import { PromptSyncManager } from '@brainbox/shared/logic/promptSync';
import { DynamicMenus } from './modules/dynamicMenus';
import { MessageRouter } from './modules/messageRouter';
import { NetworkObserver } from './modules/networkObserver';
import { InstallationManager } from './modules/installationManager';
// import { TabManager } from './modules/tabManager'; // Optional for future use

const DEBUG_MODE = false;
console.log('[BrainBox Worker] 🚀 Service Worker Starting...');

self.onerror = function(message, source, lineno, colno, error) {
    console.error('[BrainBox Worker] ❌ Global Error:', message, error);
};

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

// 1. Core Managers
const authManager = new AuthManager();
const promptSyncManager = new PromptSyncManager(CONFIG.DASHBOARD_URL);

// 2. Feature Modules
const dynamicMenus = new DynamicMenus(promptSyncManager);
const networkObserver = new NetworkObserver(DEBUG_MODE);
const installationManager = new InstallationManager(DEBUG_MODE);
// const tabManager = new TabManager(DEBUG_MODE); // Optional

// 3. Communication Router
const messageRouter = new MessageRouter(
    authManager,
    promptSyncManager,
    DEBUG_MODE
);

// ============================================================================
// START ALL MODULES
// ============================================================================

authManager.initialize();
promptSyncManager.initialize();
dynamicMenus.initialize();
networkObserver.initialize();
installationManager.initialize();
// tabManager.initialize(); // Optional

messageRouter.listen();

// ============================================================================
// CONFIGURATION SYNC
// ============================================================================

chrome.storage.local.set({ 
    API_BASE_URL: CONFIG.API_BASE_URL,
    DASHBOARD_URL: CONFIG.DASHBOARD_URL,
    EXTENSION_VERSION: CONFIG.VERSION
});

console.log('[BrainBox Worker] ✅ All modules initialized');
