/**
 * BrainBox Configuration
 * Single source of truth for the extension
 */

type Environment = 'dev' | 'docker' | 'prod';

// ПРОМЕНИ ТУК според средата, която искаш да билднеш:
const ENV: Environment = 'dev';

const DOMAINS = {
    dev: 'http://localhost:3000',
    docker: 'http://localhost:3000', // Dashboard is on 3000 usually, but Supabase API is 54321
    prod: 'https://brainbox.ai' // Replace with your production domain
};

export const CONFIG = {
    ENVIRONMENT: ENV,
    DASHBOARD_URL: DOMAINS[ENV],
    API_BASE_URL: DOMAINS[ENV],
    EXTENSION_KEY: '495d34ee-4ba7-493f-bf46-c29fbc7a3a27', // Standard Dev Key
    VERSION: '2.1.3'
} as const;

export type Config = typeof CONFIG;
