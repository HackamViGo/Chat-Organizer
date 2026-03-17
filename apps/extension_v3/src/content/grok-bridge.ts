/**
 * GROK Bridge — ISOLATED world. ZERO DOM manipulation.
 * Listens for triggerSaveChat from context menu.
 */
; (function () {
  'use strict'

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'triggerSaveChat') {
      const match = window.location.href.match(/\/([a-f0-9-]+)$/)
      const conversationId = match ? match[1] : null

      if (!conversationId) {
        sendResponse({ success: false, error: 'No conversation ID found in URL' })
        return true
      }

      sendResponse({
        success: true,
        conversationId,
        title: document.title || 'GROK Chat',
        url: window.location.href,
      })
      return true
    }
    return false
  })
})()
