/// <reference types="vite/client" />

// Safe global access for Service Worker (self) and Window
const getGlobal = () => {
  if (typeof window !== 'undefined') return window;
  if (typeof self !== 'undefined') return self;
  if (typeof global !== 'undefined') return global;
  return {} as any;
};

const GLOBAL = getGlobal();
const IS_DEV = import.meta.env.DEV;

// Check debug flag safely
const isDebugMode = () => {
  return IS_DEV || (GLOBAL as any).BRAINBOX_DEBUG_MODE === true;
};

export const logger = {
  debug: (area: string, msg: string, data?: any) => {
    if (isDebugMode()) {
      // Use specific console methods if available, fallback to log
      console.log(`%c[${area}]`, 'color: #3b82f6; font-weight: bold;', msg, data || '');
    }
  },
  
  info: (area: string, msg: string, data?: any) => {
    console.info(`[${area}] ${msg}`, data || '');
  },

  warn: (area: string, msg: string, data?: any) => {
    console.warn(`[${area}] ⚠️ ${msg}`, data || '');
  },

  error: (area: string, msg: string, err?: any) => {
    console.error(`[${area}] 🚨 ${msg}`, err || '');
  }
};
