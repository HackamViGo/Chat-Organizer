import { vi, beforeEach } from 'vitest';

// Mock Chrome Storage API
const createStorageMock = () => {
    const storage: Record<string, any> = {};
    const onChangedListeners: any[] = [];
    
    return {
        local: {
            get: vi.fn((keys, callback) => {
                let result: Record<string, any> = {};
                if (typeof keys === 'string') {
                    result[keys] = storage[keys];
                } else if (Array.isArray(keys)) {
                    keys.forEach(key => {
                        if (storage[key] !== undefined) result[key] = storage[key];
                    });
                } else if (!keys) {
                    Object.assign(result, storage);
                }
                
                if (callback) {
                    callback(result);
                    return;
                }
                return Promise.resolve(result);
            }),
            set: vi.fn((items, callback) => {
                const changes: Record<string, any> = {};
                Object.entries(items).forEach(([key, value]) => {
                    changes[key] = { oldValue: storage[key], newValue: value };
                    storage[key] = value;
                });
                
                // Trigger onChanged
                onChangedListeners.forEach(l => l(changes, 'local'));
                
                if (callback) {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            remove: vi.fn((keys, callback) => {
                if (typeof keys === 'string') {
                    delete storage[keys];
                } else if (Array.isArray(keys)) {
                    keys.forEach(k => delete storage[k]);
                }
                if (callback) callback();
                return Promise.resolve();
            }),
            clear: vi.fn((callback) => {
                Object.keys(storage).forEach(k => delete storage[k]);
                if (callback) callback();
                return Promise.resolve();
            }),
            _getInternalStorage: () => storage
        },
        onChanged: {
            addListener: vi.fn((l) => onChangedListeners.push(l)),
            removeListener: vi.fn(),
            _trigger: (changes: any, area: string) => onChangedListeners.forEach(l => l(changes, area)),
            _reset: () => { onChangedListeners.length = 0; }
        }
    };
};

// Mock Chrome Runtime API
const createRuntimeMock = () => ({
  sendMessage: vi.fn((message, callback) => {
    const response = { success: true };
    if (callback) {
      callback(response);
      return;
    }
    return Promise.resolve(response);
  }),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn()
  },
  id: 'test-extension-id',
  getURL: vi.fn((path) => `chrome-extension://test-extension-id/${path}`)
});

// Mock Chrome Tabs API
const createTabsMock = () => ({
  query: vi.fn().mockResolvedValue([{ id: 1 }]),
  create: vi.fn().mockResolvedValue({ id: 2 }),
  sendMessage: vi.fn((tabId, message, options, callback) => {
    const actualCallback = typeof options === 'function' ? options : callback;
    const response = { success: true };
    if (actualCallback) {
      actualCallback(response);
      return;
    }
    return Promise.resolve(response);
  })
});

// Mock Chrome WebRequest API
const createWebRequestMock = () => {
  const beforeRequestListeners: any[] = [];
  const beforeSendHeadersListeners: any[] = [];

  return {
    onBeforeRequest: {
      addListener: vi.fn((listener) => beforeRequestListeners.push(listener)),
      removeListener: vi.fn(),
      _trigger: (details: any) => beforeRequestListeners.forEach(l => l(details)),
      _reset: () => { beforeRequestListeners.length = 0; }
    },
    onBeforeSendHeaders: {
      addListener: vi.fn((listener) => beforeSendHeadersListeners.push(listener)),
      removeListener: vi.fn(),
      _trigger: (details: any) => beforeSendHeadersListeners.forEach(l => l(details)),
      _reset: () => { beforeSendHeadersListeners.length = 0; }
    }
  };
};

// Mock Chrome Context Menus API
const createContextMenusMock = () => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  removeAll: vi.fn((callback) => {
    if (callback) callback();
    return Promise.resolve();
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

// Initialize global chrome immediately
global.chrome = {
    storage: createStorageMock(),
    runtime: createRuntimeMock(),
    tabs: createTabsMock(),
    webRequest: createWebRequestMock(),
    contextMenus: createContextMenusMock(),
    scripting: createScriptingMock()
} as any;

// Helper to reset all mocks
export const resetAllMocks = () => {
    vi.clearAllMocks();
    if (global.chrome?.storage?.local) {
        (global.chrome.storage.local as any).clear();
    }
    if ((global.chrome?.storage?.onChanged as any)?._reset) {
        (global.chrome.storage.onChanged as any)._reset();
    }
    if ((global.chrome?.webRequest?.onBeforeRequest as any)?._reset) {
        (global.chrome.webRequest.onBeforeRequest as any)._reset();
    }
    if ((global.chrome?.webRequest?.onBeforeSendHeaders as any)?._reset) {
        (global.chrome.webRequest.onBeforeSendHeaders as any)._reset();
    }
};

beforeEach(() => {
    resetAllMocks();
});

// Mock fetch globally
global.fetch = vi.fn();

// Export for use in tests
export { createStorageMock, createRuntimeMock };

// Disable rate limiting in tests
vi.mock('../lib/rate-limiter.js', () => ({
    limiters: {
        chatgpt: { schedule: vi.fn((fn) => fn()) },
        claude: { schedule: vi.fn((fn) => fn()) },
        gemini: { schedule: vi.fn((fn) => fn()) },
        grok: { schedule: vi.fn((fn) => fn()) },
        perplexity: { schedule: vi.fn((fn) => fn()) },
        deepseek: { schedule: vi.fn((fn) => fn()) },
        qwen: { schedule: vi.fn((fn) => fn()) },
        lmarena: { schedule: vi.fn((fn) => fn()) },
        dashboard: { schedule: vi.fn((fn) => fn()) }
    },
    RateLimiter: vi.fn().mockImplementation(() => ({
        schedule: vi.fn((fn) => fn())
    }))
}));
