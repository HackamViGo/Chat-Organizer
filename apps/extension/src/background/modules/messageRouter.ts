/**
 * MessageRouter
 * 
 * Central message routing hub with dependency injection
 */
import { AuthManager } from './authManager';
import { PromptSyncManager } from '@brainbox/shared/logic/promptSync';
import * as platformAdapters from './platformAdapters';
import * as dashboardApi from './dashboardApi';
import { CONFIG } from '@/lib/config';

interface MessageRequest {
    action: string;
    [key: string]: any;
}

export class MessageRouter {
    private authManager: AuthManager;
    private promptSyncManager: PromptSyncManager;
    private DEBUG_MODE: boolean;

    constructor(
        authManager: AuthManager,
        promptSyncManager: PromptSyncManager,
        debug = false
    ) {
        this.authManager = authManager;
        this.promptSyncManager = promptSyncManager;
        this.DEBUG_MODE = debug;
        
        // Bind handlers
        this.handleMessage = this.handleMessage.bind(this);
    }

    /**
     * Start listening for messages
     */
    listen() {
        chrome.runtime.onMessage.addListener(this.handleMessage);
        console.log('[MessageRouter] 📡 Listening for messages...');
    }

    /**
     * Main message handler with route delegation
     */
    private handleMessage(
        request: MessageRequest,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void
    ): boolean {
        if (this.DEBUG_MODE) {
            console.log(`[MessageRouter] 📨 ${request.action}`, {
                platform: request.platform,
                hasData: !!request.data
            });
        }

        // Route to appropriate handler
        switch (request.action) {
            // ============ AUTH ============
            case 'setAuthToken':
                return this.handleSetAuthToken(request, sendResponse);
            
            case 'checkDashboardSession':
                return this.handleCheckSession(sendResponse);
            
            case 'syncAll':
                return this.handleSyncAll(sendResponse);

            // ============ PROMPTS ============
            case 'fetchPrompts':
                return this.handleFetchPrompts(sendResponse);
            
            case 'syncPrompts':
                return this.handleSyncPrompts(sendResponse);

            // ============ GEMINI ============
            case 'injectGeminiMainScript':
                return this.handleInjectGemini(sender, sendResponse);
            
            case 'storeGeminiToken':
                return this.handleStoreGeminiToken(request, sendResponse);

            // ============ FOLDERS ============
            case 'getUserFolders':
                return this.handleGetFolders(sendResponse);

            // ============ CONVERSATIONS ============
            case 'getConversation':
                // The original instruction provided an invalid code snippet.
                // The existing handleGetConversation already passes `request.payload`.
                // Assuming the intent was to ensure `request.payload` is passed,
                // the current implementation correctly handles this.
                // No change is made to the call site as the existing one is correct.
                return this.handleGetConversation(request, sendResponse);
            
            case 'saveToDashboard':
                return this.handleSaveConversation(request, sendResponse);

            // ============ MISC ============
            case 'openLoginPage':
                return this.handleOpenLoginPage(sendResponse);

            default:
                return false; // Allow other listeners
        }
    }

    // ========================================================================
    // AUTH HANDLERS
    // ========================================================================

    private handleSetAuthToken(request: MessageRequest, sendResponse: Function): boolean {
        this.authManager.setDashboardSession({
            accessToken: request.accessToken,
            refreshToken: request.refreshToken,
            expiresAt: request.expiresAt,
            rememberMe: request.rememberMe
        }).then(() => {
            this.promptSyncManager.sync(); // Sync prompts after login
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Async response
    }

    private handleCheckSession(sendResponse: Function): boolean {
        this.authManager.isSessionValid()
            .then(isValid => sendResponse({ success: true, isValid }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    private handleSyncAll(sendResponse: Function): boolean {
        Promise.all([
            this.authManager.syncAll(),
            this.promptSyncManager.sync(true)
        ]).then(([authResult]) => {
            sendResponse({ success: true, ...authResult });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    // ========================================================================
    // PROMPT HANDLERS
    // ========================================================================

    private handleFetchPrompts(sendResponse: Function): boolean {
        this.promptSyncManager.getAllPrompts()
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    private handleSyncPrompts(sendResponse: Function): boolean {
        this.promptSyncManager.sync()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // ========================================================================
    // GEMINI HANDLERS
    // ========================================================================

    private handleInjectGemini(sender: chrome.runtime.MessageSender, sendResponse: Function): boolean {
        this.injectGeminiScript(sender.tab?.id);
        sendResponse({ success: true });
        return true;
    }

    private handleStoreGeminiToken(request: MessageRequest, sendResponse: Function): boolean {
        if (request.token) {
            chrome.storage.local.set({ gemini_at_token: request.token }).then(() => {
                if (this.DEBUG_MODE) {
                    console.log('[MessageRouter] ✅ Gemini AT token stored');
                }
                sendResponse({ success: true });
            });
        } else {
            sendResponse({ success: true });
        }
        return true;
    }

    // ========================================================================
    // FOLDER HANDLERS
    // ========================================================================

    private handleGetFolders(sendResponse: Function): boolean {
        dashboardApi.getUserFolders()
            .then(folders => sendResponse({ success: true, folders }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // ========================================================================
    // CONVERSATION HANDLERS
    // ========================================================================

    private handleGetConversation(request: MessageRequest, sendResponse: Function): boolean {
        platformAdapters.fetchConversation(request.platform, request.conversationId, request.url, request.payload)
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    private handleSaveConversation(request: MessageRequest, sendResponse: Function): boolean {
        dashboardApi.saveToDashboard(request.data, request.folderId, request.silent)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // ========================================================================
    // MISC HANDLERS
    // ========================================================================

    private handleOpenLoginPage(sendResponse: Function): boolean {
        chrome.tabs.create({ url: `${CONFIG.API_BASE_URL}/auth/signin?redirect=/extension-auth` });
        sendResponse({ success: true });
        return true;
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private async injectGeminiScript(tabId?: number) {
        if (!tabId) return;
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                world: 'MAIN',
                files: ['src/content/inject-gemini-main.js']
            });
        } catch (e) {
            console.error('[MessageRouter] Gemini script injection failed:', e);
        }
    }
}
