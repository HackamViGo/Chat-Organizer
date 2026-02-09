/**
 * Clears old extension caches to ensure fresh data after update.
 * Targeted at storage.local keys that act as temporary caches.
 */
export async function clearExtensionCache() {
    const keysToClear = ['prompt_cache', 'folder_cache', 'last_sync_timestamp'];
    try {
        await chrome.storage.local.remove(keysToClear);
        console.info('[BrainBox/Shared] 🧹 Extension cache cleared');
    } catch (e) {
        console.error('[BrainBox/Shared] ❌ Failed to clear extension cache', e);
    }
}
