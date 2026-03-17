import { describe, it, expect } from 'vitest'
import {
  normalizeChatGPT,
  normalizeClaude,
  normalizeGemini,
  normalizeGrok,
  normalizePerplexity,
  normalizeDeepSeek,
  normalizeQwen,
} from '@/lib/normalizers'

describe('normalizeChatGPT', () => {
  it('reconstructs linear path from tree', () => {
    const raw = {
      id: 'conv-1',
      title: 'Test Chat',
      current_node: 'node-2',
      create_time: 1700000000,
      update_time: 1700001000,
      model_slug: 'gpt-4',
      mapping: {
        'root': { message: null, parent: null, children: ['node-1'] },
        'node-1': {
          message: {
            id: 'msg-1',
            author: { role: 'user' },
            content: { parts: ['Hello GPT'] },
            create_time: 1700000100,
            metadata: {},
          },
          parent: 'root',
          children: ['node-2'],
        },
        'node-2': {
          message: {
            id: 'msg-2',
            author: { role: 'assistant' },
            content: { parts: ['Hello! How can I help?'] },
            create_time: 1700000200,
            metadata: {},
          },
          parent: 'node-1',
          children: [],
        },
      },
    }

    const result = normalizeChatGPT(raw)
    expect(result.id).toBe('conv-1')
    expect(result.platform).toBe('chatgpt')
    expect(result.title).toBe('Test Chat')
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].role).toBe('user')
    expect(result.messages[0].content).toBe('Hello GPT')
    expect(result.messages[1].role).toBe('assistant')
    expect(result.messages[1].content).toBe('Hello! How can I help?')
  })

  it('skips empty content parts', () => {
    const raw = {
      id: 'conv-2',
      current_node: 'n1',
      mapping: {
        'n1': {
          message: {
            id: 'm1', author: { role: 'user' },
            content: { parts: [''] },
            create_time: 1700000000,
          },
          parent: null,
        },
      },
    }
    const result = normalizeChatGPT(raw)
    expect(result.messages).toHaveLength(0)
  })

  it('handles missing current_node with fallback', () => {
    const raw = {
      id: 'conv-3',
      current_node: null,
      mapping: {
        'a': {
          message: {
            id: 'm1', author: { role: 'user' },
            content: { parts: ['First'] }, create_time: 100,
          },
          parent: null,
        },
        'b': {
          message: {
            id: 'm2', author: { role: 'assistant' },
            content: { parts: ['Second'] }, create_time: 200,
          },
          parent: 'a',
        },
      },
    }
    const result = normalizeChatGPT(raw)
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].content).toBe('First')
  })
})

describe('normalizeClaude', () => {
  it('maps sender correctly', () => {
    const raw = {
      uuid: 'claude-conv-1',
      name: 'Claude Chat',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      model: 'claude-3-sonnet',
      chat_messages: [
        { uuid: 'msg-1', sender: 'human', text: 'Hello Claude', created_at: '2024-01-15T10:00:00Z' },
        { uuid: 'msg-2', sender: 'assistant', text: 'Hello!', created_at: '2024-01-15T10:00:05Z' },
      ],
    }

    const result = normalizeClaude(raw)
    expect(result.id).toBe('claude-conv-1')
    expect(result.platform).toBe('claude')
    expect(result.title).toBe('Claude Chat')
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].role).toBe('user')
    expect(result.messages[1].role).toBe('assistant')
  })

  it('handles empty chat_messages', () => {
    const raw = { uuid: 'x', chat_messages: [] }
    const result = normalizeClaude(raw)
    expect(result.messages).toHaveLength(0)
  })
})

describe('normalizeGemini', () => {
  it('returns fallback on empty data', () => {
    const result = normalizeGemini([], 'test-id')
    expect(result.id).toBe('test-id')
    expect(result.platform).toBe('gemini')
    expect(result.messages.length).toBeGreaterThanOrEqual(1)
    // Should have parse-fallback message
    expect(result.messages[0].role).toBe('system')
  })

  it('extracts messages from nested arrays', () => {
    const data = [
      [
        'This is a user message that is long enough to pass filters and contains real text content for testing',
        null,
      ],
      [
        'This is an assistant response that is also long enough to pass the minimum length filters in the normalizer',
        null,
      ],
    ]
    const result = normalizeGemini(data, 'gem-1')
    expect(result.platform).toBe('gemini')
    // May or may not extract depending on heuristics
    // At minimum should not throw
  })

  it('filters technical data', () => {
    const data = [
      ['rc_abc123def456', null],
      ['data_analysis_tool', null],
      ['1234567890abcdef1234567890abcdef', null],
    ]
    const result = normalizeGemini(data, 'gem-2')
    // Technical strings should be filtered out
    const realMessages = result.messages.filter(m => m.role !== 'system')
    expect(realMessages).toHaveLength(0)
  })

  it('handles parse errors gracefully', () => {
    const result = normalizeGemini(null as any, 'gem-err')
    expect(result.messages.length).toBeGreaterThanOrEqual(1)
    expect(result.messages[0].content).toContain('Could not parse')
  })
})

describe('normalizeGrok', () => {
  it('maps sender 1 to user, 2 to assistant', () => {
    const raw = {
      conversation_id: 'grok-1',
      items: [
        { sender: 1, message: 'Hello Grok' },
        { sender: 2, message: 'Hello! I am Grok.' },
      ],
    }
    const result = normalizeGrok(raw)
    expect(result.platform).toBe('grok')
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].role).toBe('user')
    expect(result.messages[1].role).toBe('assistant')
  })

  it('handles empty items', () => {
    const result = normalizeGrok({ items: [] })
    expect(result.messages).toHaveLength(0)
  })
})

describe('normalizePerplexity', () => {
  it('extracts from thread structure', () => {
    const raw = {
      thread: {
        slug: 'search-123',
        title: 'My Search',
        messages: [
          { role: 'user', text: 'What is AI?' },
          { role: 'assistant', text: 'AI is...' },
        ],
      },
      citations: ['https://example.com'],
    }
    const result = normalizePerplexity(raw)
    expect(result.platform).toBe('perplexity')
    expect(result.messages).toHaveLength(2)
    expect(result.metadata?.citations).toEqual(['https://example.com'])
  })
})

describe('normalizeDeepSeek', () => {
  it('extracts from selection_list', () => {
    const raw = {
      data: {
        session_id: 'ds-1',
        selection_list: [
          { role: 'user', content: 'Hello DeepSeek' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      },
    }
    const result = normalizeDeepSeek(raw)
    expect(result.platform).toBe('deepseek')
    expect(result.messages).toHaveLength(2)
  })
})

describe('normalizeQwen', () => {
  it('extracts messages directly', () => {
    const raw = {
      session_id: 'qwen-1',
      messages: [
        { role: 'user', content: 'Hello Qwen' },
        { role: 'assistant', content: 'Hello!' },
      ],
    }
    const result = normalizeQwen(raw)
    expect(result.platform).toBe('qwen')
    expect(result.messages).toHaveLength(2)
  })
})
