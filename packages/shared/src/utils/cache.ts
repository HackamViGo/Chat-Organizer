/**
 * Clears old extension caches to ensure fresh data after update.
 * Targeted at storage.local keys that act as temporary caches.
 */
export async function clearExtensionCache(): Promise<void> {
    // Only available in extension environment
    // @ts-expect-error - chrome API only available in extension context
    if (typeof chrome === 'undefined' || !chrome?.storage) {
        console.warn('[BrainBox/Shared] ⚠️ chrome.storage not available (not in extension context)');
        return;
    }
    
    const keysToClear = ['prompt_cache', 'folder_cache', 'last_sync_timestamp'];
    try {
        // @ts-expect-error - chrome API only available in extension context
        await chrome.storage.local.remove(keysToClear);
        console.info('[BrainBox/Shared] 🧹 Extension cache cleared');
    } catch (e) {
        console.error('[BrainBox/Shared] ❌ Failed to clear extension cache', e);
    }
}
