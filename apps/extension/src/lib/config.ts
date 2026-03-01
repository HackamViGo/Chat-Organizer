/**
 * BrainBox Configuration
 * Single source of truth for the extension
 */

type Environment = 'dev' | 'docker' | 'prod';

export const CONFIG = {
    ENVIRONMENT: (import.meta.env.VITE_ENVIRONMENT || 'dev') as Environment,
    DASHBOARD_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID || 'local',
    EXTENSION_KEY: '495d34ee-4ba7-493f-bf46-c29fbc7a3a27',
    VERSION: '2.1.3'
} as const;

export type Config = typeof CONFIG;
