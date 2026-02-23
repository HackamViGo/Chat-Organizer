/**
 * Content Script for Dashboard Auth Bridge
 */
const getSyncKey = () => {
    // Dynamically find the Supabase auth token in localStorage
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            keys.push(key);
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                // console.debug(`[BrainBox] 🎯 Found Supabase key: ${key}`);
                return key;
            }
        }
    }
    
    // Remove the hardcoded reference, deduce by env var if available
    const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
    if (projectId) {
        const prodKey = `sb-${projectId}-auth-token`;
        if (localStorage.getItem(prodKey)) {
            return prodKey;
        }
    }

    return 'sb-localhost-auth-token'; // Fallback for dev
};

let SYNC_KEY = getSyncKey();
let lastSessionState: string | null = null;

function syncSession() {
    SYNC_KEY = getSyncKey();
    
    try {
        const sessionRaw = localStorage.getItem(SYNC_KEY);
        
        // Avoid spamming logs if state hasn't changed
        if (sessionRaw === lastSessionState) return;
        lastSessionState = sessionRaw;

        if (!sessionRaw) return;

        const session = JSON.parse(sessionRaw);
        if (session && session.access_token) {
            console.log('[BrainBox] 🔑 Auth session detected, syncing to extension...');
            chrome.runtime.sendMessage({
                action: 'SET_SESSION',
                payload: {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at ? session.expires_at * 1000 : null,
                    user: session.user
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[BrainBox] ❌ Message failed:', chrome.runtime.lastError);
                } else {
                    console.log('[BrainBox] ✅ Sync response:', response);
                }
            });
        }
    } catch (e) {
        console.error('[BrainBox] ❌ Auth sync error:', e);
    }
}

console.log('[BrainBox] 🛠️ Content Dashboard Auth script loaded');

// Initial sync
syncSession();

// Post a message to window to signal loading (useful for tests)
window.postMessage({ type: 'BRAINBOX_CONTENT_LOADED' }, '*');

// Listen for explicit session broadcasts from Dashboard
window.addEventListener('message', (event) => {
    // Security: Only accept messages from same origin
    if (event.origin !== window.location.origin) {
        console.warn('[BrainBox] ⚠️ Rejected message from foreign origin:', event.origin);
        return;
    }
    
    if (event.data?.type === 'BRAINBOX_TOKEN_TRANSFER' && event.data?.session) {
        console.log('[BrainBox] 📨 Received BRAINBOX_TOKEN_TRANSFER from Dashboard');
        const session = event.data.session;
        
        // Validate session structure
        if (!session.access_token) {
            console.error('[BrainBox] ❌ Invalid session: missing access_token');
            return;
        }
        
        console.log('[BrainBox] 🔑 Valid session detected, broadcasting to extension...', {
            hasAccessToken: !!session.access_token,
            hasRefreshToken: !!session.refresh_token,
            expiresAt: session.expires_at,
            userEmail: session.user?.email
        });
        
        chrome.runtime.sendMessage({
            action: 'SET_SESSION',
            payload: {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at ? session.expires_at * 1000 : null,
                user: session.user
            }
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[BrainBox] ❌ Message failed:', chrome.runtime.lastError);
            } else {
                console.log('[BrainBox] ✅ Sync response:', response);
            }
        });
    }
    
    // Keep backward compatibility with old event type
    if (event.data?.type === 'BRAINBOX_SESSION_SYNC' && event.data?.session) {
        console.log('[BrainBox] 📨 Received legacy BRAINBOX_SESSION_SYNC (deprecated)');
        const session = event.data.session;
        
        if (session && session.access_token) {
            chrome.runtime.sendMessage({
                action: 'SET_SESSION',
                payload: {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at ? session.expires_at * 1000 : null,
                    user: session.user
                }
            });
        }
    }
    
    // Support for SYNC_SESSION_EXT as requested
    if (event.data?.type === 'SYNC_SESSION_EXT' && event.data?.session) {
        console.log('[BrainBox] 📨 Received SYNC_SESSION_EXT from Dashboard');
        const session = event.data.session;
        
        if (session && session.access_token) {
            chrome.runtime.sendMessage({
                action: 'SET_SESSION',
                payload: {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at ? session.expires_at * 1000 : null,
                    user: session.user
                }
            });
        }
    }
});

// Listen for messages from background (Lazy Pull)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'GET_SESSION') {
        const sessionRaw = localStorage.getItem(SYNC_KEY);
        if (sessionRaw) {
            const session = JSON.parse(sessionRaw);
            sendResponse({ 
                success: true, 
                payload: {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at ? session.expires_at * 1000 : null,
                    user: session.user
                }
            });
        } else {
            sendResponse({ success: false, error: 'No session in localStorage' });
        }
    }
});

// Listen for storage changes
window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith('sb-') && event.key.endsWith('-auth-token')) {
        console.log(`[BrainBox] 🔄 Storage change detected for key: ${event.key}`);
        syncSession();
        window.postMessage({ type: 'BRAINBOX_SESSION_SYNCED' }, '*');
    }
});

// Polyfill for Supabase events if needed
setInterval(syncSession, 5000); 
