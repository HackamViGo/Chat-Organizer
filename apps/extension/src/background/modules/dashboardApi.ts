/**
 * Dashboard API Operations
 * Non-platform-specific API handlers (folders, save)
 */

import { CONFIG } from '../../lib/config.js';
import { limiters } from '../../lib/rate-limiter.js';
import type { Conversation } from './platformAdapters/base';

const DASHBOARD_URL = CONFIG.DASHBOARD_URL;

/**
 * Get user folders from Dashboard
 */
export async function getUserFolders() {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    if (!accessToken) throw new Error('No access token');

    const response = await fetch(`${DASHBOARD_URL}/api/folders`, {
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
 * Save conversation to Dashboard
 */
export async function saveToDashboard(conversationData: Conversation, folderId: string | null, silent: boolean) {
    const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);

    const isTokenValid = accessToken && (!expiresAt || expiresAt > Date.now());

    if (!isTokenValid) {
        if (!silent) chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
        throw new Error('Please authenticate first');
    }

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

        const response = await fetch(`${DASHBOARD_URL}/api/chats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestBody)
        });

        if (response.status === 401) {
            await chrome.storage.local.remove(['accessToken']);
            if (!silent) chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
            throw new Error('Session expired');
        }

        if (!response.ok) throw new Error(await response.text());
        return await response.json();
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
