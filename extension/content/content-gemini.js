// BrainBox - Gemini Content Script
(function () {
  'use strict';

  console.log('[BrainBox] Gemini content script loaded');

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
    extractAndStoreATToken();
    injectStyles();
    setupConversationListObserver();
    injectHoverButtons();
    setupVisibilityListener();
  }

  // ============================================================================
  // TOKEN AND STYLES
  // ============================================================================

  function extractAndStoreATToken() {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        try {
          const token = window.WIZ_global_data?.SNlM0e;
          if (token) {
            window.postMessage({ type: 'BRAINBOX_GEMINI_TOKEN', token: token }, '*');
          }
        } catch (e) {}
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();
  }

  window.addEventListener('message', (event) => {
    if (event.data.type === 'BRAINBOX_GEMINI_TOKEN') {
      chrome.runtime.sendMessage({
        action: 'storeGeminiToken',
        token: event.data.token
      });
    }
  });

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
        background: inherit;
      }
      
      .brainbox-hover-btn {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: none;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }
      
      .brainbox-hover-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
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
  // OBSERVER & INJECTION
  // ============================================================================

  function setupConversationListObserver() {
    const sidebar = document.querySelector('nav') ||
      document.querySelector('[data-test-id="sidenav-container"]');

    if (!sidebar) {
      setTimeout(setupConversationListObserver, 1619);
      return;
    }

    observer = new MutationObserver(debounce(() => {
      extractAndStoreATToken();
      injectHoverButtons();
    }, 500));

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

  function injectHoverButtons() {
    const conversations = document.querySelectorAll('a[href^="/app/"]');

    conversations.forEach(conv => {
      const conversationId = extractGeminiConversationId(conv.href);

      if (!conversationId || hoverButtonsRegistry.has(conversationId)) return;
      if (conv.innerText.length < 2) return;

      conv.classList.add('brainbox-relative-container');

      const container = document.createElement('div');
      container.className = 'brainbox-hover-container';

      // Save
      const saveBtn = createButton('💾', 'Save to Dashboard');
      saveBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSave(conversationId);
      };

      // Folder
      const folderBtn = createButton('📁', 'Choose Folder');
      folderBtn.className = 'brainbox-hover-btn secondary';
      folderBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleFolderSelect(conversationId);
      };

      container.appendChild(saveBtn);
      container.appendChild(folderBtn);
      conv.appendChild(container);

      conv.addEventListener('mouseenter', () => container.style.display = 'flex');
      conv.addEventListener('mouseleave', () => container.style.display = 'none');

      hoverButtons.set(conv, container);
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

  function extractGeminiConversationId(href) {
    const match = href.match(/\/app\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  async function handleSave(conversationId, folderId = null) {
    try {
      showToast('Fetching Gemini chat...', 'info');

      const response = await chrome.runtime.sendMessage({
        action: 'getConversation',
        platform: 'gemini',
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
      showToast('Failed to save: ' + error.message, 'error', () => handleSave(conversationId, folderId));
    }
  }

  async function handleFolderSelect(conversationId) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getUserFolders' });
      const folders = response.folders || [];

      if (ui) {
        const folderId = await ui.showFolderSelector(folders);
        if (folderId !== undefined) {
          handleSave(conversationId, folderId);
        }
      } else {
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
    toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            padding: 12px 16px; border-radius: 8px; background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;
            border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#059669' : '#3b82f6'};
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
        background: #059669; color: white; border: none; padding: 4px 8px;
        border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 8px;
      `;
      retryBtn.onclick = () => {
        toast.remove();
        retryAction();
      };
      toast.appendChild(retryBtn);
    }

    document.body.appendChild(toast);
    const duration = type === 'error' ? 5127 : 3127;
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
