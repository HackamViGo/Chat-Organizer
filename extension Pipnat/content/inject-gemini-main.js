// BrainBox - Gemini Main World Script
// Runs in the 'MAIN' world to access window objects like WIZ_global_data

(function () {
    'use strict';

    console.log('[BrainBox] MAIN world script loaded');

    function extractToken() {
        try {
            // Attempt to read the token from the global object
            const token = window.WIZ_global_data?.SNlM0e;
            if (token) {
                console.log('[BrainBox] Token extracted from MAIN world, sending to content script...');
                window.postMessage({ type: 'BRAINBOX_GEMINI_TOKEN', token: token }, '*');
            } else {
                console.log('[BrainBox] Token not found in WIZ_global_data.SNlM0e');
                // Check if WIZ_global_data exists
                if (window.WIZ_global_data) {
                    console.log('[BrainBox] WIZ_global_data exists but SNlM0e is missing');
                } else {
                    console.log('[BrainBox] WIZ_global_data does not exist yet');
                }
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
            console.log('[BrainBox] Navigation detected, re-extracting token...');
            setTimeout(extractToken, 500);
        }
    }, 1000);

})();
