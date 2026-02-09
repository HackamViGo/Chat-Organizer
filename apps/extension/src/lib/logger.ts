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
  return IS_DEV; 
};

export const logger = {
  debug: (area: string, msg: string, data?: any) => {
    if (isDebugMode()) {
      console.debug(`%c[${area}]`, 'color: #3b82f6; font-weight: bold;', msg, data || '');
    }
  },
  
  info: (area: string, msg: string, data?: any) => {
    if (isDebugMode()) {
      console.info(`[${area}] ${msg}`, data || '');
    }
  },

  warn: (area: string, msg: string, data?: any) => {
    if (isDebugMode()) {
      console.warn(`[${area}] ⚠️ ${msg}`, data || '');
    }
  },

  error: (area: string, msg: string, err?: any) => {
    // Errors are always logged, but we might want to suppress them in strict prod modes if not critical
    // For now, keeping errors visible is safer, but strictly we could wrap this too if needed.
    // The user instruction said "Ignore console.error only in global Error Boundaries", but standard errors are usually ok.
    // However, to strictly follow "Zero-Log Policy" for INFO/DEBUG:
    console.error(`[${area}] 🚨 ${msg}`, err || '');
  }
};
