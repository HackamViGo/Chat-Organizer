'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Chrome, Loader2 } from 'lucide-react';

export default function ExtensionAuthPage() {
  const [status, setStatus] = useState<'checking' | 'sending' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Checking authentication...');
  const router = useRouter();

  useEffect(() => {
    handleExtensionAuth();
  }, []);

  async function handleExtensionAuth() {
    try {
      const supabase = createClient();
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setStatus('error');
        setMessage('Not logged in. Redirecting...');
        setTimeout(() => {
          router.push('/auth/signin?redirect=/extension-auth');
        }, 2000);
        return;
      }

      setStatus('sending');
      setMessage('Sending credentials to extension...');

      // Try to communicate with extension
      // Extension ID should be dynamic or configurable
      const accessToken = session.access_token;
      const refreshToken = session.refresh_token;
      // Convert expires_at from seconds to milliseconds
      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;

      // Store in localStorage for extension to read
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('brainbox_extension_token', JSON.stringify({
          accessToken,
          refreshToken,
          expiresAt,
        }));

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('brainbox-auth-ready', {
          detail: {
            accessToken,
            refreshToken,
            expiresAt,
          }
        }));
      }

      setStatus('success');
      setMessage('Extension connected successfully!');
      
      // Redirect to chats after 3 seconds
      setTimeout(() => {
        router.push('/chats');
      }, 3000);

    } catch (error: any) {
      console.error('Extension auth error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to connect extension');
    }
  }

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
          {status === 'checking' && 'Connecting Extension'}
          {status === 'sending' && 'Syncing Credentials'}
          {status === 'success' && 'Connected!'}
          {status === 'error' && 'Connection Failed'}
        </h1>

        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>

        {status === 'success' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800 dark:text-green-300">
              Your BrainBox extension is now connected and ready to use!
            </p>
          </div>
        )}

        {status === 'error' && (
          <button
            onClick={() => router.push('/auth/signin?redirect=/extension-auth')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            Login to Continue
          </button>
        )}
      </div>
    </div>
  );
}
