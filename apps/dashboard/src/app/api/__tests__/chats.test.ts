import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Мockове ────────────────────────────────────────────────────────────────
// We mock Supabase at the module level to avoid network calls

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-session-token' })),
    set: vi.fn(),
  })),
}));

// ─── Importujeme po mokuvaneto ───────────────────────────────────────────────
const { GET, POST, DELETE } = await import('../chats/route');

// ─── Helper ──────────────────────────────────────────────────────────────────
const makeRequest = (method: string, body?: object, url = 'http://localhost:3000/api/chats') => {
  const req = new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return req;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/chats — 401 without auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
  });

  it('returns empty chats array when not authenticated (safe FE behavior)', async () => {
    // The route returns 200 [] for unauthenticated GET (intentional design)
    const req = makeRequest('GET');
    const res = await GET(req);
    const json = await res.json();
    expect(json.chats).toEqual([]);
  });
});

describe('POST /api/chats — 401 without auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });
  });

  it('returns 401 when not authenticated', async () => {
    const req = makeRequest('POST', { title: 'Test', platform: 'chatgpt', messages: [] });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/chats — 400 validation error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });
  });

  it('returns 400 for invalid platform value', async () => {
    const req = makeRequest('POST', {
      title: 'Test Chat',
      platform: 'unknown-platform', // Invalid — not in platformEnum
      messages: [],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 for empty title', async () => {
    const req = makeRequest('POST', {
      title: '', // min(1) violation
      platform: 'chatgpt',
      messages: [],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/chats — 200 success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const savedChat = { id: 'chat-uuid-1', title: 'My Chat', platform: 'chatgpt', user_id: 'user-1' };
    // maybeSingle for duplicate check
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    // single for upsert
    mockSupabase.single.mockResolvedValue({ data: savedChat, error: null });
  });

  it('creates a chat and returns it', async () => {
    const req = makeRequest('POST', {
      title: 'My Chat',
      platform: 'chatgpt',
      messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }],
    });
    const res = await POST(req);
    // Should not be an error status
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(500);
  });
});

describe('DELETE /api/chats — auth and validation', () => {
  it('returns 401 when not authenticated', async () => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

    const req = makeRequest('DELETE', undefined, 'http://localhost:3000/api/chats?ids=1,2');
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });
});
