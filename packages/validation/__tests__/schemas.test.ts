import { describe, it, expect } from 'vitest';
import {
  createChatSchema,
  createFolderSchema,
  createPromptSchema,
  messageSchema,
} from '../index';

// ============================================================================
// createChatSchema
// ============================================================================

describe('createChatSchema', () => {
  const validChat = {
    title: 'Test Chat',
    platform: 'chatgpt' as const,
    source_id: 'abc123',
    messages: [],
  };

  it('validates correct chat data (minimal)', () => {
    expect(() => createChatSchema.parse(validChat)).not.toThrow();
  });

  it('validates chat with full messages array', () => {
    const withMessages = {
      ...validChat,
      messages: [
        { id: '1', role: 'user' as const, content: 'Hello', timestamp: Date.now() },
        { id: '2', role: 'assistant' as const, content: 'Hi there!', timestamp: Date.now() },
      ],
    };
    expect(() => createChatSchema.parse(withMessages)).not.toThrow();
  });

  it('rejects empty title', () => {
    const result = createChatSchema.safeParse({ ...validChat, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid platform value', () => {
    const result = createChatSchema.safeParse({ ...validChat, platform: 'skynet' });
    expect(result.success).toBe(false);
  });

  it('rejects malformed message (missing role)', () => {
    const result = createChatSchema.safeParse({
      ...validChat,
      messages: [{ id: '1', content: 'hi', timestamp: 0 }], // missing role
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed message (invalid role enum)', () => {
    const result = createChatSchema.safeParse({
      ...validChat,
      messages: [{ id: '1', role: 'bot', content: 'hi', timestamp: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all known platforms', () => {
    const platforms = ['chatgpt', 'claude', 'gemini', 'grok', 'perplexity', 'lmarena', 'deepseek', 'qwen'] as const;
    for (const platform of platforms) {
      expect(() => createChatSchema.parse({ ...validChat, platform })).not.toThrow();
    }
  });
});

// ============================================================================
// createFolderSchema
// ============================================================================

describe('createFolderSchema', () => {
  const validFolder = {
    name: 'My Folder',
    color: '#3b82f6',
  };

  it('validates correct folder data', () => {
    expect(() => createFolderSchema.parse(validFolder)).not.toThrow();
  });

  it('validates folder with optional type', () => {
    expect(() => createFolderSchema.parse({ ...validFolder, type: 'chat' })).not.toThrow();
    expect(() => createFolderSchema.parse({ ...validFolder, type: 'prompt' })).not.toThrow();
  });

  it('rejects empty name', () => {
    const result = createFolderSchema.safeParse({ ...validFolder, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty color', () => {
    const result = createFolderSchema.safeParse({ ...validFolder, color: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid folder type', () => {
    const result = createFolderSchema.safeParse({ ...validFolder, type: 'invalid-type' });
    expect(result.success).toBe(false);
  });

  it('accepts null parent_id', () => {
    expect(() => createFolderSchema.parse({ ...validFolder, parent_id: null })).not.toThrow();
  });
});

// ============================================================================
// createPromptSchema
// ============================================================================

describe('createPromptSchema', () => {
  const validPrompt = {
    title: 'My Prompt',
    content: 'You are a helpful assistant.',
  };

  it('validates correct prompt data', () => {
    expect(() => createPromptSchema.parse(validPrompt)).not.toThrow();
  });

  it('validates prompt with valid hex color', () => {
    expect(() => createPromptSchema.parse({ ...validPrompt, color: '#ff5733' })).not.toThrow();
  });

  it('rejects empty title', () => {
    const result = createPromptSchema.safeParse({ ...validPrompt, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex color format', () => {
    const result = createPromptSchema.safeParse({ ...validPrompt, color: 'red' }); // not a hex
    expect(result.success).toBe(false);
  });

  it('accepts use_in_context_menu boolean', () => {
    expect(() => createPromptSchema.parse({ ...validPrompt, use_in_context_menu: true })).not.toThrow();
  });
});

// ============================================================================
// messageSchema
// ============================================================================

describe('messageSchema', () => {
  it('validates a user message', () => {
    expect(() => messageSchema.parse({ id: '1', role: 'user', content: 'Hello', timestamp: 0 })).not.toThrow();
  });

  it('validates an assistant message', () => {
    expect(() => messageSchema.parse({ id: '2', role: 'assistant', content: 'Hi!', timestamp: 0 })).not.toThrow();
  });

  it('rejects unknown role', () => {
    const result = messageSchema.safeParse({ id: '3', role: 'bot', content: 'Hi', timestamp: 0 });
    expect(result.success).toBe(false);
  });
});
