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
import { clearExtensionCache } from '@brainbox/shared';

// ============================================================================
// LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * Install event - skip waiting to ensure the new worker takes over immediately
 */
self.addEventListener('install', () => {
    console.log('[BrainBox SW] 📥 Service Worker Installing...');
    logger.info('Worker', '📥 Service Worker Installing...');
    (self as any).skipWaiting();
});

/**
 * Activate event - claim clients to ensure consistent control
 */
self.addEventListener('activate', (event: any) => {
    console.log('[BrainBox SW] ✨ Service Worker Activating...');
    logger.info('Worker', '✨ Service Worker Activating...');
    event.waitUntil((self as any).clients.claim());
});

// Track initialization count to detect double-loading
(self as any).__BRAINBOX_INIT_COUNT__ = ((self as any).__BRAINBOX_INIT_COUNT__ || 0) + 1;
console.log(`[BrainBox SW] 🚀 Service Worker Starting (Init: ${(self as any).__BRAINBOX_INIT_COUNT__})...`);
logger.info('Worker', `🚀 Service Worker Starting (Init: ${(self as any).__BRAINBOX_INIT_COUNT__})...`);

self.onerror = function(message, source, lineno, colno, error) {
    console.error('[BrainBox SW] ❌ Global Error:', message, error);
    logger.error('Worker', '❌ Global Error: ' + message, error);
};

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

// 1. Core Managers
const authManager = new AuthManager();
const promptSyncManager = new PromptSyncManager(CONFIG.DASHBOARD_URL);

// 2. Feature Modules
const dynamicMenus = new DynamicMenus(promptSyncManager, authManager);
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

console.log('[BrainBox SW] 🔧 Initializing modules...');
authManager.initialize();
promptSyncManager.initialize();
clearExtensionCache().catch(() => {});

// Trigger sync queue processing on startup
authManager.checkAuth().then(isValid => {
    console.log('[BrainBox SW] 📦 Auth session:', isValid ? 'Valid' : 'Not found');
    if (isValid) {
        chrome.storage.local.get(['accessToken'], ({ accessToken }) => {
            SyncManager.initialize((accessToken as string) || null);
        });
    }
});

dynamicMenus.initialize();
networkObserver.initialize();
installationManager.initialize();

messageRouter.listen();
console.log('[BrainBox SW] ✅ All modules initialized');

// 4. API Proxy Listener (CORS Bridge)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'proxyToFactory') {
        (async () => {
             try {
                const { payload } = request;
                
                // Get Auth Token
                const { accessToken } = await chrome.storage.local.get('accessToken');
                if (!accessToken) {
                    throw new Error('No access token available');
                }

                logger.debug('Worker', '📡 Proxying to Factory:', CONFIG.API_BASE_URL + '/api/captures/save');

                const response = await fetch(`${CONFIG.API_BASE_URL}/api/captures/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify(payload)
                });

                if (response.status === 401) {
                    logger.error('Worker', '❌ 401 Unauthorized - Token expired or invalid');
                    // Potentially trigger re-login flow here
                    sendResponse({ success: false, error: 'Unauthorized' });
                    return;
                }

                if (!response.ok) {
                     const errorText = await response.text();
                     throw new Error(`Server error ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                sendResponse({ success: true, data });

             } catch (error: any) {
                 logger.error('Worker', '❌ Proxy Error:', error);
                 sendResponse({ success: false, error: error.message });
             }
        })();
        return true; // Keep channel open
    }
});

// ============================================================================
// CONFIGURATION SYNC
// ============================================================================

chrome.storage.local.set({ 
    API_BASE_URL: CONFIG.API_BASE_URL,
    DASHBOARD_URL: CONFIG.DASHBOARD_URL,
    EXTENSION_VERSION: CONFIG.VERSION
});

logger.info('Worker', '✅ All modules initialized');

