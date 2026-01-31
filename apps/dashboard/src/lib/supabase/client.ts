import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@brainbox/database';

export const createClient = () => {
  let rememberMe = false;
  if (typeof window !== 'undefined') {
    try {
      rememberMe = localStorage.getItem('brainbox_remember_me') === 'true';
    } catch (error) {
      // localStorage access denied (e.g., in iframe with different origin)
      console.warn('Failed to read remember me from localStorage:', error);
      rememberMe = false;
    }
  }
  
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined;
          const cookies = document.cookie.split(';');
          const cookie = cookies.find(c => c.trim().startsWith(`${name}=`));
          return cookie ? cookie.split('=')[1] : undefined;
        },
        set(name: string, value: string, options: { maxAge?: number; path?: string; domain?: string; sameSite?: string; secure?: boolean } = {}) {
          if (typeof document === 'undefined') return;
          
          // If remember me is enabled, set longer expiry (30 days)
          if (rememberMe && name.includes('auth-token')) {
            options.maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
          }
          
          let cookieString = `${name}=${value}`;
          if (options.maxAge) cookieString += `; max-age=${options.maxAge}`;
          if (options.path) cookieString += `; path=${options.path}`;
          if (options.domain) cookieString += `; domain=${options.domain}`;
          if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;
          if (options.secure) cookieString += `; secure`;
          
          document.cookie = cookieString;
        },
        remove(name: string, options: { path?: string; domain?: string } = {}) {
          if (typeof document === 'undefined') return;
          let cookieString = `${name}=; max-age=0`;
          if (options.path) cookieString += `; path=${options.path}`;
          if (options.domain) cookieString += `; domain=${options.domain}`;
          document.cookie = cookieString;
        },
      },
    }
  );
};
