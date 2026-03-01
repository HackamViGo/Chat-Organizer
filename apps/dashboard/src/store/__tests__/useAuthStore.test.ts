import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

import { useAuthStore } from '../useAuthStore';

import { createClient } from '@/lib/supabase/client';

// Mock the supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock logger to avoid console spam during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }
}));

// Mock NEXT_PUBLIC_SUPABASE variables if needed by createBrowserClient fallback
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
};

describe('useAuthStore', () => {
  beforeAll(() => {
    (createClient as any).mockReturnValue(mockSupabase);
    // Mock global fetch
    global.fetch = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ user: null, isPro: false })
    });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: null, user: null }, error: null });
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    useAuthStore.setState({ user: null, session: null, isAuthenticated: false, isLoading: true, error: null });
  });

  it('initializes with no session', async () => {
    await useAuthStore.getState().initialize();
    
    expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('initializes with session', async () => {
    const mockSession = { user: { id: '123' }, access_token: 'token' };
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: mockSession }, error: null });
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: '123' }, isPro: true })
    });
    
    await useAuthStore.getState().initialize();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe('123');
  });

  it('handles sign in', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: { session: {}, user: { id: '1' } }, error: null });
    
    await useAuthStore.getState().signIn('test@test.com', 'password');
    
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password' });
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('handles sign in error', async () => {
    const error = new Error('Invalid credentials');
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null, user: null }, error });
    
    // It should throw the error so components can catch it
    await expect(useAuthStore.getState().signIn('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    
    expect(useAuthStore.getState().error).toBe('Invalid credentials');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('handles sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null });
    useAuthStore.setState({ isAuthenticated: true, user: { id: '123' } as any });
    
    await useAuthStore.getState().signOut();
    
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});
