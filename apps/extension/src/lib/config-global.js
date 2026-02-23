/**
 * BrainBox Global Configuration
 * Used in non-module contexts like content scripts and popup
 * Set window.BRAINBOX_CONFIG
 */

(function() {
    window.BRAINBOX_CONFIG = {
        DASHBOARD_URL: 'http://localhost:3000', // Dev URL
        // DASHBOARD_URL: 'https://brainbox-alpha.vercel.app', // Production URL
        VERSION: '2.1.3'
    };
})();
