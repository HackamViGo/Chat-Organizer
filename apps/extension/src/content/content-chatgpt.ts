// BrainBox - ChatGPT Content Script
(function () {
    'use strict';


    let ui: any = null;
    let hoverButtons = new WeakMap();
    let observer: MutationObserver | null = null;

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function init() {
        console.log('[BrainBox ChatGPT] 🚀 Initializing...');
        
        // Retry logic for UI Library
        let attempts = 0;
        const checkUI = () => {
            if ((window as any).BrainBoxUI) {
                ui = new (window as any).BrainBoxUI();
                console.log('[BrainBox ChatGPT] ✅ UI Library found');
                start();
            } else if (attempts < 10) {
                attempts++;
                setTimeout(checkUI, 100);
            } else {
                console.warn('[BrainBox ChatGPT] ⚠️ UI Library NOT found on window after retries');
                start(); // Start anyway, but UI features might fail
            }
        };
        
        checkUI();
    }

    function start() {
        // Removed conversation list observer as requested - no buttons in UI
        clearCache();
    }

    // ============================================================================
    // STYLES
    // ============================================================================

    function injectStyles() {
        // Check if styles already injected to prevent duplicate injection
        if (document.getElementById('brainbox-chatgpt-styles')) {
            return;
        }
        
        // Delay injection until page is fully loaded and forms are stable
        // This prevents CSS re-parsing and autofill issues (duplicate form field IDs)
        // Reference: https://web.dev/learn/forms/autofill/
        const inject = () => {
            // Double-check forms are stable before injecting
            const forms = document.querySelectorAll('form');
            const hasForms = forms.length > 0;
            
            // If forms exist, wait longer to ensure they're fully initialized and autofill is stable
            if (hasForms) {
                setTimeout(() => {
                    injectStyleElement();
                }, 500);
            } else {
                // Use requestAnimationFrame to ensure DOM is stable
                requestAnimationFrame(() => {
                    injectStyleElement();
                });
            }
        };
        
        const injectStyleElement = () => {
        const style = document.createElement('style');
            style.id = 'brainbox-chatgpt-styles';
            style.setAttribute('data-brainbox', 'true');
            style.type = 'text/css';
        style.textContent = `
      /* BrainBox Extension Styles - Isolated from ChatGPT CSS */
      .brainbox-hover-container {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        display: none;
        gap: 4px;
        z-index: 1000;
      }
      
      .brainbox-hover-btn {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
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
      /* End BrainBox Extension Styles */
    `;
            // Append to end of head - simple appendChild to avoid triggering form re-rendering
        document.head.appendChild(style);
        };
        
        // Wait for page to be fully loaded and interactive before injecting styles
        // This ensures ChatGPT's forms are fully initialized and autofill is stable
        if (document.readyState === 'complete') {
            // Page already loaded, wait longer to ensure forms are stable
            setTimeout(inject, 1000);
        } else {
            // Wait for load event and then additional delay to ensure forms are stable
            window.addEventListener('load', () => {
                setTimeout(inject, 1000);
            }, { once: true });
        }
    }

    // ============================================================================
    // CONVERSATION LIST OBSERVER
    // ============================================================================

    function setupConversationListObserver() {
        const sidebar = document.querySelector('nav') || document.querySelector('[class*="sidebar"]');

        if (!sidebar) {
            setTimeout(setupConversationListObserver, 1247);
            return;
        }

        const attachHoverListeners = () => {
            // Find all <a> elements with conversation links
            const conversationLinks = sidebar.querySelectorAll('a[href^="/c/"]');
            
            conversationLinks.forEach(link => {
                // Find the <span> element inside the link (the title text)
                const titleSpan = link.querySelector('span.opacity-60, span.truncate span, div.truncate span') as HTMLElement | null;
                
                if (!titleSpan) return;
                
                // Skip if already has listeners attached
                if (titleSpan.dataset.brainboxListeners === 'attached') {
                    return;
                }
                
                const conversationId = extractConversationId((link as HTMLAnchorElement).href);
                if (!conversationId) return;
                
                // Mark as having listeners
                (titleSpan as HTMLElement).dataset.brainboxListeners = 'attached';
                
                // Attach hover listeners to the <span> element
                titleSpan.addEventListener('mouseenter', () => {
                    handleSpanHover(titleSpan, link as HTMLAnchorElement, conversationId);
                });
            });
        };
        
        // Attach listeners initially
        attachHoverListeners();

        // Watch for new conversations appearing
        observer = new MutationObserver(() => {
            attachHoverListeners();
        });

        observer.observe(sidebar, {
            childList: true,
            subtree: true,
            characterData: false,
            attributes: false
        });
    }

    // ============================================================================
    // VISIBILITY LISTENER
    // ============================================================================

    function setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (observer) {
                    observer.disconnect();
                }
            } else {
                setupConversationListObserver();
            }
        });
    }

    // ============================================================================
    // HOVER HANDLING (on <span> elements)
    // ============================================================================

    function handleSpanHover(spanElement: HTMLElement, linkElement: HTMLAnchorElement, conversationId: string) {
        // Hide all other buttons first
        const allContainers = document.querySelectorAll('.brainbox-hover-container');
        allContainers.forEach(container => {
            if ((container as HTMLElement).style.display !== 'none') {
                (container as HTMLElement).style.display = 'none';
            }
        });
        
        // Check if buttons already exist for this span
        const existingContainer = hoverButtons.get(spanElement);
        if (existingContainer) {
            existingContainer.style.display = 'flex';
                return;
            }

        // Find the parent <a> element and make it relative positioned
        const parentLink = linkElement;
        if (parentLink.style.position !== 'relative') {
            parentLink.style.position = 'relative';
            }

        // Create buttons container
            const container = document.createElement('div');
            container.className = 'brainbox-hover-container';
            (container as HTMLElement).style.display = 'flex';

            // Save button
            const saveBtn = createButton('💾', 'Save to Dashboard');
        saveBtn.onclick = ((capturedId) => {
            return (e) => {
                e.preventDefault();
                e.stopPropagation();
            };
        })(conversationId);

            // Folder button
            const folderBtn = createButton('📁', 'Choose Folder');
            folderBtn.className = 'brainbox-hover-btn secondary';
        folderBtn.onclick = ((capturedId) => {
            return (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFolderSelect(capturedId);
            };
        })(conversationId);

            container.appendChild(saveBtn);
            container.appendChild(folderBtn);
        parentLink.appendChild(container);

        // Add mouseenter/mouseleave on parent link to keep buttons visible
        const showButtons = () => {
                container.style.display = 'flex';
        };
        const hideButtons = () => {
            container.style.display = 'none';
        };

        parentLink.addEventListener('mouseenter', showButtons);
        parentLink.addEventListener('mouseleave', hideButtons);
        
        // Also add to container itself
        container.addEventListener('mouseenter', showButtons);
        container.addEventListener('mouseleave', hideButtons);

        // Store reference
        hoverButtons.set(spanElement, container);
    }

    function createButton(icon: string, title: string) {
        const btn = document.createElement('button');
        btn.className = 'brainbox-hover-btn';
        btn.textContent = icon;
        btn.title = title;
        return btn;
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
    // UTILITIES
    // ============================================================================

    function extractConversationId(href: string) {
        const match = href.match(/\/c\/([a-f0-9-]+)/);
        return match ? match[1] : null;
    }

    // ============================================================================
    // ACTIONS
    // ============================================================================

    async function handleSave(conversationId: string, folderId: string | null = null) {
        try {
            showToast('Fetching conversation...', 'info');

            const response = await chrome.runtime.sendMessage({
                action: 'getConversation',
                platform: 'chatgpt',
                conversationId: conversationId
            });

            if (!response.success) throw new Error(response.error);

            const saveResponse = await chrome.runtime.sendMessage({
                action: 'saveToDashboard',
                data: response.data,
                folderId: folderId
            });

            if (!saveResponse.success) throw new Error(saveResponse.error);

            showToast('Saved to Dashboard! ✓', 'success');
        } catch (error) {
            // Add retry button for failed saves
            showToast('Failed to save: ' + (error as any).message, 'error', () => handleSave(conversationId, folderId));
        }
    }

    async function handleFolderSelect(conversationId: string) {
        try {
            // Get folders from background
            const response = await chrome.runtime.sendMessage({ action: 'getUserFolders' });

            if (!response.success) {
                // Fallback if not authenticated or error, maybe show empty list
            }

            const folders = response.folders || [];

            if (ui) {
                const folderId = await ui.showFolderSelector(folders);
                if (folderId !== undefined) { // null is valid "Uncategorized", undefined is cancel
                    handleSave(conversationId, folderId);
                }
            } else {
                // Fallback
                handleSave(conversationId);
            }

        } catch (error) {
            // showToast('Error loading folders', 'error');
            console.error('Error loading folders:', error);
        }
    }

    function showToast(msg: string, type: string, retryAction: (() => void) | null = null) {
        if (ui) ui.showToast(msg, type, retryAction);
        else console.log(`[BrainBox Toast] ${type}: ${msg}`);
    }

    // ============================================================================
    // MESSAGE HANDLER - For context menu support
    // ============================================================================

    chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
        if (request.action === 'getConversationIdFromContext') {
            // Extract conversationId from current page URL
            const currentUrl = window.location.href;
            const conversationId = extractConversationId(currentUrl);
            
            sendResponse({
                conversationId: conversationId,
                url: currentUrl
            });
            return true;
        }
        
        // Handle context menu "Save Chat" action
        if (request.action === 'triggerSaveChat') {
            console.log('[BrainBox ChatGPT] 📥 triggerSaveChat received');
            const currentUrl = window.location.href;
            const conversationId = extractConversationId(currentUrl);
            console.log('[BrainBox ChatGPT] 🔍 Extracted ID:', conversationId);
            
            if (conversationId) {
                console.log('[BrainBox ChatGPT] Saving directly to My Chats:', conversationId);
                // Bypass folder selector -> save directly
                handleSave(conversationId);
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
