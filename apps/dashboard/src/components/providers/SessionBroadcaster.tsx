'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

/**
 * SessionBroadcaster - Broadcasts Supabase session to BrainBox Extension
 * 
 * This component listens for auth state changes and explicitly broadcasts
 * the session to the extension via window.postMessage. This is more reliable
 * than relying on localStorage monitoring, especially with Google OAuth.
 */
export function SessionBroadcaster() {
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Broadcast current session on mount
        const broadcastSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                console.log('[Dashboard] 📡 Broadcasting session to extension via BRAINBOX_TOKEN_TRANSFER...');
                window.postMessage({
                    type: 'BRAINBOX_TOKEN_TRANSFER',
                    session: {
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        expires_at: session.expires_at,
                        user: session.user
                    }
                }, window.location.origin);

                // Added for Extension Sync logic
                window.postMessage({
                    type: 'SYNC_SESSION_EXT',
                    session: {
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        expires_at: session.expires_at,
                        user: session.user
                    }
                }, window.location.origin);
            }
        };

        // Initial broadcast
        broadcastSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                console.log('[Dashboard] 🔄 Auth state changed, broadcasting via BRAINBOX_TOKEN_TRANSFER...');
                window.postMessage({
                    type: 'BRAINBOX_TOKEN_TRANSFER',
                    session: {
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        expires_at: session.expires_at,
                        user: session.user
                    }
                }, window.location.origin);

                // Added for Extension Sync logic
                window.postMessage({
                    type: 'SYNC_SESSION_EXT',
                    session: {
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        expires_at: session.expires_at,
                        user: session.user
                    }
                }, window.location.origin);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return null; // This component doesn't render anything
}
