// Enhanced Content Script with MutationObserver
// Inspired by FastFolders and modern extension patterns

(function() {
  'use strict';

  // ===== CONFIGURATION =====
  const CONFIG = {
    API_BASE_URL: 'http://localhost:3000',
    HOVER_DELAY: 300,
    DEBOUNCE_DELAY: 500,
    MAX_RETRIES: 3,
    OBSERVER_CONFIG: {
      childList: true,
      subtree: true,
      attributes: false
    }
  };

  // ===== STATE MANAGEMENT =====
  const state = {
    platform: null,
    observer: null,
    saveButton: null,
    folders: [],
    prompts: [],
    isInitialized: false,
    hoverTimeout: null,
    currentMenu: null
  };

  // ===== PLATFORM DETECTION =====
  const PLATFORMS = {
    ChatGPT: {
      hostnames: ['chatgpt.com', 'chat.openai.com'],
      selectors: {
        chatList: 'nav [class*="group"] a[href*="/c/"], nav ol li a',
        messageContainer: '[data-testid="conversation-turn"]',
        userMessage: '[data-message-author-role="user"]',
        assistantMessage: '[data-message-author-role="assistant"]',
        inputField: '#prompt-textarea, textarea[placeholder*="Message"]',
        headerContainer: 'header, nav + div, [class*="sticky"][class*="top"]'
      },
      extractChat: extractChatGPTChat,
      extractTitle: extractChatGPTTitle
    },
    Claude: {
      hostnames: ['claude.ai'],
      selectors: {
        chatList: '[data-testid*="chat"][data-testid*="item"], a[href*="/chat/"]',
        messageContainer: '[data-testid^="message-"]',
        userMessage: '[data-testid*="user-message"]',
        assistantMessage: '[data-testid*="assistant-message"]',
        inputField: 'div[contenteditable="true"]',
        headerContainer: 'header, [class*="header"]'
      },
      extractChat: extractClaudeChat,
      extractTitle: extractClaudeTitle
    },
    Gemini: {
      hostnames: ['gemini.google.com'],
      selectors: {
        chatList: '.conversation-item, [data-test-id*="conversation"], mat-list-item',
        messageContainer: '[data-test-id*="message"], .message-content',
        userMessage: '[data-test-id*="user"], .user-message',
        assistantMessage: '[data-test-id*="model"], .model-message',
        inputField: 'rich-textarea, textarea, [contenteditable="true"]',
        headerContainer: 'header, mat-toolbar'
      },
      extractChat: extractGeminiChat,
      extractTitle: extractGeminiTitle
    }
  };

  // ===== INITIALIZATION =====
  function init() {
    console.log('[BrainBox] Extension initializing...');
    
    state.platform = detectPlatform();
    
    if (!state.platform) {
      console.log('[BrainBox] Platform not supported');
      return;
    }

    console.log('[BrainBox] Detected platform:', state.platform);
    
    // Load data
    loadFolders();
    loadPrompts();
    
    // Inject styles
    injectStyles();
    
    // Setup UI with retry logic
    setupUIWithRetry();
    
    // Setup message listeners
    setupMessageListeners();
    
    // Start observing DOM changes
    startMutationObserver();
    
    state.isInitialized = true;
    console.log('[BrainBox] Extension initialized successfully');
  }

  function detectPlatform() {
    const hostname = window.location.hostname;
    
    for (const [platformName, platform] of Object.entries(PLATFORMS)) {
      if (platform.hostnames.some(h => hostname.includes(h))) {
        return platformName;
      }
    }
    
    return null;
  }

  // ===== MUTATION OBSERVER =====
  function startMutationObserver() {
    if (state.observer) {
      state.observer.disconnect();
    }

    const platformConfig = PLATFORMS[state.platform];
    const targetNode = document.body;

    const callback = debounce((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if chat list was updated
          const hasChatElements = Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            return node.matches && node.matches(platformConfig.selectors.chatList);
          });

          if (hasChatElements) {
            console.log('[BrainBox] Chat list updated, refreshing UI');
            refreshSaveButton();
          }

          // Check if header was added
          const hasHeader = Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            return node.matches && node.matches(platformConfig.selectors.headerContainer);
          });

          if (hasHeader && !state.saveButton) {
            console.log('[BrainBox] Header detected, injecting save button');
            injectSaveButton();
          }
        }
      }
    }, CONFIG.DEBOUNCE_DELAY);

    state.observer = new MutationObserver(callback);
    state.observer.observe(targetNode, CONFIG.OBSERVER_CONFIG);
    
    console.log('[BrainBox] MutationObserver started');
  }

  // ===== UI INJECTION =====
  function setupUIWithRetry(attempt = 0) {
    const success = injectSaveButton();
    
    if (!success && attempt < CONFIG.MAX_RETRIES) {
      console.log(`[BrainBox] Retry ${attempt + 1}/${CONFIG.MAX_RETRIES} to inject UI`);
      setTimeout(() => setupUIWithRetry(attempt + 1), 1000 * (attempt + 1));
    }
  }

  function injectSaveButton() {
    if (state.saveButton && document.body.contains(state.saveButton)) {
      return true;
    }

    const platformConfig = PLATFORMS[state.platform];
    const headerContainer = document.querySelector(platformConfig.selectors.headerContainer);
    
    if (!headerContainer) {
      console.log('[BrainBox] Header container not found yet');
      return false;
    }

    // Create save button
    const button = document.createElement('button');
    button.className = 'brainbox-save-btn';
    button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      <span>Save to BrainBox</span>
    `;
    
    button.addEventListener('click', handleSaveClick);
    
    // Insert button
    headerContainer.style.position = 'relative';
    headerContainer.appendChild(button);
    
    state.saveButton = button;
    console.log('[BrainBox] Save button injected');
    
    return true;
  }

  function refreshSaveButton() {
    if (state.saveButton && !document.body.contains(state.saveButton)) {
      state.saveButton = null;
      injectSaveButton();
    }
  }

  // ===== SAVE FUNCTIONALITY =====
  async function handleSaveClick() {
    const button = state.saveButton;
    
    // Show loading state
    button.classList.add('brainbox-loading');
    button.disabled = true;
    
    try {
      const platformConfig = PLATFORMS[state.platform];
      const chatData = await platformConfig.extractChat();
      
      if (!chatData || !chatData.content) {
        throw new Error('No chat content found');
      }
      
      // Show folder selector modal
      showFolderSelector(chatData);
      
    } catch (error) {
      console.error('[BrainBox] Save error:', error);
      showNotification('Failed to save chat: ' + error.message, 'error');
    } finally {
      button.classList.remove('brainbox-loading');
      button.disabled = false;
    }
  }

  function showFolderSelector(chatData) {
    // Remove existing modal
    const existing = document.querySelector('.brainbox-modal');
    if (existing) existing.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'brainbox-modal';
    
    const folderOptions = state.folders.length > 0
      ? state.folders.map(f => `
          <div class="brainbox-folder-option" data-folder-id="${f.id}">
            <div class="folder-icon" style="background: ${f.color || '#667eea'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z"/>
              </svg>
            </div>
            <span>${f.name}</span>
            <span class="folder-count">${f.chat_count || 0}</span>
          </div>
        `).join('')
      : '<div class="brainbox-empty">No folders yet. Create one in BrainBox!</div>';
    
    modal.innerHTML = `
      <div class="brainbox-modal-content">
        <div class="brainbox-modal-header">
          <h3>Save to Folder</h3>
          <button class="brainbox-close">&times;</button>
        </div>
        <div class="brainbox-modal-body">
          <div class="brainbox-chat-preview">
            <strong>${chatData.title || 'Untitled Chat'}</strong>
            <small>${state.platform} • ${new Date().toLocaleDateString()}</small>
          </div>
          <div class="brainbox-folder-option" data-folder-id="null">
            <div class="folder-icon" style="background: #8b5cf6">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <span>My Chats (Default)</span>
          </div>
          ${folderOptions}
          <button class="brainbox-new-folder-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Create New Folder
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.brainbox-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    modal.querySelectorAll('.brainbox-folder-option').forEach(option => {
      option.addEventListener('click', async () => {
        const folderId = option.dataset.folderId === 'null' ? null : option.dataset.folderId;
        modal.remove();
        await saveChat(chatData, folderId);
      });
    });
    
    modal.querySelector('.brainbox-new-folder-btn')?.addEventListener('click', () => {
      window.open(CONFIG.API_BASE_URL + '/settings', '_blank');
      modal.remove();
    });
  }

  async function saveChat(chatData, folderId) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: chatData.title,
          content: chatData.content,
          platform: state.platform,
          folder_id: folderId,
          url: window.location.href
        })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please login to BrainBox first');
        }
        throw new Error('Failed to save chat');
      }
      
      const result = await response.json();
      showNotification('✓ Chat saved successfully!', 'success');
      
      return result;
    } catch (error) {
      console.error('[BrainBox] Save error:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }

  // ===== CHAT EXTRACTION =====
  function extractChatGPTChat() {
    const messages = [];
    const messageElements = document.querySelectorAll('[data-testid="conversation-turn"]');
    
    messageElements.forEach(element => {
      const role = element.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role');
      const content = element.querySelector('.markdown')?.innerText || element.innerText;
      
      if (role && content) {
        messages.push({ role, content: content.trim() });
      }
    });
    
    return {
      title: extractChatGPTTitle(),
      content: JSON.stringify(messages),
      messageCount: messages.length
    };
  }

  function extractChatGPTTitle() {
    return document.querySelector('h1')?.innerText || 
           document.title.replace(' - ChatGPT', '') ||
           'Untitled Chat';
  }

  function extractClaudeChat() {
    const messages = [];
    const messageElements = document.querySelectorAll('[data-testid^="message-"]');
    
    messageElements.forEach(element => {
      const isUser = element.querySelector('[data-testid*="user"]');
      const role = isUser ? 'user' : 'assistant';
      const content = element.innerText;
      
      if (content) {
        messages.push({ role, content: content.trim() });
      }
    });
    
    return {
      title: extractClaudeTitle(),
      content: JSON.stringify(messages),
      messageCount: messages.length
    };
  }

  function extractClaudeTitle() {
    return document.querySelector('h1')?.innerText || 
           document.title ||
           'Untitled Chat';
  }

  function extractGeminiChat() {
    const messages = [];
    const messageElements = document.querySelectorAll('[data-test-id*="message"]');
    
    messageElements.forEach(element => {
      const isUser = element.querySelector('[data-test-id*="user"]');
      const role = isUser ? 'user' : 'assistant';
      const content = element.innerText;
      
      if (content) {
        messages.push({ role, content: content.trim() });
      }
    });
    
    return {
      title: extractGeminiTitle(),
      content: JSON.stringify(messages),
      messageCount: messages.length
    };
  }

  function extractGeminiTitle() {
    return document.querySelector('mat-toolbar h1')?.innerText || 
           document.querySelector('.conversation-title')?.innerText ||
           'Untitled Chat';
  }

  // ===== NOTIFICATIONS =====
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `brainbox-notification brainbox-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ===== DATA LOADING =====
  async function loadFolders() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/folders?type=chat`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        state.folders = data.folders || [];
        console.log('[BrainBox] Loaded folders:', state.folders.length);
      }
    } catch (error) {
      console.error('[BrainBox] Failed to load folders:', error);
    }
  }

  async function loadPrompts() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/prompts`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        state.prompts = data.prompts || [];
        console.log('[BrainBox] Loaded prompts:', state.prompts.length);
      }
    } catch (error) {
      console.error('[BrainBox] Failed to load prompts:', error);
    }
  }

  // ===== MESSAGE LISTENERS =====
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'extractChat':
          const platformConfig = PLATFORMS[state.platform];
          platformConfig.extractChat().then(data => sendResponse(data));
          return true;
          
        case 'showNotification':
          showNotification(message.message, message.type);
          sendResponse({ success: true });
          break;
          
        case 'refreshFolders':
          loadFolders().then(() => sendResponse({ success: true }));
          return true;
      }
    });
  }

  // ===== STYLES =====
  function injectStyles() {
    if (document.getElementById('brainbox-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'brainbox-styles';
    style.textContent = `
      .brainbox-save-btn {
        position: absolute;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 9999;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
      }
      
      .brainbox-save-btn:hover {
        transform: translateY(-50%) scale(1.05);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
      }
      
      .brainbox-save-btn:active {
        transform: translateY(-50%) scale(0.98);
      }
      
      .brainbox-save-btn.brainbox-loading {
        opacity: 0.7;
        pointer-events: none;
      }
      
      .brainbox-save-btn svg {
        flex-shrink: 0;
      }
      
      .brainbox-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      }
      
      .brainbox-modal-content {
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
      }
      
      .brainbox-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .brainbox-modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }
      
      .brainbox-close {
        background: none;
        border: none;
        font-size: 28px;
        color: #6b7280;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s;
      }
      
      .brainbox-close:hover {
        background: #f3f4f6;
        color: #111827;
      }
      
      .brainbox-modal-body {
        padding: 24px;
        max-height: 60vh;
        overflow-y: auto;
      }
      
      .brainbox-chat-preview {
        padding: 16px;
        background: #f9fafb;
        border-radius: 12px;
        margin-bottom: 20px;
      }
      
      .brainbox-chat-preview strong {
        display: block;
        font-size: 16px;
        color: #111827;
        margin-bottom: 4px;
      }
      
      .brainbox-chat-preview small {
        font-size: 13px;
        color: #6b7280;
      }
      
      .brainbox-folder-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 8px;
        border: 2px solid transparent;
      }
      
      .brainbox-folder-option:hover {
        background: #f3f4f6;
        border-color: #667eea;
      }
      
      .folder-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .brainbox-folder-option span {
        flex: 1;
        font-size: 15px;
        font-weight: 500;
        color: #374151;
      }
      
      .folder-count {
        font-size: 13px !important;
        color: #9ca3af !important;
        font-weight: 400 !important;
      }
      
      .brainbox-new-folder-btn {
        width: 100%;
        padding: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: #f9fafb;
        border: 2px dashed #d1d5db;
        border-radius: 10px;
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 12px;
      }
      
      .brainbox-new-folder-btn:hover {
        background: #f3f4f6;
        border-color: #667eea;
        color: #667eea;
      }
      
      .brainbox-empty {
        text-align: center;
        padding: 40px 20px;
        color: #9ca3af;
        font-size: 14px;
      }
      
      .brainbox-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        font-size: 15px;
        font-weight: 500;
        z-index: 10001;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
      }
      
      .brainbox-notification.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      .brainbox-notification-success {
        border-left: 4px solid #10b981;
        color: #047857;
      }
      
      .brainbox-notification-error {
        border-left: 4px solid #ef4444;
        color: #dc2626;
      }
      
      .brainbox-notification-info {
        border-left: 4px solid #3b82f6;
        color: #1d4ed8;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(40px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // ===== UTILITIES =====
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

  // ===== START =====
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    if (state.observer) {
      state.observer.disconnect();
    }
  });
  
})();
