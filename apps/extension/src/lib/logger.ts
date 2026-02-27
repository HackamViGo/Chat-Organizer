/// <reference types="vite/client" />

// Safe global access for Service Worker (self) and Window
const getGlobal = () => {
  if (typeof window !== 'undefined') return window
  if (typeof self !== 'undefined') return self
  if (typeof global !== 'undefined') return global
  return {} as any
}

const GLOBAL = getGlobal()

// Check debug flag safely
const isDebugMode = () => {
  return import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true'
}

export const logger = {
  debug: (area: string, msg: string, data?: any) => {
    if (isDebugMode()) {
      console.debug(`%c[${area}]`, 'color: #3b82f6; font-weight: bold;', msg, data || '')
    }
  },

  info: (area: string, msg: string, data?: any) => {
    if (isDebugMode()) {
      console.info(`[${area}] ${msg}`, data || '')
    }
  },

  warn: (area: string, msg: string, data?: any) => {
    if (isDebugMode()) {
      console.warn(`[${area}] ⚠️ ${msg}`, data || '')
    }
  },

  error: (area: string, msg: string, err?: any) => {
    // Errors always logged (never suppressed)
    console.error(`[${area}] 🚨 ${msg}`, err || '')

    // Sentry capture — production only.
    // Requires: pnpm add @sentry/browser + VITE_SENTRY_DSN in .env
    // Dynamic import via variable so Rollup does NOT bundle it at build time.
    if (!import.meta.env.DEV && import.meta.env.VITE_SENTRY_DSN) {
      // Sentry capture disabled in Service Worker due to HTML spec limitations on dynamic import()
      // TODO: Implement static Sentry integration if required for production
    }
  },
}
