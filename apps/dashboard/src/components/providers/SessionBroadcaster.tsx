'use client';

import { useEffect } from 'react';

import { useAuthStore } from '@/store/useAuthStore';

/**
 * SessionBroadcaster - Broadcasts Supabase session to BrainBox Extension
 * 
 * This component listens for auth state changes from useAuthStore and explicitly broadcasts
 * the session to the extension via window.postMessage.
 */
export function SessionBroadcaster() {
    const session = useAuthStore((state) => state.session);

    useEffect(() => {
        if (session) {
            console.log('[Dashboard] 📡 Broadcasting session to extension via postMessage...');
            
            const payload = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                user: session.user
            };

            window.postMessage({
                type: 'BRAINBOX_TOKEN_TRANSFER',
                session: payload
            }, window.location.origin);

            // Added for Extension Sync logic
            window.postMessage({
                type: 'SYNC_SESSION_EXT',
                session: payload
            }, window.location.origin);
        }
    }, [session]);

    return null;
}
