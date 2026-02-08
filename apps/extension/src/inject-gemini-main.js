// BrainBox - Gemini Main World Script
// Runs in the 'MAIN' world to access window objects like WIZ_global_data

(function () {
    'use strict';

    // console.log('[BrainBox] MAIN world script loaded');

    function extractToken() {
        try {
            // Attempt to read the token from multiple common locations
            let token = window.WIZ_global_data?.SNlM0e;
            
            // Fallback 1: Check AF_initDataCallback for SNlM0e
            if (!token) {
                try {
                    // Gemini/Google sometimes stores it in these callbacks
                    const afData = window.AF_initDataCallback?.find?.(cb => cb.key === 'ds:1')?.data;
                    if (afData && Array.isArray(afData)) {
                        // SNlM0e often appears in certain indices, but it's hard to track. 
                        // Instead, we look for strings that look like the token.
                    }
                } catch (e) {}
            }

            // Fallback 2: Check global _sc_at
            if (!token) {
                token = window._sc_at;
            }

            if (token) {
                // console.log('[BrainBox] Token extracted, sending to content script...');
                window.postMessage({ type: 'BRAINBOX_GEMINI_TOKEN', token: token }, '*');
            } else {
                // console.log('[BrainBox] Token not found in standard locations');
            }
        } catch (e) {
            console.error('[BrainBox] Token extraction error:', e);
        }
    }

    // Run immediately
    extractToken();

    // Also watch for changes/navigations (Gemini is an SPA)
    // Backup: sometimes data loads a bit later
    setTimeout(extractToken, 1000);
    setTimeout(extractToken, 2127);
    setTimeout(extractToken, 5000);

    // Watch for navigation changes
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // console.log('[BrainBox] Navigation detected, re-extracting token...');
            setTimeout(extractToken, 500);
        }
    }, 1000);

})();
