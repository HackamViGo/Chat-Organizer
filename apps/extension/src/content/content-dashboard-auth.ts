import { CONFIG } from '../lib/config';
import { logger } from '../lib/logger';

logger.debug('Dashboard Auth', 'Dashboard auth content script loaded');

// Listen for custom event from page
window.addEventListener('brainbox-auth-ready', handleAuthEvent);

// Also attempt to extract from localStorage on load (Backup method)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', extractFromStorage);
} else {
    extractFromStorage();
}

async function handleAuthEvent(event: Event) {
    if (!validateOrigin()) return;
    const customEvent = event as CustomEvent;
    logger.debug('Dashboard Auth', 'Auth event received', customEvent.detail);
    await processAuthData(customEvent.detail);
}

function extractFromStorage() {
    if (!validateOrigin()) return;
    
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

function validateOrigin() {
    const allowedOrigins = [CONFIG.DASHBOARD_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'];
    const currentOrigin = window.location.origin;
    
    // Check strict match or wildcard for dashboard
    const isAllowed = allowedOrigins.some(origin => {
        if (origin.includes('*')) {
             const regex = new RegExp(origin.replace('*', '.*'));
             return regex.test(currentOrigin);
        }
        return origin === currentOrigin;
    });

    if (!isAllowed) {
        logger.error('Dashboard Auth', '❌ Auth attempt from unauthorized origin: ' + currentOrigin);
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

async function processAuthData(data: any) {
    try {
        const { accessToken, refreshToken, expiresAt, rememberMe } = data;

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
        }
    } catch (error: any) {
        logger.error('Dashboard Auth', 'Failed to store auth token', error);
    }
}

function showSuccessNotification() {
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
        z-index: 10000;
        font-family: sans-serif;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
    `;
    successDiv.textContent = '✅ Extension Connected!';
    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => successDiv.remove(), 300);
    }, 2500);
}

// Note: localStorage is NOT used - all auth tokens are stored in chrome.storage.local only


