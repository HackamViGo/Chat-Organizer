/**
 * BrainBox Global Configuration
 * Used in non-module contexts like content scripts and popup
 * Set window.BRAINBOX_CONFIG
 */

(function() {
    // ПРОМЕНИ ТУК ('dev', 'docker' или 'prod')
    const ENV = 'dev';

    const DOMAINS = {
        dev: 'http://localhost:3000',
        docker: 'http://localhost:3000',
        prod: 'https://brainbox.ai' // Replace with your production domain
    };

    window.BRAINBOX_CONFIG = {
        ENVIRONMENT: ENV,
        DASHBOARD_URL: DOMAINS[ENV],
        API_BASE_URL: DOMAINS[ENV],
        EXTENSION_KEY: '495d34ee-4ba7-493f-bf46-c29fbc7a3a27',
        VERSION: '2.1.3'
    };
})();
