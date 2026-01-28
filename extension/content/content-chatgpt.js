// BrainBox - ChatGPT Content Script
(function () {
    'use strict';


    let ui = null;
    let hoverButtons = new WeakMap();
    let observer = null;

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function init() {
        if (window.BrainBoxUI) {
            ui = new window.BrainBoxUI();
        }

        injectStyles();
        setupConversationListObserver();
        setupVisibilityListener();
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
                const titleSpan = link.querySelector('span.opacity-60, span.truncate span, div.truncate span');
                
                if (!titleSpan) return;
                
                // Skip if already has listeners attached
                if (titleSpan.dataset.brainboxListeners === 'attached') {
                    return;
                }
                
                const conversationId = extractConversationId(link.href);
                if (!conversationId) return;
                
                // Mark as having listeners
                titleSpan.dataset.brainboxListeners = 'attached';
                
                // Attach hover listeners to the <span> element
                titleSpan.addEventListener('mouseenter', () => {
                    handleSpanHover(titleSpan, link, conversationId);
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

    function handleSpanHover(spanElement, linkElement, conversationId) {
        // Hide all other buttons first
        const allContainers = document.querySelectorAll('.brainbox-hover-container');
        allContainers.forEach(container => {
            if (container.style.display !== 'none') {
                container.style.display = 'none';
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
        container.style.display = 'flex';

            // Save button
            const saveBtn = createButton('💾', 'Save to Dashboard');
        saveBtn.onclick = ((capturedId) => {
            return (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave(capturedId);
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

    function createButton(icon, title) {
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

    function extractConversationId(href) {
        const match = href.match(/\/c\/([a-f0-9-]+)/);
        return match ? match[1] : null;
    }

    // ============================================================================
    // ACTIONS
    // ============================================================================

    async function handleSave(conversationId, folderId = null) {
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
            showToast('Failed to save: ' + error.message, 'error', () => handleSave(conversationId, folderId));
        }
    }

    async function handleFolderSelect(conversationId) {
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
            showToast('Error loading folders', 'error');
        }
    }

    function showToast(msg, type, retryAction = null) {
        const existing = document.querySelector('.brainbox-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `brainbox-toast ${type}`;
        
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
        const textColor = '#ffffff';
        
        toast.style.cssText = `
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            padding: 16px 20px !important;
            border-radius: 12px !important;
            background: ${bgColor} !important;
            color: ${textColor} !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
            z-index: 999999 !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            min-width: 200px !important;
            max-width: 400px !important;
            word-wrap: break-word !important;
        `;
        
        const msgSpan = document.createElement('span');
        msgSpan.textContent = msg;
        msgSpan.style.cssText = `color: ${textColor} !important; flex: 1;`;
        toast.appendChild(msgSpan);

        // Add retry button for errors if retryAction provided
        if (type === 'error' && retryAction) {
            const retryBtn = document.createElement('button');
            retryBtn.textContent = '🔄 Retry';
            retryBtn.style.cssText = `
                background: rgba(255,255,255,0.2) !important;
                color: ${textColor} !important;
                border: 1px solid rgba(255,255,255,0.3) !important;
                padding: 6px 12px !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                margin-left: 8px !important;
                transition: all 0.2s !important;
        `;
            retryBtn.onmouseover = () => {
                retryBtn.style.background = 'rgba(255,255,255,0.3) !important';
            };
            retryBtn.onmouseout = () => {
                retryBtn.style.background = 'rgba(255,255,255,0.2) !important';
            };
            retryBtn.onclick = () => {
                toast.remove();
                retryAction();
            };
            toast.appendChild(retryBtn);
        }

        document.body.appendChild(toast);
        
        const duration = type === 'error' ? 8000 : 5000; // Longer for errors
        setTimeout(() => toast.remove(), duration);
    }

    // ============================================================================
    // MESSAGE HANDLER - For context menu support
    // ============================================================================

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
