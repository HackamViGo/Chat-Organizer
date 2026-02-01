// BrainBox AI Chat Organizer - Service Worker
// Manifest V3 Background Script

import { CONFIG } from '../lib/config.js';
import { AuthManager } from './modules/authManager';
import { PromptSyncManager } from '@brainbox/shared/logic/promptSync';
import { DynamicMenus } from './modules/dynamicMenus';
import * as platformAdapters from './modules/platformAdapters';
import * as dashboardApi from './modules/dashboardApi';

// Environment Configuration
const API_BASE_URL = CONFIG.API_BASE_URL;
const DEBUG_MODE = false;
console.log('[BrainBox Worker] 🚀 Service Worker Starting...');

self.onerror = function(message, source, lineno, colno, error) {
    console.error('[BrainBox Worker] ❌ Global Error:', message, error);
};

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

const authManager = new AuthManager();
const promptSyncManager = new PromptSyncManager(CONFIG.DASHBOARD_URL);
const dynamicMenus = new DynamicMenus(promptSyncManager);

// Initialize modules
authManager.initialize();
promptSyncManager.initialize();
dynamicMenus.initialize();

// Initialize Configuration for Content Scripts
chrome.storage.local.set({ 
    API_BASE_URL: CONFIG.API_BASE_URL,
    DASHBOARD_URL: CONFIG.DASHBOARD_URL,
    EXTENSION_VERSION: CONFIG.VERSION
});

// ============================================================================
// CONTEXT MENUS
// ============================================================================
// All context menus are now managed by DynamicMenus module
// - Save Chat (contexts: page, on AI platforms)
// - Create Prompt (contexts: selection)
// - Inject Prompts (contexts: editable, with dynamic prompt list)

// ============================================================================
// CLAUDE ORG ID CAPTURE (Passive Network Sniffing)
// ============================================================================
// Capture Org ID from API requests like: https://claude.ai/api/organizations/{UUID}/...
// ============================================================================
// CLAUDE ORG ID CAPTURE (Passive Network Sniffing)
// ============================================================================
// Capture Org ID from API requests like: https://claude.ai/api/organizations/{UUID}/...
try {
    if (chrome.webRequest && chrome.webRequest.onBeforeRequest) {
        chrome.webRequest.onBeforeRequest.addListener(
            (details): chrome.webRequest.BlockingResponse | undefined => {
                try {
                    const url = details.url;
                    const match = url.match(/organizations\/([a-f0-9-]+)/i);
                    if (match && match[1]) {
                        const orgId = match[1];
                        
                        // Check if we need to update storage (avoid excessive writes)
                        chrome.storage.local.get(['claude_org_id'], (result) => {
                            if (result.claude_org_id !== orgId) {
                                if (DEBUG_MODE) console.log('[BrainBox Worker] 🕵️ Captured Claude Org ID from network:', orgId);
                                chrome.storage.local.set({ claude_org_id: orgId });
                            }
                        });
                    }
                } catch (e) {
                    // Ignore errors
                }
                return undefined;
            },
            { urls: ["https://claude.ai/api/organizations/*"] }
        );
    } else {
        console.warn('[BrainBox Worker] ⚠️ chrome.webRequest API not available - Claude Org ID capture disabled');
    }
} catch (e) {
    console.error('[BrainBox Worker] ❌ Error setting up webRequest listener:', e);
}

// ============================================================================
// MESSAGE HANDLER (Coordinator)
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (DEBUG_MODE) console.log(`[BrainBox Worker] 📨 Message received: ${request.action}`, { platform: request.platform, hasData: !!request.data });

    // --- AUTH ---
    if (request.action === 'setAuthToken') {
        authManager.setDashboardSession({
            accessToken: request.accessToken,
            refreshToken: request.refreshToken,
            expiresAt: request.expiresAt,
            rememberMe: request.rememberMe
        }).then(() => {
            promptSyncManager.sync(); // Sync prompts after login
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'checkDashboardSession') {
        authManager.isSessionValid()
            .then(isValid => sendResponse({ success: true, isValid }));
        return true;
    }

    if (request.action === 'syncAll') {
        Promise.all([
            authManager.syncAll(),
            promptSyncManager.sync(true)
        ]).then(([authResult]) => {
            sendResponse({ success: true, ...authResult });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    // --- PROMPTS ---
    if (request.action === 'fetchPrompts') {
        promptSyncManager.getAllPrompts()
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'syncPrompts') {
        promptSyncManager.sync()
            .then(result => sendResponse(result));
        return true;
    }

    // --- GEMINI SPECIFIC ---
    if (request.action === 'injectGeminiMainScript') {
        injectGeminiScript(sender.tab?.id);
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'storeGeminiToken') {
        if (request.token) {
            chrome.storage.local.set({ gemini_at_token: request.token }).then(() => {
                 if (DEBUG_MODE) console.log('[BrainBox Worker] ✅ Gemini AT token updated via content script');
            });
        }
        sendResponse({ success: true });
        return true;
    }

    // --- USER SETTINGS / FOLDERS ---
    if (request.action === 'getUserFolders') {
        dashboardApi.getUserFolders()
            .then(folders => sendResponse({ success: true, folders }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // --- CONVERSATION API ---
    if (request.action === 'getConversation') {
        platformAdapters.fetchConversation(request.platform, request.conversationId, request.url)
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'saveToDashboard') {
        dashboardApi.saveToDashboard(request.data, request.folderId, request.silent)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    // --- MISC ---
    if (request.action === 'openLoginPage') {
        chrome.tabs.create({ url: `${API_BASE_URL}/auth/signin?redirect=/extension-auth` });
        sendResponse({ success: true });
        return true;
    }
    
    return false; // Allow other listeners
});

// ============================================================================
// HELPERS
// ============================================================================

async function injectGeminiScript(tabId) {
    if (!tabId) return;
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            files: ['src/content/inject-gemini-main.js']
        });
    } catch (e) {
        console.error('Gemini script injection failed', e);
    }
}
