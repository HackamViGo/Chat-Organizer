/**
 * AuthManager
 * 
 * Responsible for:
 * 1. Listening to network requests to capture tokens (ChatGPT, Claude, Gemini).
 * 2. Managing auth state in chrome.storage.local.
 * 3. Validating Dashboard sessions.
 */
export class AuthManager {
    private tokens: {
        chatgpt: string | null;
        gemini_at: string | null;
        gemini_key: string | null;
        claude_session: string | null;
        claude_org_id: string | null;
    };
    private DEBUG_MODE: boolean;

    constructor() {
        this.tokens = {
            chatgpt: null,
            gemini_at: null,
            gemini_key: null,
            claude_session: null,
            claude_org_id: null
        };
        this.DEBUG_MODE = false; // Disabled for production
        
        // Bind methods to ensure 'this' context
        this.handleChatGPTHeaders = this.handleChatGPTHeaders.bind(this);
        this.handleClaudeRequest = this.handleClaudeRequest.bind(this);
        this.handleGeminiRequest = this.handleGeminiRequest.bind(this);
    }

    /**
     * Start listening for tokens
     */
    initialize() {
        this.registerListeners();
        this.loadTokensFromStorage();
        console.log('[AuthManager] 🛡️ Initialized and listening.');
    }

    registerListeners() {
        // --- ChatGPT ---
        chrome.webRequest.onBeforeSendHeaders.addListener(
            this.handleChatGPTHeaders as any,
            { urls: ['https://chatgpt.com/backend-api/*'] },
            ['requestHeaders']
        );

        // --- Claude (Org ID Discovery) ---
        chrome.webRequest.onBeforeRequest.addListener(
            this.handleClaudeRequest as any,
            { urls: ['https://claude.ai/api/organizations/*'] },
            []
        );

        // --- Gemini (Dynamic Key) ---
        chrome.webRequest.onBeforeRequest.addListener(
            this.handleGeminiRequest as any,
            { urls: ['https://gemini.google.com/*', 'http://gemini.google.com/*'] },
            ['requestBody']
        );
    }

    async loadTokensFromStorage() {
        const result = await chrome.storage.local.get([
            'chatgpt_token', 
            'gemini_at_token', 
            'gemini_dynamic_key', 
            'claude_org_id'
        ]);
        
        this.tokens.chatgpt = result.chatgpt_token || null;
        this.tokens.gemini_at = result.gemini_at_token || null;
        this.tokens.gemini_key = result.gemini_dynamic_key || null;
        this.tokens.claude_org_id = result.claude_org_id || null;
    }

    // ========================================================================
    // Handlers
    // ========================================================================

    handleChatGPTHeaders(details: any) {
        const authHeader = details.requestHeaders?.find(
            h => h.name.toLowerCase() === 'authorization'
        );

        if (authHeader && authHeader.value?.startsWith('Bearer ')) {
            const token = authHeader.value;
            if (this.tokens.chatgpt !== token) {
                this.tokens.chatgpt = token;
                chrome.storage.local.set({ chatgpt_token: token });
                if (this.DEBUG_MODE) console.log('[AuthManager] ✅ ChatGPT token updated');
            }
        }
    }

    handleClaudeRequest(details: any) {
        if (details.url.includes('/api/organizations/')) {
            try {
                // Pattern: "/api/organizations/([^/]+)/"
                const match = details.url.match(/\/api\/organizations\/([^\/]+)\//);
                if (match && match[1]) {
                    const orgId = match[1];
                    if (this.tokens.claude_org_id !== orgId) {
                        this.tokens.claude_org_id = orgId;
                        chrome.storage.local.set({
                            claude_org_id: orgId,
                            org_id_discovered_at: Date.now()
                        });
                        if (this.DEBUG_MODE) console.log('[AuthManager] ✅ Claude Org ID updated:', orgId);
                    }
                }
            } catch (error) {
                console.error('[AuthManager] ❌ Claude extraction error:', error);
            }
        }
    }

    handleGeminiRequest(details: any) {
        // Implementation from service-worker.js
        if (!details.url.includes('batchexecute') || !details.requestBody) return;

        try {
            const formData = details.requestBody.formData;
            if (formData && formData['f.req']) {
                const reqData = formData['f.req'][0];
                
                // Spec Pattern: /"([a-zA-Z0-9]{5,6})",\s*"\[/
                const specPattern = /"([a-zA-Z0-9]{5,6})",\s*"\[/;
                const match = reqData.match(specPattern);

                if (match) {
                    const key = match[1];
                    // Conversation-specific logic could be added here if needed
                    // For now, effectively capture the key
                    if (this.tokens.gemini_key !== key) {
                        this.tokens.gemini_key = key;
                        chrome.storage.local.set({
                            gemini_dynamic_key: key,
                            key_discovered_at: Date.now()
                        });
                        if (this.DEBUG_MODE) console.log('[AuthManager] ✅ Gemini Dynamic Key updated:', key);
                    }
                }
            }
        } catch (error) {
            console.error('[AuthManager] ❌ Gemini extraction error:', error);
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    async setDashboardSession(session) {
        await chrome.storage.local.set({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt,
            rememberMe: session.rememberMe
        });
        if (this.DEBUG_MODE) console.log('[AuthManager] ✅ Dashboard session updated');
    }

    async isSessionValid() {
        const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);
        const isValid = accessToken && (!expiresAt || expiresAt > Date.now());
        return !!isValid;
    }

    /**
     * Actively sync and verify all tokens
     */
    async syncAll() {
        if (this.DEBUG_MODE) console.log('[AuthManager] 🔄 Starting full token sync...');
        
        // 1. Refresh internal state from storage
        await this.loadTokensFromStorage();
        
        // 2. Verify Dashboard Session via Ping
        const { accessToken } = await chrome.storage.local.get(['accessToken']);
        if (!accessToken) return { isValid: false, tokens: this.tokens };

        try {
            // Using a simple fetch to verify token validity
            const { CONFIG } = await import('../../lib/config.js');
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/folders`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (response.status === 401) {
                // Token is dead, cleanup
                await chrome.storage.local.remove(['accessToken', 'refreshToken', 'userEmail', 'expiresAt']);
                return { isValid: false, tokens: this.tokens };
            }
            
            return { 
                isValid: response.ok, 
                tokens: this.tokens 
            };
        } catch (e) {
            console.error('[AuthManager] Sync ping failed:', e);
            // If offline, trust storage if not expired
            const valid = await this.isSessionValid();
            return { isValid: valid, tokens: this.tokens };
        }
    }

    async getHeader(platform) {
        // Return necessary headers for a platform request
        // This abstracts token retrieval for the API handlers
        // TODO: Implement cleaner interface for API calls
    }
}
