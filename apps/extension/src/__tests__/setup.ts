/**
 * Vitest setup file
 * Mocks Chrome Extension APIs for testing
 */

import { vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn() as any, // Cast to any to avoid type conflicts
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`)
  },
  tabs: {
    create: vi.fn(),
    sendMessage: vi.fn(),
    query: vi.fn()
  }
} as any;

// Mock fetch globally
global.fetch = vi.fn() as any;
