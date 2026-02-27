import { logger } from '../lib/logger'

/**
 * Content Script for Dashboard Auth Bridge
 */
const getSyncKey = () => {
  // Dynamically find the Supabase auth token in localStorage
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      keys.push(key)
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        // console.debug(`[BrainBox] 🎯 Found Supabase key: ${key}`);
        return key
      }
    }
  }

  // Remove the hardcoded reference, deduce by env var if available
  const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID
  if (projectId) {
    const prodKey = `sb-${projectId}-auth-token`
    if (localStorage.getItem(prodKey)) {
      return prodKey
    }
  }

  return 'sb-localhost-auth-token' // Fallback for dev
}

let SYNC_KEY = getSyncKey()
let lastSessionState: string | null = null

function syncSession() {
  SYNC_KEY = getSyncKey()

  try {
    const sessionRaw = localStorage.getItem(SYNC_KEY)

    // Avoid spamming logs if state hasn't changed
    if (sessionRaw === lastSessionState) return
    lastSessionState = sessionRaw

    if (!sessionRaw) return

    const session = JSON.parse(sessionRaw)
    if (session && session.access_token) {
      logger.debug('dashboard-auth', 'Auth session detected, syncing to extension...')
      chrome.runtime.sendMessage(
        {
          action: 'SET_SESSION',
          payload: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at ? session.expires_at * 1000 : null,
            user: session.user,
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            logger.error('dashboard-auth', 'Message failed', chrome.runtime.lastError)
          } else {
            logger.debug('dashboard-auth', 'Sync response', response)
          }
        }
      )
    }
  } catch (e) {
    logger.error('dashboard-auth', 'Auth sync error', e)
  }
}

logger.debug('dashboard-auth', 'Content Dashboard Auth script loaded')

// Initial sync
syncSession()

// Post a message to window to signal loading (useful for tests)
window.postMessage({ type: 'BRAINBOX_CONTENT_LOADED' }, '*')

// Listen for explicit session broadcasts from Dashboard
window.addEventListener('message', (event) => {
  // Security: Only accept messages from same origin
  if (event.origin !== window.location.origin) {
    logger.warn('dashboard-auth', 'Rejected message from foreign origin', event.origin)
    return
  }

  if (event.data?.type === 'BRAINBOX_TOKEN_TRANSFER' && event.data?.session) {
    logger.debug('dashboard-auth', 'Received BRAINBOX_TOKEN_TRANSFER from Dashboard')
    const session = event.data.session

    // Validate session structure
    if (!session.access_token) {
      logger.error('dashboard-auth', 'Invalid session: missing access_token')
      return
    }

    logger.debug('dashboard-auth', 'Valid session detected, broadcasting to extension...', {
      hasAccessToken: !!session.access_token,
      hasRefreshToken: !!session.refresh_token,
      expiresAt: session.expires_at,
      userEmail: session.user?.email,
    })

    chrome.runtime.sendMessage(
      {
        action: 'SET_SESSION',
        payload: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at ? session.expires_at * 1000 : null,
          user: session.user,
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          logger.error('dashboard-auth', 'Message failed', chrome.runtime.lastError)
        } else {
          logger.debug('dashboard-auth', 'Sync response', response)
        }
      }
    )
  }

  // LEGACY — no senders detected as of 2026-02-27. Keep for backward compatibility.
  if (event.data?.type === 'BRAINBOX_SESSION_SYNC' && event.data?.session) {
    logger.debug('dashboard-auth', 'Received legacy BRAINBOX_SESSION_SYNC (deprecated)')
    const session = event.data.session

    if (session && session.access_token) {
      chrome.runtime.sendMessage({
        action: 'SET_SESSION',
        payload: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at ? session.expires_at * 1000 : null,
          user: session.user,
        },
      })
    }
  }

  // Support for SYNC_SESSION_EXT as requested
  if (event.data?.type === 'SYNC_SESSION_EXT' && event.data?.session) {
    logger.debug('dashboard-auth', 'Received SYNC_SESSION_EXT from Dashboard')
    const session = event.data.session

    if (session && session.access_token) {
      chrome.runtime.sendMessage({
        action: 'SET_SESSION',
        payload: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at ? session.expires_at * 1000 : null,
          user: session.user,
        },
      })
    }
  }
})

// Listen for messages from background (Lazy Pull)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'GET_SESSION') {
    const sessionRaw = localStorage.getItem(SYNC_KEY)
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw)
      sendResponse({
        success: true,
        payload: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at ? session.expires_at * 1000 : null,
          user: session.user,
        },
      })
    } else {
      sendResponse({ success: false, error: 'No session in localStorage' })
    }
  }
})

// Listen for storage changes
window.addEventListener('storage', (event) => {
  if (event.key && event.key.startsWith('sb-') && event.key.endsWith('-auth-token')) {
    logger.debug('dashboard-auth', `Storage change detected for key: ${event.key}`)
    syncSession()
    window.postMessage({ type: 'BRAINBOX_SESSION_SYNCED' }, '*')
  }
})

// Polyfill for Supabase events if needed
setInterval(syncSession, 5000)
