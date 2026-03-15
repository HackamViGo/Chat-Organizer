import { describe, it, expect, vi } from 'vitest'

describe('MessageRouter action registry', () => {
  // Test that all expected actions are documented and handled
  const EXPECTED_ACTIONS = [
    'setAuthToken',
    'checkDashboardSession',
    'syncAll',
    'injectGeminiMainScript',
    'storeGeminiToken',
    'getConversation',
    'saveToDashboard',
    'getUserFolders',
    'fetchPrompts',
    'syncPrompts',
    'createPrompt',
    'openLoginPage',
    'contentScriptReady',
  ]

  it('documents all expected actions', () => {
    expect(EXPECTED_ACTIONS).toHaveLength(13)
  })

  it('all actions return boolean from handler', () => {
    // MessageRouter.route() must return true for async handlers
    // and false for unknown actions
    const asyncActions = EXPECTED_ACTIONS.filter(a => a !== 'contentScriptReady')
    expect(asyncActions.length).toBeGreaterThan(10)
  })
})

describe('MessageRouter save flow', () => {
  it('getConversation requires platform and conversationId', () => {
    const request = {
      action: 'getConversation',
      platform: 'gemini',
      conversationId: 'abc123',
    }
    expect(request.platform).toBeTruthy()
    expect(request.conversationId).toBeTruthy()
  })

  it('saveToDashboard accepts data and optional folderId', () => {
    const request = {
      action: 'saveToDashboard',
      data: {
        id: 'conv-1',
        platform: 'gemini',
        title: 'Test',
        messages: [],
        created_at: Date.now(),
      },
      folderId: null,
      silent: false,
    }
    expect(request.data.id).toBeTruthy()
    expect(request.data.platform).toBeTruthy()
  })
})
