import { logger } from '@/lib/logger';

/**
 * AuthManager
 * 
 * Responsible for:
 * 1. Listening to network requests to capture tokens (ChatGPT, Gemini).
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
        
        // New platforms
        deepseek: string | null;
        deepseek_version: string | null;
        perplexity_session: string | null;
        grok_csrf: string | null;
        grok_auth: string | null;
        qwen_xsrf: string | null;
        qwen_app_id: string | null;
        lmarena_session: string | null;
        lmarena_fn_index: string | null;

        // User IDs
        chatgpt_user_id: string | null;
        deepseek_user_id: string | null;
        perplexity_user_id: string | null;
        grok_user_id: string | null;
        qwen_user_id: string | null;
    };

    constructor() {
        this.tokens = {
            chatgpt: null,
            gemini_at: null,
            gemini_key: null,
            claude_session: null,
            claude_org_id: null,
            
            deepseek: null,
            deepseek_version: null,
            perplexity_session: null,
            grok_csrf: null,
            grok_auth: null,
            qwen_xsrf: null,
            qwen_app_id: null,
            lmarena_session: null,
            lmarena_fn_index: null,

            chatgpt_user_id: null,
            deepseek_user_id: null,
            perplexity_user_id: null,
            grok_user_id: null,
            qwen_user_id: null
        };
        
        // Bind methods to ensure 'this' context
        this.handleChatGPTHeaders = this.handleChatGPTHeaders.bind(this);
        this.handleClaudeRequest = this.handleClaudeRequest.bind(this);
        this.handleGeminiRequest = this.handleGeminiRequest.bind(this);
        
        // New Platform Handlers
        this.handleDeepSeekHeaders = this.handleDeepSeekHeaders.bind(this);
        this.handlePerplexityHeaders = this.handlePerplexityHeaders.bind(this);
        this.handleGrokHeaders = this.handleGrokHeaders.bind(this);
        this.handleQwenHeaders = this.handleQwenHeaders.bind(this);
    }

    /**
     * Start listening for tokens
     */
    initialize() {
        this.registerListeners();
        this.loadTokensFromStorage();
        this.registerMessageListeners();
        logger.info('AuthManager', '🛡️ Initialized and listening.');
    }

    private registerMessageListeners() {
        // Consolidated into MessageRouter to avoid listener conflicts
    }

    registerListeners() {
        if (typeof chrome.webRequest === 'undefined') {
            logger.warn('AuthManager', '⚠️ chrome.webRequest is undefined. Network observation disabled.');
            return;
        }

        const { onBeforeSendHeaders, onBeforeRequest } = chrome.webRequest;

        // --- ChatGPT ---
        if (onBeforeSendHeaders) {
            onBeforeSendHeaders.addListener(
                this.handleChatGPTHeaders as any,
                { urls: ['https://chatgpt.com/backend-api/*'] },
                ['requestHeaders']
            );
        }

        // --- Claude ---
        if (onBeforeRequest) {
            onBeforeRequest.addListener(
                this.handleClaudeRequest as any,
                { urls: ['https://claude.ai/api/organizations/*'] },
                []
            );
        }

        // --- Gemini ---
        if (onBeforeRequest) {
            onBeforeRequest.addListener(
                this.handleGeminiRequest as any,
                { urls: ['https://gemini.google.com/*', 'http://gemini.google.com/*'] },
                ['requestBody']
            );
        }

        // --- DeepSeek ---
        if (onBeforeSendHeaders) {
            onBeforeSendHeaders.addListener(
                this.handleDeepSeekHeaders as any,
                { urls: ['https://chat.deepseek.com/api/*'] },
                ['requestHeaders']
            );
        }

        // --- Perplexity ---
        if (onBeforeSendHeaders) {
            onBeforeSendHeaders.addListener(
                this.handlePerplexityHeaders as any,
                { urls: ['https://www.perplexity.ai/api/*'] },
                ['requestHeaders']
            );
        }

        // --- Grok ---
        if (onBeforeSendHeaders) {
            onBeforeSendHeaders.addListener(
                this.handleGrokHeaders as any,
                { urls: ['https://x.com/i/api/*', 'https://grok.com/api/*'] },
                ['requestHeaders']
            );
        }

        // --- Qwen ---
        if (onBeforeSendHeaders) {
            onBeforeSendHeaders.addListener(
                this.handleQwenHeaders as any,
                { urls: ['https://chat.qwenlm.ai/api/*'] },
                ['requestHeaders']
            );
        }

        if (!onBeforeSendHeaders || !onBeforeRequest) {
            logger.warn('AuthManager', '⚠️ Some webRequest events are missing. Partial observation active.');
        }
    }

    async loadTokensFromStorage() {
        const result = (await chrome.storage.local.get([
            'chatgpt_token',
            'claude_token',
            'gemini_dynamic_key',
            'deepseek_token',
            'perplexity_id',
            'grok_token',
            'qwen_token',
            'chatgpt_user_id',
            'claude_org_id',
            'deepseek_user_id',
            'perplexity_user_id',
            'grok_user_id',
            'qwen_user_id'
        ])) as any;

        this.tokens.chatgpt = result.chatgpt_token || null;
        this.tokens.claude_session = result.claude_token || null;
        this.tokens.gemini_key = result.gemini_dynamic_key || null;
        this.tokens.deepseek = result.deepseek_token || null;
        this.tokens.perplexity_session = result.perplexity_id || null;
        this.tokens.grok_auth = result.grok_token || null;
        this.tokens.qwen_xsrf = result.qwen_token || null;

        this.tokens.chatgpt_user_id = result.chatgpt_user_id || null;
        this.tokens.claude_org_id = result.claude_org_id || null;
        this.tokens.deepseek_user_id = result.deepseek_user_id || null;
        this.tokens.perplexity_user_id = result.perplexity_user_id || null;
        this.tokens.grok_user_id = result.grok_user_id || null;
        this.tokens.qwen_user_id = result.qwen_user_id || null;
    }

    // ========================================================================
    // Handlers
    // ========================================================================

    handleChatGPTHeaders(details: any) {
        const authHeader = details.requestHeaders?.find(
            (h: any) => h.name.toLowerCase() === 'authorization'
        );

        if (authHeader && authHeader.value?.startsWith('Bearer ')) {
            const token = authHeader.value;
            if (this.tokens.chatgpt !== token) {
                this.tokens.chatgpt = token;
                chrome.storage.local.set({ chatgpt_token: token });
                logger.debug('AuthManager', '✅ ChatGPT token updated');
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
                        logger.debug('AuthManager', '✅ Claude Org ID updated', orgId);
                    }
                }
            } catch (error) {
                logger.error('AuthManager', '❌ Claude extraction error', error);
            }
        }
    }

    handleGeminiRequest(details: any) {
        // 1. Capture AT Token from URL
        if (details.url.includes('/app/')) {
            try {
                const url = new URL(details.url);
                const pathParts = url.pathname.split('/');
                const atToken = pathParts[pathParts.length - 1];
                if (atToken && atToken.startsWith('AT-')) {
                    if (this.tokens.gemini_at !== atToken) {
                        this.tokens.gemini_at = atToken;
                        chrome.storage.local.set({ gemini_at_token: atToken });
                        logger.debug('AuthManager', '✅ Gemini AT Token updated');
                    }
                }
            } catch (e) {
                // ignore URL parsing errors
            }
        }

        // 2. Capture Dynamic Key from batchexecute
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
                    if (this.tokens.gemini_key !== key) {
                        this.tokens.gemini_key = key;
                        chrome.storage.local.set({
                            gemini_dynamic_key: key,
                            key_discovered_at: Date.now()
                        });
                        logger.debug('AuthManager', '✅ Gemini Dynamic Key updated');
                    }
                }
            }
        } catch (error) {
            logger.error('AuthManager', '❌ Gemini extraction error', error);
        }
    }

    /**
     * Generic dispatcher for platform headers (Grok, Perplexity, DeepSeek, Qwen)
     */
    handlePlatformHeaders(details: any) {
        if (details.url.includes('deepseek.com')) {
            this.handleDeepSeekHeaders(details);
        } else if (details.url.includes('perplexity.ai')) {
            this.handlePerplexityHeaders(details);
        } else if (details.url.includes('x.com') || details.url.includes('grok.com')) {
            this.handleGrokHeaders(details);
        } else if (details.url.includes('qwenlm.ai')) {
            this.handleQwenHeaders(details);
        }
    }

    handleDeepSeekHeaders(details: any) {
        const authHeader = details.requestHeaders?.find(
            (h: any) => h.name.toLowerCase() === 'authorization'
        );

        if (authHeader && authHeader.value?.startsWith('Bearer ')) {
            const token = authHeader.value;
            if (this.tokens.deepseek !== token) {
                this.tokens.deepseek = token;
                chrome.storage.local.set({ deepseek_token: token });
                logger.debug('AuthManager', '✅ DeepSeek token updated');
            }
        }

        const dsVersionHeader = details.requestHeaders?.find((h: any) => h.name.toLowerCase() === 'x-client-version');
        if (dsVersionHeader && details.url.includes('deepseek.com')) {
            if (this.tokens.deepseek_version !== dsVersionHeader.value) {
                this.tokens.deepseek_version = dsVersionHeader.value;
                chrome.storage.local.set({ deepseek_version: dsVersionHeader.value });
                logger.debug('AuthManager', '✅ DeepSeek version header updated');
            }
        }
    }

    handlePerplexityHeaders(details: any) {
        const authHeader = details.requestHeaders?.find(
            (h: any) => h.name.toLowerCase() === 'authorization'
        );

        if (authHeader && authHeader.value?.startsWith('Bearer ')) {
            const token = authHeader.value;
            if (this.tokens.perplexity_session !== token) {
                this.tokens.perplexity_session = token;
                chrome.storage.local.set({ perplexity_session: token });
                logger.debug('AuthManager', '✅ Perplexity token updated');
            }
        }

        // Capture session cookies specifically for Perplexity (web API fallback)
        const cookieHeader = details.requestHeaders?.find((h: any) => h.name.toLowerCase() === 'cookie');
        if (cookieHeader && details.url.includes('perplexity.ai') && !authHeader) {
            if (this.tokens.perplexity_session !== cookieHeader.value) {
                this.tokens.perplexity_session = cookieHeader.value;
                chrome.storage.local.set({ perplexity_session: cookieHeader.value });
                logger.debug('AuthManager', '✅ Perplexity session cookie captured');
            }
        }
    }

    handleGrokHeaders(details: any) {
        const csrfHeader = details.requestHeaders?.find(
            (h: any) => h.name.toLowerCase() === 'x-csrf-token'
        );
        const authHeader = details.requestHeaders?.find(
            (h: any) => h.name.toLowerCase() === 'authorization'
        );

        let updated = false;

        if (csrfHeader && this.tokens.grok_csrf !== csrfHeader.value) {
            this.tokens.grok_csrf = csrfHeader.value;
            chrome.storage.local.set({ grok_csrf_token: csrfHeader.value });
            updated = true;
        }

        if (authHeader && this.tokens.grok_auth !== authHeader.value) {
            this.tokens.grok_auth = authHeader.value;
            chrome.storage.local.set({ grok_auth_token: authHeader.value });
            updated = true;
        }

        if (updated) {
            logger.debug('AuthManager', '✅ Grok tokens updated');
        }
    }

    handleQwenHeaders(details: any) {
        const xsrfHeader = details.requestHeaders?.find(
            (h: any) => h.name.toLowerCase() === 'x-xsrf-token'
        );
        const appIdHeader = details.requestHeaders?.find(
            (h: any) => h.name.toLowerCase() === 'x-app-id'
        );

        let updated = false;

        if (xsrfHeader && this.tokens.qwen_xsrf !== xsrfHeader.value) {
            this.tokens.qwen_xsrf = xsrfHeader.value;
            chrome.storage.local.set({ qwen_xsrf_token: xsrfHeader.value });
            updated = true;
        }

        if (appIdHeader && this.tokens.qwen_app_id !== appIdHeader.value) {
            this.tokens.qwen_app_id = appIdHeader.value;
            chrome.storage.local.set({ qwen_app_id: appIdHeader.value });
            updated = true;
        }

        if (updated) {
            logger.debug('AuthManager', '✅ Qwen tokens updated');
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    async setDashboardSession(session: any) {
        console.log('[AuthManager] 📥 Processing session sync...', {
            access_token: session.access_token ? 'Present' : 'Missing',
            refresh_token: session.refresh_token ? 'Present' : 'Missing',
            expires_at: session.expires_at,
            user: session.user?.email
        });
        
        try {
            // Normalize session structure (handle both camelCase and snake_case)
            const sessionToStore = {
                access_token: session.access_token || session.accessToken,
                refresh_token: session.refresh_token || session.refreshToken,
                expires_at: session.expires_at || session.expiresAt,
                user: session.user
            };

            // Validate required fields
            if (!sessionToStore.access_token) {
                throw new Error('Missing access_token in session');
            }

            console.log('[AuthManager] 💾 Storing session in chrome.storage.local...');
            await chrome.storage.local.set({ BRAINBOX_SESSION: sessionToStore });
            
            // Backward compatibility for legacy token keys
            if (sessionToStore.access_token) {
                await chrome.storage.local.set({
                    accessToken: sessionToStore.access_token,
                    refreshToken: sessionToStore.refresh_token,
                    expiresAt: sessionToStore.expires_at
                });
            }

            // Verify write
            const verify = await chrome.storage.local.get('BRAINBOX_SESSION');
            if (!verify.BRAINBOX_SESSION) {
                throw new Error('Session verification failed after write');
            }
            
            console.log('[AuthManager] ✅ Session stored and verified successfully');
            logger.debug('AuthManager', '✅ Dashboard session updated');
        } catch (error) {
            console.error('[AuthManager] ❌ Critical: Failed to save session!', error);
            logger.error('AuthManager', '❌ Failed to save session', error);
            throw error; // Re-throw for caller to handle
        }
    }

    async isSessionValid() {
        const result = (await chrome.storage.local.get(['BRAINBOX_SESSION', 'accessToken', 'expiresAt'])) as any;
        
        // Try new key first (snake_case internally)
        if (result.BRAINBOX_SESSION) {
            const { access_token, expires_at } = result.BRAINBOX_SESSION;
            // Add 5 minute grace period (300,000 ms)
            const GRACE_PERIOD = 5 * 60 * 1000;
            const now = Date.now();
            
            if (access_token && (!expires_at || expires_at > (now + GRACE_PERIOD))) {
                logger.debug('AuthManager', '✅ Session is valid by BRAINBOX_SESSION', { expires_at, now });
                return true;
            }
            
            // If token is in grace period, try to refresh
            if (access_token && expires_at && expires_at > now && expires_at <= (now + GRACE_PERIOD)) {
                logger.info('AuthManager', '🕒 Session in grace period, initiating background refresh...');
                this.refreshSession().catch(err => logger.error('AuthManager', 'Failed to refresh session in grace period', err));
                return true; // Still "valid" for now
            }

            logger.warn('AuthManager', '❌ Session in BRAINBOX_SESSION is invalid/expired', { 
                hasToken: !!access_token, 
                expires_at, 
                now,
                diff: expires_at ? expires_at - now : 'N/A'
            });
            
            if (!access_token) logger.warn('AuthManager', '❌ No access_token in BRAINBOX_SESSION');
            else if (expires_at && expires_at <= now) logger.warn('AuthManager', '❌ Session in BRAINBOX_SESSION expired', { expires_at, now });
            
            return false;
        }

        // Fallback to legacy keys
        const accessToken = result.accessToken;
        const expiresAt = result.expiresAt;
        const GRACE_PERIOD = 5 * 60 * 1000;
        const now = Date.now();
        const isValid = accessToken && (!expiresAt || expiresAt > (now + GRACE_PERIOD));
        
        if (accessToken && expiresAt && expiresAt > now && expiresAt <= (now + GRACE_PERIOD)) {
            this.refreshSession().catch(err => logger.error('AuthManager', 'Failed to refresh legacy session', err));
            return true;
        }
        
        return !!isValid;
    }

    /**
     * Standardized checkAuth method for robust validation
     */
    async checkAuth(): Promise<boolean> {
        const isValid = await this.isSessionValid();
        if (isValid) return true;

        // One last check directly from storage to be 100% sure
        const storage = (await chrome.storage.local.get('BRAINBOX_SESSION')) as { BRAINBOX_SESSION?: any };
        logger.debug('AuthManager', '🔍 Final check storage dump:', { 
            hasSession: !!storage.BRAINBOX_SESSION, 
            hasToken: !!storage.BRAINBOX_SESSION?.access_token 
        });
        if (storage.BRAINBOX_SESSION?.access_token) {
            // If we have a token but it's expired, try one last refresh
            try {
                logger.info('AuthManager', '🔄 Session expired, attempting final refresh before redirect...');
                const success = await this.refreshSession();
                if (success) return true;
            } catch (e) {
                logger.warn('AuthManager', 'Final refresh attempt failed');
            }
        }

        return false;
    }

    /**
     * Refresh the Dashboard session using the refresh token
     */
    async refreshSession(): Promise<boolean> {
        try {
            const { BRAINBOX_SESSION } = (await chrome.storage.local.get('BRAINBOX_SESSION')) as { BRAINBOX_SESSION?: any };
            const refreshToken = BRAINBOX_SESSION?.refresh_token;

            if (!refreshToken) {
                logger.warn('AuthManager', 'No refresh token available');
                return false;
            }

            const { CONFIG } = await import('@/lib/config');
            const response = await fetch(`${CONFIG.DASHBOARD_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new Error(`Refresh failed with status ${response.status}`);
            }

            const data = await response.json();
            if (data.accessToken) {
                await this.setDashboardSession({
                    access_token: data.accessToken,
                    refresh_token: data.refreshToken,
                    expires_at: data.expiresAt,
                    user: BRAINBOX_SESSION?.user
                });
                logger.info('AuthManager', '✨ Session refreshed successfully');
                return true;
            }

            return false;
        } catch (error) {
            logger.error('AuthManager', '❌ Failed to refresh session', error);
            return false;
        }
    }

    /**
     * Actively sync and verify all tokens
     */
    async syncAll() {
        logger.debug('AuthManager', '🔄 Starting full token sync...');
        
        // 1. Refresh internal state from storage
        await this.loadTokensFromStorage();
        
        // 2. Verify Dashboard Session via Ping
        const result = (await chrome.storage.local.get(['BRAINBOX_SESSION', 'accessToken'])) as any;
        const accessToken = result.BRAINBOX_SESSION?.access_token || result.accessToken;
        
        if (!accessToken) return { isValid: false, tokens: this.tokens };

        try {
            // Using a simple fetch to verify token validity
            const { CONFIG } = await import('@/lib/config');
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/folders`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (response && response.status === 401) {
                // Token is dead, cleanup
                await chrome.storage.local.remove(['BRAINBOX_SESSION', 'accessToken', 'refreshToken', 'userEmail', 'expiresAt']);
                return { isValid: false, tokens: this.tokens };
            }
            
            return { 
                isValid: response?.ok ?? false, 
                tokens: this.tokens 
            };
        } catch (e) {
            logger.error('AuthManager', 'Sync ping failed', e);
            // If offline, trust storage if not expired
            const valid = await this.isSessionValid();
            return { isValid: valid, tokens: this.tokens };
        }
    }

    async getHeader(platform: any) {
        // Return necessary headers for a platform request
        // This abstracts token retrieval for the API handlers
        // TODO: Implement cleaner interface for API calls
        return platform;
    }
}
