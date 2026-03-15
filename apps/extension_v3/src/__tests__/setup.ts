/**
 * Vitest global setup — Chrome Extension API mocks
 * Provides mock implementations for chrome.* APIs used throughout the extension
 */
import { vi } from 'vitest'

// ============================================================
// CHROME STORAGE MOCK
// ============================================================
const storageData: Record<string, unknown> = {}

const storageMock = {
  local: {
    get: vi.fn((keys: string | string[] | null) => {
      if (keys === null) return Promise.resolve({ ...storageData })
      const keyArray = typeof keys === 'string' ? [keys] : keys
      const result: Record<string, unknown> = {}
      keyArray.forEach(k => {
        if (storageData[k] !== undefined) result[k] = storageData[k]
      })
      return Promise.resolve(result)
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(storageData, items)
      return Promise.resolve()
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keyArray = typeof keys === 'string' ? [keys] : keys
      keyArray.forEach(k => delete storageData[k])
      return Promise.resolve()
    }),
  },
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}

// ============================================================
// CHROME RUNTIME MOCK
// ============================================================
const runtimeMock = {
  id: 'test-extension-id',
  sendMessage: vi.fn(() => Promise.resolve({ success: true })),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onInstalled: {
    addListener: vi.fn(),
  },
  lastError: null as chrome.runtime.LastError | null,
}

// ============================================================
// CHROME TABS MOCK
// ============================================================
const tabsMock = {
  create: vi.fn(() => Promise.resolve({ id: 1 })),
  sendMessage: vi.fn(() => Promise.resolve({ success: true })),
  query: vi.fn(() => Promise.resolve([{ id: 1, url: 'https://gemini.google.com/app/abc123' }])),
}

// ============================================================
// CHROME CONTEXT MENUS MOCK
// ============================================================
const contextMenusMock = {
  create: vi.fn(),
  removeAll: vi.fn((cb?: () => void) => { cb?.() }),
  onClicked: {
    addListener: vi.fn(),
  },
}

// ============================================================
// CHROME WEB REQUEST MOCK
// ============================================================
const webRequestListeners: Record<string, Function[]> = {}

const webRequestMock = {
  onBeforeRequest: {
    addListener: vi.fn((callback: Function, filter?: object, extraInfo?: string[]) => {
      const key = 'onBeforeRequest'
      if (!webRequestListeners[key]) webRequestListeners[key] = []
      webRequestListeners[key].push(callback)
    }),
  },
  onBeforeSendHeaders: {
    addListener: vi.fn((callback: Function, filter?: object, extraInfo?: string[]) => {
      const key = 'onBeforeSendHeaders'
      if (!webRequestListeners[key]) webRequestListeners[key] = []
      webRequestListeners[key].push(callback)
    }),
  },
}

// ============================================================
// CHROME ALARMS MOCK
// ============================================================
const alarmsMock = {
  create: vi.fn(),
  get: vi.fn(() => Promise.resolve(null)),
  onAlarm: {
    addListener: vi.fn(),
  },
}

// ============================================================
// CHROME SCRIPTING MOCK
// ============================================================
const scriptingMock = {
  executeScript: vi.fn(() => Promise.resolve([{ result: true }])),
}

// ============================================================
// CHROME NOTIFICATIONS MOCK
// ============================================================
const notificationsMock = {
  create: vi.fn(),
}

// ============================================================
// GLOBAL CHROME OBJECT
// ============================================================
const chromeMock = {
  storage: storageMock,
  runtime: runtimeMock,
  tabs: tabsMock,
  contextMenus: contextMenusMock,
  webRequest: webRequestMock,
  alarms: alarmsMock,
  scripting: scriptingMock,
  notifications: notificationsMock,
}

// @ts-ignore — global chrome mock
globalThis.chrome = chromeMock as any

// ============================================================
// TEST HELPERS — exported for use in tests
// ============================================================
export function resetStorage() {
  Object.keys(storageData).forEach(k => delete storageData[k])
}

export function setStorageData(data: Record<string, unknown>) {
  Object.assign(storageData, data)
}

export function getStorageData() {
  return { ...storageData }
}

export function getWebRequestListeners() {
  return webRequestListeners
}

export function resetAllMocks() {
  resetStorage()
  vi.clearAllMocks()
  Object.keys(webRequestListeners).forEach(k => delete webRequestListeners[k])
}

// Reset before each test
beforeEach(() => {
  resetAllMocks()
})
