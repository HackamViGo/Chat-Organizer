// Content Script for AI Chat Organizer Extension
// Injects into AI platform pages with hover menu and context menu support

(function () {
  'use strict';

  // Configuration
  const HOVER_MENU_DELAY = 500; // ms to show menu on hover
  const PLATFORM = detectCurrentPlatform();

  let hoverTimeout = null;
  let currentHoverMenu = null;
  let customFolders = [];
  let saveButton = null;

  // Initialize
  init();

  function init() {
    console.log('AI Chat Organizer extension loaded on', PLATFORM);

    if (PLATFORM !== 'Unknown') {
      loadCustomFolders();
      injectStyles();
      injectSaveButton();
      initializeHoverMenus();
      setupMessageListener();
    }
  }

  // ===== PLATFORM DETECTION =====

  function detectCurrentPlatform() {
    const hostname = window.location.hostname;

    if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
      return 'ChatGPT';
    } else if (hostname.includes('claude.ai')) {
      return 'Claude';
    } else if (hostname.includes('gemini.google.com')) {
      return 'Gemini';
    } else if (hostname.includes('lmarena.ai') || hostname.includes('lmsys.org')) {
      return 'LMArena';
    }
    return 'Unknown';
  }

  // ===== HOVER MENU FUNCTIONALITY =====

  function loadCustomFolders() {
    // Load folders from API via background script
    chrome.runtime.sendMessage(
      { action: 'getFolders' },
      (response) => {
        if (response && response.success) {
          customFolders = response.folders || [];
          console.log('Loaded folders:', customFolders.length);
        } else {
          console.error('Failed to load folders:', response?.error);
          customFolders = [];
        }
      }
    );
  }

  function initializeHoverMenus() {
    // Add listeners to detect chat elements on hover
    document.addEventListener('mouseover', handleChatHover);
    document.addEventListener('mouseout', handleChatLeave);
  }

  function getChatElements() {
    // Platform-specific selectors for chat list items
    switch (PLATFORM) {
      case 'ChatGPT':
        return document.querySelectorAll('nav [class*="group"] a[href*="/c/"], nav ol li a');
      case 'Claude':
        return document.querySelectorAll('[data-testid*="chat"][data-testid*="item"], .chat-item, a[href*="/chat/"]');
      case 'Gemini':
        return document.querySelectorAll('.conversation-item, [data-test-id*="conversation"], mat-list-item');
      case 'LMArena':
        return document.querySelectorAll('.conversation-item, [data-conversation-id]');
      default:
        return [];
    }
  }

  function handleChatHover(e) {
    const chatElement = findChatElement(e.target);
    if (!chatElement) return;

    // Clear any existing timeout
    if (hoverTimeout) clearTimeout(hoverTimeout);

    // Set new timeout to show menu
    hoverTimeout = setTimeout(() => {
      showHoverMenu(chatElement, e);
    }, HOVER_MENU_DELAY);
  }

  function handleChatLeave(e) {
    // Clear timeout if leaving before menu shows
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
  }

  function findChatElement(element) {
    // Walk up the DOM to find the chat container
    let current = element;
    let depth = 0;
    const maxDepth = 10;

    while (current && depth < maxDepth) {
      // Check if this element matches chat selectors
      if (current.matches) {
        if (PLATFORM === 'ChatGPT' && (current.matches('nav [class*="group"] a[href*="/c/"]') || current.matches('nav ol li a'))) {
          return current;
        }
        if (PLATFORM === 'Claude' && (current.matches('[data-testid*="chat"]') || current.matches('a[href*="/chat/"]'))) {
          return current;
        }
        if (PLATFORM === 'Gemini' && (current.matches('.conversation-item') || current.matches('[data-test-id*="conversation"]') || current.matches('mat-list-item'))) {
          return current;
        }
        if (PLATFORM === 'LMArena' && (current.matches('.conversation-item') || current.matches('[data-conversation-id]'))) {
          return current;
        }
      }

      current = current.parentElement;
      depth++;
    }
    return null;
  }

  function showHoverMenu(chatElement, event) {
    // Remove existing menu if any
    if (currentHoverMenu) {
      currentHoverMenu.remove();
    }

    // Create menu
    const menu = createHoverMenu(chatElement);
    document.body.appendChild(menu);
    currentHoverMenu = menu;

    // Position menu
    positionHoverMenu(menu, chatElement);

    // Add event listeners
    menu.addEventListener('mouseleave', () => {
      setTimeout(() => {
        if (currentHoverMenu === menu) {
          menu.remove();
          currentHoverMenu = null;
        }
      }, 300);
    });
  }

  function createHoverMenu(chatElement) {
    const menu = document.createElement('div');
    menu.className = 'ai-organizer-hover-menu';

    let customFoldersHtml = '';
    if (customFolders.length > 0) {
      customFolders.forEach((folder) => {
        customFoldersHtml += `
          <div class="hover-menu-item" data-action="custom-folder" data-folder-id="${folder.id}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="${folder.color || '#667eea'}">
              <path d="M2 4a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V4z"/>
            </svg>
            <span>${folder.name}</span>
          </div>
        `;
      });
    }

    menu.innerHTML = `
      <div class="hover-menu-item" data-action="add-to-my-chats">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3z"/>
        </svg>
        <span>Add to My Chats</span>
      </div>
      <div class="hover-menu-item" data-action="new-folder">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z"/>
        </svg>
        <span>+ New Folder</span>
      </div>
      ${customFoldersHtml ? '<div class="hover-menu-divider"></div>' + customFoldersHtml : ''}
      ${customFolders.length < 3 ? `
      <div class="hover-menu-hint">
        <small>💡 Select up to ${3 - customFolders.length} more folder(s) in Settings</small>
      </div>` : ''}
    `;

    // Add click handlers
    menu.querySelectorAll('.hover-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        handleMenuAction(item.dataset.action, chatElement, item.dataset.folderId);
      });
    });

    return menu;
  }

  function positionHoverMenu(menu, chatElement) {
    const rect = chatElement.getBoundingClientRect();
    const menuWidth = 250;
    const menuHeight = menu.offsetHeight || 300;
    const padding = 10;

    // Default: position to the right
    let left = rect.right + padding;
    let top = rect.top;

    // Check if menu would overflow right side
    if (left + menuWidth > window.innerWidth) {
      // Position to the left instead
      left = rect.left - menuWidth - padding;

      // If still overflows, position inside viewport
      if (left < 0) {
        left = padding;
      }
    }

    // Adjust vertical position if needed
    if (top + menuHeight > window.innerHeight) {
      top = window.innerHeight - menuHeight - padding;
    }
    if (top < 0) {
      top = padding;
    }

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.position = 'fixed';
  }

  async function handleMenuAction(action, chatElement, folderId) {
    // Extract chat data
    const chatUrl = chatElement.href || window.location.href;
    const chatTitle = chatElement.textContent?.trim() || extractChatTitle() || 'Untitled Chat';

    switch (action) {
      case 'add-to-my-chats':
        await saveChatToFolder(chatUrl, chatTitle, null);
        break;

      case 'new-folder':
        showNewFolderModal(chatUrl, chatTitle);
        break;

      case 'custom-folder':
        await saveChatToFolder(chatUrl, chatTitle, folderId);
        break;
    }

    // Close menu
    if (currentHoverMenu) {
      currentHoverMenu.remove();
      currentHoverMenu = null;
    }
  }

  async function saveChatToFolder(url, title, folderId) {
    try {
      const chatData = {
        title: title,
        url: url,
        content: extractChatContent() || 'Saved from ' + PLATFORM,
        platform: PLATFORM,
        folder_id: folderId,
        timestamp: new Date().toISOString()
      };

      const response = await chrome.runtime.sendMessage({
        action: 'saveChat',
        data: chatData
      });

      if (response && response.success) {
        showNotification('✓ Chat saved successfully!', 'success');
      } else {
        throw new Error(response?.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      // Show actual error message if possible
      const errorMsg = error.message || 'Failed to save chat';
      showNotification('✗ ' + errorMsg, 'error');
    }
  }

  function showNewFolderModal(chatUrl, chatTitle) {
    const modal = document.createElement('div');
    modal.className = 'ai-organizer-modal-overlay';
    modal.innerHTML = `
      <div class="ai-organizer-modal ai-organizer-folder-modal">
        <div class="ai-organizer-modal-header">
          <h2>Create New Folder</h2>
          <button class="ai-organizer-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="ai-organizer-modal-content">
          <div class="form-group">
            <label for="folder-name-input">Folder Name</label>
            <input type="text" id="folder-name-input" placeholder="Enter folder name..." class="folder-input" />
          </div>
          <div class="form-group">
            <label>Folder Type</label>
            <select id="folder-type-select" class="folder-input">
              <option value="chat">Chat Folder</option>
              <option value="image">Image Folder</option>
              <option value="prompt">Prompt Folder</option>
            </select>
          </div>
          <div class="form-group">
            <label>Color</label>
            <div class="color-picker">
              <button class="color-option selected" data-color="#667eea" style="background: #667eea"></button>
              <button class="color-option" data-color="#f59e0b" style="background: #f59e0b"></button>
              <button class="color-option" data-color="#10b981" style="background: #10b981"></button>
              <button class="color-option" data-color="#ef4444" style="background: #ef4444"></button>
              <button class="color-option" data-color="#8b5cf6" style="background: #8b5cf6"></button>
              <button class="color-option" data-color="#ec4899" style="background: #ec4899"></button>
            </div>
          </div>
          <div class="checkbox-group">
            <label>
              <input type="checkbox" id="add-chat-to-folder" checked />
              <span>Add current chat to this folder</span>
            </label>
          </div>
          <div class="checkbox-group">
            <label>
              <input type="checkbox" id="add-to-custom-menu" />
              <span>Add to quick access menu (${customFolders.length}/3)</span>
            </label>
          </div>
        </div>
        <div class="ai-organizer-modal-footer">
          <button class="btn-secondary" id="cancel-folder-btn">Cancel</button>
          <button class="btn-primary" id="create-folder-btn">Create Folder</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    let selectedColor = '#667eea';

    // Color picker
    modal.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedColor = btn.dataset.color;
      });
    });

    // Close handlers
    const closeModal = () => modal.remove();
    modal.querySelector('.ai-organizer-modal-close').addEventListener('click', closeModal);
    modal.querySelector('#cancel-folder-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Create folder
    modal.querySelector('#create-folder-btn').addEventListener('click', async () => {
      const folderName = modal.querySelector('#folder-name-input').value.trim();
      const folderType = modal.querySelector('#folder-type-select').value;
      const addChatToFolder = modal.querySelector('#add-chat-to-folder').checked;
      const addToCustomMenu = modal.querySelector('#add-to-custom-menu').checked;

      if (!folderName) {
        showNotification('Please enter a folder name', 'error');
        return;
      }

      if (addToCustomMenu && customFolders.length >= 3) {
        showNotification('Maximum 3 custom folders allowed', 'error');
        return;
      }

      try {
        // Create folder via background script
        const response = await chrome.runtime.sendMessage({
          action: 'createFolder',
          data: {
            name: folderName,
            type: folderType,
            color: selectedColor
          }
        });

        if (response && response.success) {
          const newFolder = response.folder;

          // Add to custom menu if requested
          if (addToCustomMenu) {
            customFolders.push(newFolder);
            chrome.storage.local.set({ customFolders });
          }

          showNotification(`✓ Folder "${folderName}" created!`, 'success');

          // Add chat to folder if requested
          if (addChatToFolder) {
            await saveChatToFolder(chatUrl, chatTitle, newFolder.id);
          }

          closeModal();
        } else {
          throw new Error(response?.error || 'Failed to create folder');
        }
      } catch (error) {
        console.error('Create folder error:', error);
        showNotification('Failed to create folder', 'error');
      }
    });

    // Focus input
    setTimeout(() => modal.querySelector('#folder-name-input').focus(), 100);
  }

  // ===== SAVE BUTTON INJECTION =====

  function injectSaveButton() {
    // Wait for page to load
    const checkInterval = setInterval(() => {
      const targetElement = getTargetElement();

      if (targetElement && !saveButton) {
        clearInterval(checkInterval);
        saveButton = createSaveButton();
        targetElement.appendChild(saveButton);
      }
    }, 1000);

    // Stop checking after 30 seconds
    setTimeout(() => clearInterval(checkInterval), 30000);
  }

  function getTargetElement() {
    // Platform-specific selectors for where to inject the save button
    switch (PLATFORM) {
      case 'ChatGPT':
        return document.querySelector('nav') || document.querySelector('header');
      case 'Claude':
        return document.querySelector('header nav') || document.querySelector('header');
      case 'Gemini':
        return document.querySelector('header') || document.querySelector('.header-content');
      case 'LMArena':
        return document.querySelector('header') || document.querySelector('.top-bar');
      default:
        return null;
    }
  }

  function createSaveButton() {
    const button = document.createElement('button');
    button.className = 'ai-organizer-save-button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm2 2v6h8V5H4z"/>
      </svg>
      <span>Save to Organizer</span>
    `;

    button.addEventListener('click', handleSaveClick);
    return button;
  }

  async function handleSaveClick() {
    const chatData = extractChatData();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveChat',
        data: chatData
      });

      if (response && response.success) {
        showNotification('✓ Chat saved successfully!', 'success');
      } else {
        throw new Error(response?.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification('Failed to save chat. Please try again.', 'error');
    }
  }

  // ===== CHAT EXTRACTION =====

  function extractChatData() {
    return {
      url: window.location.href,
      title: extractChatTitle() || 'Untitled Chat',
      content: extractChatContent(),
      platform: PLATFORM,
      timestamp: new Date().toISOString()
    };
  }

  function extractChatTitle() {
    switch (PLATFORM) {
      case 'ChatGPT':
        return document.querySelector('h1')?.textContent ||
          document.querySelector('title')?.textContent ||
          'ChatGPT Conversation';
      case 'Claude':
        return document.querySelector('[data-testid="chat-title"]')?.textContent ||
          document.querySelector('h1')?.textContent ||
          'Claude Conversation';
      case 'Gemini':
        return document.querySelector('.conversation-title')?.textContent ||
          document.querySelector('h1')?.textContent ||
          'Gemini Chat';
      case 'LMArena':
        return document.querySelector('.chat-title')?.textContent ||
          'LM Arena Conversation';
      default:
        return 'Conversation';
    }
  }

  function extractChatContent() {
    const messages = [];

    switch (PLATFORM) {
      case 'ChatGPT':
        messages.push(...extractChatGPTMessages());
        break;
      case 'Claude':
        messages.push(...extractClaudeMessages());
        break;
      case 'Gemini':
        messages.push(...extractGeminiMessages());
        break;
      case 'LMArena':
        messages.push(...extractLMArenaMessages());
        break;
    }

    if (messages.length === 0) {
      return 'No conversation content extracted';
    }

    // Add header with metadata
    const header = `=== ${PLATFORM} Conversation ===\nExtracted: ${new Date().toLocaleString()}\nURL: ${window.location.href}\n\n`;

    return header + messages.join('\n---\n\n');
  }

  function extractChatGPTMessages() {
    const messages = [];

    // Strategy 1: Look for 'article' elements (standard ChatGPT message containers)
    const articles = document.querySelectorAll('article');

    if (articles.length > 0) {
      articles.forEach((article, index) => {
        // Determine role: checks for user specific elements or text
        const isUser = article.querySelector('[data-testid="user-message"]') ||
          article.querySelector('h5') ||
          (article.innerText && article.innerText.startsWith('You\n'));

        const roleLabel = isUser ? 'USER' : 'ASSISTANT';

        // Extract text content
        // Usually content is in .markdown or a div with specific classes
        const contentDiv = article.querySelector('.markdown') || article.querySelector('div[class*="text-message"]');
        let text = '';

        if (contentDiv) {
          text = contentDiv.innerText.trim();
        } else {
          // Fallback: Get all text if specific container is missing
          text = article.innerText.trim();
        }

        if (text) {
          messages.push(`**${roleLabel}:**\n${text}\n`);
        }
      });
    } else {
      // Strategy 2: Fallback to getting all .markdown elements directly
      // This works if article tags are missing but markdown content exists
      const markdownDivs = document.querySelectorAll('.markdown');
      markdownDivs.forEach(div => {
        // Assume assistant if we can't determine, or valid message block
        messages.push(`**MESSAGE:**\n${div.innerText.trim()}\n`);
      });

      // Strategy 3: Old data-message-author-role fallback
      if (messages.length === 0) {
        const messageElements = document.querySelectorAll('[data-message-author-role]');
        messageElements.forEach((el) => {
          const role = el.getAttribute('data-message-author-role');
          const contentEl = el.querySelector('.markdown, [class*="markdown"]') || el;
          const content = contentEl.textContent.trim();
          if (content) {
            const roleLabel = role === 'user' ? 'USER' : 'ASSISTANT';
            messages.push(`**${roleLabel}:**\n${content}\n`);
          }
        });
      }
    }

    return messages;
  }

  function extractClaudeMessages() {
    const messages = [];
    const messageElements = document.querySelectorAll('[data-testid^="message-"]');

    messageElements.forEach((el, index) => {
      const isUser = el.getAttribute('data-testid').includes('user');
      const roleLabel = isUser ? 'USER' : 'ASSISTANT';
      const content = el.textContent.trim();

      if (content) {
        messages.push(`${roleLabel}:\n${content}\n`);
      }
    });

    return messages;
  }

  function extractGeminiMessages() {
    const messages = [];
    const messageElements = document.querySelectorAll('[data-test-id*="message"]');

    messageElements.forEach((el, index) => {
      const isUser = el.getAttribute('data-test-id').includes('user');
      const roleLabel = isUser ? 'USER' : 'MODEL';
      const content = el.textContent.trim();

      if (content) {
        messages.push(`${roleLabel}:\n${content}\n`);
      }
    });

    return messages;
  }

  function extractLMArenaMessages() {
    const messages = [];
    const messageElements = document.querySelectorAll('.message, [data-message]');

    messageElements.forEach(el => {
      const content = el.textContent.trim();
      if (content) {
        messages.push(content);
      }
    });

    return messages;
  }

  // ===== PROMPT INSERTION =====

  function showPromptSelector(prompts) {
    if (!prompts || prompts.length === 0) {
      const modal = document.createElement('div');
      modal.className = 'ai-organizer-modal-overlay';
      modal.innerHTML = `
        <div class="ai-organizer-modal">
          <div class="ai-organizer-modal-header">
            <h2>No Prompts Found</h2>
            <button class="ai-organizer-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="ai-organizer-modal-content">
            <div class="ai-organizer-no-prompts">
              <p>You don't have any saved prompts yet.</p>
              <a href="https://brainbox-alpha.vercel.app/prompts" target="_blank">Create your first prompt</a>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('.ai-organizer-modal-close').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });

      return;
    }

    const modal = document.createElement('div');
    modal.className = 'ai-organizer-modal-overlay';
    modal.innerHTML = `
      <div class="ai-organizer-modal">
        <div class="ai-organizer-modal-header">
          <h2>Select a Prompt</h2>
          <button class="ai-organizer-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="ai-organizer-modal-content">
          <ul class="ai-organizer-prompt-list">
            ${prompts.map(prompt => `
              <li class="ai-organizer-prompt-item" data-prompt-id="${prompt.id}">
                <h3>${prompt.title}</h3>
                <p>${prompt.content.substring(0, 100)}${prompt.content.length > 100 ? '...' : ''}</p>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.ai-organizer-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Prompt click handlers
    modal.querySelectorAll('.ai-organizer-prompt-item').forEach(item => {
      item.addEventListener('click', () => {
        const promptId = item.dataset.promptId;
        const prompt = prompts.find(p => p.id === promptId);
        if (prompt) {
          insertPromptIntoPage(prompt.content);
          modal.remove();
        }
      });
    });
  }

  function insertPromptIntoPage(content) {
    const activeElement = document.activeElement;

    // Try to insert into focused element
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
      activeElement.value = content;
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      showNotification('✓ Prompt inserted!', 'success');
      return;
    }

    // Try contentEditable
    if (activeElement && activeElement.isContentEditable) {
      activeElement.textContent = content;
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      showNotification('✓ Prompt inserted!', 'success');
      return;
    }

    // Platform-specific fallback
    let inputElement = null;
    switch (PLATFORM) {
      case 'ChatGPT':
        inputElement = document.querySelector('#prompt-textarea, [data-id="root"] textarea');
        break;
      case 'Claude':
        inputElement = document.querySelector('[data-testid="chat-input"], [contenteditable="true"]');
        break;
      case 'Gemini':
        inputElement = document.querySelector('.input-area textarea, [contenteditable="true"]');
        break;
      case 'LMArena':
        inputElement = document.querySelector('textarea, [contenteditable="true"]');
        break;
    }

    if (inputElement) {
      if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
        inputElement.value = content;
      } else {
        inputElement.textContent = content;
      }
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.focus();
      showNotification('✓ Prompt inserted!', 'success');
    } else {
      showNotification('Could not find input field. Please focus on the input first.', 'error');
    }
  }

  // ===== NOTIFICATIONS =====

  function showNotification(message, type = 'success') {
    // Check if it's a login error
    const isLoginError = message.toLowerCase().includes('login') ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('please login');

    if (isLoginError) {
      showLoginRequiredModal();
      return;
    }

    const notification = document.createElement('div');
    notification.className = `ai-organizer-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('hiding');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Show centered modal for login required
  function showLoginRequiredModal() {
    // Remove existing modal if any
    const existing = document.querySelector('.ai-organizer-login-modal');
    if (existing) existing.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'ai-organizer-login-modal';
    modalOverlay.innerHTML = `
      <div class="ai-organizer-login-content">
        <div class="ai-organizer-login-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" x2="3" y1="12" y2="12"/>
          </svg>
        </div>
        <h2>Login Required</h2>
        <p>Please login to your BrainBox account to save chats.</p>
        <button class="ai-organizer-login-btn" id="brainbox-login-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" x2="9.01" y1="9" y2="9"/>
            <line x1="15" x2="15.01" y1="9" y2="9"/>
          </svg>
          Login to BrainBox
        </button>
        <button class="ai-organizer-cancel-btn" id="brainbox-cancel-btn">Maybe Later</button>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    // Add event listeners
    document.getElementById('brainbox-login-btn').addEventListener('click', () => {
      // Change URL for local testing
      window.open('http://localhost:3000/extension-auth', '_blank');
      // window.open('https://brainbox-alpha.vercel.app/extension-auth', '_blank');
      modalOverlay.remove();
    });

    document.getElementById('brainbox-cancel-btn').addEventListener('click', () => {
      modalOverlay.remove();
    });

    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.remove();
      }
    });
  }

  // ===== MESSAGE LISTENER =====

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'extractChatContext') {
        const chatData = extractChatData();
        sendResponse(chatData);
      } else if (message.action === 'showPromptSelector') {
        showPromptSelector(message.prompts);
        sendResponse({ success: true });
      } else if (message.action === 'extractAllImages') {
        const images = extractAllImagesFromPage();
        sendResponse({ images: images });
      } else if (message.action === 'showNotification') {
        showNotification(message.message, message.type);
        sendResponse({ success: true });
      }
      return true;
    });
  }

  // Extract all images from current page
  function extractAllImagesFromPage() {
    const images = [];
    const imageElements = document.querySelectorAll('img');

    imageElements.forEach(img => {
      const src = img.src || img.dataset.src;
      if (src && src.startsWith('http')) {
        // Filter out small images (likely icons/logos)
        if (img.naturalWidth > 100 && img.naturalHeight > 100) {
          images.push(src);
        }
      }
    });

    // Also check for background images
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const bgImage = window.getComputedStyle(el).backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (urlMatch && urlMatch[1] && urlMatch[1].startsWith('http')) {
          images.push(urlMatch[1]);
        }
      }
    });

    // Remove duplicates
    return [...new Set(images)];
  }

  // ===== STYLES INJECTION =====

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Hover Menu Styles */
      .ai-organizer-hover-menu {
        position: fixed;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        padding: 8px;
        min-width: 250px;
        z-index: 1000002;
        animation: slideInMenu 0.2s ease;
      }

      @keyframes slideInMenu {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .hover-menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #374151;
        font-size: 14px;
        font-weight: 500;
      }

      .hover-menu-item:hover {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        color: #667eea;
      }

      .hover-menu-item svg {
        flex-shrink: 0;
      }

      .hover-menu-divider {
        height: 1px;
        background: #e5e7eb;
        margin: 4px 0;
      }

      .hover-menu-hint {
        padding: 8px 12px;
        font-size: 12px;
        color: #6b7280;
        font-style: italic;
      }

      .hover-menu-empty {
        padding: 8px 12px;
        font-size: 12px;
        color: #9ca3af;
        text-align: center;
      }

      /* Form Styles */
      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 6px;
      }

      .folder-input {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.2s ease;
      }

      .folder-input:focus {
        outline: none;
        border-color: #667eea;
      }

      .color-picker {
        display: flex;
        gap: 10px;
      }

      .color-option {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 3px solid transparent;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .color-option:hover {
        transform: scale(1.1);
      }

      .color-option.selected {
        border-color: #fff;
        box-shadow: 0 0 0 2px #667eea;
      }

      .checkbox-group {
        margin-bottom: 12px;
      }

      .checkbox-group label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-weight: normal;
      }

      .checkbox-group input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      /* Modal Styles */
      .ai-organizer-folder-modal,
      .ai-organizer-url-modal {
        max-width: 500px;
      }

      .ai-organizer-modal-footer {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 2px solid #f3f4f6;
      }

      .btn-primary,
      .btn-secondary {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }

      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }

      .btn-secondary:hover {
        background: #e5e7eb;
      }
    `;
    document.head.appendChild(style);
  }

})();
