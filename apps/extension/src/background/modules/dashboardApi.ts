/**
 * Dashboard API Operations
 * Non-platform-specific API handlers (folders, save)
 */

import { CONFIG } from '../../lib/config.js';
import { limiters } from '../../lib/rate-limiter.js';
import type { Conversation } from './platformAdapters/base';

const API_BASE_URL = CONFIG.API_BASE_URL;
console.log(`[DashboardAPI] Using API_BASE_URL: ${API_BASE_URL}`);

/**
 * Get user folders from Dashboard
 */
export async function getUserFolders(silent: boolean = false) {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    if (!accessToken) {
        console.warn('[DashboardAPI] No access token found in getUserFolders.');
        if (!silent) chrome.tabs.create({ url: `${API_BASE_URL}/auth/signin?redirect=/extension-auth` });
        throw new Error('No access token');
    }

    const response = await fetch(`${API_BASE_URL}/api/folders`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch folders');
    }

    const data = await response.json();
    return data.folders || [];
}

/**
 * Get user settings from Dashboard
 */
export async function getUserSettings() {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    if (!accessToken) return { quickAccessFolders: [] };

    try {
        const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) return { quickAccessFolders: [] };

        const data = await response.json();
        return data.settings || { quickAccessFolders: [] };
    } catch (error) {
        console.error('[DashboardAPI] Error fetching settings:', error);
        return { quickAccessFolders: [] };
    }
}

/**
 * Save conversation to Dashboard
 */
export async function saveToDashboard(conversationData: Conversation, folderId: string | null, silent: boolean) {
    const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);

    const isTokenValid = accessToken && (!expiresAt || expiresAt > Date.now());

    if (!isTokenValid) {
        console.warn('[DashboardAPI] ⚠️ Invalid or expired token:', { hasToken: !!accessToken, expiresAt });
        if (!silent) chrome.tabs.create({ url: `${API_BASE_URL}/auth/signin?redirect=/extension-auth` });
        throw new Error('Please authenticate first');
    }

    console.log(`[DashboardAPI] 📤 Saving chat to ${API_BASE_URL}/api/chats...`);
    console.log(`[DashboardAPI] 🔑 Token check:`, { 
        hasToken: !!accessToken, 
        tokenStart: accessToken ? accessToken.substring(0, 10) + '...' : 'N/A',
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'Never',
        now: new Date().toISOString()
    });

    return await limiters.dashboard.schedule(async () => {
        const formattedContent = formatMessagesAsText(conversationData);

        // Ensure URL
        const chatUrl = conversationData.url || `https://${conversationData.platform}/${conversationData.id}`;

        const requestBody = {
            title: conversationData.title || 'Untitled Chat',
            content: formattedContent,
            messages: conversationData.messages || [],
            platform: conversationData.platform,
            url: chatUrl,
            folder_id: folderId || null
        };

        const response = await fetch(`${API_BASE_URL}/api/chats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`[DashboardAPI] 📡 Response status: ${response.status}`);

        if (response.status === 401) {
            console.warn('[DashboardAPI] ⛔ 401 Unauthorized from server. Clearing token.');
            await chrome.storage.local.remove(['accessToken']);
            if (!silent) chrome.tabs.create({ url: `${API_BASE_URL}/auth/signin?redirect=/extension-auth` });
            throw new Error('Session expired');
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[DashboardAPI] ❌ Save failed (${response.status}):`, errorText);
            throw new Error(errorText);
        }
        
        const result = await response.json();
        console.log('[DashboardAPI] ✅ Save successful:', result);
        return result;
    });
}

/**
 * Format messages as text for storage
 */
function formatMessagesAsText(conversationData: Conversation): string {
    if (!conversationData.messages?.length) return 'No messages';
    return conversationData.messages
        .map((m) => `[${m.role?.toUpperCase()}]: ${m.content}`)
        .join('\n\n');
}

/**
 * Enhance prompt using Gemini API
 */
export async function enhancePrompt(promptText: string) {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    
    // We don't strictly require login for enhancement if GEMINI_API_KEY is configured on server
    // but we use the token to identify the user if possible.
    
    const response = await fetch(`${API_BASE_URL}/api/ai/enhance-prompt`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': accessToken ? `Bearer ${accessToken}` : ''
        },
        body: JSON.stringify({ prompt: promptText })
    });

    if (!response.ok) {
        throw new Error('Failed to enhance prompt');
    }

    const data = await response.json();
    return data.enhancedPrompt;
}
