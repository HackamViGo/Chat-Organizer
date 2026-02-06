import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@brainbox/database';
import { CONFIG } from '../config';

export const createServerSupabaseClient = () => {
  const cookieStore = cookies();
  return createServerClient<Database>(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Server Component limitation
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Server Component limitation
          }
        },
      },
    }
  );
};
