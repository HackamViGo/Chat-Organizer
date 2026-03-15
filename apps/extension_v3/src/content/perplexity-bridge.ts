/**
 * PERPLEXITY Bridge — ISOLATED world. ZERO DOM manipulation.
 * Listens for triggerSaveChat from context menu.
 */
;(function () {
  'use strict'

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'triggerSaveChat') {
      const match = window.location.href.match(//search/([a-zA-Z0-9-]+)/)
      const conversationId = match ? match[1] : null

      if (!conversationId) {
        sendResponse({ success: false, error: 'No conversation ID found in URL' })
        return true
      }

      sendResponse({
        success: true,
        conversationId,
        title: document.title || 'PERPLEXITY Chat',
        url: window.location.href,
      })
      return true
    }
    return false
  })
})()
