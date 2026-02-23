/**
 * Clears old extension caches to ensure fresh data after update.
 * Targeted at storage.local keys that act as temporary caches.
 */
export async function clearExtensionCache(): Promise<void> {
    // Only available in extension environment
    const chromeApi = (globalThis as any).chrome;
    if (typeof chromeApi === 'undefined' || !chromeApi?.storage) {
        console.warn('[BrainBox/Shared] ⚠️ chrome.storage not available (not in extension context)');
        return;
    }
    
    const keysToClear = ['prompt_cache', 'folder_cache', 'last_sync_timestamp'];
    try {
        await chromeApi.storage.local.remove(keysToClear);
        console.info('[BrainBox/Shared] 🧹 Extension cache cleared');
    } catch (e) {
        console.error('[BrainBox/Shared] ❌ Failed to clear extension cache', e);
    }
}
