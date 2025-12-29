'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useFolderStore } from '@/store/useFolderStore';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const { setFolders, folders } = useFolderStore();
  const router = useRouter();
  const isFetchingRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const authCheckedRef = useRef(false);

  const fetchFolders = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const supabase = createClient();

      // Wait for auth to be ready
      let user: any = null;
      let authError: any = null;

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
          console.warn(`Auth attempt ${i + 1} failed:`, authTryError);
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
          }
        }
      }

      if (authError) {
        console.warn('Auth error in FolderProvider:', authError);
        isFetchingRef.current = false;
        return;
      }

      if (!user) {
        console.warn('No user found in FolderProvider - auth might not be ready yet');
        isFetchingRef.current = false;
        return;
      }

      // Fetch folders from API (more reliable than direct Supabase query)
      const response = await fetch('/api/folders', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.folders && Array.isArray(data.folders)) {
          setFolders(data.folders);
        }
      } else {
        console.error('Failed to fetch folders:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error in FolderProvider:', error);
      retryCountRef.current++;

      // Retry up to maxRetries times with exponential backoff
      if (retryCountRef.current < maxRetries) {
        setTimeout(() => {
          isFetchingRef.current = false;
        }, 1000 * Math.pow(2, retryCountRef.current - 1));
      } else {
        isFetchingRef.current = false;
      }
      return;
    }

    isFetchingRef.current = false;
    retryCountRef.current = 0;
  }, [setFolders]);

  useEffect(() => {
    // Skip if already fetching
    if (isFetchingRef.current) return;

    fetchFolders();
  }, [fetchFolders]);

  // Watch for auth changes and re-fetch folders
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed in FolderProvider:', event, session?.user?.id);

      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in - fetch folders
        setTimeout(() => fetchFolders(), 100); // Small delay to ensure auth is settled
      } else if (event === 'SIGNED_OUT') {
        // User signed out - clear folders
        setFolders([]);
      }
    });

    // Initial check if we have a session
    const checkInitialAuth = async () => {
      if (authCheckedRef.current) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && folders.length === 0) {
          authCheckedRef.current = true;
          setTimeout(() => fetchFolders(), 100);
        }
      } catch (error) {
        console.error('Error checking initial auth:', error);
      }
    };

    checkInitialAuth();

    return () => subscription.unsubscribe();
  }, [fetchFolders, setFolders, folders.length]);

  return <>{children}</>;
}
