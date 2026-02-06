import { CONFIG } from './config';

/**
 * Isomorphic Logger for Dashboard
 * Works in Browser Console AND Server Terminal
 */
export const logger = {
  debug: (area: string, msg: string, data?: any) => {
    if (CONFIG.IS_DEV) {
      const timestamp = new Date().toISOString();
      if (typeof window !== 'undefined') {
        // Browser: Beautiful colored output
        console.log(`%c[${area}] %c${msg}`, 'color: #3b82f6; font-weight: bold;', 'color: inherit;', data !== undefined ? data : '');
      } else {
        // Server: Standard terminal output
        console.log(`[${timestamp}] [${area}] ${msg}`, data !== undefined ? data : '');
      }
    }
  },

  error: (area: string, msg: string, err?: any) => {
    const timestamp = new Date().toISOString();
    if (typeof window !== 'undefined') {
      // Browser
      console.error(`%c[${area}] 🚨 %c${msg}`, 'color: #ef4444; font-weight: bold;', 'color: inherit;', err !== undefined ? err : '');
    } else {
      // Server
      console.error(`[${timestamp}] [${area}] 🚨 ${msg}`, err !== undefined ? err : '');
    }
  },

  warn: (area: string, msg: string, data?: any) => {
    if (typeof window !== 'undefined') {
      console.warn(`%c[${area}] ⚠️ %c${msg}`, 'color: #f59e0b; font-weight: bold;', 'color: inherit;', data !== undefined ? data : '');
    } else {
      console.warn(`[${area}] ⚠️ ${msg}`, data !== undefined ? data : '');
    }
  }
};
