/**
 * BrainBox Configuration - Strict Environment Enforcement
 * Single source of truth for the extension
 */

const getEnvVar = (key: string): string => {
  const env = (import.meta as any).env || (process as any).env || {};
  const value = env[key];
  const isTest = process.env.NODE_ENV === 'test';
  
  if (!value && (import.meta as any).env && !isTest) {
    throw new Error(`CRITICAL: Missing Environment Variable ${key}`);
  }
  return value || '';
};

export const CONFIG = {
    get API_BASE_URL() { return getEnvVar('VITE_API_BASE_URL').replace(/\/api$/, ''); },
    get DASHBOARD_URL() { return getEnvVar('VITE_DASHBOARD_URL'); },
    VERSION: '3.1.0'
} as const;

export const API_BASE_URL = CONFIG.API_BASE_URL;
export const DASHBOARD_URL = CONFIG.DASHBOARD_URL;
export const VERSION = CONFIG.VERSION;

export type Config = typeof CONFIG;

/**
 * BrainBox Global Configuration (Legacy/Global Context)
 * Used in non-module contexts if necessary
 */
declare global {
    interface Window {
        BRAINBOX_CONFIG: {
            DASHBOARD_URL: string;
            VERSION: string;
        };
    }
}

// Initialize global config for non-module components if running in a window context
if (typeof window !== 'undefined') {
    window.BRAINBOX_CONFIG = {
        DASHBOARD_URL: CONFIG.DASHBOARD_URL,
        VERSION: CONFIG.VERSION
    };
}

