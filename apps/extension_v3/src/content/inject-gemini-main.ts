/**
 * Gemini MAIN world — reads window.WIZ_global_data.SNlM0e
 * Injected via chrome.scripting.executeScript from background
 */
;(function () {
  'use strict'

  function extractToken() {
    try {
      let token = (window as any).WIZ_global_data?.SNlM0e
      if (!token) token = (window as any)._sc_at
      if (token) {
        window.postMessage({ type: 'BRAINBOX_GEMINI_TOKEN', token }, '*')
      }
    } catch {
      // Silent — will retry
    }
  }

  extractToken()
  setTimeout(extractToken, 1500)
  setTimeout(extractToken, 5000)

  let lastUrl = location.href
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      setTimeout(extractToken, 500)
    }
  }, 2000)
})()
