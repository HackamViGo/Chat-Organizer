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

    constructor() {
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
    async syncIfNeeded() {
        const lastSync = await this.getLastSyncTime();
        const now = Date.now();

        if (now - lastSync > this.SYNC_INTERVAL) {
            await this.sync();
        }
    }

    /**
     * Force a sync with the backend
     */
    async sync() {
        try {
            console.log('[PromptSyncManager] 🔄 Starting sync...');
            
            // We need the auth token to fetch prompts
            const token = await this.getAuthToken();
            if (!token || token.trim() === '') {
                console.warn('[PromptSyncManager] ⚠️ No auth token available.');
                
                // Check if we already redirected in this session
                const { brainbox_login_redirect_shown } = await chrome.storage.session.get(['brainbox_login_redirect_shown']);
                
                if (!brainbox_login_redirect_shown) {
                    // Auto-redirect to login page (only once per session)
                    const dashboardUrl = await this.getDashboardUrl();
                    const loginUrl = `${dashboardUrl}/login?redirect=dashboard`;
                    
                    console.log('[PromptSyncManager] 🔓 Opening login page...');
                    chrome.tabs.create({ url: loginUrl });
                    
                    // Mark as shown for this session
                    await chrome.storage.session.set({ brainbox_login_redirect_shown: true });
                    
                    return { success: false, reason: 'no_auth', action: 'redirected_to_login' };
                } else {
                    console.log('[PromptSyncManager] ℹ️ Login page already shown this session.');
                    return { success: false, reason: 'no_auth', action: 'already_redirected' };
                }
            }

            // Get the Dashboard URL
            const dashboardUrl = await this.getDashboardUrl();

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

                // Save to storage
                await this.saveToCache(prompts);
                
                // Update last sync time
                await this.setLastSyncTime(Date.now());

                console.log(`[PromptSyncManager] ✅ Sync complete. Cached ${prompts.length} prompts.`);
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
    async getQuickPrompt(id) {
        const prompts = await this.getAllPrompts();
        return prompts.find(p => p.id === id) || null;
    }

    /**
     * Get all cached prompts
     */
    async getAllPrompts() {
        const result = await chrome.storage.local.get([this.STORAGE_KEY]);
        return result[this.STORAGE_KEY] || [];
    }

    // --- Helpers ---

    async getAuthToken() {
        const { accessToken } = await chrome.storage.local.get(['accessToken']);
        return accessToken;
    }

    async getDashboardUrl() {
        // Use correct dashboard URL (port 3000 for dev)
        return 'http://localhost:3000';
        // TODO: Import from config or make dynamic for production
        // const { DASHBOARD_URL } = await import('../../../apps/extension/src/lib/config.js').catch(() => ({ DASHBOARD_URL: 'http://localhost:3000' }));
        // return DASHBOARD_URL || 'http://localhost:3000';
    }

    async saveToCache(prompts) {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: prompts });
    }

    async getLastSyncTime() {
        const result = await chrome.storage.local.get([this.LAST_SYNC_KEY]);
        return result[this.LAST_SYNC_KEY] || 0;
    }

    async setLastSyncTime(time) {
        await chrome.storage.local.set({ [this.LAST_SYNC_KEY]: time });
    }

    async logError(message) {
        await chrome.storage.local.set({ 
            last_prompt_sync_error: {
                message,
                time: Date.now()
            }
        });
    }
}
