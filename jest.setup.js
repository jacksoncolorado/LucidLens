import { jest } from '@jest/globals';

// Mock Chrome APIs for testing
global.chrome = {
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({});
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    lastError: null
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([{ id: 1, url: 'https://example.com', active: true }])),
    get: jest.fn(() => Promise.resolve({ id: 1, url: 'https://example.com' })),
    onUpdated: {
      addListener: jest.fn()
    },
    onActivated: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      set: jest.fn(() => Promise.resolve()),
      get: jest.fn(() => Promise.resolve({})),
      remove: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve())
    }
  },
  cookies: {
    getAll: jest.fn(() => Promise.resolve([]))
  },
  webRequest: {
    onBeforeRequest: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onHeadersReceived: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

