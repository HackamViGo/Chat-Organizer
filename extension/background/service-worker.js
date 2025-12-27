// BrainBox AI Chat Organizer - Service Worker
// Manifest V3 Background Script

// Environment Configuration
// Change this to 'development' for local testing
const ENVIRONMENT = 'production'; // 'development' or 'production'

const DASHBOARD_URL = ENVIRONMENT === 'development' 
    ? 'http://localhost:3000'
    : 'https://brainbox-alpha.vercel.app';

console.log('[BrainBox] Environment:', ENVIRONMENT);
console.log('[BrainBox] Dashboard URL:', DASHBOARD_URL);

// ============================================================================
// IMPORTS
// ============================================================================

import { normalizeChatGPT, normalizeClaude, normalizeGemini } from '../lib/normalizers.js';
import { validateConversation } from '../lib/schemas.js';
import { limiters } from '../lib/rate-limiter.js';

// ============================================================================
// TOKEN STORAGE
// ============================================================================

const tokens = {
    chatgpt: null,
    gemini_at: null,
    gemini_key: null,
    claude_session: null
};

// ============================================================================
// TOKEN INTERCEPTOR - ChatGPT
// ============================================================================

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const authHeader = details.requestHeaders.find(
            h => h.name.toLowerCase() === 'authorization'
        );

        if (authHeader && authHeader.value.startsWith('Bearer ')) {
            tokens.chatgpt = authHeader.value;
            chrome.storage.local.set({ chatgpt_token: authHeader.value });
            // console.debug('[BrainBox] ✅ ChatGPT token captured');
        }
    },
    { urls: ['https://chatgpt.com/backend-api/*'] },
    ['requestHeaders']
);

// ============================================================================
// GEMINI DYNAMIC KEY DISCOVERY
// ============================================================================

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.method === 'POST' && details.requestBody) {
            try {
                const formData = details.requestBody.formData;
                if (formData && formData['f.req']) {
                    const reqData = formData['f.req'][0];
                    // Extract dynamic key (e.g., "xsZAb")
                    const match = reqData.match(/"([a-zA-Z0-9]{5,6})"/);
                    if (match) {
                        tokens.gemini_key = match[1];
                        chrome.storage.local.set({
                            gemini_dynamic_key: match[1],
                            key_discovered_at: Date.now()
                        });
                        // console.debug('[BrainBox] ✅ Gemini dynamic key discovered:', match[1]);
                    }
                }
            } catch (error) {
                console.error('[BrainBox] Error in key discovery:', error);
            }
        }
    },
    { urls: ['https://gemini.google.com/_/BardChatUi/data/batchexecute'] },
    ['requestBody']
);

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // Set auth token (from dashboard auth page)
    if (request.action === 'setAuthToken') {
        chrome.storage.local.set({
            accessToken: request.accessToken,
            refreshToken: request.refreshToken,
            expiresAt: request.expiresAt
        });
        console.log('[BrainBox] ✅ Auth token received from dashboard');
        sendResponse({ success: true });
        return true;
    }

    // Get conversation by ID (API method)
    if (request.action === 'getConversation') {
        handleGetConversation(request.platform, request.conversationId)
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // Save to dashboard
    if (request.action === 'saveToDashboard') {
        handleSaveToDashboard(request.data, request.folderId)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // Check dashboard session
    if (request.action === 'checkDashboardSession') {
        checkDashboardSession()
            .then(isValid => sendResponse({ success: true, isValid }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // Get user folders
    if (request.action === 'getUserFolders') {
        getUserFolders()
            .then(folders => sendResponse({ success: true, folders }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // Store Gemini AT token (from content script)
    if (request.action === 'storeGeminiToken') {
        tokens.gemini_at = request.token;
        chrome.storage.local.set({ gemini_at_token: request.token });
        // console.debug('[BrainBox] ✅ Gemini AT token stored');
        sendResponse({ success: true });
        return true;
    }
});

// ============================================================================
// API EXTRACTION FUNCTIONS (Rate Limited)
// ============================================================================

async function handleGetConversation(platform, conversationId) {
    // Wrap actual fetch logic with RateLimiter scheduling
    switch (platform) {
        case 'chatgpt':
            return await limiters.chatgpt.schedule(() => fetchChatGPTConversation(conversationId));
        case 'claude':
            return await limiters.claude.schedule(() => fetchClaudeConversation(conversationId));
        case 'gemini':
            return await limiters.gemini.schedule(() => fetchGeminiConversation(conversationId));
        default:
            throw new Error('Unsupported platform: ' + platform);
    }
}

// ----------------------------------------------------------------------------
// ChatGPT API
// ----------------------------------------------------------------------------

async function fetchChatGPTConversation(conversationId) {
    const { chatgpt_token } = await chrome.storage.local.get(['chatgpt_token']);

    if (!chatgpt_token) {
        throw new Error('ChatGPT token not found. Please refresh the page.');
    }

    const response = await fetch(
        `https://chatgpt.com/backend-api/conversation/${conversationId}`,
        {
            method: 'GET',
            headers: {
                'Authorization': chatgpt_token,
                'Content-Type': 'application/json'
            }
        }
    );

    if (response.status === 401) {
        await chrome.storage.local.remove(['chatgpt_token']);
        throw new Error('Token expired. Please refresh the page.');
    }

    if (!response.ok) {
        throw new Error(`ChatGPT API error: ${response.status}`);
    }

    const data = await response.json();
    const conversation = normalizeChatGPT(data);
    const validation = validateConversation(conversation);

    if (!validation.valid) {
        console.warn('ChatGPT validation warning:', validation.error);
    }

    return conversation;
}

// ----------------------------------------------------------------------------
// Claude API
// ----------------------------------------------------------------------------

async function fetchClaudeConversation(conversationId) {
    // Extract org_id from current tab URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0]?.url || '';
    const orgMatch = url.match(/organizations\/([^\/]+)/);

    if (!orgMatch) {
        throw new Error('Could not extract organization ID');
    }

    const orgId = orgMatch[1];

    const response = await fetch(
        `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Use cookies
        }
    );

    if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const conversation = normalizeClaude(data);
    const validation = validateConversation(conversation);

    if (!validation.valid) {
        console.warn('Claude validation warning:', validation.error);
    }

    return conversation;
}

// ----------------------------------------------------------------------------
// Gemini API
// ----------------------------------------------------------------------------

async function fetchGeminiConversation(conversationId) {
    const { gemini_at_token, gemini_dynamic_key } = await chrome.storage.local.get([
        'gemini_at_token',
        'gemini_dynamic_key'
    ]);

    if (!gemini_at_token) {
        throw new Error('Gemini AT token not found. Please refresh the page.');
    }

    if (!gemini_dynamic_key) {
        throw new Error('Gemini dynamic key not discovered. Please open any conversation first.');
    }

    // Construct double-serialized JSON payload
    const innerPayload = JSON.stringify([conversationId, 100]);
    const middlePayload = JSON.stringify([
        [gemini_dynamic_key, innerPayload, null, "generic"]
    ]);
    const outerPayload = JSON.stringify([null, middlePayload]);

    const body = new URLSearchParams({
        'f.req': outerPayload,
        'at': gemini_at_token
    });

    const response = await fetch(
        'https://gemini.google.com/_/BardChatUi/data/batchexecute',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'X-Same-Domain': '1'
            },
            body: body.toString()
        }
    );

    if (response.status === 400 || response.status === 403) {
        // Key might have rotated, trigger rediscovery
        await chrome.storage.local.remove(['gemini_dynamic_key']);
        throw new Error('Gemini key expired. Please open any conversation to re-sync.');
    }

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const rawText = await response.text();
    // We need to parse Gemini response here because it's double serialized
    try {
        const cleaned = rawText.slice(5);
        const firstLevel = JSON.parse(cleaned);
        const dataString = firstLevel[0][2];
        const secondLevel = JSON.parse(dataString);

        return normalizeGemini(secondLevel, conversationId);
    } catch (error) {
        console.error('[BrainBox] Gemini parse error:', error);
        throw new Error('Failed to parse Gemini response. Structure may have changed.');
    }
}

// ============================================================================
// DASHBOARD INTEGRATION
// ============================================================================

async function checkDashboardSession() {
    try {
        const cookies = await chrome.cookies.getAll({
            domain: new URL(DASHBOARD_URL).hostname
        });

        // Check if session cookie exists
        const sessionCookie = cookies.find(c =>
            c.name.includes('session') || c.name.includes('token')
        );

        return !!sessionCookie;
    } catch (error) {
        console.error('[BrainBox] Session check error:', error);
        return false;
    }
}

async function handleSaveToDashboard(conversationData, folderId) {
    // Wrap with minimal rate limiting to avoid flooding dashboard
    return await limiters.dashboard.schedule(async () => {
        const { accessToken } = await chrome.storage.local.get(['accessToken']);

        if (!accessToken) {
            // Open auth page
            chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
            throw new Error('Please authenticate first');
        }

        const response = await fetch(`${DASHBOARD_URL}/api/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                conversation_id: conversationData.id,
                platform: conversationData.platform,
                raw_data: conversationData,
                folder_id: folderId || null,
                user_action: 'manual_save'
            })
        });

        if (response.status === 401) {
            await chrome.storage.local.remove(['accessToken']);
            chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
            throw new Error('Session expired. Please re-authenticate.');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP ${response.status}`);
        }

        return await response.json();
    });
}

async function getUserFolders() {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);

    if (!accessToken) {
        return [];
    }

    try {
        const response = await fetch(`${DASHBOARD_URL}/api/folders`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error('[BrainBox] Error fetching folders:', error);
        return [];
    }
}

// ============================================================================
// ONBOARDING - First Install
// ============================================================================

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // First time installation
        console.log('[BrainBox] 🎉 Extension installed for the first time!');
        
        // Open welcome page with login prompt
        chrome.tabs.create({
            url: `${DASHBOARD_URL}/extension-auth`
        });
        
        // Set flag that we've shown onboarding
        chrome.storage.local.set({ onboarded: true });
    } else if (details.reason === 'update') {
        console.log('[BrainBox] Extension updated to version', chrome.runtime.getManifest().version);
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[BrainBox] 🚀 Service Worker initialized');

// Load stored tokens on startup
chrome.storage.local.get([
    'chatgpt_token',
    'gemini_at_token',
    'gemini_dynamic_key',
    'accessToken',
    'onboarded'
], (result) => {
    if (result.chatgpt_token) tokens.chatgpt = result.chatgpt_token;
    if (result.gemini_at_token) tokens.gemini_at = result.gemini_at_token;
    if (result.gemini_dynamic_key) tokens.gemini_key = result.gemini_dynamic_key;

    console.log('[BrainBox] Tokens loaded:', {
        chatgpt: !!tokens.chatgpt,
        gemini_at: !!tokens.gemini_at,
        gemini_key: !!tokens.gemini_key,
        dashboard: !!result.accessToken,
        onboarded: !!result.onboarded
    });
});
