// BrainBox - Gemini Main World Script
// Runs in the 'MAIN' world to access window objects like WIZ_global_data

(function () {
    'use strict';

    function extractToken() {
        try {
            // Attempt to read the token from the global object
            const token = window.WIZ_global_data?.SNlM0e;
            if (token) {
                window.postMessage({ type: 'BRAINBOX_GEMINI_TOKEN', token: token }, '*');
            }
        } catch (e) {
            // Fail silently
        }
    }

    // Run immediately
    extractToken();

    // Also watch for changes/navigations (Gemini is an SPA)
    // We can hook into history or just poll occasionally if needed, 
    // but usually WIZ_global_data is static for the session.

    // Backup: sometimes data loads a bit later?
    setTimeout(extractToken, 2127);

})();
