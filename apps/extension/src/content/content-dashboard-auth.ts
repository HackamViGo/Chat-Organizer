import { CONFIG } from '../lib/config';
import { logger } from '../lib/logger';

logger.debug('Dashboard Auth', 'Dashboard auth content script loaded');

// Listen for custom event from page
window.addEventListener('brainbox-auth-ready', async (event: Event) => {
    // Origin Validation (Allow configured URL or local dev)
    const allowedOrigins = [CONFIG.DASHBOARD_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'];
    if (!allowedOrigins.includes(window.location.origin)) {
        logger.error('Dashboard Auth', '❌ Auth attempt from unauthorized origin: ' + window.location.origin);
        return;
    }

    const customEvent = event as CustomEvent;
    logger.debug('Dashboard Auth', 'Auth event received', customEvent.detail);

    try {
        const { accessToken, refreshToken, expiresAt, rememberMe } = customEvent.detail;

        // Send to service worker
        const response = await chrome.runtime.sendMessage({
            action: 'setAuthToken',
            accessToken,
            refreshToken,
            expiresAt,
            rememberMe
        });

        if (response && response.success) {
            logger.info('Dashboard Auth', '✅ Token stored successfully');
            
            // Show success message on page
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
    } catch (error: any) {
        logger.error('Dashboard Auth', 'Failed to store auth token', error);
    }
});

// Note: localStorage is NOT used - all auth tokens are stored in chrome.storage.local only


