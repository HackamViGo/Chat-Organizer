/**
 * BrainBox Configuration
 * Single source of truth for the extension
 */

export const CONFIG = {
    DASHBOARD_URL: 'http://localhost:3000',
    API_BASE_URL: 'http://localhost:3000',
    EXTENSION_KEY: '495d34ee-4ba7-493f-bf46-c29fbc7a3a27', // Standard Dev Key
    VERSION: '2.1.3'
} as const;

export type Config = typeof CONFIG;
