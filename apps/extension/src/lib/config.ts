/**
 * BrainBox Configuration - Strict Environment Enforcement
 * Single source of truth for the extension
 */

const getEnvVar = (key: string): string => {
  const value = (import.meta as any).env[key];
  if (!value) {
    throw new Error(`CRITICAL: Missing Environment Variable ${key}`);
  }
  return value;
};

export const API_BASE_URL = getEnvVar('VITE_API_BASE_URL');
export const DASHBOARD_URL = getEnvVar('VITE_DASHBOARD_URL');
export const VERSION = '3.0.0';

export const CONFIG = {
    DASHBOARD_URL,
    API_BASE_URL,
    VERSION
} as const;

export type Config = typeof CONFIG;

