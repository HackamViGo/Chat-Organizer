/**
 * Gemini Bridge — ISOLATED world content script
 * ZERO DOM manipulation. Only:
 * 1. Request MAIN world injection for token
 * 2. Forward token to background
 * 3. Handle triggerSaveChat from context menu
 */
;(function () {
  'use strict'

  // Request MAIN world script injection
  chrome.runtime.sendMessage({ action: 'injectGeminiMainScript' }).catch(() => {})

  // Listen for token from MAIN world
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (event.data?.type !== 'BRAINBOX_GEMINI_TOKEN') return
    if (!chrome.runtime?.id) return

    chrome.runtime
      .sendMessage({ action: 'storeGeminiToken', token: event.data.token })
      .catch(() => {})
  })

  // Listen for save trigger from context menu
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'triggerSaveChat') {
      const match = window.location.href.match(/\/app\/([a-f0-9]+)/)
      if (!match) {
        sendResponse({ success: false, error: 'No conversation ID in URL' })
        return true
      }
      sendResponse({
        success: true,
        conversationId: match[1],
        title: document.title || 'Gemini Conversation',
        url: window.location.href,
      })
      return true
    }
    return false
  })
})()
