'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useFolderStore } from '@/store/useFolderStore';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const { setFolders, setLoading } = useFolderStore();
  const isFetchingRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchFolders = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const supabase = createClient();

      // Wait for auth to be ready
      let user: { id: string } | null = null;
      let authError: Error | null = null;

      // Try multiple times to get user (auth might not be ready immediately)
      for (let i = 0; i < maxRetries; i++) {
        try {
          const result = await supabase.auth.getUser();
          user = result.data.user;
          authError = result.error;

          if (user || authError) break;

          // Wait before retry
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
          }
        } catch (authTryError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Auth attempt ${i + 1} failed:`, authTryError);
          }
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
          }
        }
      }

      if (authError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Auth error in FolderProvider:', authError);
        }
        isFetchingRef.current = false;
        setLoading(false);
        return;
      }

      if (!user) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('No user found in FolderProvider - auth might not be ready yet');
        }
        isFetchingRef.current = false;
        setLoading(false);
        return;
      }

      // Fetch folders from API (more reliable than direct Supabase query)
      const response = await fetch('/api/folders', {
        credentials: 'include',
        cache: 'no-store' // Ensure fresh data on every fetch
      });

      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('[FolderProvider] Fetched folders:', data.folders?.length || 0);
        }
        if (data.folders && Array.isArray(data.folders)) {
          setFolders(data.folders);
          if (process.env.NODE_ENV === 'development') {
            console.log('[FolderProvider] Set folders in store:', data.folders.length);
          }
        } else {
          // No folders returned, set empty array
          if (process.env.NODE_ENV === 'development') {
            console.log('[FolderProvider] No folders in response, setting empty array');
          }
          setFolders([]);
        }
      } else {
        const errorText = await response.text();
        console.error('[FolderProvider] Failed to fetch folders:', response.status, response.statusText, errorText);
        // Set empty array on error to prevent loading state from hanging
        setFolders([]);
      }
    } catch (error) {
      console.error('Error in FolderProvider:', error);
      retryCountRef.current++;

      // Retry up to maxRetries times with exponential backoff
      if (retryCountRef.current < maxRetries) {
        setTimeout(() => {
          isFetchingRef.current = false;
          setLoading(false);
        }, 1000 * Math.pow(2, retryCountRef.current - 1));
      } else {
        isFetchingRef.current = false;
        setLoading(false);
      }
      return;
    }

    isFetchingRef.current = false;
    retryCountRef.current = 0;
    setLoading(false);
  }, [setFolders, setLoading]);

  // Watch for auth changes and re-fetch folders
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth state changed in FolderProvider:', event, session?.user?.id);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in - fetch folders
        setTimeout(() => fetchFolders(), 100); // Small delay to ensure auth is settled
      } else if (event === 'SIGNED_OUT') {
        // User signed out - clear folders
        setFolders([]);
        setLoading(false);
      }
    });

    // Always check for existing session on mount and fetch folders
    const checkInitialAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (process.env.NODE_ENV === 'development') {
          console.log('[FolderProvider] Initial auth check:', session?.user?.id || 'no user');
        }
        if (session?.user) {
          // Always fetch folders on mount if user is authenticated
          // Don't check folders.length - Zustand store resets on refresh
          if (process.env.NODE_ENV === 'development') {
            console.log('[FolderProvider] User authenticated, fetching folders...');
          }
          // Use longer delay to ensure auth is fully ready
          setTimeout(() => fetchFolders(), 200);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[FolderProvider] No user session found');
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('[FolderProvider] Error checking initial auth:', error);
        setLoading(false);
      }
    };

    // Initial fetch on mount
    checkInitialAuth();

    return () => subscription.unsubscribe();
  }, [fetchFolders, setFolders, setLoading]);

  return <>{children}</>;
}
