/**
 * BrainBox Global Configuration
 * Used in non-module contexts like content scripts and popup
 * Set window.BRAINBOX_CONFIG
 */

(function() {
    // Production fallbacks removed. 
    // This script should be injected with environment-specific values during build or via storage.
    window.BRAINBOX_CONFIG = {
        DASHBOARD_URL: 'http://localhost:3000', 
        VERSION: '3.0.0'
    };
})();
