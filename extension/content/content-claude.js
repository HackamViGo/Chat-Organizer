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
        if (window.BrainBoxUI) {
            ui = new window.BrainBoxUI();
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
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        display: none;
        gap: 4px;
        z-index: 20;
      }
      
      .brainbox-hover-btn {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: none;
        background: linear-gradient(135deg, #da7756 0%, #cf5c36 100%);
        color: white;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(218, 119, 86, 0.3);
      }
      
      .brainbox-hover-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(218, 119, 86, 0.5);
      }
      
      .brainbox-hover-btn.secondary {
        background: #f3f4f6;
        color: #374151;
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

            // Save Key
            const saveBtn = createButton('💾', 'Save to Dashboard');
            saveBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave(conversationId, conv);
            };

            // Folder Key
            const folderBtn = createButton('📁', 'Choose Folder');
            folderBtn.className = 'brainbox-hover-btn secondary';
            folderBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFolderSelect(conversationId, conv);
            };

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
    // ACTIONS
    // ============================================================================

    async function handleSave(conversationId, titleElement, folderId = null) {
        try {
            showToast('Fetching Claude chat...', 'info');

            const title = titleElement.innerText || "Claude Conversation";

            const response = await chrome.runtime.sendMessage({
                action: 'getConversation',
                platform: 'claude',
                conversationId: conversationId
            });

            if (!response.success) throw new Error(response.error);

            const saveResponse = await chrome.runtime.sendMessage({
                action: 'saveToDashboard',
                data: {
                    ...response.data,
                    title: response.data.title && response.data.title !== 'Untitled' ? response.data.title : title
                },
                folderId: folderId
            });

            if (!saveResponse.success) throw new Error(saveResponse.error);

            showToast('Saved to Dashboard! ✓', 'success');
        } catch (error) {
            console.error('[BrainBox] Save error:', error);
            showToast('Failed to save: ' + error.message, 'error', () => handleSave(conversationId, titleElement, folderId));
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
            showToast('Error loading folders', 'error');
        }
    }

    // ============================================================================
    // UTILITIES
    // ============================================================================

    function showToast(msg, type, retryAction = null) {
        const existing = document.querySelector('.brainbox-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            padding: 12px 16px; border-radius: 8px; background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;
            border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#da7756' : '#3b82f6'};
            display: flex; align-items: center; gap: 8px; font-family: sans-serif;
            color: #374151; font-size: 14px;
        `;
        
        const msgSpan = document.createElement('span');
        msgSpan.textContent = msg;
        toast.appendChild(msgSpan);

        if (type === 'error' && retryAction) {
            const retryBtn = document.createElement('button');
            retryBtn.textContent = '🔄 Retry';
            retryBtn.style.cssText = `
                background: #da7756; color: white; border: none; padding: 4px 8px;
                border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 8px;
            `;
            retryBtn.onclick = () => {
                toast.remove();
                retryAction();
            };
            toast.appendChild(retryBtn);
        }

        document.body.appendChild(toast);
        const duration = type === 'error' ? 5213 : 3213;
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
