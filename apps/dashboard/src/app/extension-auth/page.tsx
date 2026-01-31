'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Chrome, Loader2 } from 'lucide-react';

export default function ExtensionAuthPage() {
  const [status, setStatus] = useState<'checking' | 'sending' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Checking authentication...');
  const router = useRouter();

  const handleExtensionAuth = useCallback(async () => {
    try {
      // Clean up any old localStorage entries from previous versions
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('brainbox_extension_token');
        } catch (e) {
          // Ignore errors if localStorage is not accessible
          if (process.env.NODE_ENV === 'development') {
            console.log('[Extension Auth] Could not clean up old localStorage entries:', e);
          }
        }
      }

      const supabase = createClient();
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setStatus('error');
        setMessage('Not logged in. Redirecting to login...');
        // Faster redirect - 1 second instead of 2
        setTimeout(() => {
          router.push('/auth/signin?redirect=/extension-auth');
        }, 1000);
        return;
      }

      setStatus('sending');
      setMessage('Sending credentials to extension...');

      // Try to communicate with extension
      // Extension ID should be dynamic or configurable
      const accessToken = session.access_token;
      const refreshToken = session.refresh_token;
      
      // Check if remember me is enabled
      let rememberMe = false;
      if (typeof window !== 'undefined') {
        try {
          rememberMe = localStorage.getItem('brainbox_remember_me') === 'true';
        } catch (error) {
          if (error instanceof DOMException) {
            if (error.name === 'SecurityError') {
              console.warn('[Extension Auth] localStorage access denied, skipping remember me check');
            }
          }
        }
      }
      
      // If remember me is enabled, extend expiresAt to 30 days from now
      // Otherwise use the session's expires_at (usually 1 hour)
      let expiresAt: number | null = null;
      if (rememberMe) {
        // 30 days from now in milliseconds
        expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
        if (process.env.NODE_ENV === 'development') {
          console.log('[Extension Auth] Remember me enabled - extending token to 30 days');
        }
      } else if (session.expires_at) {
        // Use session's expires_at (convert from seconds to milliseconds)
        expiresAt = session.expires_at * 1000;
        if (process.env.NODE_ENV === 'development') {
          console.log('[Extension Auth] Using session expires_at:', new Date(expiresAt).toISOString());
        }
      }

      // IMPORTANT: Do NOT store tokens in localStorage
      // The extension content script (content-dashboard-auth.js) will receive the tokens
      // via the custom event below and store them securely in chrome.storage.local
      // localStorage is not secure and should never contain auth tokens
      
      // Dispatch custom event for extension content script
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('brainbox-auth-ready', {
          detail: {
            accessToken,
            refreshToken,
            expiresAt,
          }
        }));
      }

      setStatus('success');
      setMessage('Extension connected successfully! You can close this tab.');
      
      // Auto-close tab after 2 seconds (or redirect to chats)
      setTimeout(() => {
        // Try to close the tab (works if opened by extension)
        if (window.opener) {
          window.close();
        } else {
          // If can't close, redirect to chats
        router.push('/chats');
        }
      }, 2000);

    } catch (error: any) {
      console.error('Extension auth error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to connect extension');
    }
  }, [router]);

  useEffect(() => {
    handleExtensionAuth();
  }, [handleExtensionAuth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-[#0B1121] dark:via-[#0f1729] dark:to-[#0B1121] p-6 flex items-center justify-center">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="mb-6">
          {status === 'checking' || status === 'sending' ? (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 animate-pulse">
              <Loader2 className="text-white animate-spin" size={32} />
            </div>
          ) : status === 'success' ? (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
              <CheckCircle2 className="text-white" size={32} />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-600">
              <Chrome className="text-white" size={32} />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          {status === 'checking' && '🔗 Connecting Extension'}
          {status === 'sending' && '🔄 Syncing Credentials'}
          {status === 'success' && '✅ Connected!'}
          {status === 'error' && '🔐 Login Required'}
        </h1>

        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>

        {status === 'success' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800 dark:text-green-300 font-medium">
              🎉 Your BrainBox extension is now connected!
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-2">
              You can now save conversations from ChatGPT, Claude, and Gemini.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Please login to connect your extension to your BrainBox account.
              </p>
            </div>
          <button
            onClick={() => router.push('/auth/signin?redirect=/extension-auth')}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            Login to Continue
          </button>
          </div>
        )}
      </div>
    </div>
  );
}
