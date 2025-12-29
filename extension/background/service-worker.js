// BrainBox AI Chat Organizer - Service Worker
// Manifest V3 Background Script

// Environment Configuration - Production only (Vercel)
const DASHBOARD_URL = 'https://brainbox-alpha.vercel.app';

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
    claude_session: null,
    claude_org_id: null
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
// CLAUDE ORG_ID DISCOVERY (per specification: ORG_ID_EXTRACTION)
// ============================================================================
// Specification: source: "current_page_URL", pattern: "/api/organizations/([^/]+)/", storage: "cache_per_session"

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.url.includes('/api/organizations/')) {
            try {
                // Extract org_id from Claude API URL using specification pattern
                // Pattern from spec: "/api/organizations/([^/]+)/"
                const match = details.url.match(/\/api\/organizations\/([^\/]+)\//);
                if (match && match[1]) {
                    const orgId = match[1];
                    tokens.claude_org_id = orgId;
                    // Storage: "cache_per_session" - using chrome.storage.local for session persistence
                    chrome.storage.local.set({
                        claude_org_id: orgId,
                        org_id_discovered_at: Date.now()
                    });
                    console.log('[BrainBox] ✅ Claude org_id extracted per spec:', orgId);
                }
            } catch (error) {
                console.error('[BrainBox] Error in org_id extraction:', error);
            }
        }
    },
    { urls: ['https://claude.ai/api/organizations/*'] },
    []
);

// ============================================================================
// GEMINI DYNAMIC KEY DISCOVERY
// ============================================================================

// General listener for all Gemini requests (for debugging)
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        // Log all Gemini POST requests to debug
        if (details.url.includes('gemini.google.com') && details.method === 'POST') {
            console.log('[BrainBox] 🔍 Gemini POST request:', details.url.substring(0, 150), 'Method:', details.method);
        }
    },
    { urls: ['https://gemini.google.com/*'] },
    ['requestBody']
);

// Specific listener for batchexecute requests
// Use broader URL pattern to catch all batchexecute requests
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        // Double-check if URL contains batchexecute (safety check)
        if (!details.url.includes('batchexecute')) {
            return; // Not a batchexecute request
        }
        
        console.log('[BrainBox] ✅ Batchexecute request detected!');
        console.log('[BrainBox] Full URL:', details.url);
        console.log('[BrainBox] Method:', details.method);
        console.log('[BrainBox] Has requestBody:', !!details.requestBody);
        
        if (details.requestBody) {
            try {
                console.log('[BrainBox] ✅ Gemini batchexecute request intercepted');
                console.log('[BrainBox] Request body type:', details.requestBody ? Object.keys(details.requestBody) : 'null');
                
                // Try formData first
                const formData = details.requestBody.formData;
                if (formData && formData['f.req']) {
                    const reqData = formData['f.req'][0];
                    console.log('[BrainBox] Request data (first 300 chars):', reqData.substring(0, 300));
                    
                    // Extract dynamic key per specification:
                    // Pattern from spec: /"([a-zA-Z0-9]{5,6})",\s*"\[/
                    // This matches: "KEY", "[ where KEY is the dynamic key
                    // The key is the first element in the array: [KEY, innerPayload, null, "generic"]
                    const specPattern = /"([a-zA-Z0-9]{5,6})",\s*"\[/;
                    const match = reqData.match(specPattern);
                    
                    if (match) {
                        const key = match[1];
                        
                        // Check if this request contains a conversation ID (c_XXXXX pattern)
                        // These keys are more reliable for fetching conversations
                        // Pattern needs to handle escaped quotes: \"c_XXXXX\" or "c_XXXXX"
                        const conversationIdPattern = /(?:\\?"|")c_([a-zA-Z0-9_-]{16,})(?:\\?"|")/;
                        const hasConversationId = conversationIdPattern.test(reqData);
                        
                        console.log('[BrainBox] Key discovery check:', {
                            key,
                            hasConversationId,
                            reqDataSample: reqData.substring(0, 200)
                        });
                        
                        if (hasConversationId) {
                            // This is a conversation-related request, prioritize this key
                            tokens.gemini_key = key;
                            chrome.storage.local.set({
                                gemini_dynamic_key: key,
                                key_discovered_at: Date.now()
                            });
                            console.log('[BrainBox] ✅ Gemini dynamic key discovered (conversation request):', key);
                        } else {
                            // Store as fallback, but don't overwrite conversation keys
                            if (!tokens.gemini_key) {
                                tokens.gemini_key = key;
                                chrome.storage.local.set({
                                    gemini_dynamic_key: key,
                                    key_discovered_at: Date.now()
                                });
                                console.log('[BrainBox] ✅ Gemini dynamic key discovered (per spec):', key);
                            } else {
                                console.log('[BrainBox] ⚠️ Key already exists, skipping:', key);
                            }
                        }
                    } else {
                        console.log('[BrainBox] ⚠️ Spec pattern not found, trying fallback patterns...');
                        
                        // Fallback 1: Simple pattern "KEY"
                        const fallback1 = reqData.match(/"([a-zA-Z0-9]{5,6})"/);
                        if (fallback1) {
                            // Validate it's not part of conversationId or other data
                            const key = fallback1[1];
                            // Check if it appears in the expected position (near the start, before conversationId)
                            const keyIndex = reqData.indexOf(`"${key}"`);
                            const conversationIdPattern = /"([a-zA-Z0-9_-]{16,})"/;
                            const conversationMatch = reqData.match(conversationIdPattern);
                            
                            if (conversationMatch) {
                                const convIdIndex = reqData.indexOf(`"${conversationMatch[1]}"`);
                                // Key should appear before conversationId in the structure
                                if (keyIndex < convIdIndex || keyIndex < 100) {
                                    tokens.gemini_key = key;
                                    chrome.storage.local.set({
                                        gemini_dynamic_key: key,
                                        key_discovered_at: Date.now()
                                    });
                                    console.log('[BrainBox] ✅ Gemini dynamic key discovered (fallback):', key);
                                } else {
                                    console.log('[BrainBox] ⚠️ Fallback pattern found but position invalid');
                                }
                            }
                        }
                        
                        // Fallback 2: Pattern ["KEY"
                        const fallback2 = reqData.match(/\["([a-zA-Z0-9]{5,6})"/);
                        if (fallback2 && !tokens.gemini_key) {
                            console.log('[BrainBox] Found alternative pattern ["KEY":', fallback2[1]);
                        }
                    }
                } else {
                    console.log('[BrainBox] ⚠️ No formData or f.req found in request body');
                    console.log('[BrainBox] Request body keys:', details.requestBody ? Object.keys(details.requestBody) : 'null');
                }
            } catch (error) {
                console.error('[BrainBox] Error in key discovery:', error);
            }
        }
    },
    { 
        urls: ['https://gemini.google.com/*', 'http://gemini.google.com/*'] 
    },
    ['requestBody']
);

// Debug: Verify listener is registered
console.log('[BrainBox] ✅ Gemini dynamic key discovery listener registered');
console.log('[BrainBox] 📋 Listening for batchexecute requests');
console.log('[BrainBox] 📋 URL patterns:', [
    '*://gemini.google.com/*/batchexecute',
    '*://gemini.google.com/_/BardChatUi/data/batchexecute',
    '*://gemini.google.com/*/BardChatUi/data/batchexecute',
    '*://gemini.google.com/*/data/batchexecute'
]);

// ============================================================================
// BATCHEXECUTE RESPONSE INTERCEPTOR (СТАРИЯТ НАЧИН)
// ============================================================================
// Хваща batchexecute responses и ги изпраща до content script

chrome.webRequest.onCompleted.addListener(
    async (details) => {
        // Double-check if URL contains batchexecute
        if (!details.url.includes('batchexecute')) {
            return;
        }
        
        console.log('[BrainBox] ✅ Batchexecute response detected!');
        console.log('[BrainBox] URL:', details.url);
        console.log('[BrainBox] Tab ID:', details.tabId);
        
        // Get the response body (requires responseBody permission)
        // Note: We can't read responseBody directly in onCompleted
        // Instead, we'll notify the content script to intercept it
        
        // Send message to content script to process this response
        if (details.tabId && details.tabId > 0) {
            try {
                chrome.tabs.sendMessage(details.tabId, {
                    action: 'processBatchexecuteResponse',
                    url: details.url,
                    timestamp: Date.now()
                }).catch(err => {
                    // Content script might not be ready yet, that's OK
                    console.log('[BrainBox] Content script not ready:', err.message);
                });
            } catch (error) {
                console.error('[BrainBox] Error sending message to content script:', error);
            }
        }
    },
    { 
        urls: [
            'https://gemini.google.com/*/batchexecute*',
            'http://gemini.google.com/*/batchexecute*'
        ] 
    },
    []
);

console.log('[BrainBox] ✅ Batchexecute response interceptor registered');

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
        handleGetConversation(request.platform, request.conversationId, request.url)
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

    // Get dashboard URL
    if (request.action === 'getDashboardUrl') {
        sendResponse({ success: true, url: DASHBOARD_URL });
        return true;
    }

    // Open login page (for content scripts - chrome.tabs is not available there)
    if (request.action === 'openLoginPage') {
        chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
        sendResponse({ success: true });
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

    // Inject Gemini MAIN world script
    if (request.action === 'injectGeminiMainScript') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes('gemini.google.com')) {
                console.log('[BrainBox] Injecting Gemini MAIN world script into tab:', tabs[0].id);
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    world: 'MAIN',
                    files: ['content/inject-gemini-main.js']
                }).then(() => {
                    console.log('[BrainBox] ✅ Gemini MAIN world script injected successfully');
                    sendResponse({ success: true });
                }).catch(err => {
                    console.error('[BrainBox] ❌ Failed to inject Gemini MAIN world script:', err);
                    sendResponse({ success: false, error: err.message });
                });
            } else {
                console.warn('[BrainBox] Not a Gemini page, skipping script injection');
                sendResponse({ success: false, error: 'Not a Gemini page' });
            }
        });
        return true; // Keep channel open for async response
    }
});

// ============================================================================
// API EXTRACTION FUNCTIONS (Rate Limited)
// ============================================================================

async function handleGetConversation(platform, conversationId, url = null) {
    // Wrap actual fetch logic with RateLimiter scheduling
    switch (platform) {
        case 'chatgpt':
            return await limiters.chatgpt.schedule(() => fetchChatGPTConversation(conversationId));
        case 'claude':
            return await limiters.claude.schedule(() => fetchClaudeConversation(conversationId, url));
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

async function fetchClaudeConversation(conversationId, providedUrl = null) {
    // ORG_ID_EXTRACTION per specification:
    // source: "current_page_URL"
    // pattern: "/api/organizations/([^/]+)/"
    // storage: "cache_per_session"
    
    let orgId = null;
    
    // Step 1: Try to get cached org_id (from intercepted API calls)
    // This is the primary method per spec: "cache_per_session"
    const { claude_org_id } = await chrome.storage.local.get(['claude_org_id']);
    if (claude_org_id) {
        orgId = claude_org_id;
        console.log('[BrainBox] ✅ Using cached org_id per spec:', orgId);
    }
    
    // Step 2: If not cached, try to extract from current page URL
    // Specification says: source: "current_page_URL", pattern: "/api/organizations/([^/]+)/"
    if (!orgId) {
        let url = providedUrl;
        if (!url) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            url = tabs[0]?.url || '';
        }
        
        // Try pattern from spec: "/api/organizations/([^/]+)/"
        // This might be in the URL if user navigated from an API response
        const orgMatch = url.match(/\/api\/organizations\/([^\/]+)\//);
        if (orgMatch && orgMatch[1]) {
            orgId = orgMatch[1];
            // Cache it per spec: "cache_per_session"
            chrome.storage.local.set({ claude_org_id: orgId });
            console.log('[BrainBox] ✅ Extracted org_id from URL per spec:', orgId);
        }
    }
    
    // Step 3: If still not found, wait for API call to be intercepted
    // The webRequest listener will capture it on next API call
    if (!orgId) {
        // Wait a bit for any pending API calls to be intercepted
        await new Promise(resolve => setTimeout(resolve, 500));
        const { claude_org_id: cachedId } = await chrome.storage.local.get(['claude_org_id']);
        if (cachedId) {
            orgId = cachedId;
            console.log('[BrainBox] ✅ Got org_id from intercepted API call:', orgId);
        }
    }

    if (!orgId) {
        throw new Error('Could not extract organization ID. Please make sure you are on a Claude chat page and the page has loaded.');
    }

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
    
    // Add URL from current page (not from API response)
    // providedUrl is the current page URL like: https://claude.ai/chat/{conversationId}
    if (providedUrl && providedUrl.includes('claude.ai')) {
        conversation.url = providedUrl;
        console.log('[BrainBox] ✅ Claude URL set from providedUrl:', conversation.url);
    } else {
        // Fallback: construct URL from conversationId
        conversation.url = `https://claude.ai/chat/${conversationId}`;
        console.log('[BrainBox] ⚠️ Claude URL constructed (no providedUrl):', conversation.url);
    }
    
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
    const { gemini_at_token, gemini_dynamic_key, key_discovered_at } = await chrome.storage.local.get([
        'gemini_at_token',
        'gemini_dynamic_key',
        'key_discovered_at'
    ]);

    console.log('[BrainBox] fetchGeminiConversation - Token:', gemini_at_token ? 'Present' : 'Missing');
    console.log('[BrainBox] fetchGeminiConversation - Dynamic key:', gemini_dynamic_key || 'Missing');
    console.log('[BrainBox] fetchGeminiConversation - Key discovered at:', key_discovered_at ? new Date(key_discovered_at).toISOString() : 'Never');

    if (!gemini_at_token) {
        throw new Error('Gemini AT token not found. Please refresh the page.');
    }

    if (!gemini_dynamic_key) {
        console.warn('[BrainBox] ⚠️ Dynamic key not found. Checking if webRequest listener is active...');
        // Check if listener is registered
        console.warn('[BrainBox] ⚠️ User needs to open a conversation first to trigger key discovery.');
        throw new Error('Gemini dynamic key not discovered. Please open any conversation first to initialize the extension.');
    }

    // Construct double-serialized JSON payload
    // Match the format Gemini uses: ["c_conversationId", 10, null, 1, [1], [4], null, 1]
    const innerPayload = JSON.stringify([`c_${conversationId}`, 10, null, 1, [1], [4], null, 1]);
    // Gemini expects 3 levels: [[[key, innerPayload, null, "generic"]]]
    const middlePayload = [
        [
            [gemini_dynamic_key, innerPayload, null, "generic"]
        ]
    ];
    // f.req should be JSON.stringify of middlePayload (single serialization)
    const outerPayload = JSON.stringify(middlePayload);

    const body = new URLSearchParams({
        'f.req': outerPayload,
        'at': gemini_at_token
    });

    // Use /u/0/ path with rpcids parameter (same as Gemini website uses)
    // The rpcids parameter should match the dynamic key
    const url = `https://gemini.google.com/u/0/_/BardChatUi/data/batchexecute?rpcids=${gemini_dynamic_key}`;
    
    const response = await fetch(
        url,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'X-Same-Domain': '1'
            },
            credentials: 'include', // Include cookies for authentication
            body: body.toString()
        }
    );

    if (response.status === 400 || response.status === 403) {
        // Log response for debugging
        const responseText = await response.text();
        console.error('[BrainBox] Gemini API error response:', response.status, responseText.substring(0, 500));
        
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
        const dashboardDomain = new URL(DASHBOARD_URL).hostname;
        const cookies = await chrome.cookies.getAll({
            domain: dashboardDomain
        });

        // Check for Supabase auth cookies (sb-<project-id>-auth-token pattern)
        // Also check for any session/auth related cookies
        const hasSession = cookies.some(cookie => {
            const name = cookie.name.toLowerCase();
            return name.includes('sb-') && name.includes('auth') ||
                   name.includes('session') ||
                   name.includes('auth-token') ||
                   (name.includes('supabase') && name.includes('auth'));
        });

        return hasSession;
    } catch (error) {
        console.error('[BrainBox] Session check error:', error);
        return false;
    }
}

/**
 * Format conversation messages into readable text
 */
function formatMessagesAsText(conversationData) {
    if (!conversationData.messages || conversationData.messages.length === 0) {
        return 'No messages';
    }

    const lines = [];
    
    // Add header
    lines.push(`Title: ${conversationData.title || 'Untitled Chat'}`);
    lines.push(`Platform: ${conversationData.platform}`);
    lines.push(`Date: ${new Date(conversationData.created_at || Date.now()).toLocaleString()}`);
    lines.push(`Messages: ${conversationData.messages.length}`);
    lines.push('');
    lines.push('─'.repeat(80));
    lines.push('');

    // Add each message
    conversationData.messages.forEach((msg, index) => {
        const role = msg.role || 'unknown';
        const roleLabel = role === 'user' ? '👤 USER' : 
                         role === 'assistant' ? '🤖 ASSISTANT' : 
                         role === 'system' ? '⚙️ SYSTEM' : 
                         '💬 ' + role.toUpperCase();
        
        lines.push(`${roleLabel}:`);
        lines.push('');
        
        // Add content
        if (msg.content) {
            lines.push(msg.content);
        } else {
            lines.push('(No content)');
        }
        
        lines.push('');
        
        // Add separator between messages (but not after last one)
        if (index < conversationData.messages.length - 1) {
            lines.push('─'.repeat(80));
            lines.push('');
        }
    });

    return lines.join('\n');
}

async function handleSaveToDashboard(conversationData, folderId) {
    // Check authentication FIRST, before rate limiting
    const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);
    
    // Check if token exists and is not expired
    const isTokenValid = accessToken && 
                        accessToken !== null && 
                        accessToken !== undefined && 
                        accessToken !== '' &&
                        (!expiresAt || expiresAt > Date.now());
    
    if (!isTokenValid) {
        // Open auth page immediately
        chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
        throw new Error('Please authenticate first');
    }
    
    // Wrap with minimal rate limiting to avoid flooding dashboard
    return await limiters.dashboard.schedule(async () => {

        // Format messages as readable text
        const formattedContent = formatMessagesAsText(conversationData);

        // Ensure we have the correct URL (not dashboard URL)
        const chatUrl = conversationData.url || 
            (conversationData.platform === 'chatgpt' ? `https://chatgpt.com/c/${conversationData.id}` :
             conversationData.platform === 'claude' ? `https://claude.ai/chat/${conversationData.id}` :
             conversationData.platform === 'gemini' ? `https://gemini.google.com/app/${conversationData.id}` :
             `https://${conversationData.platform}/chat/${conversationData.id}`);

        console.log('[BrainBox] Saving to dashboard with URL:', chatUrl);
        console.log('[BrainBox] conversationData.url:', conversationData.url);
        console.log('[BrainBox] conversationData.id:', conversationData.id);
        console.log('[BrainBox] conversationData.platform:', conversationData.platform);

        const requestBody = {
            title: conversationData.title || 'Untitled Chat',
            content: formattedContent,
            platform: conversationData.platform,
            url: chatUrl,
            folder_id: folderId || null
        };

        console.log('[BrainBox] Request body to dashboard:', JSON.stringify(requestBody, null, 2));

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
    
    // Create context menu for all platforms
    createContextMenu();
});

// ============================================================================
// CONTEXT MENU
// ============================================================================

function createContextMenu() {
    // Remove ALL existing menu items first (including any submenus)
    chrome.contextMenus.removeAll(() => {
        // Create 3 different context menu items with different contexts
        // They won't show at the same time, so no submenu grouping
        
        // 1. Prompt Inject - shows ONLY in editable fields (textarea/input)
        chrome.contextMenus.create({
            id: 'brainbox-prompt-inject',
            title: '💬 BrainBox Prompt Inject',
            contexts: ['editable'],
            documentUrlPatterns: ['<all_urls>']
        });
        
        // 2. Create Prompt - shows ONLY when text is selected
        chrome.contextMenus.create({
            id: 'brainbox-create-prompt',
            title: '➕ BrainBox Create Prompt',
            contexts: ['selection'],
            documentUrlPatterns: ['<all_urls>']
        });
        
        // 3. Save Chat - shows on page/link (but not editable or selection)
        chrome.contextMenus.create({
            id: 'brainbox-save-chat',
            title: '💾 BrainBox Save Chat',
            contexts: ['page', 'link'],
            documentUrlPatterns: [
                'https://chatgpt.com/*',
                'https://chat.openai.com/*',
                'https://claude.ai/*',
                'https://gemini.google.com/*'
            ]
        });
        
        // 4. Save Image - shows when right-clicking on an image
        chrome.contextMenus.create({
            id: 'brainbox-save-image',
            title: '🖼️ BrainBox Save Image',
            contexts: ['image'],
            documentUrlPatterns: ['<all_urls>']
        });
        
        console.log('[BrainBox] ✅ Context menu created (4 items with different contexts)');
    });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // Prompt Inject handler - in editable fields (textarea) - WORKS EVERYWHERE
    if (info.menuItemId === 'brainbox-prompt-inject') {
        try {
            console.log('[💬 BrainBox] Prompt Inject clicked on:', tab.url);
            
            // Always try to inject script first for universal compatibility
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['prompt-inject/prompt-inject.js']
                });
                console.log('[💬 BrainBox] ✅ Prompt inject script injected');
            } catch (injectError) {
                console.log('[💬 BrainBox] Script might already be loaded, continuing...', injectError.message);
            }
            
            // Send message to content script to show prompt menu
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'showPromptMenu'
                });
                console.log('[💬 BrainBox] ✅ Prompt menu message sent');
            } catch (error) {
                console.log('[💬 BrainBox] ⚠️ Message failed, retrying after delay...', error.message);
                // Retry after a delay
                setTimeout(async () => {
                    try {
                        await chrome.tabs.sendMessage(tab.id, {
                            action: 'showPromptMenu'
                        });
                        console.log('[💬 BrainBox] ✅ Prompt menu message sent after retry');
                    } catch (e) {
                        console.error('[💬 BrainBox] ❌ Still failed after retry:', e);
                    }
                }, 800);
            }
        } catch (error) {
            console.error('[💬 BrainBox] ❌ Error in prompt inject handler:', error);
        }
        return;
    }
    
    // Create Prompt handler - when text is selected - WORKS EVERYWHERE
    if (info.menuItemId === 'brainbox-create-prompt') {
        try {
            console.log('[➕ BrainBox] Create Prompt from Selection clicked on:', tab.url);
            const selectedText = info.selectionText;
            
            if (!selectedText || selectedText.trim().length === 0) {
                console.warn('[➕ BrainBox] ⚠️ No text selected');
                try {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                        title: 'BrainBox',
                        message: 'Моля, маркирай текст преди да създадеш промпт.'
                    });
                } catch (notifError) {
                    console.warn('[➕ BrainBox] Could not show notification:', notifError);
                }
                return;
            }
            
            console.log('[➕ BrainBox] 📝 Selected text length:', selectedText.length);
            
            // Always try to inject script first for universal compatibility
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['prompt-inject/prompt-inject.js']
                });
                console.log('[➕ BrainBox] ✅ Prompt inject script injected');
            } catch (injectError) {
                console.log('[➕ BrainBox] Script might already be loaded, continuing...', injectError.message);
            }
            
            // Send message to content script to show create prompt dialog
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'showCreatePromptDialog',
                    selectedText: selectedText
                });
                console.log('[➕ BrainBox] ✅ Create prompt dialog message sent');
            } catch (error) {
                console.log('[➕ BrainBox] ⚠️ Message failed, retrying after delay...', error.message);
                // Retry after a delay
                setTimeout(async () => {
                    try {
                        await chrome.tabs.sendMessage(tab.id, {
                            action: 'showCreatePromptDialog',
                            selectedText: selectedText
                        });
                        console.log('[➕ BrainBox] ✅ Create prompt dialog message sent after retry');
                    } catch (e) {
                        console.error('[➕ BrainBox] ❌ Still failed after retry:', e);
                    }
                }, 800);
            }
        } catch (error) {
            console.error('[➕ BrainBox] ❌ Error in create prompt handler:', error);
        }
        return;
    }
    
    // Save Image handler - when right-clicking on an image
    if (info.menuItemId === 'brainbox-save-image') {
        try {
            console.log('[🖼️ BrainBox] Save Image context menu clicked');
            console.log('[🖼️ BrainBox] Image info:', {
                srcUrl: info.srcUrl,
                altText: info.altText,
                linkText: info.linkText,
                pageUrl: info.pageUrl,
                tabId: tab.id,
                tabUrl: tab.url
            });
            
            if (!info.srcUrl) {
                console.error('[🖼️ BrainBox] ❌ No image URL found in context menu info');
                return;
            }
            
            // Send message to content script to save the image
            try {
                console.log('[🖼️ BrainBox] 📨 Attempting to send message to content script...');
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'saveImage',
                    imageUrl: info.srcUrl,
                    imageName: info.altText || info.linkText || 'Saved Image'
                });
                console.log('[🖼️ BrainBox] ✅ Save image message sent, response:', response);
            } catch (error) {
                console.log('[🖼️ BrainBox] ⚠️ Content script not ready, error:', error.message);
                console.log('[🖼️ BrainBox] 🔧 Injecting image-saver script...');
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['image-saver/image-saver.js']
                    });
                    console.log('[🖼️ BrainBox] ✅ Image saver script injected successfully');
                    
                    setTimeout(async () => {
                        try {
                            console.log('[🖼️ BrainBox] 📨 Retrying message after injection...');
                            const response = await chrome.tabs.sendMessage(tab.id, {
                                action: 'saveImage',
                                imageUrl: info.srcUrl,
                                imageName: info.altText || info.linkText || 'Saved Image'
                            });
                            console.log('[🖼️ BrainBox] ✅ Save image message sent after injection, response:', response);
                        } catch (e) {
                            console.error('[🖼️ BrainBox] ❌ Still failed after injection:', e);
                            console.error('[🖼️ BrainBox] Error details:', {
                                message: e.message,
                                stack: e.stack
                            });
                        }
                    }, 500);
                } catch (injectError) {
                    console.error('[🖼️ BrainBox] ❌ Failed to inject image saver script:', injectError);
                    console.error('[🖼️ BrainBox] Inject error details:', {
                        message: injectError.message,
                        stack: injectError.stack
                    });
                }
            }
        } catch (error) {
            console.error('[🖼️ BrainBox] ❌ Error in save image handler:', error);
            console.error('[🖼️ BrainBox] Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
        return;
    }
    
    // Save Chat handler - on page/link
    if (info.menuItemId === 'brainbox-save-chat') {
        try {
            // Check accessToken FIRST - this is the reliable way
            const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);
            
            // Check if token exists and is not expired
            const isTokenValid = accessToken && 
                                accessToken !== null && 
                                accessToken !== undefined && 
                                accessToken !== '' &&
                                (!expiresAt || expiresAt > Date.now());
            
            if (!isTokenValid) {
                console.log('[BrainBox] No valid accessToken found, opening login page');
                // Open auth page immediately
                chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
                
                // Show notification
                try {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                        title: 'BrainBox',
                        message: 'Please log in first. Opening login page...'
                    });
                } catch (notifError) {
                    console.warn('[BrainBox] Could not show notification:', notifError);
                }
                
                return; // Stop here, don't try to save
            }
            
            console.log('[BrainBox] Valid accessToken found, proceeding with save');
            
            // For Gemini: Extract conversation ID from clicked element
            if (tab.url && tab.url.includes('gemini.google.com')) {
                console.log('[BrainBox] Gemini detected - extracting conversation from clicked element');
                
                try {
                    // Send message to content script to extract conversation ID from clicked element
                    // Note: info.pageX/pageY might not be available, use fallback to URL
                    const response = await chrome.tabs.sendMessage(tab.id, {
                        action: 'extractConversationFromContextMenu',
                        clickInfo: {
                            pageX: info.pageX || null,
                            pageY: info.pageY || null,
                            linkUrl: info.linkUrl || null,
                            selectionText: info.selectionText || null
                        }
                    }).catch(err => {
                        console.log('[BrainBox] Content script not ready, using URL fallback:', err.message);
                        return null;
                    });
                    
                    if (response && response.success && response.conversationId) {
                        const conversationId = response.conversationId;
                        const title = response.title || conversationId;
                        
                        console.log('[BrainBox] Conversation ID extracted:', conversationId);
                        
                        // Show notification
                try {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                        title: 'BrainBox',
                                message: `Saving Gemini chat: ${title}...`
                    });
                } catch (notifError) {
                    console.warn('[BrainBox] Could not show notification:', notifError);
                }
                        
                        // Send message to content script to save the conversation
                        try {
                            await chrome.tabs.sendMessage(tab.id, {
                                action: 'saveConversationFromContextMenu',
                                conversationId: conversationId,
                                title: title,
                                url: response.url || tab.url
                            });
                        } catch (msgError) {
                            console.error('[BrainBox] Failed to send save message:', msgError);
                        }
                        
                        return;
                    } else {
                        // Fallback: Try to extract from current page URL
                        const conversationId = extractConversationIdFromUrl(tab.url, 'gemini');
                        
                        // Валидация на conversation ID
                        const invalidIds = ['view', 'edit', 'delete', 'new', 'create', 'undefined', 'null', ''];
                        if (conversationId && !invalidIds.includes(conversationId.toLowerCase()) && conversationId.length >= 10) {
                            console.log('[BrainBox] Using conversation ID from URL:', conversationId);
                            
                            // Send message to content script to save current conversation
                            await chrome.tabs.sendMessage(tab.id, {
                                action: 'saveConversationFromContextMenu',
                                conversationId: conversationId,
                                title: null,
                                url: tab.url
                            });
                            
                            try {
                                chrome.notifications.create({
                                    type: 'basic',
                                    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                                    title: 'BrainBox',
                                    message: 'Saving current Gemini chat...'
                                });
                            } catch (notifError) {
                                console.warn('[BrainBox] Could not show notification:', notifError);
                            }
                            
                            return;
                        }
                        
                        throw new Error('Could not extract conversation ID. Please right-click on a conversation in the sidebar or on the current chat page.');
                    }
                } catch (error) {
                    console.error('[BrainBox] Error saving Gemini conversation:', error);
                    try {
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                            title: 'BrainBox',
                            message: `Error: ${error.message}`
                        });
                    } catch (notifError) {
                        console.warn('[BrainBox] Could not show notification:', notifError);
                    }
                    return;
                }
            }
            
            // For ChatGPT: If right-clicking on a link in sidebar, use linkUrl
            // Otherwise, use tab.url (current page)
            let url = tab.url;
            let conversationId = null;
            let platform = null;
            
            // Check if right-clicked on a link (sidebar conversation link)
            if (info.linkUrl && (info.linkUrl.includes('chatgpt.com/c/') || info.linkUrl.includes('chat.openai.com/c/'))) {
                url = info.linkUrl;
                platform = 'chatgpt';
                conversationId = extractConversationIdFromUrl(url, platform);
                console.log('[BrainBox] Using linkUrl from sidebar:', { url, conversationId });
            } else {
                // Right-clicked on page, not on a link
                if (!url) {
                    throw new Error('No URL available');
                }
                
                // Detect platform
                platform = detectPlatformFromUrl(url);
                if (!platform) {
                    throw new Error('Not on a supported platform (ChatGPT, Claude, or Gemini)');
                }
                
                // Extract conversation ID from current page URL
                conversationId = extractConversationIdFromUrl(url, platform);
                
                if (!conversationId) {
                    throw new Error(`Could not extract conversation ID from URL. Make sure you are on a chat page or right-click on a conversation link. Current URL: ${url}`);
                }
            }
            
            console.log('[BrainBox] Context menu: Saving chat', { 
                platform, 
                conversationId, 
                url
            });
            
            // Show notification (with error handling)
            try {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                    title: 'BrainBox',
                    message: `Saving ${platform} chat...`
                });
            } catch (notifError) {
                console.warn('[BrainBox] Could not show notification:', notifError);
            }
            
            // Fetch conversation using tab.url
            const conversationData = await fetchConversationByPlatform(platform, conversationId, url);
            
            // Save to dashboard
            const saveResponse = await handleSaveToDashboard(conversationData, null);
            
            // Show success notification
            try {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                    title: 'BrainBox',
                    message: 'Chat saved successfully! ✓'
                });
            } catch (notifError) {
                console.warn('[BrainBox] Could not show success notification:', notifError);
            }
            
        } catch (error) {
            console.error('[BrainBox] Context menu save error:', error);
            
            // Show error notification
            try {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                    title: 'BrainBox Error',
                    message: error.message || 'Failed to save chat'
                });
            } catch (notifError) {
                console.warn('[BrainBox] Could not show error notification:', notifError);
            }
            
            // If auth error OR org_id extraction error (might mean not logged in), open login page
            if (error.message.includes('Session expired') || 
                error.message.includes('authenticate') ||
                error.message.includes('401') ||
                error.message.includes('Could not extract organization ID')) {
                console.log('[BrainBox] Auth-related error detected, opening login page');
                chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
            }
        }
    }
});

function detectPlatformFromUrl(url) {
    if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
        return 'chatgpt';
    } else if (url.includes('claude.ai')) {
        return 'claude';
    } else if (url.includes('gemini.google.com')) {
        return 'gemini';
    }
    return null;
}

function extractConversationIdFromUrl(url, platform) {
    try {
        const urlObj = new URL(url);
        
        if (platform === 'chatgpt') {
            // ChatGPT: /c/[id]
            const match = urlObj.pathname.match(/\/c\/([a-f0-9-]+)/);
            return match ? match[1] : null;
        } else if (platform === 'claude') {
            // Claude: /chat/[id]
            const match = urlObj.pathname.match(/\/chat\/([a-f0-9-]+)/);
            return match ? match[1] : null;
        } else if (platform === 'gemini') {
            // Gemini: /app/[id], /chat/[id], or ?q=[id]
            let match = urlObj.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/);
            if (match) return match[1];
            
            match = urlObj.pathname.match(/\/chat\/([a-zA-Z0-9_-]+)/);
            if (match) return match[1];
            
            match = urlObj.searchParams.get('q');
            if (match) return match;
            
            // Fallback: last path segment
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts.length > 0) {
                return pathParts[pathParts.length - 1];
            }
        }
        
        return null;
    } catch (error) {
        console.error('[BrainBox] Error extracting conversation ID:', error);
        return null;
    }
}

async function fetchConversationByPlatform(platform, conversationId, url = null) {
    if (platform === 'chatgpt') {
        return await fetchChatGPTConversation(conversationId);
    } else if (platform === 'claude') {
        return await fetchClaudeConversation(conversationId, url);
    } else if (platform === 'gemini') {
        return await fetchGeminiConversation(conversationId);
    }
    throw new Error(`Unsupported platform: ${platform}`);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[BrainBox] 🚀 Service Worker initialized');
console.log('[BrainBox] ✅ WebRequest listeners registered for Gemini dynamic key discovery');
console.log('[BrainBox] 📋 To discover dynamic key: Open any conversation in Gemini');

// Create context menu on startup
createContextMenu();

// Load stored tokens on startup
chrome.storage.local.get([
    'chatgpt_token',
    'gemini_at_token',
    'gemini_dynamic_key',
    'claude_org_id',
    'accessToken',
    'onboarded'
], (result) => {
    if (result.chatgpt_token) tokens.chatgpt = result.chatgpt_token;
    if (result.gemini_at_token) tokens.gemini_at = result.gemini_at_token;
    if (result.gemini_dynamic_key) tokens.gemini_key = result.gemini_dynamic_key;
    if (result.claude_org_id) tokens.claude_org_id = result.claude_org_id;

    console.log('[BrainBox] Tokens loaded:', {
        chatgpt: !!tokens.chatgpt,
        gemini_at: !!tokens.gemini_at,
        gemini_key: !!tokens.gemini_key,
        claude_org_id: !!tokens.claude_org_id,
        dashboard: !!result.accessToken,
        onboarded: !!result.onboarded
    });
});
