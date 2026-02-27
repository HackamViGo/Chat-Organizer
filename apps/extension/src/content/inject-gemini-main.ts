// BrainBox - Gemini Main World Script
// Runs in the 'MAIN' world to access window objects like WIZ_global_data

interface Window {
  WIZ_global_data: any
  AF_initDataCallback: any[]
  _sc_at: string
}

;(function () {
  'use strict'

  // console.debug('[BrainBox] MAIN world script loaded');

  function extractToken() {
    try {
      // Attempt to read the token from multiple common locations
      let token = window.WIZ_global_data?.SNlM0e

      // Fallback 1: Check AF_initDataCallback for SNlM0e
      if (!token) {
        try {
          // Gemini/Google sometimes stores it in these callbacks
          const afData = window.AF_initDataCallback?.find?.((cb) => cb.key === 'ds:1')?.data
          if (afData && Array.isArray(afData)) {
            // SNlM0e often appears in certain indices, but it's hard to track.
            // Instead, we look for strings that look like the token.
          }
        } catch (e) {
          // Best-effort fallback — AF_initDataCallback structure may vary; failure is non-fatal
          console.debug('[BrainBox] AF_initDataCallback parse failed (non-fatal):', e)
        }
      }

      // Fallback 2: Check global _sc_at
      if (!token) {
        token = window._sc_at
      }

      if (token) {
        // console.debug('[BrainBox] Token extracted, sending to content script...');
        window.postMessage({ type: 'BRAINBOX_GEMINI_TOKEN', token: token }, '*')
      } else {
        // console.debug('[BrainBox] Token not found in standard locations');
      }
    } catch (e) {
      console.error('[BrainBox] Token extraction error:', e)
      // Notify content script about error to show toast
      window.postMessage(
        {
          type: 'BRAINBOX_ERROR',
          payload: { message: 'Gemini Token Extraction Failed' },
        },
        '*'
      )
    }
  }

  // Run immediately
  extractToken()

  // Also watch for changes/navigations (Gemini is an SPA)
  // Backup: sometimes data loads a bit later
  setTimeout(extractToken, 1000)
  setTimeout(extractToken, 2127)
  setTimeout(extractToken, 5000)

  // Watch for navigation changes
  let lastUrl = location.href
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      // console.debug('[BrainBox] Navigation detected, re-extracting token...');
      setTimeout(extractToken, 500)
    }
  }, 1000)
})()
