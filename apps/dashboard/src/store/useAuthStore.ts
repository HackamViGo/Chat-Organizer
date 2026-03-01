import { createBrowserClient } from '@supabase/ssr';
import type { User, Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { CONFIG } from '@/lib/config';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';

// We import the same way createClient does it in src/lib/supabase/client.ts
// Or we can just use createClient from there which handles "remember_me" slightly specially

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github', options?: { redirectTo?: string }) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
  clearError: () => void;
}

const initialState: Omit<AuthState, 'isAuthenticated'> = {
  user: null,
  session: null,
  isLoading: true,
  isPro: false,
  error: null,
};

// Singleton client for the store actions to prevent recreating
let supabaseInstance: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
  if (!supabaseInstance) {
    if (typeof window !== 'undefined') {
       supabaseInstance = createClient();
    } else {
        // Fallback for SSR
       supabaseInstance = createBrowserClient(
          CONFIG.SUPABASE_URL,
          CONFIG.SUPABASE_ANON_KEY
       );
    }
  }
  return supabaseInstance;
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...initialState,
  isAuthenticated: false,
  isPro: false,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await fetch('/api/auth/session');
      if (!res.ok) {
        set({ user: null, session: null, isPro: false, isAuthenticated: false, isLoading: false });
        return;
      }
      const data = await res.json();
      
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      set({
        session: session,
        user: data.user,
        isPro: data.isPro,
        isAuthenticated: !!data.user,
        isLoading: false
      });

      supabase.auth.onAuthStateChange((_event, currentSession) => {
        get().setSession(currentSession);
      });
    } catch (error) {
      logger.error('Auth', 'Initialize error', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage, isLoading: false, isAuthenticated: false });
    }
  },

  signIn: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ isLoading: false });
    } catch (error) {
      logger.error('Auth', 'Sign-in error', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  signInWithOAuth: async (provider, options) => {
    try {
      set({ isLoading: true, error: null });
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: options?.redirectTo || `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      logger.error('Auth', 'OAuth sign-in error', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  signUp: async (email, password, fullName) => {
    try {
      set({ isLoading: true, error: null });
      const supabase = getSupabase();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      set({ isLoading: false });
    } catch (error) {
      logger.error('Auth', 'Sign-up error', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});

      set({
        user: null,
        session: null,
        isPro: false,
        isAuthenticated: false,
        isLoading: false
      });
    } catch (error) {
      logger.error('Auth', 'Sign-out error', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  setSession: (session) => {
    set({
      session,
      user: session?.user || null,
      isAuthenticated: !!session,
      isLoading: false
    });
  },

  clearError: () => set({ error: null }),
}));
