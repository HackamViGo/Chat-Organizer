import { CONFIG } from '../lib/config';
import { logger } from '../lib/logger';

// Visual marker for testing
const marker = document.createElement('div');
marker.id = 'brainbox-auth-script-loaded';
marker.style.display = 'none';
document.body.appendChild(marker);

logger.debug('Dashboard Auth', 'Dashboard auth content script loaded');
logger.debug("Dashboard Auth", '🐞 DEBUG: Content Script Loaded', window.location.href);

// Listen for messages from the page (window.postMessage)
window.addEventListener('message', handleAuthMessage);

// Also attempt to extract from localStorage on load (Backup method)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', extractFromStorage);
} else {
    extractFromStorage();
}

async function handleAuthMessage(event: MessageEvent) {
    logger.debug("Dashboard Auth", '🐞 DEBUG: Received message from origin:', event.origin);
    // 1. Validate Origin
    if (!validateOrigin(event.origin)) {
        console.warn('🐞 DEBUG: Origin validation failed for:', event.origin);
        return;
    }

    // 2. Validate Data Structure
    const data = event.data;
    if (!data || data.type !== 'BRAINBOX_AUTH_SYNC' || !data.payload) {
        return;
    }

    logger.debug('Dashboard Auth', 'Auth message received via postMessage', data.payload);
    logger.debug("Dashboard Auth", '🐞 DEBUG: Auth Message Received', data.payload);
    await processAuthData(data.payload);
}

function extractFromStorage() {
    const currentOrigin = window.location.origin;
    if (!validateOrigin(currentOrigin)) return;
    
    // Try localStorage first (Standard for most SPAs)
    try {
        const storedAuth = localStorage.getItem('supabase.auth.token'); // Default Supabase key
        if (storedAuth) {
            const parsed = JSON.parse(storedAuth);
            if (parsed.currentSession) {
                logger.info('Dashboard Auth', '✅ Found session in localStorage');
                processAuthData({
                    accessToken: parsed.currentSession.access_token,
                    refreshToken: parsed.currentSession.refresh_token,
                    expiresAt: parsed.currentSession.expires_at,
                    rememberMe: true
                });
                return;
            }
        }
    } catch (e) {
        logger.warn('Dashboard Auth', 'Could not access localStorage', e);
    }

    // Try Cookies (Fallback)
    const cookieToken = getCookie('sb-access-token');
    if (cookieToken) {
         logger.info('Dashboard Auth', '✅ Found session in cookies');
         processAuthData({
            accessToken: cookieToken,
            refreshToken: getCookie('sb-refresh-token') || '',
            expiresAt: undefined, // Unknown from simple cookie
            rememberMe: true
        });
    }
}

function validateOrigin(origin: string) {
    // 1. Remove trailing slash for consistency
    const cleanOrigin = origin.replace(/\/$/, "");

    const allowedOrigins = [
        CONFIG.DASHBOARD_URL.replace(/\/$/, ""),
        'https://brainbox-alpha.vercel.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ];
    
    // Check strict match
    const isAllowed = allowedOrigins.includes(cleanOrigin);

    if (!isAllowed) {
        // Only log error if it looks like an intentional auth attempt
        // logger.debug('Dashboard Auth', 'Ignored message from origin: ' + origin);
        return false;
    }
    return true;
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

async function processAuthData(payload: any) {
    try {
        const { accessToken, refreshToken, expiresAt, rememberMe } = payload;

        if (!accessToken) {
             logger.warn('Dashboard Auth', '❌ No access token found in data');
             return;
        }

        // Send to service worker
        const response = await chrome.runtime.sendMessage({
            action: 'setAuthToken',
            accessToken,
            refreshToken,
            expiresAt,
            rememberMe
        });

        if (response && response.success) {
            logger.info('Dashboard Auth', '✅ Token synced to Extension');
            showSuccessNotification();
        } else {
             logger.error('Dashboard Auth', 'Failed to sync token', response?.error);
             console.error('🐞 DEBUG: SendMessage Response Error', response);
        }
    } catch (error: any) {
        logger.error('Dashboard Auth', 'Failed to process auth data', error);
        console.error('🐞 DEBUG: SendMessage Exception', error);
    }
}

function showSuccessNotification() {
    // Check if valid notification UI exists in shared lib, otherwise use custom
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        z-index: 2147483647; /* Max z-index */
        font-family: sans-serif;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
        pointer-events: none;
    `;
    successDiv.textContent = '✅ Extension Connected!';
    document.body.appendChild(successDiv);

    // Add keyframes if not exists
    if (!document.getElementById('brainbox-keyframes')) {
        const style = document.createElement('style');
        style.id = 'brainbox-keyframes';
        style.textContent = `
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        successDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => successDiv.remove(), 300);
    }, 2500);
}


