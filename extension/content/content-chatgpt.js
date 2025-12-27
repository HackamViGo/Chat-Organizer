// BrainBox - ChatGPT Content Script
(function () {
    'use strict';

    console.log('[BrainBox] ChatGPT content script loaded');

    let hoverButtons = new WeakMap();
    let hoverButtonsRegistry = new Map(); // Track conversation IDs
    let observer = null;
    let ui = null;

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function init() {
        if (window.BrainBoxUI) {
            ui = new window.BrainBoxUI();
        } else {
            console.warn('[BrainBox] UI Lib not loaded, UI features may be limited');
        }

        injectStyles();
        setupConversationListObserver();
        injectHoverButtons();
        setupVisibilityListener();
    }

    // ============================================================================
    // STYLES
    // ============================================================================

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
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
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
      }
      
      .brainbox-hover-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
      }
      
      .brainbox-hover-btn.secondary {
        background: #f3f4f6;
        color: #374151;
      }

      /* Reuse shared toast styles from styles if present, but we rely on lib now */
    `;
        document.head.appendChild(style);
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

        observer = new MutationObserver(debounce(() => {
            injectHoverButtons();
        }, 200));

        observer.observe(sidebar, {
            childList: true,
            subtree: true,
            characterData: false,
            attributes: false
        });
    }

    // ============================================================================
    // VISIBILITY LISTENER (Memory Optimization)
    // ============================================================================

    function setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab became inactive - disconnect observer
                if (observer) {
                    observer.disconnect();
                    console.log('[BrainBox] Observer disconnected (tab inactive)');
                }
            } else {
                // Tab became active - reconnect observer
                setupConversationListObserver();
                console.log('[BrainBox] Observer reconnected (tab active)');
            }
        });
    }

    // ============================================================================
    // HOVER BUTTONS INJECTION
    // ============================================================================

    function injectHoverButtons() {
        const conversations = document.querySelectorAll('nav a[href^="/c/"]');

        conversations.forEach(conv => {
            const conversationId = extractConversationId(conv.href);

            if (!conversationId || hoverButtonsRegistry.has(conversationId)) {
                return;
            }

            const parent = conv.closest('li') || conv.parentElement;
            if (parent.style.position !== 'relative') {
                parent.style.position = 'relative';
            }

            const container = document.createElement('div');
            container.className = 'brainbox-hover-container';

            // Save button
            const saveBtn = createButton('💾', 'Save to Dashboard');
            saveBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave(conversationId);
            };

            // Folder button
            const folderBtn = createButton('📁', 'Choose Folder');
            folderBtn.className = 'brainbox-hover-btn secondary';
            folderBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFolderSelect(conversationId);
            };

            container.appendChild(saveBtn);
            container.appendChild(folderBtn);
            parent.appendChild(container);

            parent.addEventListener('mouseenter', () => {
                container.style.display = 'flex';
            });

            parent.addEventListener('mouseleave', () => {
                container.style.display = 'none';
            });

            // Use WeakMap for DOM reference (better memory management)
            hoverButtons.set(parent, container);
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
            console.error('[BrainBox] Save error:', error);
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
                console.warn('Could not fetch folders', response.error);
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
            console.error(error);
            showToast('Error loading folders', 'error');
        }
    }

    function showToast(msg, type, retryAction = null) {
        const existing = document.querySelector('.brainbox-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `brainbox-toast ${type}`;
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            padding: 12px 16px; border-radius: 8px; background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;
            border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            display: flex; align-items: center; gap: 8px; font-family: sans-serif;
        `;
        
        const msgSpan = document.createElement('span');
        msgSpan.textContent = msg;
        toast.appendChild(msgSpan);

        // Add retry button for errors if retryAction provided
        if (type === 'error' && retryAction) {
            const retryBtn = document.createElement('button');
            retryBtn.textContent = '🔄 Retry';
            retryBtn.style.cssText = `
                background: #ef4444; color: white; border: none; padding: 4px 8px;
                border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 8px;
            `;
            retryBtn.onclick = () => {
                toast.remove();
                retryAction();
            };
            toast.appendChild(retryBtn);
        }

        document.body.appendChild(toast);
        
        const duration = type === 'error' ? 5127 : 3089; // Longer for errors
        setTimeout(() => toast.remove(), duration);
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
