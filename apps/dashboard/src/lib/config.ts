/**
 * Centralized Dashboard Configuration
 * Resolves environmental variables with Next.js compatibility.
 */

export const CONFIG = {
  // Supabase Configuration (Client & Server)
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',

  // API & Dashboard URLs
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  DASHBOARD_URL: process.env.DASHBOARD_URL || 'http://localhost:3000',

  // Third-party API Keys (Server-only)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  CONTEXT7_API_KEY: process.env.CONTEXT7_API_KEY || '',

  // Environment State
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_PROD: process.env.NODE_ENV === 'production',

  // Versioning
  VERSION: '3.0.0',
};

// Simple validation
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
  if (CONFIG.IS_DEV) {
    console.warn('[Config] ⚠️ Missing Supabase credentials in environment.');
  }
}
