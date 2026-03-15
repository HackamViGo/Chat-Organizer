/**
 * CacheManager
 * 
 * Handles local caching of dashboard data (folders, settings)
 * to ensure immediate UI responsiveness in the popup.
 * Uses Stale-While-Revalidate pattern.
 */

export const CACHE_KEYS = {
    FOLDERS: 'brainbox_folders_cache',
    SETTINGS: 'brainbox_user_settings_cache',
    LAST_SYNC: 'brainbox_last_sync_timestamp'
};

export class CacheManager {
    /**
     * Get cached folders
     */
    static async getFolders(): Promise<any[] | null> {
        const result = await chrome.storage.local.get([CACHE_KEYS.FOLDERS]);
        return result[CACHE_KEYS.FOLDERS] || null;
    }

    /**
     * Set cached folders
     */
    static async setFolders(folders: any[]): Promise<void> {
        await chrome.storage.local.set({ 
            [CACHE_KEYS.FOLDERS]: folders,
            [CACHE_KEYS.LAST_SYNC]: Date.now()
        });
    }

    /**
     * Get cached user settings
     */
    static async getSettings(): Promise<any | null> {
        const result = await chrome.storage.local.get([CACHE_KEYS.SETTINGS]);
        return result[CACHE_KEYS.SETTINGS] || null;
    }

    /**
     * Set cached user settings
     */
    static async setSettings(settings: any): Promise<void> {
        await chrome.storage.local.set({ 
            [CACHE_KEYS.SETTINGS]: settings,
            [CACHE_KEYS.LAST_SYNC]: Date.now()
        });
    }

    /**
     * Clear all caches
     */
    static async clearAll(): Promise<void> {
        await chrome.storage.local.remove([
            CACHE_KEYS.FOLDERS,
            CACHE_KEYS.SETTINGS,
            CACHE_KEYS.LAST_SYNC
        ]);
    }
}
