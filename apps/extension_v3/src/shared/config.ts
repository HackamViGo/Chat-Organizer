/**
 * BrainBox v3 — Shared Config
 * Single source of truth for URLs and app metadata.
 */

declare const __APP_VERSION__: string;

export const CONFIG = {
  DASHBOARD_URL: import.meta.env.VITE_DASHBOARD_URL ?? 'https://app.brainbox.app',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'https://app.brainbox.app',
  SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID ?? 'local',
  ENVIRONMENT: (import.meta.env.VITE_ENVIRONMENT ?? 'dev') as 'dev' | 'docker' | 'prod',
  EXTENSION_KEY: '495d34ee-4ba7-493f-bf46-c29fbc7a3a27',
  VERSION: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '3.0.0',
} as const;

export type Config = typeof CONFIG;
