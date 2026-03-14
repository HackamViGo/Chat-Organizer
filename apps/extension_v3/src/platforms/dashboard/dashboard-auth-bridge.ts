/**
 * BrainBox v3 — Dashboard Auth Bridge
 * Captures tokens from the dashboard and syncs them to the extension.
 */

// eslint-disable-next-line no-console
console.log('[BrainBox:AuthBridge] Monitoring for auth events...');

/**
 * Handle auth data and sync to extension
 */
const syncAuth = (data: { accessToken: string; refreshToken?: string; expiresAt?: number }) => {
    const { accessToken, refreshToken, expiresAt } = data;

    if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('[BrainBox:AuthBridge] No access token received');
        return;
    }

    // eslint-disable-next-line no-console
    console.log('[BrainBox:AuthBridge] Auth token received, syncing to extension...');

    chrome.runtime.sendMessage({
        action: 'storeDashboardAuth',
        accessToken,
        refreshToken,
        expiresAt
    }, (response) => {
        if (chrome.runtime.lastError) {
            // eslint-disable-next-line no-console
            console.error('[BrainBox:AuthBridge] Failed to sync auth:', chrome.runtime.lastError.message);
        } else if (response?.success) {
            // eslint-disable-next-line no-console
            console.log('[BrainBox:AuthBridge] ✅ Auth synced successfully');
        } else {
            // eslint-disable-next-line no-console
            console.warn('[BrainBox:AuthBridge] ⚠️ Sync returned unexpected response:', response);
        }
    });
};

// 1. Listen for CustomEvent (Used by /extension-auth page)
window.addEventListener('brainbox-auth-ready', (event: Event) => {
    const customEvent = event as CustomEvent<{ accessToken: string; refreshToken?: string; expiresAt?: number }>;
    syncAuth(customEvent.detail);
});

// 2. Listen for postMessage (Used by SessionBroadcaster on every page)
window.addEventListener('message', (event) => {
    // Only accept messages from our own window
    if (event.source !== window) return;

    const { data } = event;
    if (data?.type === 'BRAINBOX_TOKEN_TRANSFER' || data?.type === 'SYNC_SESSION_EXT') {
        if (data.session) {
            syncAuth({
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : undefined
            });
        }
    }
});

// Check if we are on the extension-auth page and if auth is already there
if (window.location.pathname === '/extension-auth') {
    // eslint-disable-next-line no-console
    console.log('[BrainBox:AuthBridge] On extension-auth page, waiting for event...');
}
