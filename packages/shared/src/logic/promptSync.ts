/// <reference types="chrome" />

/**
 * PromptSyncManager
 * 
 * Responsible for:
 * 1. Fetching prompts from the Dashboard/Supabase
 * 2. Caching them in chrome.storage.local (or IndexedDB)
 * 3. Providing quick access to cached prompts
 */
export class PromptSyncManager {
    private STORAGE_KEY: string;
    private LAST_SYNC_KEY: string;
    private SYNC_INTERVAL: number;

    constructor(private dashboardUrl: string = 'https://brainbox-alpha.vercel.app') {
        this.STORAGE_KEY = 'brainbox_prompts_cache';
        this.LAST_SYNC_KEY = 'brainbox_prompts_last_sync';
        this.SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Initialize the manager and perform an initial sync if needed
     */
    async initialize() {
        // Load cache into memory if needed, or just rely on storage
        // For now, we'll hit storage on requests to keep memory low, 
        // unless performance becomes an issue.
        await this.syncIfNeeded();
    }

    /**
     * Check if sync is needed based on time
     */
    async syncIfNeeded(silent: boolean = true) {
        const lastSync = await this.getLastSyncTime();
        const now = Date.now();

        const token = await this.getAuthToken();
        const { expiresAt } = await chrome.storage.local.get(['expiresAt']) as { expiresAt?: number };
        const isTokenValid = token && (!expiresAt || expiresAt > Date.now());

        if (!isTokenValid || (now - lastSync > this.SYNC_INTERVAL)) {
            await this.sync(silent);
        }
    }

    /**
     * Force a sync with the backend
     */
    async sync(silent: boolean = false) {
        try {
            console.log('[PromptSyncManager] 🔄 Starting sync...');
            
            // We need the auth token to fetch prompts
            const token = await this.getAuthToken();
            const { expiresAt, rememberMe } = await chrome.storage.local.get(['expiresAt', 'rememberMe']) as { expiresAt?: number, rememberMe?: boolean };
            // dashboardUrl is now a class property
            const dashboardUrl = this.dashboardUrl;

            // 1. If NO token at all
            if (!token || (typeof token === 'string' && token.trim() === '')) {
                if (silent) {
                    console.log('[PromptSyncManager] ℹ️ No token found (silent mode). Skipping sync.');
                    return { success: false, reason: 'no_auth_silent' };
                }

                // Prevent redirect spam (cooldown 10 min for automatic sync)
                const { last_auto_redirect } = await chrome.storage.session.get(['last_auto_redirect']) as { last_auto_redirect?: number };
                const now_time = Date.now();
                if (last_auto_redirect && (now_time - last_auto_redirect < 10 * 60 * 1000)) {
                    console.log('[PromptSyncManager] ℹ️ Skipping auto-redirect (cooldown).');
                    return { success: false, reason: 'no_auth_cooldown' };
                }
                await chrome.storage.session.set({ last_auto_redirect: now_time });

                if (rememberMe) {
                    console.log('[PromptSyncManager] ℹ️ No token found, but Remember Me is on. Attempting sync check...');
                    await this.safeRedirect(`${dashboardUrl}/extension-auth`);
                    return { success: false, reason: 'no_token_but_remember_me' };
                } else {
                    console.warn('[PromptSyncManager] ⚠️ No auth token and no Remember Me. Redirecting to SIGNIN.');
                    await this.safeRedirect(`${dashboardUrl}/auth/signin?redirect=/extension-auth`);
                    return { success: false, reason: 'no_auth', action: 'redirected_to_signin' };
                }
            }

            const isTokenValid = !expiresAt || expiresAt > Date.now();
            if (!isTokenValid) {
                if (silent) {
                    console.log('[PromptSyncManager] ℹ️ Token expired (silent mode). Skipping sync.');
                    return { success: false, reason: 'token_expired_silent' };
                }
                console.warn('[PromptSyncManager] ⚠️ Token expired or not sync. Redirecting to AUTH page.');
                await this.safeRedirect(`${dashboardUrl}/extension-auth`);
                return { success: false, reason: 'token_not_sync', action: 'redirected_to_auth' };
            }

            // Get the Dashboard URL
            // (already defined above)

            // Fetch prompts with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            try {
                const response = await fetch(`${dashboardUrl}/api/prompts`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    if (response.status === 401) {
                        console.warn('[PromptSyncManager] ⚠️ Authentication failed. Please login to Dashboard.');
                        return { success: false, reason: 'auth_failed' };
                    }
                    throw new Error(`API Error: ${response.status}`);
                }

                const data = await response.json();
                
                // Handle both response formats:
                // 1. Direct array: [...]
                // 2. Object with prompts key: { prompts: [...] }
                let prompts;
                if (Array.isArray(data)) {
                    prompts = data;
                } else if (data && Array.isArray(data.prompts)) {
                    prompts = data.prompts;
                } else {
                    console.error('[PromptSyncManager] Unexpected response format:', data);
                    throw new Error('Invalid response format: expected array or {prompts: array}');
                }

                // Save prompts to storage
                await this.saveToCache(prompts);
                
                // 2. Fetch Folders
                const foldersResponse = await fetch(`${dashboardUrl}/api/folders`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (foldersResponse.ok) {
                    const foldersData = await foldersResponse.json();
                    await chrome.storage.local.set({ 'brainbox_folders_cache': foldersData.folders || [] });
                }

                // 3. Fetch Settings
                const settingsResponse = await fetch(`${dashboardUrl}/api/user/settings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (settingsResponse.ok) {
                    const settingsData = await settingsResponse.json();
                    await chrome.storage.local.set({ 'brainbox_user_settings_cache': settingsData.settings || {} });
                }

                // Update last sync time
                await this.setLastSyncTime(Date.now());

                console.log(`[PromptSyncManager] ✅ Sync complete. Cached ${prompts.length} prompts, folders and settings.`);
                return { success: true, count: prompts.length };

            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                
                if (fetchError.name === 'AbortError') {
                    console.warn('[PromptSyncManager] ⚠️ Sync timeout. Dashboard may be unreachable.');
                    return { success: false, reason: 'timeout' };
                }
                
                // Network error (CORS, offline, etc)
                if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
                    console.warn('[PromptSyncManager] ⚠️ Network error. Dashboard may be offline or unreachable.');
                    return { success: false, reason: 'network_error' };
                }
                
                throw fetchError; // Re-throw other errors
            }

        } catch (error: any) {
            console.error('[PromptSyncManager] ❌ Sync failed:', error);
            await this.logError(error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a specific prompt by ID immediately from cache
     */
    async getQuickPrompt(id: string): Promise<any | null> {
        const prompts = await this.getAllPrompts();
        return prompts.find((p: any) => p.id === id) || null;
    }

    /**
     * Get all cached prompts
     */
    async getAllPrompts(): Promise<any[]> {
        const result = await chrome.storage.local.get([this.STORAGE_KEY]) as { [key: string]: any[] };
        return result[this.STORAGE_KEY] || [];
    }

    // --- Helpers ---

    async getAuthToken() {
        const { accessToken } = await chrome.storage.local.get(['accessToken']);
        return accessToken;
    }

    async getDashboardUrl() {
        return this.dashboardUrl;
    }

    async saveToCache(prompts: any[]): Promise<void> {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: prompts });
    }

    async getLastSyncTime(): Promise<number> {
        const result = await chrome.storage.local.get([this.LAST_SYNC_KEY]);
        return (result[this.LAST_SYNC_KEY] as number) || 0;
    }

    async setLastSyncTime(time: number): Promise<void> {
        await chrome.storage.local.set({ [this.LAST_SYNC_KEY]: time });
    }

    async logError(message: string): Promise<void> {
        await chrome.storage.local.set({ 
            last_prompt_sync_error: {
                message,
                time: Date.now()
            }
        });
    }

    /**
     * Redirect to a URL, but only if not already open to prevent tab spam
     */
    private async safeRedirect(url: string) {
        return new Promise<void>((resolve) => {
            chrome.tabs.query({}, (tabs) => {
                const targetBase = url.split('?')[0];
                const alreadyOpen = tabs.find(t => t.url && t.url.includes(targetBase));
                if (alreadyOpen && alreadyOpen.id) {
                    chrome.tabs.update(alreadyOpen.id, { active: true });
                } else {
                    chrome.tabs.create({ url });
                }
                resolve();
            });
        });
    }
}
