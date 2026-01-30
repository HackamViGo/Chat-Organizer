 // BrainBox AI Chat Organizer - Service Worker
// Manifest V3 Background Script

import { CONFIG } from '../lib/config.js';
import { normalizeChatGPT, normalizeClaude, normalizeGemini } from '../lib/normalizers.js';
import { validateConversation } from '../lib/schemas.js';
import { limiters } from '../lib/rate-limiter.js';

// Environment Configuration
const DASHBOARD_URL = CONFIG.DASHBOARD_URL;
const DEBUG_MODE = false;


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
            // console.debug('[🧠 BrainBox] ✅ ChatGPT token captured');
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
                    if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Claude org_id extracted per spec:', orgId);
                }
            } catch (error) {
                console.error('[🧠 BrainBox] Error in org_id extraction:', error);
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
        if (DEBUG_MODE && details.url.includes('gemini.google.com') && details.method === 'POST') {
            if (DEBUG_MODE) console.log('[🧠 BrainBox] 🔍 Gemini POST request:', details.url.substring(0, 150), 'Method:', details.method);
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
        
        if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Batchexecute request detected!');
        if (DEBUG_MODE) console.log('[🧠 BrainBox] Full URL:', details.url);
        if (DEBUG_MODE) console.log('[🧠 BrainBox] Method:', details.method);
        if (DEBUG_MODE) console.log('[🧠 BrainBox] Has requestBody:', !!details.requestBody);
        
        if (details.requestBody) {
            try {
                if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Gemini batchexecute request intercepted');
                if (DEBUG_MODE) console.log('[🧠 BrainBox] Request body type:', details.requestBody ? Object.keys(details.requestBody) : 'null');
                
                // Try formData first
                const formData = details.requestBody.formData;
                if (formData && formData['f.req']) {
                    const reqData = formData['f.req'][0];
                    if (DEBUG_MODE) console.log('[🧠 BrainBox] Request data (first 300 chars):', reqData.substring(0, 300));
                    
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
                        
                        if (DEBUG_MODE) console.log('[🧠 BrainBox] Key discovery check:', {
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
                            if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Gemini dynamic key discovered (conversation request):', key);
                        } else {
                            // Store as fallback, but don't overwrite conversation keys
                            if (!tokens.gemini_key) {
                                tokens.gemini_key = key;
                                chrome.storage.local.set({
                                    gemini_dynamic_key: key,
                                    key_discovered_at: Date.now()
                                });
                                if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Gemini dynamic key discovered (per spec):', key);
                            } else {
                                if (DEBUG_MODE) console.log('[🧠 BrainBox] ⚠️ Key already exists, skipping:', key);
                            }
                        }
                    } else {
                        if (DEBUG_MODE) console.log('[🧠 BrainBox] ⚠️ Spec pattern not found, trying fallback patterns...');
                        
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
                                    if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Gemini dynamic key discovered (fallback):', key);
                                } else {
                                    if (DEBUG_MODE) console.log('[🧠 BrainBox] ⚠️ Fallback pattern found but position invalid');
                                }
                            }
                        }
                        
                        // Fallback 2: Pattern ["KEY"
                        const fallback2 = reqData.match(/\["([a-zA-Z0-9]{5,6})"/);
                        if (fallback2 && !tokens.gemini_key) {
                            if (DEBUG_MODE) console.log('[🧠 BrainBox] Found alternative pattern ["KEY":', fallback2[1]);
                        }
                    }
                } else {
                    if (DEBUG_MODE) console.log('[🧠 BrainBox] ⚠️ No formData or f.req found in request body');
                    if (DEBUG_MODE) console.log('[🧠 BrainBox] Request body keys:', details.requestBody ? Object.keys(details.requestBody) : 'null');
                }
            } catch (error) {
                console.error('[🧠 BrainBox] Error in key discovery:', error);
            }
        }
    },
    { 
        urls: ['https://gemini.google.com/*', 'http://gemini.google.com/*'] 
    },
    ['requestBody']
);

// Debug: Verify listener is registered
if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Gemini dynamic key discovery listener registered');
if (DEBUG_MODE) console.log('[🧠 BrainBox] 📋 Listening for batchexecute requests');
if (DEBUG_MODE) console.log('[🧠 BrainBox] 📋 URL patterns:', [
    '*://gemini.google.com/*/batchexecute',
    '*://gemini.google.com/_/BardChatUi/data/batchexecute',
    '*://gemini.google.com/*/BardChatUi/data/batchexecute',
    '*://gemini.google.com/*/data/batchexecute'
]);

// ============================================================================
// BATCHEXECUTE RESPONSE INTERCEPTOR (OLD WAY)
// ============================================================================// BATCHEXECUTE RESPONSE INTERCEPTOR (OLD WAY)
// Catches batchexecute responses and sends them to the content script

chrome.webRequest.onCompleted.addListener(
    async (details) => {
        // Double-check if URL contains batchexecute
        if (!details.url.includes('batchexecute')) {
            return;
        }
        
        if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Batchexecute response detected!');
        if (DEBUG_MODE) console.log('[🧠 BrainBox] URL:', details.url);
        if (DEBUG_MODE) console.log('[🧠 BrainBox] Tab ID:', details.tabId);
        
        // Get the response body (requires responseBody permission)
        // Note: We can't read responseBody directly in onCompleted
        // Instead, we'll notify the content script to intercept it
        
        // Send message to content script to process this response
        if (details.tabId && details.tabId > 0) {
            sendMessageToTab(details.tabId, {
                action: 'processBatchexecuteResponse',
                url: details.url,
                timestamp: Date.now()
            });
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

if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Batchexecute response interceptor registered');

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (DEBUG_MODE) console.log('[BrainBox Worker] 📨 Message received:', request.action, 'from', sender.tab ? 'tab ' + sender.tab.id : 'extension');


    // Set auth token (from dashboard auth page)
    if (request.action === 'setAuthToken') {
        chrome.storage.local.set({
            accessToken: request.accessToken,
            refreshToken: request.refreshToken,
            expiresAt: request.expiresAt
        });
        if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Auth token received from dashboard');
        // Start token refresh check
        startTokenRefreshCheck();
        sendResponse({ success: true });
        return true;
    }

    // Refresh auth token
    if (request.action === 'refreshAuthToken') {
        refreshAccessToken()
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
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
        handleSaveToDashboard(request.data, request.folderId, request.silent)
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
        if (request.token) {
            tokens.gemini_at = request.token;
            chrome.storage.local.set({ gemini_at_token: request.token });
            if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Gemini AT token updated');
        }
        sendResponse({ success: true });
        return true;
    }

    // Inject Gemini MAIN world script
    if (request.action === 'injectGeminiMainScript') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                if (DEBUG_MODE) console.log('[🧠 BrainBox] Injecting Gemini MAIN world script into tab:', tabs[0].id);
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    world: 'MAIN',
                    files: ['content/inject-gemini-main.js']
                }).then(() => {
                    if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Gemini MAIN world script injected successfully');
                    sendResponse({ success: true });
                }).catch(err => {
                    console.error('[🧠 BrainBox] ❌ Failed to inject Gemini MAIN world script:', err);
                    sendResponse({ success: false, error: err.message });
                });
            } else {
                sendResponse({ success: false, error: 'No active tab found' });
            }
        });
        return true;
    }

    // Content script readiness signal
    if (request.action === 'contentScriptReady') {
        if (DEBUG_MODE) console.log(`[🧠 BrainBox] 🚀 Content script ready signal from tab ${sender.tab?.id || 'unknown'} (${request.platform})`);
        return true;
    }

    // Fetch Prompts (Delegate to background to bypass CSP)
    if (request.action === 'fetchPrompts') {
        handleFetchPrompts()
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

/**
 * Robust message sending with retries
 */
async function sendMessageToTab(tabId, message, retries = 3, delay = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            await chrome.tabs.sendMessage(tabId, message);
            return true;
        } catch (error) {
            if (i === retries - 1) {
                if (DEBUG_MODE) console.log(`[🧠 BrainBox] ⚠️ Message failed after ${retries} attempts:`, message.action);
                return false;
            }
            await new Promise(r => setTimeout(r, delay));
        }
    }
    return false;
}

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
        if (DEBUG_MODE) console.warn('ChatGPT validation warning:', validation.error);
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
        if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Using cached org_id per spec:', orgId);
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
            if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Extracted org_id from URL per spec:', orgId);
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
            if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Got org_id from intercepted API call:', orgId);
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
        if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Claude URL set from providedUrl:', conversation.url);
    } else {
        // Fallback: construct URL from conversationId
        conversation.url = `https://claude.ai/chat/${conversationId}`;
        if (DEBUG_MODE) console.log('[🧠 BrainBox] ⚠️ Claude URL constructed (no providedUrl):', conversation.url);
    }
    
    const validation = validateConversation(conversation);

    if (!validation.valid) {
        if (DEBUG_MODE) console.warn('Claude validation warning:', validation.error);
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

    if (DEBUG_MODE) console.log('[🧠 BrainBox] fetchGeminiConversation - Token:', gemini_at_token ? 'Present' : 'Missing');
    if (DEBUG_MODE) console.log('[🧠 BrainBox] fetchGeminiConversation - Dynamic key:', gemini_dynamic_key || 'Missing');
    if (DEBUG_MODE) console.log('[🧠 BrainBox] fetchGeminiConversation - Key discovered at:', key_discovered_at ? new Date(key_discovered_at).toISOString() : 'Never');

    if (!gemini_at_token) {
        throw new Error('Gemini AT token not found. Please refresh the page.');
    }

    if (!gemini_dynamic_key) {
        if (DEBUG_MODE) {
            console.warn('[🧠 BrainBox] ⚠️ Dynamic key not found. Checking if webRequest listener is active...');
            // Check if listener is registered
            console.warn('[🧠 BrainBox] ⚠️ User needs to open a conversation first to trigger key discovery.');
        }
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
        console.error('[🧠 BrainBox] Gemini API error response:', response.status, responseText.substring(0, 500));
        
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
        console.error('[🧠 BrainBox] Gemini parse error:', error);
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
        console.error('[🧠 BrainBox] Session check error:', error);
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

async function handleSaveToDashboard(conversationData, folderId, silent = false) {
    // Check authentication FIRST, before rate limiting
    const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);
    
    // Check if token exists and is not expired
    const isTokenValid = accessToken && 
                        accessToken !== null && 
                        accessToken !== undefined && 
                        accessToken !== '' &&
                        (!expiresAt || expiresAt > Date.now());
    
    if (!isTokenValid) {
        // Open auth page ONLY if NOT silent
        if (!silent) {
            chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
        }
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

        if (DEBUG_MODE) console.log('[BrainBox Worker] 💾 Saving to dashboard:', conversationData.id);
        if (DEBUG_MODE) console.log('[BrainBox Worker] Platform:', conversationData.platform);
        if (DEBUG_MODE) console.log('[BrainBox Worker] URL:', chatUrl);
        if (DEBUG_MODE) console.log('[BrainBox Worker] Messages count:', conversationData.messages?.length || 0);


        const requestBody = {
            title: conversationData.title || 'Untitled Chat',
            content: formattedContent,
            messages: conversationData.messages || [],
            platform: conversationData.platform,
            url: chatUrl,
            folder_id: folderId || null
        };

        if (DEBUG_MODE) console.log('[🧠 BrainBox] Request body to dashboard:', JSON.stringify(requestBody, null, 2));

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
            if (!silent) {
                chrome.tabs.create({ url: `${DASHBOARD_URL}/extension-auth` });
            }
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
        console.error('[🧠 BrainBox] Error fetching folders:', error);
        return [];
    }
}

// ============================================================================
// ONBOARDING - First Install
// ============================================================================

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // First time installation
        if (DEBUG_MODE) console.log('[🧠 BrainBox] 🎉 Extension installed for the first time!');
        
        // Open welcome page with login prompt
        chrome.tabs.create({
            url: `${DASHBOARD_URL}/extension-auth`
        });
        
        // Set flag that we've shown onboarding
        chrome.storage.local.set({ onboarded: true });
    } else if (details.reason === 'update') {
        if (DEBUG_MODE) console.log('[🧠 BrainBox] Extension updated to version', chrome.runtime.getManifest().version);
    }
    
    // Create context menu for all platforms
    createContextMenu();
});

// ============================================================================
// CONTEXT MENU
// ============================================================================

let isUpdatingContextMenu = false;

async function createContextMenu() {
    if (isUpdatingContextMenu) return;
    isUpdatingContextMenu = true;

    try {
        // 1. First, always remove existing to avoid duplicates
        // In MV3 removeAll returns a promise if no callback is provided
        await new Promise((resolve) => {
            chrome.contextMenus.removeAll(() => {
                const error = chrome.runtime.lastError;
                if (error && DEBUG_MODE) console.warn('[🧠 BrainBox] Context menu removal warning:', error.message);
                resolve();
            });
        });

        // 2. Fetch prompts for dynamic menu
        let prompts = [];
        try {
            const data = await handleFetchPrompts();
            prompts = Array.isArray(data) ? data : (data?.prompts || []);
        } catch (error) {
            if (DEBUG_MODE) console.log('[🧠 BrainBox] Could not fetch prompts for context menu:', error.message);
        }

        // Deduplicate prompts by ID to prevent duplicate menu items
        const seenIds = new Set();
        const validPrompts = prompts.filter(p => {
            if (!p.id || seenIds.has(p.id)) return false;
            seenIds.add(p.id);
            return true;
        });

        // Helper to create with error handling
        const safeCreate = (options) => {
            chrome.contextMenus.create(options, () => {
                const error = chrome.runtime.lastError;
                if (error && !error.message.includes('duplicate id')) {
                    console.error('[🧠 BrainBox] Context menu creation error:', error.message, options.id);
                }
            });
        };

        // 3. Create static "Save Chat" item (shows on page/link)
        safeCreate({
            id: 'brainbox-save-chat',
            title: '💾 BrainBox Save Chat',
            contexts: ['page', 'link'],
            documentUrlPatterns: ['<all_urls>']
        });

        // 4. Create static "Create Prompt" item (shows when text is selected)
        safeCreate({
            id: 'brainbox-create-prompt',
            title: '➕ BrainBox Create Prompt',
            contexts: ['selection'],
            documentUrlPatterns: ['<all_urls>']
        });

        // 5. Create dynamic "BrainBox Prompts" parent item
        safeCreate({
            id: 'brainbox-prompts-root',
            title: '💬 BrainBox Prompts',
            contexts: ['editable'],
            documentUrlPatterns: ['<all_urls>']
        });

        // 6. Add "Show Prompt Menu" as the first specialized item
        safeCreate({
            id: 'brainbox-prompt-inject',
            parentId: 'brainbox-prompts-root',
            title: '🔍 Search All Prompts...',
            contexts: ['editable']
        });

        // 7. Add separator if we have prompts
        if (validPrompts.length > 0) {
            safeCreate({
                id: 'brainbox-sep-1',
                parentId: 'brainbox-prompts-root',
                type: 'separator',
                contexts: ['editable']
            });

            // 8. Add individual prompts as sub-items
            validPrompts.slice(0, 30).forEach((prompt) => {
                safeCreate({
                    id: `prompt_${prompt.id}`,
                    parentId: 'brainbox-prompts-root',
                    title: prompt.title || 'Untitled Prompt',
                    contexts: ['editable']
                });
            });
        }

        if (DEBUG_MODE) console.log(`[🧠 BrainBox] ✅ Context menu created with ${validPrompts.length} dynamic prompts`);
    } catch (err) {
        console.error('[🧠 BrainBox] Failed to update context menu:', err);
    } finally {
        // Wait a small bit before allowing next update to handle rapid storage changes
        setTimeout(() => {
            isUpdatingContextMenu = false;
        }, 500);
    }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // Prompt Inject handler - in editable fields (textarea) - WORKS EVERYWHERE
    if (info.menuItemId === 'brainbox-prompt-inject' || info.menuItemId.startsWith('prompt_')) {
        try {
            if (DEBUG_MODE) console.log('[💬 BrainBox] Prompt Inject/Select clicked on:', tab.url);
            
            // Always try to inject script first for universal compatibility
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['prompt-inject/prompt-inject.js']
                });
            } catch (injectError) {
                // Ignore, might already be loaded
            }
            
            if (info.menuItemId === 'brainbox-prompt-inject') {
                // Show the full search menu
                await chrome.tabs.sendMessage(tab.id, { action: 'showPromptMenu' });
            } else {
                // Direct injection of a specific prompt
                const promptId = info.menuItemId.replace('prompt_', '');
                
                // Fetch all prompts to find the content of this one
                // (Optimized: we could cache them, but for now we fetch)
                const data = await handleFetchPrompts();
                const validPrompts = Array.isArray(data) ? data : (data.prompts || []);
                const prompt = validPrompts.find(p => p.id === promptId);
                
                if (prompt) {
                    await chrome.tabs.sendMessage(tab.id, { 
                        action: 'injectPrompt',
                        prompt: prompt
                    });
                }
            }
        } catch (error) {
            console.error('[💬 BrainBox] ❌ Error in prompt inject handler:', error);
        }
        return;
    }
    
    // Create Prompt handler - when text is selected - WORKS EVERYWHERE
    if (info.menuItemId === 'brainbox-create-prompt') {
        try {
            if (DEBUG_MODE) console.log('[➕ BrainBox] Create Prompt from Selection clicked on:', tab.url);
            const selectedText = info.selectionText;
            
            if (!selectedText || selectedText.trim().length === 0) {
                console.warn('[➕ BrainBox] ⚠️ No text selected');
                try {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                        title: 'BrainBox',
                        message: 'Please select some text before creating a prompt.'
                    });
                } catch (notifError) {
                    console.warn('[➕ BrainBox] Could not show notification:', notifError);
                }
                return;
            }
            
            if (DEBUG_MODE) console.log('[➕ BrainBox] 📝 Selected text length:', selectedText.length);
            
            // Always try to inject script first for universal compatibility
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['prompt-inject/prompt-inject.js']
                });
                if (DEBUG_MODE) console.log('[➕ BrainBox] ✅ Prompt inject script injected');
            } catch (injectError) {
                if (DEBUG_MODE) console.log('[➕ BrainBox] Script might already be loaded, continuing...', injectError.message);
            }
            
            // Send message to content script to show create prompt dialog
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'showCreatePromptDialog',
                    selectedText: selectedText
                });
                if (DEBUG_MODE) console.log('[➕ BrainBox] ✅ Create prompt dialog message sent');
            } catch (error) {
                if (DEBUG_MODE) console.log('[➕ BrainBox] ⚠️ Message failed, retrying after delay...', error.message);
                // Retry after a delay
                setTimeout(async () => {
                    try {
                        await chrome.tabs.sendMessage(tab.id, {
                            action: 'showCreatePromptDialog',
                            selectedText: selectedText
                        });
                        if (DEBUG_MODE) console.log('[➕ BrainBox] ✅ Create prompt dialog message sent after retry');
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
                if (DEBUG_MODE) console.log('[🧠 BrainBox] No valid accessToken found, opening login page');
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
                    console.warn('[🧠 BrainBox] Could not show notification:', notifError);
                }
                
                return; // Stop here, don't try to save
            }
            
            if (DEBUG_MODE) console.log('[🧠 BrainBox] Valid accessToken found, proceeding with save');
            
            // For Gemini: Extract conversation ID from clicked element
            if (tab.url && tab.url.includes('gemini.google.com')) {
                if (DEBUG_MODE) console.log('[🧠 BrainBox] Gemini detected - extracting conversation from clicked element');
                
                try {
                    // Send message to content script to extract conversation ID from clicked element
                    // Note: info.pageX/pageY might not be available, use fallback to URL
                    const response = await chrome.tabs.sendMessage(tab.id, {
                        action: 'extractConversationFromContextMenu',
                        clickInfo: {
                            pageX: info.pageX ?? null,
                            pageY: info.pageY ?? null,
                            linkUrl: info.linkUrl || null,
                            selectionText: info.selectionText || null
                        }
                    }).catch(err => {
                        if (DEBUG_MODE) console.log('[🧠 BrainBox] Content script not ready, using URL fallback:', err.message);
                        return null;
                    });
                    
                    if (response && response.success && response.conversationId) {
                        const conversationId = response.conversationId;
                        const title = response.title || conversationId;
                        
                        if (DEBUG_MODE) console.log('[🧠 BrainBox] Conversation ID extracted:', conversationId);
                        
                        // Show notification
                try {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                        title: 'BrainBox',
                                message: `Saving Gemini chat: ${title}...`
                    });
                } catch (notifError) {
                    console.warn('[🧠 BrainBox] Could not show notification:', notifError);
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
                            console.error('[🧠 BrainBox] Failed to send save message:', msgError);
                        }
                        
                        return;
                    } else {
                        // Fallback: Try to extract from current page URL
                        const conversationId = extractConversationIdFromUrl(tab.url, 'gemini');
                        
                        // Validation of conversation ID
                        const invalidIds = ['view', 'edit', 'delete', 'new', 'create', 'undefined', 'null', ''];
                        if (conversationId && !invalidIds.includes(conversationId.toLowerCase()) && conversationId.length >= 10) {
                            if (DEBUG_MODE) console.log('[🧠 BrainBox] Using conversation ID from URL:', conversationId);
                            
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
                                console.warn('[🧠 BrainBox] Could not show notification:', notifError);
                            }
                            
                            return;
                        }
                        
                        throw new Error('Could not extract conversation ID. Please right-click on a conversation in the sidebar or on the current chat page.');
                    }
                } catch (error) {
                    const errorMsg = error?.message || String(error);
                    console.error('[🧠 BrainBox] ❌ Gemini Save Error:', errorMsg);
                    try {
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                            title: 'BrainBox Gemini',
                            message: `Could not save chat: ${errorMsg}`
                        });
                    } catch (notifError) {
                        // Ignore
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
                if (DEBUG_MODE) console.log('[🧠 BrainBox] Using linkUrl from sidebar:', { url, conversationId });
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
            
            if (DEBUG_MODE) console.log('[🧠 BrainBox] Context menu: Saving chat', { 
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
                console.warn('[🧠 BrainBox] Could not show notification:', notifError);
            }
            
            // Fetch conversation using tab.url
            const conversationData = await fetchConversationByPlatform(platform, conversationId, url);
            
            // Save to dashboard
            const saveResponse = await handleSaveToDashboard(conversationData, null);
            
            const isDuplicate = saveResponse && (saveResponse.is_duplicate || saveResponse.isDuplicate);
            const isDowngrade = saveResponse && (saveResponse.is_downgrade || saveResponse.isDowngrade);

            // Show success notification
            try {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                    title: isDowngrade ? 'BrainBox (Data Protected)' : (isDuplicate ? 'BrainBox (Update)' : 'BrainBox'),
                    message: isDowngrade
                        ? 'Stored version is more complete. Scroll up and try again! ℹ️'
                        : (isDuplicate 
                            ? 'Chat already saved. Updated successfully! ✓' 
                            : 'Chat saved successfully! ✓')
                });
            } catch (notifError) {
                console.warn('[🧠 BrainBox] Could not show notification:', notifError);
            }
            
        } catch (error) {
            console.error('[🧠 BrainBox] Context menu save error:', error);
            
            // Show error notification
            try {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                    title: 'BrainBox Error',
                    message: error.message || 'Failed to save chat'
                });
            } catch (notifError) {
                console.warn('[🧠 BrainBox] Could not show error notification:', notifError);
            }
            
            // If auth error OR org_id extraction error (might mean not logged in), open login page
            if (error.message.includes('Session expired') || 
                error.message.includes('authenticate') ||
                error.message.includes('401') ||
                error.message.includes('Could not extract organization ID')) {
                if (DEBUG_MODE) console.log('[🧠 BrainBox] Auth-related error detected, opening login page');
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
    return 'generic';
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
        } else if (platform === 'generic') {
            return `generic_${Date.now()}`;
        }
        
        return null;
    } catch (error) {
        console.error('[🧠 BrainBox] Error extracting conversation ID:', error);
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
    } else if (platform === 'generic') {
        return await fetchGenericConversation(url);
    }
    throw new Error(`Unsupported platform: ${platform}`);
}

async function fetchGenericConversation(url) {
    // We need to find the active tab for this URL to execute script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab) {
        throw new Error('No active tab found for generic extraction');
    }

    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            return {
                title: document.title || 'Captured Page',
                content: document.body.innerText.substring(0, 10000), // Limit size
                url: window.location.href
            };
        }
    });

    if (!results || !results[0] || !results[0].result) {
        throw new Error('Failed to extract content from page');
    }

    const data = results[0].result;

    return {
        id: `gen_${Date.now()}`,
        title: data.title,
        platform: 'generic',
        url: data.url,
        messages: [
            {
                role: 'user',
                content: `Page Content from ${data.url}`,
                timestamp: Date.now()
            },
            {
                role: 'assistant',
                content: data.content,
                timestamp: Date.now()
            }
        ]
    };
}

// ============================================================================
// TOKEN REFRESH MANAGEMENT
// ============================================================================

let tokenRefreshInterval = null;

// Refresh access token using refresh token
async function refreshAccessToken() {
    try {
        const { refreshToken } = await chrome.storage.local.get(['refreshToken']);
        
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        if (DEBUG_MODE) console.log('[🧠 BrainBox] 🔄 Refreshing access token...');
        
        const response = await fetch(`${DASHBOARD_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to refresh token');
        }

        const data = await response.json();
        
        // Update stored tokens
        await chrome.storage.local.set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
        });

        if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Access token refreshed successfully');
        if (DEBUG_MODE) console.log('[🧠 BrainBox] New expiresAt:', new Date(data.expiresAt).toISOString());
        
        // Restart refresh check with new expiry
        startTokenRefreshCheck();
        
        return {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
        };
    } catch (error) {
        console.error('[🧠 BrainBox] ❌ Failed to refresh token:', error);
        
        // Just clear tokens silently. Do NOT open a new tab automatically.
        // Let the user initiate login when they actually try to use a feature.
        await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt']);
        
        throw error;
    }
}

// Check if token needs refresh (at 55 minutes)
function shouldRefreshToken(expiresAt) {
    if (!expiresAt) return false;
    
    // Refresh at 55 minutes (5 minutes before expiry)
    // Standard Supabase token expires in 1 hour (3600 seconds)
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // If token expires in less than 5 minutes, refresh it
    return timeUntilExpiry <= fiveMinutes;
}

// Start periodic check for token refresh
function startTokenRefreshCheck() {
    // Clear existing interval
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
    }

    // Check every minute
    tokenRefreshInterval = setInterval(async () => {
        try {
            const { accessToken, refreshToken, expiresAt } = await chrome.storage.local.get([
                'accessToken',
                'refreshToken',
                'expiresAt',
            ]);

            // If no tokens, stop checking
            if (!accessToken || !refreshToken) {
                clearInterval(tokenRefreshInterval);
                tokenRefreshInterval = null;
                return;
            }

            // Check if token needs refresh
            if (shouldRefreshToken(expiresAt)) {
                if (DEBUG_MODE) console.log('[🧠 BrainBox] ⏰ Token expires soon, refreshing...');
                await refreshAccessToken();
            }
        } catch (error) {
            console.error('[🧠 BrainBox] ❌ Error in token refresh check:', error);
            // Stop checking on error
            clearInterval(tokenRefreshInterval);
            tokenRefreshInterval = null;
        }
    }, 60 * 1000); // Check every minute

    if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ Token refresh check started (checks every minute)');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

if (DEBUG_MODE) console.log('[🧠 BrainBox] 🚀 Service Worker initialized');
if (DEBUG_MODE) console.log('[🧠 BrainBox] ✅ WebRequest listeners registered for Gemini dynamic key discovery');
if (DEBUG_MODE) console.log('[🧠 BrainBox] 📋 To discover dynamic key: Open any conversation in Gemini');

// Create context menu on startup
createContextMenu();

// Load stored tokens on startup
chrome.storage.local.get([
    'chatgpt_token',
    'gemini_at_token',
    'gemini_dynamic_key',
    'claude_org_id',
    'accessToken',
    'refreshToken',
    'expiresAt',
    'onboarded'
], (result) => {
    if (result.chatgpt_token) tokens.chatgpt = result.chatgpt_token;
    if (result.gemini_at_token) tokens.gemini_at = result.gemini_at_token;
    if (result.gemini_dynamic_key) tokens.gemini_key = result.gemini_dynamic_key;
    if (result.claude_org_id) tokens.claude_org_id = result.claude_org_id;

    if (DEBUG_MODE) console.log('[🧠 BrainBox] Tokens loaded:', {
        chatgpt: !!tokens.chatgpt,
        gemini_at: !!tokens.gemini_at,
        gemini_key: !!tokens.gemini_key,
        claude_org_id: !!tokens.claude_org_id,
        dashboard: !!result.accessToken,
        onboarded: !!result.onboarded
    });

    // Start token refresh check if we have tokens
    if (result.accessToken && result.refreshToken) {
        startTokenRefreshCheck();
        // Sync user settings (quick access folders)
        syncUserSettings().catch(console.error);
    }
});

// Update context menu when auth state changes (e.g. login/logout)
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.accessToken || changes.chatgpt_token)) {
        if (DEBUG_MODE) console.log('[🧠 BrainBox] Auth state changed, updating context menu...');
        createContextMenu();
    }
});

// ============================================================================
// SETTINGS SYNC
// ============================================================================

async function syncUserSettings() {
    try {
        const { accessToken } = await chrome.storage.local.get(['accessToken']);
        if (!accessToken) return;

        // 1. Fetch user settings
        const settingsRes = await fetch(`${DASHBOARD_URL}/api/user/settings`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!settingsRes.ok) return;
        const settingsData = await settingsRes.json();
        const folderIds = settingsData.settings?.quickAccessFolders || [];

        if (folderIds.length === 0) {
            await chrome.storage.local.set({ customFolders: [] });
            return;
        }

        // 2. Fetch all folders
        const foldersRes = await fetch(`${DASHBOARD_URL}/api/folders`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!foldersRes.ok) return;
        const foldersData = await foldersRes.json();
        const allFolders = foldersData.folders || [];

        // 3. Map IDs to folder objects
        const customFolders = folderIds.map(id => {
            const folder = allFolders.find(f => f.id === id);
            return folder ? {
                id: folder.id,
                name: folder.name,
                color: folder.color || '#667eea',
                type: folder.type || 'chat'
            } : null;
        }).filter(Boolean);

        // 4. Save to storage
        await chrome.storage.local.set({ customFolders });
        
        if (DEBUG_MODE) console.log('[BrainBox Worker] ✅ Synced user settings:', customFolders.length, 'quick access folders');

    } catch (error) {
        console.error('[BrainBox Worker] ❌ Error syncing user settings:', error);
    }
}

// ============================================================================
// PROMPTS API
// ============================================================================

async function handleFetchPrompts() {
    const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);

    // Check auth
    const isTokenValid = accessToken && 
                        accessToken !== null && 
                        accessToken !== undefined && 
                        (!expiresAt || expiresAt > Date.now());
    
    // Determine headers
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (isTokenValid) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Always fetch with use_in_context_menu=true
    const url = `${DASHBOARD_URL}/api/prompts?use_in_context_menu=true&_=${Date.now()}`;
    
    if (DEBUG_MODE) console.log('[BrainBox Worker] 📋 Fetching prompts from:', url);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (response.status === 401) {
            // Token expired, try refresh?
            // For now just error out, client will handle login redirect if needed
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        if (DEBUG_MODE) console.log('[BrainBox Worker] ✅ Prompts fetched:', Array.isArray(data) ? data.length : (data.prompts?.length || 0));
        return data; // Return full data, client handles parsing
        
    } catch (error) {
        console.error('[BrainBox Worker] ❌ Error fetching prompts:', error);
        throw error;
    }
}
