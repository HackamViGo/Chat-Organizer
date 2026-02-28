import { createBrowserClient } from '@supabase/ssr';
import type { User, Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      isAuthenticated: false,

      initialize: async () => {
        try {
          const supabase = getSupabase();
          
          set({ isLoading: true, error: null });
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) throw error;
          
          set({
            session,
            user: session?.user || null,
            isAuthenticated: !!session,
            isLoading: false
          });

          // Unsubscribe if previously subscribed? The store initializes once so it's fine
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
          // State is updated by onAuthStateChange listener
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
          // Don't set isLoading: false here because we're being redirected
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
          
          // Clear Zustand session state
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false
          });

          // Optional: we can clear everything or let the router handle it
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
    }),
    {
      name: 'brainbox-auth-store',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
        
        return {
          getItem: (name: string): string | null => {
            const value = localStorage.getItem(name);
            if (!value && name === 'brainbox-auth-store') {
              // Migration: remove after 2026-06-01 (90 days from audit)
              const oldState = localStorage.getItem('promptmaster-auth-store');
              if (oldState) {
                try {
                  localStorage.setItem('brainbox-auth-store', oldState);
                  localStorage.removeItem('promptmaster-auth-store');
                  console.info('[BrainBox] Legacy storage migrated and purged.');
                  return oldState;
                } catch (e) {
                  const errorMessage = e instanceof Error ? e.message : String(e);
                  logger.error('Auth', `Migration from promptmaster-auth-store failed: ${errorMessage}`);
                }
              }
            }
            return value;
          },
          setItem: (name: string, value: string) => localStorage.setItem(name, value),
          removeItem: (name: string) => localStorage.removeItem(name),
        };
      }),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }), // ONLY persist user and session
      onRehydrateStorage: () => (state) => {
        // Runs after rehydration from localStorage
        if (state) {
            state.isAuthenticated = !!state.session;
            state.isLoading = false; 
        }
      }
    }
  )
);
