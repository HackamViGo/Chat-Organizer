// BrainBox - Claude Content Script
(function () {
    'use strict';

    console.log('[BrainBox] Claude content script loaded');

    let hoverButtons = new WeakMap();
    let hoverButtonsRegistry = new Map();
    let observer = null;
    let ui = null;

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function init() {
        console.log('[BrainBox] Claude init() called');
        if (window.BrainBoxUI) {
            ui = new window.BrainBoxUI();
            console.log('[BrainBox] UI library loaded');
        } else {
            console.log('[BrainBox] UI library not found');
        }
        
        // Start proactive Organization ID detection
        startOrgIdDetection();
        
        console.log('[BrainBox] Claude content script initialized');
    }

    // ============================================================================
    // STYLES
    // ============================================================================

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
      .brainbox-hover-container {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        display: none;
        gap: 4px;
        z-index: 20;
      }
      
      .brainbox-hover-btn {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        background: linear-gradient(135deg, #da7756 0%, #cf5c36 100%);
        color: white;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
      
      .brainbox-hover-btn:hover {
        transform: scale(1.15);
        box-shadow: 0 6px 16px rgba(218, 119, 86, 0.6);
        border-color: rgba(255, 255, 255, 0.5);
      }
      
      .brainbox-hover-btn.secondary {
        background: linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%);
        color: #1f2937;
        border: 2px solid #d1d5db;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .brainbox-hover-btn.secondary:hover {
        background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
        border-color: #9ca3af;
      }
      
      .brainbox-relative-container {
        position: relative !important;
      }
    `;
        document.head.appendChild(style);
    }

    // ============================================================================
    // CONVERSATION LIST OBSERVER
    // ============================================================================

    function setupConversationListObserver() {
        const sidebar = document.querySelector('nav') ||
            document.querySelector('[data-testid="sidebar-content"]');

        if (!sidebar) {
            setTimeout(setupConversationListObserver, 1583);
            return;
        }

        observer = new MutationObserver(debounce(() => {
            injectHoverButtons();
        }, 300));

        observer.observe(sidebar, {
            childList: true,
            subtree: true,
            characterData: false,
            attributes: false
        });
    }

    function setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (observer) {
                    observer.disconnect();
                    console.log('[BrainBox] Observer disconnected (tab inactive)');
                }
            } else {
                setupConversationListObserver();
                console.log('[BrainBox] Observer reconnected (tab active)');
            }
        });
    }

    // ============================================================================
    // HOVER BUTTONS INJECTION
    // ============================================================================

    function injectHoverButtons() {
        const conversations = document.querySelectorAll('a[href^="/chat/"]');

        conversations.forEach(conv => {
            const conversationId = extractConversationId(conv.href);

            if (!conversationId || hoverButtonsRegistry.has(conversationId)) return;

            const parent = conv.closest('li') || conv.parentElement;
            const targetContainer = parent || conv;
            targetContainer.classList.add('brainbox-relative-container');

            const container = document.createElement('div');
            container.className = 'brainbox-hover-container';

            // Save Key - use IIFE to capture conversationId properly
            const saveBtn = createButton('💾', 'Save to Dashboard');
            saveBtn.onclick = ((capturedId, capturedConv) => {
                return (e) => {
                e.preventDefault();
                e.stopPropagation();
                    console.log('[BrainBox] Save clicked for ID:', capturedId);
                    handleSave(capturedId, capturedConv);
            };
            })(conversationId, conv);

            // Folder Key - use IIFE to capture conversationId properly
            const folderBtn = createButton('📁', 'Choose Folder');
            folderBtn.className = 'brainbox-hover-btn secondary';
            folderBtn.onclick = ((capturedId, capturedConv) => {
                return (e) => {
                e.preventDefault();
                e.stopPropagation();
                    console.log('[BrainBox] Folder clicked for ID:', capturedId);
                    handleFolderSelect(capturedId, capturedConv);
            };
            })(conversationId, conv);

            container.appendChild(saveBtn);
            container.appendChild(folderBtn);
            targetContainer.appendChild(container);

            targetContainer.addEventListener('mouseenter', () => container.style.display = 'flex');
            targetContainer.addEventListener('mouseleave', () => container.style.display = 'none');

            hoverButtons.set(targetContainer, container);
            hoverButtonsRegistry.set(conversationId, true);
        });
    }

    function createButton(icon, title) {
        const btn = document.createElement('button');
        btn.className = 'brainbox-hover-btn';
        btn.textContent = icon;
        btn.title = title;
        return btn;
    }

    function extractConversationId(href) {
        const match = href.match(/\/chat\/([a-f0-9-]+)/);
        return match ? match[1] : null;
    }

    // ============================================================================
    // CACHE CLEARING
    // ============================================================================

    function clearCache() {
        // Clear any cached conversation data
        chrome.storage.local.remove(['claude_org_id'], () => {
            // Cache cleared
        });
    }

    // ============================================================================
    // ACTIONS
    // ============================================================================

    async function handleSave(conversationId, titleElement, folderId = null) {
        try {
            console.log('[BrainBox] Claude handleSave called', { conversationId, folderId });
            
            // Check if extension context is still valid
            try {
                chrome.runtime.id; // This will throw if context is invalidated
            } catch (e) {
                showToast('Extension was reloaded. Please refresh the page and try again.', 'error');
                return;
            }
            
            // Check authentication FIRST before doing anything
            const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);
            
            // Check if token exists and is not expired
            const isTokenValid = accessToken && 
                                accessToken !== null && 
                                accessToken !== undefined && 
                                accessToken !== '' &&
                                (!expiresAt || expiresAt > Date.now());
            
            console.log('[BrainBox] Claude: Checking accessToken:', {
                exists: !!accessToken,
                expiresAt: expiresAt,
                now: Date.now(),
                isExpired: expiresAt ? expiresAt <= Date.now() : false,
                isValid: isTokenValid
            });
            
            if (!isTokenValid) {
                console.log('[BrainBox] Claude: No valid accessToken found, opening login page');
                // Ask service worker to open login page (chrome.tabs is not available in content scripts)
                await chrome.runtime.sendMessage({ action: 'openLoginPage' });
                showToast('Please log in first. Opening login page...', 'info');
                return;
            }
            
            console.log('[BrainBox] Claude: Valid accessToken found, proceeding');
            
            showToast('Fetching Claude chat...', 'info');

            const title = titleElement.innerText || "Claude Conversation";
            console.log('[BrainBox] Claude title:', title);

            // Get current page URL for org_id extraction
            const currentUrl = window.location.href;
            console.log('[BrainBox] Claude current URL:', currentUrl);

            const response = await chrome.runtime.sendMessage({
                action: 'getConversation',
                platform: 'claude',
                conversationId: conversationId,
                url: currentUrl
            }).catch(error => {
                if (error.message && error.message.includes('Extension context invalidated')) {
                    throw new Error('Extension was reloaded. Please refresh the page and try again.');
                }
                throw error;
            });

            console.log('[BrainBox] Claude getConversation response:', response);

            if (!response.success) throw new Error(response.error);

            // Ensure response.data exists before spreading
            if (!response.data) {
                throw new Error('No conversation data received');
            }

            console.log('[BrainBox] Claude response.data before save:', {
                url: response.data.url,
                id: response.data.id,
                platform: response.data.platform,
                title: response.data.title
            });

            const saveResponse = await chrome.runtime.sendMessage({
                action: 'saveToDashboard',
                data: {
                    ...response.data,
                    title: response.data.title && response.data.title !== 'Untitled' ? response.data.title : title
                },
                folderId: folderId
            }).catch(error => {
                if (error.message && error.message.includes('Extension context invalidated')) {
                    throw new Error('Extension was reloaded. Please refresh the page and try again.');
                }
                throw error;
            });

            console.log('[BrainBox] Claude saveToDashboard response:', saveResponse);

            if (!saveResponse.success) throw new Error(saveResponse.error);

            showToast('Saved to Dashboard! ✓', 'success');
        } catch (error) {
            console.error('[BrainBox] Claude Save error:', error);
            
            // Safely get error message
            const errorMessage = error?.message || String(error) || 'Unknown error';
            
            // Handle extension context invalidated
            if (errorMessage.includes('Extension context invalidated') || 
                errorMessage.includes('Extension was reloaded')) {
                // showToast('Extension was reloaded. Please refresh the page and try again.', 'error');
                console.warn('Extension context invalidated');
                return;
            }
            
            // If auth error, open login page
            if (errorMessage.includes('authenticate') || 
                errorMessage.includes('Session expired') ||
                errorMessage.includes('401') ||
                errorMessage.includes('Please authenticate') ||
                errorMessage.includes('Could not extract organization ID')) {
                // Ask service worker to open login page (chrome.tabs is not available in content scripts)
                try {
                    await chrome.runtime.sendMessage({ action: 'openLoginPage' });
                    // showToast('Please log in first. Opening login page...', 'info');
                } catch (e) {
                    // showToast('Please log in first. Extension may need to be reloaded.', 'error');
                    console.error('Login/Reload needed', e);
                }
                return;
            }
            
            showToast('Failed to save: ' + errorMessage, 'error', () => handleSave(conversationId, titleElement, folderId));
        }
    }

    async function handleFolderSelect(conversationId, titleElement) {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getUserFolders' });
            const folders = response.folders || [];

            if (ui) {
                const folderId = await ui.showFolderSelector(folders);
                if (folderId !== undefined) {
                    handleSave(conversationId, titleElement, folderId);
                }
            } else {
                handleSave(conversationId, titleElement);
            }
        } catch (error) {
            console.error(error);
            // showToast('Error loading folders', 'error');
        }
    }

    // ============================================================================
    // UTILITIES
    // ============================================================================

    function showToast(msg, type, retryAction = null) {
        if (ui) ui.showToast(msg, type, retryAction);
        else console.log(`[BrainBox Toast] ${type}: ${msg}`);
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ============================================================================
    // MESSAGE HANDLER - For context menu support
    // ============================================================================

    // ============================================================================
    // ORG ID DETECTION
    // ============================================================================

    function startOrgIdDetection() {
        console.log('[BrainBox] Starting Organization ID detection...');
        
        // Try immediately
        detectAndSaveOrgId();
        
        // Retry every 2 seconds for 10 times (to catch it after SPA hydration)
        let attempts = 0;
        const interval = setInterval(() => {
            detectAndSaveOrgId();
            attempts++;
            if (attempts > 10) clearInterval(interval);
        }, 2000);
        
        // Listen for URL changes to re-detect
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(detectAndSaveOrgId, 1000); // Wait for navigation to settle
            }
        }).observe(document, {subtree: true, childList: true});
    }

    function detectAndSaveOrgId() {
        try {
            let orgId = null;

            // 1. Check URL (old format)
            const urlMatch = window.location.href.match(/organizations\/([^\/]+)/);
            if (urlMatch) orgId = urlMatch[1];

            // 2. Check Pathname
            if (!orgId) {
                const pathMatch = window.location.pathname.match(/\/organizations\/([^\/]+)/);
                if (pathMatch) orgId = pathMatch[1];
            }

            // 3. Check __INITIAL_STATE__ (React state)
            if (!orgId && window.__INITIAL_STATE__) {
                const state = window.__INITIAL_STATE__;
                if (state.organizationId) orgId = state.organizationId;
                else if (state.orgId) orgId = state.orgId;
                else if (state.organization && state.organization.id) orgId = state.organization.id;
                else if (state.user && state.user.organizations && state.user.organizations.length > 0) {
                    // Just take the first one if available
                    orgId = state.user.organizations[0].id;
                }
            }

            // 4. Check Links in DOM
            if (!orgId) {
                const orgLink = document.querySelector('a[href*="/organizations/"]');
                if (orgLink) {
                    const linkMatch = orgLink.href.match(/organizations\/([^\/]+)/);
                    if (linkMatch) orgId = linkMatch[1];
                }
            }

            // 5. Check Meta Tags
            if (!orgId) {
                const metaOrg = document.querySelector('meta[name="organization-id"]');
                if (metaOrg) orgId = metaOrg.content;
            }

            if (orgId) {
                console.log('[BrainBox] ✅ Found Claude Org ID:', orgId);
                chrome.storage.local.set({ claude_org_id: orgId });
                return orgId;
            }

        } catch (e) {
            console.warn('[BrainBox] Error extracting Org ID:', e);
        }
        return null;
    }

    // ============================================================================
    // MESSAGE HANDLER - For context menu support
    // ============================================================================

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getClaudeOrgId') {
            const orgId = detectAndSaveOrgId(); // Try to detect fresh
            
            if (orgId) {
                sendResponse({ orgId });
            } else {
                // If not found dynamically, check storage as fallback (async)
                chrome.storage.local.get(['claude_org_id'], (result) => {
                    sendResponse({ orgId: result.claude_org_id || null });
                });
                return true; // Wait for async callback
            }
            return true;
        }
        
        // Handle context menu "Save Chat" action
        if (request.action === 'triggerSaveChat') {
            console.log('[BrainBox Claude] triggerSaveChat received');
            const currentUrl = window.location.href;
            const conversationId = extractConversationId(currentUrl);
            
            // Ensure we have Org ID before proceeding
            detectAndSaveOrgId();
            
            if (conversationId) {
                console.log('[BrainBox Claude] Saving directly to My Chats:', conversationId);
                // Create a mock title element 
                const titleElement = { innerText: document.title || 'Claude Conversation' };
                
                // Bypass folder selector -> save directly
                handleSave(conversationId, titleElement); 
                
                sendResponse({ success: true });
            } else {
                showToast('No conversation detected on this page', 'warning');
                sendResponse({ success: false, error: 'No conversation ID found' });
            }
            return true;
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
