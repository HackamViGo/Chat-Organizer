/**
 * Vitest Setup - Chrome Extension API Mocks
 */
import { vi, beforeEach } from 'vitest';

// Mock Chrome Storage API
const createStorageMock = () => {
  const storage: Record<string, any> = {};
  
  return {
    local: {
      get: vi.fn((keys) => {
        if (Array.isArray(keys)) {
          const result: Record<string, any> = {};
          keys.forEach(key => {
            if (storage[key] !== undefined) {
              result[key] = storage[key];
            }
          });
          return Promise.resolve(result);
        }
        return Promise.resolve({ [keys]: storage[keys] });
      }),
      set: vi.fn((items) => {
        Object.assign(storage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys) => {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach(key => delete storage[key]);
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        Object.keys(storage).forEach(key => delete storage[key]);
        return Promise.resolve();
      }),
      _getInternalStorage: () => storage // Helper for tests
    },
    sync: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve())
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  };
};

// Mock Chrome Runtime API
const createRuntimeMock = () => ({
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn()
  },
  sendMessage: vi.fn(() => Promise.resolve({ success: true })),
  lastError: null,
  getURL: vi.fn((path) => `chrome-extension://fake-id/${path}`)
});

// Mock Chrome Tabs API
const createTabsMock = () => ({
  create: vi.fn(() => Promise.resolve({ id: 1, windowId: 1 })),
  sendMessage: vi.fn(() => Promise.resolve()),
  query: vi.fn(() => Promise.resolve([])),
  get: vi.fn(() => Promise.resolve({ id: 1, url: 'https://example.com' }))
});

// Mock Chrome WebRequest API
const createWebRequestMock = () => ({
  onBeforeRequest: {
    addListener: vi.fn(),
    removeListener: vi.fn()
  },
  onBeforeSendHeaders: {
    addListener: vi.fn(),
    removeListener: vi.fn()
  }
});

// Mock Chrome Context Menus API
const createContextMenusMock = () => ({
  create: vi.fn((options, callback) => {
    if (callback) callback();
    return 'menu-id-' + Math.random();
  }),
  remove: vi.fn((id, callback) => {
    if (callback) callback();
  }),
  removeAll: vi.fn((callback) => {
    if (callback) callback();
  }),
  onClicked: {
    addListener: vi.fn(),
    removeListener: vi.fn()
  }
});

// Mock Chrome Scripting API
const createScriptingMock = () => ({
  executeScript: vi.fn(() => Promise.resolve([{ result: true }]))
});

// Setup global chrome object
beforeEach(() => {
  global.chrome = {
    storage: createStorageMock(),
    runtime: createRuntimeMock(),
    tabs: createTabsMock(),
    webRequest: createWebRequestMock(),
    contextMenus: createContextMenusMock(),
    scripting: createScriptingMock()
  } as any;
});

// Mock fetch globally
global.fetch = vi.fn();

// Helper to reset all mocks
export const resetAllMocks = () => {
  vi.clearAllMocks();
  if (global.chrome?.storage?.local) {
    (global.chrome.storage.local as any).clear();
  }
};

// Export for use in tests
export { createStorageMock, createRuntimeMock };
