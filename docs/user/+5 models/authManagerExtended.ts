/**
 * AuthManager - Extended with New Platforms
 * 
 * Token capture for:
 * - ChatGPT, Claude, Gemini (existing)
 * - DeepSeek, Perplexity, Grok, Qwen, LMSYS Arena (new)
 */

export class AuthManagerExtended {
    private tokens: {
        // Original
        chatgpt: string | null;
        gemini_at: string | null;
        gemini_key: string | null;
        claude_session: string | null;
        claude_org_id: string | null;
        
        // New platforms
        deepseek: string | null;
        perplexity_session: string | null;
        grok_csrf: string | null;
        grok_auth: string | null;
        qwen_xsrf: string | null;
        qwen_app_id: string | null;
        lmarena_session: string | null;
        lmarena_fn_index: string | null;
    };

    private DEBUG_MODE: boolean;

    constructor() {
        this.tokens = {
            chatgpt: null,
            gemini_at: null,
            gemini_key: null,
            claude_session: null,
            claude_org_id: null,
            deepseek: null,
            perplexity_session: null,
            grok_csrf: null,
            grok_auth: null,
            qwen_xsrf: null,
            qwen_app_id: null,
            lmarena_session: null,
            lmarena_fn_index: null
        };
        this.DEBUG_MODE = false;

        // Bind methods
        this.handleDeepSeekHeaders = this.handleDeepSeekHeaders.bind(this);
        this.handlePerplexityHeaders = this.handlePerplexityHeaders.bind(this);
        this.handleGrokHeaders = this.handleGrokHeaders.bind(this);
        this.handleQwenHeaders = this.handleQwenHeaders.bind(this);
    }

    registerListeners() {
        // Original listeners (ChatGPT, Claude, Gemini) remain unchanged
        // ... existing code ...

        // --- DeepSeek ---
        chrome.webRequest.onBeforeSendHeaders.addListener(
            this.handleDeepSeekHeaders as any,
            { urls: ['https://chat.deepseek.com/api/*'] },
            ['requestHeaders']
        );

        // --- Perplexity ---
        chrome.webRequest.onBeforeSendHeaders.addListener(
            this.handlePerplexityHeaders as any,
            { urls: ['https://www.perplexity.ai/api/*'] },
            ['requestHeaders']
        );

        // --- Grok (X.com) ---
        chrome.webRequest.onBeforeSendHeaders.addListener(
            this.handleGrokHeaders as any,
            { urls: ['https://x.com/i/api/*'] },
            ['requestHeaders']
        );

        // --- Qwen ---
        chrome.webRequest.onBeforeSendHeaders.addListener(
            this.handleQwenHeaders as any,
            { urls: ['https://chat.qwenlm.ai/api/*'] },
            ['requestHeaders']
        );
    }

    // ========================================================================
    // New Platform Handlers
    // ========================================================================

    handleDeepSeekHeaders(details: any) {
        const authHeader = details.requestHeaders?.find(
            h => h.name.toLowerCase() === 'authorization'
        );

        if (authHeader && authHeader.value?.startsWith('Bearer ')) {
            const token = authHeader.value;
            if (this.tokens.deepseek !== token) {
                this.tokens.deepseek = token;
                chrome.storage.local.set({ deepseek_token: token });
                if (this.DEBUG_MODE) console.log('[AuthManager] ✅ DeepSeek token updated');
            }
        }
    }

    handlePerplexityHeaders(details: any) {
        const authHeader = details.requestHeaders?.find(
            h => h.name.toLowerCase() === 'authorization'
        );

        if (authHeader && authHeader.value?.startsWith('Bearer ')) {
            const token = authHeader.value;
            if (this.tokens.perplexity_session !== token) {
                this.tokens.perplexity_session = token;
                chrome.storage.local.set({ perplexity_session: token });
                if (this.DEBUG_MODE) console.log('[AuthManager] ✅ Perplexity token updated');
            }
        }
    }

    handleGrokHeaders(details: any) {
        const csrfHeader = details.requestHeaders?.find(
            h => h.name.toLowerCase() === 'x-csrf-token'
        );
        const authHeader = details.requestHeaders?.find(
            h => h.name.toLowerCase() === 'authorization'
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

        if (updated && this.DEBUG_MODE) {
            console.log('[AuthManager] ✅ Grok tokens updated');
        }
    }

    handleQwenHeaders(details: any) {
        const xsrfHeader = details.requestHeaders?.find(
            h => h.name.toLowerCase() === 'x-xsrf-token'
        );
        const appIdHeader = details.requestHeaders?.find(
            h => h.name.toLowerCase() === 'x-app-id'
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

        if (updated && this.DEBUG_MODE) {
            console.log('[AuthManager] ✅ Qwen tokens updated');
        }
    }

    async loadTokensFromStorage() {
        const result = await chrome.storage.local.get([
            // Original
            'chatgpt_token',
            'gemini_at_token',
            'gemini_dynamic_key',
            'claude_org_id',
            
            // New
            'deepseek_token',
            'perplexity_session',
            'grok_csrf_token',
            'grok_auth_token',
            'qwen_xsrf_token',
            'qwen_app_id',
            'lmarena_session_hash',
            'lmarena_fn_index'
        ]);

        // Original
        this.tokens.chatgpt = result.chatgpt_token || null;
        this.tokens.gemini_at = result.gemini_at_token || null;
        this.tokens.gemini_key = result.gemini_dynamic_key || null;
        this.tokens.claude_org_id = result.claude_org_id || null;

        // New
        this.tokens.deepseek = result.deepseek_token || null;
        this.tokens.perplexity_session = result.perplexity_session || null;
        this.tokens.grok_csrf = result.grok_csrf_token || null;
        this.tokens.grok_auth = result.grok_auth_token || null;
        this.tokens.qwen_xsrf = result.qwen_xsrf_token || null;
        this.tokens.qwen_app_id = result.qwen_app_id || null;
        this.tokens.lmarena_session = result.lmarena_session_hash || null;
        this.tokens.lmarena_fn_index = result.lmarena_fn_index || null;
    }
}
