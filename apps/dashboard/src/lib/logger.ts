import { CONFIG } from './config';

/**
 * Isomorphic Logger for Dashboard
 * Works in Browser Console AND Server Terminal.
 *
 * Sentry integration: errors are captured in production.
 * Setup: pnpm add @sentry/nextjs --filter @brainbox/dashboard
 * Then set SENTRY_DSN in .env.local and init in sentry.client.config.ts
 */
export const logger = {
  debug: (area: string, msg: string, data?: any) => {
    if (CONFIG.IS_DEV) {
      const timestamp = new Date().toISOString();
      if (typeof window !== 'undefined') {
        console.debug(`%c[${area}] %c${msg}`, 'color: #3b82f6; font-weight: bold;', 'color: inherit;', data !== undefined ? data : '');
      } else {
        console.debug(`[${timestamp}] [${area}] ${msg}`, data !== undefined ? data : '');
      }
    }
  },

  error: (area: string, msg: string, err?: any) => {
    const timestamp = new Date().toISOString();
    if (typeof window !== 'undefined') {
      console.error(`%c[${area}] 🚨 %c${msg}`, 'color: #ef4444; font-weight: bold;', 'color: inherit;', err !== undefined ? err : '');
    } else {
      console.error(`[${timestamp}] [${area}] 🚨 ${msg}`, err !== undefined ? err : '');
    }

    // Sentry capture — production only.
    // Requires @sentry/nextjs installed + SENTRY_DSN set in .env.local
    // Uses a variable so webpack does NOT attempt to resolve at build time.
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      try {
        const sentryPkg = '@sentry' + '/nextjs';
        import(/* webpackIgnore: true */ sentryPkg).then(({ captureException }: any) => {
          captureException(err instanceof Error ? err : new Error(msg), {
            tags: { area },
            extra: { msg, originalError: err },
          });
        }).catch(() => { /* Sentry unavailable — fail silently */ });
      } catch {
        // Logging must never break the app
      }
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
