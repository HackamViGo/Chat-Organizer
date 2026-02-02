// ============================================================================
// BrainBox Prompt Inject
// Injecting prompts from dashboard into Gemini textarea
// ============================================================================
    
(function () {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
      
  const CONFIG = {
    API_BASE_URL: null, // Will be loaded from storage
    API_ENDPOINT: '/api/prompts', // API endpoint for prompts
    DEBUG_MODE: false
  };

  // Prevent multiple executions
  if (window.BRAINBOX_PROMPT_INJECT_LOADED) {
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⏹️ Script already loaded, skipping init.');
    return;
  }
  window.BRAINBOX_PROMPT_INJECT_LOADED = true;

  if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] Loading (v2.0.2)...');

  // ============================================================================
  // STATE
  // ============================================================================
  
  const STATE = {
    prompts: [],
    isLoading: false
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
      
  async function init() {
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] Initializing...');
    
    // Load Configuration from Storage
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const config = await chrome.storage.local.get(['API_BASE_URL']);
            if (config.API_BASE_URL) {
                CONFIG.API_BASE_URL = config.API_BASE_URL;
                if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Loaded Config:', CONFIG.API_BASE_URL);
            } else {
                CONFIG.API_BASE_URL = 'https://brainbox-alpha.vercel.app';
            }
        } else {
            // Context where storage is not available (e.g. sandboxed iframe or Main world)
            CONFIG.API_BASE_URL = 'https://brainbox-alpha.vercel.app';
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⚠️ Storage API not available, using default URL');
        }
    } catch (e) {
        console.warn('[🧠 Prompt Inject] ⚠️ Config load check failed (using default):', e);
        CONFIG.API_BASE_URL = 'https://brainbox-alpha.vercel.app';
    }

    // Setup message listener
    setupMessageListener();
        
    // Notify background that we are ready
    chrome.runtime.sendMessage({ action: 'contentScriptReady', platform: 'universal' }).catch(() => {});
        
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Ready');
  }

  // ============================================================================
  // FETCH PROMPTS FROM API
  // ============================================================================
  
  async function fetchPrompts(forceRefresh = false) {
    if (STATE.isLoading && !forceRefresh) return STATE.prompts;
    STATE.isLoading = true;

    try {
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📥 Fetching via Background (CSP Bypass)...');
      
      const response = await chrome.runtime.sendMessage({ action: 'fetchPrompts' });
      
      if (!response || !response.success) {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Background fetch failed:', response?.error);
        if (response?.error === 'Unauthorized') {
             if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⚠️ Auth failed (Background)');
        }
        return [];
      }

      const data = response.data;
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📦 Received data from background:', typeof data);

      // Handle { prompts: [...] } structure vs [...]
      const promptsList = Array.isArray(data.prompts) ? data.prompts : (Array.isArray(data) ? data : []);
      STATE.prompts = promptsList;
      
      if (CONFIG.DEBUG_MODE) console.log(`[🧠 Prompt Inject] 📡 OK | Count: ${STATE.prompts.length}`);
      return STATE.prompts;

    } catch (error) {
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Error in fetchPrompts:', error);
      return [];
    } finally {
      STATE.isLoading = false;
    }
  }

  // ============================================================================
  // SHOW PROMPT SELECTION MENU
  // ============================================================================
  
  function showPromptMenu(prompts, options = {}) {
    const isSearchMode = options.mode === 'search';
    
    // Remove old menu if exists
    const existingMenu = document.getElementById('brainbox-prompt-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create menu container
    const menu = document.createElement('div');
    menu.id = 'brainbox-prompt-menu';
    if (isSearchMode) menu.classList.add('brainbox-mode-search');

    menu.innerHTML = `
      <div class="brainbox-prompt-menu-overlay"></div>
      <div class="brainbox-prompt-menu-content ${isSearchMode ? 'brainbox-compact' : ''}">
        <div class="brainbox-prompt-menu-header">
          <div class="brainbox-prompt-menu-header-main">
            <h3>${isSearchMode ? 'Search Prompts' : 'Select a prompt'}</h3>
            <div class="brainbox-prompt-menu-header-actions">
              ${!isSearchMode ? '<button class="brainbox-prompt-menu-refresh" aria-label="Refresh" title="Refresh prompt list">🔄</button>' : ''}
              <button class="brainbox-prompt-menu-close" aria-label="Close">×</button>
            </div>
          </div>
          <div class="brainbox-prompt-menu-search-container">
            <input type="text" class="brainbox-prompt-menu-search" placeholder="Type to search..." autofocus />
          </div>
        </div>
        <div class="brainbox-prompt-menu-list">
          ${renderPromptList(prompts)}
        </div>
      </div>
    `;

    function renderPromptList(promptsToRender) {
      if (promptsToRender.length === 0) {
        return `
          <div class="brainbox-prompt-menu-empty">
            <p>No prompts available</p>
            <p class="brainbox-prompt-menu-empty-hint">Use the refresh button (🔄) to load prompts from the dashboard</p>
          </div>
        `;
      }

      return promptsToRender.map((prompt, index) => `
        <div class="brainbox-prompt-menu-item" data-prompt-id="${prompt.id}" data-index="${index}">
          <div class="brainbox-prompt-menu-item-title">${escapeHtml(prompt.title)}</div>
          ${prompt.content ? `<div class="brainbox-prompt-menu-item-preview">${escapeHtml(prompt.content.substring(0, 100))}${prompt.content.length > 100 ? '...' : ''}</div>` : ''}
        </div>
      `).join('');
    }

    // Add styles
    injectStyles();

    // Add event listeners
    function attachItemListeners() {
      menu.querySelectorAll('.brainbox-prompt-menu-item').forEach(item => {
        item.addEventListener('click', () => {
          const promptId = item.dataset.promptId;
          const prompt = prompts.find(p => p.id === promptId);
          if (prompt) {
            injectPrompt(prompt);
            menu.remove();
          }
        });
      });
    }

    attachItemListeners();

    // Search logic
    const searchInput = menu.querySelector('.brainbox-prompt-menu-search');
    const listContainer = menu.querySelector('.brainbox-prompt-menu-list');

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = prompts.filter(p => 
        p.title.toLowerCase().includes(query) || 
        (p.content && p.content.toLowerCase().includes(query))
      );
      listContainer.innerHTML = renderPromptList(filtered);
      attachItemListeners();
    });

    menu.querySelector('.brainbox-prompt-menu-close').addEventListener('click', () => {
      menu.remove();
    });

    menu.querySelector('.brainbox-prompt-menu-overlay').addEventListener('click', () => {
      menu.remove();
    });

    // Refresh button handler
    const refreshButton = menu.querySelector('.brainbox-prompt-menu-refresh');
    if (refreshButton) {
      let isRefreshing = false;
      
      refreshButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Prevent multiple simultaneous refreshes
        if (isRefreshing) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⏳ Refresh already in progress...');
          return;
        }
                        
        isRefreshing = true;
        refreshButton.style.animation = 'spin 1s linear infinite';
        refreshButton.style.pointerEvents = 'none';
        refreshButton.style.opacity = '0.7';
                        
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 🔄 Starting refresh...');
        showNotification('Refreshing list...', 'info');
        
        try {
          // Reload access token before refresh
          // No auth required
                              
          const newPrompts = await fetchPrompts(true); // Force refresh
                              
          if (CONFIG.DEBUG_MODE) console.log(`[🧠 Prompt Inject] ✅ Refresh complete: ${newPrompts.length} prompts`);
          
          if (newPrompts.length > 0) {
            // Update menu with new prompts
            const listContainer = menu.querySelector('.brainbox-prompt-menu-list');
            if (listContainer) {
              listContainer.innerHTML = newPrompts.map((prompt, index) => `
                <div class="brainbox-prompt-menu-item" data-prompt-id="${prompt.id}" data-index="${index}">
                  <div class="brainbox-prompt-menu-item-title">${escapeHtml(prompt.title)}</div>
                  ${prompt.content ? `<div class="brainbox-prompt-menu-item-preview">${escapeHtml(prompt.content.substring(0, 100))}${prompt.content.length > 100 ? '...' : ''}</div>` : ''}
                </div>
              `).join('');
              
              // Re-attach event listeners
              listContainer.querySelectorAll('.brainbox-prompt-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                  const promptId = item.dataset.promptId;
                  const prompt = newPrompts.find(p => p.id === promptId);
                  if (prompt) {
                    injectPrompt(prompt);
                    menu.remove();
                  }
                });
              });
              
              // Only notify if prompts are found
              // (Redundant success notification removed here to prevent double toast)
            }
          } else {
            // Only show warning if explicitly 0 prompts found
             if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⚠️ No prompts found via refresh');
             showNotification('No prompts found for the menu.', 'warning');
          }
        } catch (error) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Error during refresh:', error);
          showNotification('Error refreshing. Check console.', 'error');
        } finally {
          isRefreshing = false;
          refreshButton.style.animation = '';
          refreshButton.style.pointerEvents = 'auto';
          refreshButton.style.opacity = '1';
        }
      });
                      
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Refresh button initialized');
    } else {
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⚠️ Refresh button not found in menu');
    }

    // Add menu to DOM
    document.body.appendChild(menu);

    // Focus search input
    const searchInputActual = menu.querySelector('.brainbox-prompt-menu-search');
    if (searchInputActual) {
      setTimeout(() => searchInputActual.focus(), 100);
    }
  }

  // ============================================================================
  // INJECT PROMPT INTO TEXTAREA
  // ============================================================================
  
  function injectPrompt(prompt) {
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 💉 Injecting prompt:', prompt.title);
    
    // Search for textarea (universal for all platforms)
    const textarea = findTextarea();
        
    if (!textarea) {
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Textarea not found. Checking document.activeElement:', document.activeElement?.tagName);
      showNotification('No textarea found for injection', 'error');
      return;
    }

    // Inject content
    const content = prompt.content || '';
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📝 Content for injection (length):', content.length);

    // Check if it's a textarea or contenteditable div
    const isContentEditable = textarea.contentEditable === 'true' || 
                              textarea.getAttribute('contenteditable') === 'true';
    
    if (isContentEditable) {
      // For contenteditable divs
      // Imitating a delicate sequence of events for Gemini/React
      try {
        // 1. Initial focus and selection preparation
        textarea.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textarea);
        range.collapse(false); // Move to end
        selection.removeAllRanges();
        selection.addRange(range);

        // 2. Simulate typing start (important for React/Gemini)
        textarea.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        textarea.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));

        // 3. Use execCommand for insertion - this is the most native way for React
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⌨️ Executing execCommand...');
        const success = document.execCommand('insertText', false, content);
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ execCommand result:', success, 'New text:', textarea.innerText.substring(0, 30) + '...');
        
        // 4. Send standard events
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: content
        });
        textarea.dispatchEvent(inputEvent);
                
        // Standard text input event
        textarea.dispatchEvent(new Event('textInput', { bubbles: true }));
    
        // 5. Finishing typing
        textarea.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: content }));
                
        // Forced sync for Gemini if needed
        if (textarea.innerText.length === 0 && content.length > 0) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⚠️ execCommand did not change text, trying innerText...');
          textarea.innerText = content;
        }
        
        // 6. Simulate key up
        const keyUpEvent = new KeyboardEvent('keyup', {
          key: ' ',
          code: 'Space',
          bubbles: true
        });
        textarea.dispatchEvent(keyUpEvent);
        
      } catch (e) {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⚠️ Injection failed, falling back:', e);
        textarea.innerText = content;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      // For standard textareas (ChatGPT/Claude)
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⌨️ Inserting into standard textarea...');
      textarea.value = value.substring(0, start) + content + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + content.length;
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Value updated. New length:', textarea.value.length);
      
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Sync state
    setTimeout(() => {
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      textarea.blur();
      setTimeout(() => {
        textarea.focus();
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Injection complete');
      }, 50);
    }, 100);
    
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Prompt injected successfully');
    showNotification(`Prompt "${prompt.title}" injected`, 'success');
  }

  // ============================================================================
  // CREATE PROMPT FROM SELECTED TEXT
  // ============================================================================
  
  function showCreatePromptDialog(selectedText) {
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📝 Showing create prompt dialog');
        
    // Remove old dialog if exists
    const existingDialog = document.getElementById('brainbox-create-prompt-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    // Show loading notification while fetching folders
    showNotification('Loading folders...', 'info');
        
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.id = 'brainbox-create-prompt-dialog';
    
    // Fetch folders before showing dialog
    (async () => {
      let folders = [];
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getUserFolders' });
        if (response && response.success) {
          folders = response.folders || [];
          // Filter only prompt folders if type is available, otherwise show all
          folders = folders.filter(f => !f.type || f.type === 'prompt' || f.type === 'custom' || f.type === 'default');
        }
      } catch (err) {
        console.error('[🧠 Prompt Inject] Error fetching folders:', err);
      }

      const folderOptions = folders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');

      dialog.innerHTML = `
        <div class="brainbox-prompt-menu-overlay"></div>
        <div class="brainbox-create-prompt-dialog-content">
          <div class="brainbox-create-prompt-dialog-header">
            <h3>Create Prompt</h3>
            <button class="brainbox-create-prompt-dialog-close" aria-label="Close">×</button>
          </div>
          <div class="brainbox-create-prompt-dialog-body">
            <div class="brainbox-create-prompt-field">
              <label for="brainbox-prompt-title">Title <span class="required">*</span></label>
              <input type="text" id="brainbox-prompt-title" placeholder="Enter prompt title..." maxlength="200" />
            </div>
            <div class="brainbox-create-prompt-field">
              <label for="brainbox-prompt-content">Content <span class="required">*</span></label>
              <textarea id="brainbox-prompt-content" rows="6" placeholder="Enter prompt content...">${escapeHtml(selectedText)}</textarea>
            </div>
            <div class="brainbox-create-prompt-field">
              <label>Save to Folder</label>
              <div id="brainbox-prompt-folder-list" class="brainbox-folder-selection-list">
                <div class="brainbox-folder-option selected" data-folder-id="">
                  <span class="folder-icon">📂</span>
                  <span class="folder-name">(No folder - Root)</span>
                </div>
                ${folders.map(f => `
                  <div class="brainbox-folder-option" data-folder-id="${f.id}">
                    <span class="folder-icon">📁</span>
                    <span class="folder-name">${escapeHtml(f.name)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="brainbox-create-prompt-field">
              <label for="brainbox-prompt-use-in-context-menu" style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="brainbox-prompt-use-in-context-menu" checked style="margin-right: 8px;" />
                Use in context menu (BrainBox Prompts)
              </label>
            </div>
          </div>
          <div class="brainbox-create-prompt-dialog-footer">
            <button class="brainbox-create-prompt-cancel">Cancel</button>
            <button class="brainbox-create-prompt-save">Save</button>
          </div>
        </div>
      `;
      
      // Add styles
      injectStyles();
      
      // Event listeners
      const closeButton = dialog.querySelector('.brainbox-create-prompt-dialog-close');
      const cancelButton = dialog.querySelector('.brainbox-create-prompt-cancel');
      const saveButton = dialog.querySelector('.brainbox-create-prompt-save');
      const overlay = dialog.querySelector('.brainbox-prompt-menu-overlay');
      const titleInput = dialog.querySelector('#brainbox-prompt-title');
      const contentTextarea = dialog.querySelector('#brainbox-prompt-content');
      const folderListContainer = dialog.querySelector('#brainbox-prompt-folder-list');
      let selectedFolderId = "";

      // Handle folder selection in custom list
      folderListContainer.querySelectorAll('.brainbox-folder-option').forEach(opt => {
        opt.addEventListener('click', () => {
          folderListContainer.querySelectorAll('.brainbox-folder-option').forEach(el => el.classList.remove('selected'));
          opt.classList.add('selected');
          selectedFolderId = opt.dataset.folderId;
        });
      });
      
      const closeDialog = () => {
        dialog.remove();
      };
      
      closeButton.addEventListener('click', closeDialog);
      cancelButton.addEventListener('click', closeDialog);
      overlay.addEventListener('click', closeDialog);
      
      saveButton.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const content = contentTextarea.value.trim();
            
        if (!title) {
          showNotification('Please enter a title', 'warning');
          titleInput.focus();
          return;
        }

        if (!content) {
          showNotification('Please enter prompt content', 'warning');
          contentTextarea.focus();
          return;
        }
        
        const useInContextMenu = dialog.querySelector('#brainbox-prompt-use-in-context-menu').checked;
        const folderId = selectedFolderId || null;
        
        // Disable button during save
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        
        try {
          const result = await createPrompt({
            title: title,
            content: content,
            folder_id: folderId,
            use_in_context_menu: useInContextMenu
          });
          
          if (result.success) {
            showNotification(`Prompt "${title}" created successfully!`, 'success');
            closeDialog();
            // Optional: trigger refresh in background
            chrome.runtime.sendMessage({ action: 'syncPrompts' }).catch(() => {});
          } else {
            throw new Error(result.error || 'Failed to create prompt');
          }
        } catch (error) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Error creating prompt:', error);
          showNotification(`Error: ${error.message}`, 'error');
          saveButton.disabled = false;
          saveButton.textContent = 'Save';
        }
      });
      
      // Add dialog to DOM
      document.body.appendChild(dialog);
      
      // Focus on input field
      setTimeout(() => {
        titleInput.focus();
      }, 100);
    })();
  }
  
  // ============================================================================
  // CREATE PROMPT IN API
  // ============================================================================
  
  async function createPrompt(promptData) {
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📤 Creating prompt:', promptData.title);
    
    try {
      // Get access token from storage
      const storage = await chrome.storage.local.get(['accessToken']);
      const accessToken = storage.accessToken;
      
      if (!accessToken) {
        const errorMsg = 'Extension not linked. Please visit <a href="' + CONFIG.API_BASE_URL + '/extension-auth" target="_blank" style="color:white;text-decoration:underline;">this page</a> to sync.';
        showNotification(errorMsg, 'warning');
        throw new Error('Missing access token');
      }
      
      const url = `${CONFIG.API_BASE_URL}${CONFIG.API_ENDPOINT}`;
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header if access token is available
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const options = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          title: promptData.title,
          content: promptData.content,
          folder_id: promptData.folder_id || null,
          color: '#6366f1', // Default color
          use_in_context_menu: promptData.use_in_context_menu || false
        })
      };
      
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📋 Request details:', {
        url,
        title: promptData.title,
        contentLength: promptData.content.length,
        use_in_context_menu: promptData.use_in_context_menu,
        hasAuth: !!accessToken
      });
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.text();
          if (errorData) {
            errorMessage += ` - ${errorData}`;
          }
        } catch (e) {
          // Ignore
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Prompt created successfully:', data.id);
      
      return { success: true, data: data };
      
    } catch (error) {
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Error creating prompt:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // FIND TEXTAREA (Universal for all platforms)
  // ============================================================================
  
  function findTextarea() {
    const hostname = window.location.hostname;
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 🔍 Searching for textarea on:', hostname);
    
    // Platform-specific selectors
    const platformSelectors = {
      'chat.deepseek.com': [
        'textarea#chat-input',
        'textarea[placeholder*="message"]'
      ],
      'x.com': [
        'div[role="textbox"][data-testid="grok_input_field"]',
        'div[role="textbox"]',
        'textarea'
      ],
      'perplexity.ai': [
        'textarea[placeholder*="Ask anything"]',
        'textarea'
      ],
      'chat.qwenlm.ai': [
        'textarea.qwen-input',
        'textarea[placeholder*="Enter your prompt"]',
        'textarea'
      ],
      'chat.lmsys.org': [
        'textarea[data-testid="textbox"]',
        'textarea'
      ],
      'chatgpt.com': [
        'textarea#prompt-textarea',
        'textarea[data-id*="root"]',
        'textarea[placeholder*="Message"]'
      ],
      'chat.openai.com': [
        'textarea#prompt-textarea',
        'textarea[data-id*="root"]',
        'textarea[placeholder*="Message"]'
      ],
      'claude.ai': [
        'textarea[placeholder*="Message"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]'
      ]
    };
    
    // Universal selectors (works everywhere)
    const universalSelectors = [
      'textarea[placeholder*="prompt"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Type"]',
      'textarea[data-testid*="input"]',
      'textarea[class*="input"]',
      'textarea[class*="text"]',
      'textarea[class*="message"]',
      'textarea[id*="input"]',
      'textarea[id*="message"]',
      'textarea[id*="prompt"]',
      'textarea:focus', // Active textarea
      'textarea',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'input[type="text"][multiline]',
      'input[type="textarea"]'
    ];
    
    // First try platform-specific selectors
    if (platformSelectors[hostname]) {
      for (const selector of platformSelectors[hostname]) {
        const element = document.querySelector(selector);
        if (element && isElementVisible(element)) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Found textarea (platform-specific):', selector);
          return element;
        }
      }
    }
    
    // Then try universal selectors
    for (const selector of universalSelectors) {
      const element = document.querySelector(selector);
      if (element && isElementVisible(element)) {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Found textarea (universal):', selector);
        return element;
      }
    }
    
    // Fallback: Search all textareas and contenteditables and choose the best fit
    const allTextareas = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"], input[type="text"]'));
    if (allTextareas.length > 0) {
      // Filter only visible ones
      const visibleTextareas = allTextareas.filter(ta => isElementVisible(ta));
      
      if (visibleTextareas.length > 0) {
        // Prioritize:
        // 1. Active field (focused)
        const focused = visibleTextareas.find(ta => ta === document.activeElement);
        if (focused) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Found textarea (focused)');
          return focused;
        }
        
        // 2. Bottom-most textarea (usually the input field)
        visibleTextareas.sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return rectB.bottom - rectA.bottom;
        });
        
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Found textarea (fallback)');
        return visibleTextareas[0];
      }
    }
    
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⚠️ Textarea not found');
    return null;
  }
  
  // Helper function to check if element is visible
  function isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top >= -100 && // Allow a bit outside viewport
      rect.left >= -100 &&
      rect.bottom <= window.innerHeight + 100 &&
      rect.right <= window.innerWidth + 100 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  // ============================================================================
  // MESSAGE LISTENER
  // ============================================================================
  
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'showPromptMenu') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Received message to show menu');
        
        (async () => {
          try {
            // Check access token
            // No auth required
                                
            // Loading prompts
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 🔍 Loading prompts...');
            const prompts = await fetchPrompts();
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📊 Loaded prompts:', prompts.length);
                                
            // Show menu even if no prompts found to allow refresh button usage
            showPromptMenu(prompts);
                                
            if (prompts.length === 0) {
              showNotification('No prompts available. Use the refresh button to load new ones.', 'warning');
            }
            
            sendResponse({ success: true, count: prompts.length });
          } catch (error) {
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Error:', error);
            showNotification(`Error: ${error.message}`, 'error');
            // Show menu even on error to allow refresh attempt
            showPromptMenu([]);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }

      if (request.action === 'injectPrompt') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Received message to inject prompt');
        
        // Clear any existing loading notifications
        const existingNotifications = document.querySelectorAll('.brainbox-prompt-notification');
        existingNotifications.forEach(n => n.remove());

        if (request.prompt) {
          injectPrompt(request.prompt);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No prompt provided' });
        }
        
        return true;
      }

      if (request.action === 'refreshPrompts') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Received message to refresh prompts');
        
        (async () => {
          try {
            const prompts = await fetchPrompts(true); // Force refresh
            sendResponse({ success: true, count: prompts.length });
          } catch (error) {
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Error during refresh:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }

      if (request.action === 'checkIfEditableField') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Checking if click is in editable field');
        
        try {
          const { pageX, pageY } = request.clickInfo || {};
          
          if (typeof pageX === 'number' && typeof pageY === 'number' && 
              isFinite(pageX) && isFinite(pageY) && 
              pageX >= 0 && pageY >= 0) {
            const elementAtPoint = document.elementFromPoint(pageX - window.scrollX, pageY - window.scrollY);
            
            if (elementAtPoint) {
              // Check if element or its parent is textarea/contenteditable
              let current = elementAtPoint;
              let isEditable = false;
              
              for (let i = 0; i < 5 && current; i++) {
                if (current.tagName === 'TEXTAREA' || 
                    current.tagName === 'INPUT' ||
                    current.contentEditable === 'true' ||
                    current.getAttribute('contenteditable') === 'true') {
                  isEditable = true;
                  break;
                }
                current = current.parentElement;
              }
              
              if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Check complete:', { isEditable });
              sendResponse({ success: true, isEditable });
              return true;
            }
          }
          
          sendResponse({ success: true, isEditable: false });
        } catch (error) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Error during check:', error);
          sendResponse({ success: false, isEditable: false });
        }
        
        return true;
      }

      if (request.action === 'showCreatePromptDialog') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Received message to create prompt from selection');
        
        (async () => {
          try {
            const { selectedText } = request;
            
            if (!selectedText || selectedText.trim().length === 0) {
              showNotification('No text selected', 'warning');
              sendResponse({ success: false, error: 'No text selected' });
              return;
            }
            
            // Show create prompt dialog
            showCreatePromptDialog(selectedText);
            
            sendResponse({ success: true });
          } catch (error) {
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Error:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }


      
      if (request.action === 'triggerSaveChat') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Received message to trigger save chat');
        
        // This handler acts as a fallback or universal listener.
        // Platform-specific content scripts (content-chatgpt.js, etc.) should handle the actual saving.
        // If this logs but nothing happens, it means the platform script is missing or failed.
      }



      if (request.action === 'openCreatePromptDialog') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Received message to create prompt from selection');
        
        const { selectedText } = request;
        
        if (!selectedText || selectedText.trim().length === 0) {
          showNotification('No text selected', 'warning');
          sendResponse({ success: false, error: 'No text selected' });
          return true;
        }
        
        // Show create prompt dialog
        showCreatePromptDialog(selectedText);
        sendResponse({ success: true });
        
        return true;
      }

      if (request.action === 'showPromptMenu') {
        const { mode } = request;
        fetchPrompts().then(prompts => {
          showPromptMenu(prompts, { mode });
        });
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'showNotification') {
        showNotification(request.message, request.type, request.duration);
        sendResponse({ success: true });
        return true;
      }

      return false; // No handler for this action
    });

    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Message listener active');
  }

  // ============================================================================
  // STYLES
  // ============================================================================
      
  function injectStyles() {
    if (document.getElementById('brainbox-prompt-inject-styles')) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'brainbox-prompt-inject-styles';
    style.textContent = `
      #brainbox-prompt-menu {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      .brainbox-prompt-menu-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .brainbox-prompt-menu-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .brainbox-prompt-menu-header {
        display: flex;
        flex-direction: column;
        padding: 0;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .brainbox-prompt-menu-header-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
      }

      .brainbox-prompt-menu-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }

      .brainbox-prompt-menu-search-container {
        padding: 0 24px 16px 24px;
      }

      .brainbox-prompt-menu-search {
        width: 100%;
        padding: 10px 16px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        background: white;
        color: #111827;
        outline: none;
        transition: all 0.2s;
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
      }

      .brainbox-prompt-menu-search:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), inset 0 1px 2px rgba(0,0,0,0.05);
      }

      .brainbox-prompt-menu-header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .brainbox-prompt-menu-refresh {
        background: none;
        border: none;
        font-size: 18px;
        line-height: 1;
        color: #6b7280;
        cursor: pointer;
        padding: 4px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
        user-select: none;
      }

      .brainbox-prompt-menu-refresh:hover {
        background: #f3f4f6;
        color: #3b82f6;
        transform: scale(1.1);
      }

      .brainbox-prompt-menu-refresh:active {
        transform: scale(0.95);
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .brainbox-prompt-menu-close {
        background: none;
        border: none;
        font-size: 28px;
        line-height: 1;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .brainbox-prompt-menu-close:hover {
        background: #f3f4f6;
        color: #111827;
      }

      .brainbox-prompt-menu-list {
        overflow-y: auto;
        flex: 1;
        padding: 8px;
      }

      .brainbox-prompt-menu-item {
        padding: 16px;
        margin: 4px 0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
      }

      .brainbox-prompt-menu-item:hover {
        background: #f9fafb;
        border-color: #e5e7eb;
      }

      .brainbox-prompt-menu-item:focus {
        outline: none;
        background: #f3f4f6;
        border-color: #3b82f6;
      }

      .brainbox-prompt-menu-item-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        margin-bottom: 8px;
      }

      .brainbox-prompt-menu-item-preview {
        font-size: 14px;
        color: #6b7280;
        line-height: 1.5;
      }

      .brainbox-prompt-menu-empty {
        padding: 40px 20px;
        text-align: center;
        color: #6b7280;
      }

      .brainbox-prompt-menu-empty p {
        margin: 8px 0;
      }

      .brainbox-prompt-menu-empty-hint {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 12px;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .brainbox-prompt-menu-content {
          background: #1f2937;
        }

        .brainbox-prompt-menu-header {
          border-bottom-color: #374151;
          background: #111827;
        }

        .brainbox-prompt-menu-header h3 {
          color: #f9fafb;
        }

        .brainbox-prompt-menu-search {
          background: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }

        .brainbox-prompt-menu-search:focus {
          border-color: #3b82f6;
        }

        .brainbox-prompt-menu-close {
          color: #9ca3af;
        }

        .brainbox-prompt-menu-close:hover {
          background: #374151;
          color: #f9fafb;
        }

        .brainbox-prompt-menu-refresh {
          color: #9ca3af;
        }

        .brainbox-prompt-menu-refresh:hover {
          background: #374151;
          color: #3b82f6;
        }

        .brainbox-prompt-menu-item:hover {
          background: #374151;
          border-color: #4b5563;
        }

        .brainbox-prompt-menu-item:focus {
          background: #4b5563;
          border-color: #3b82f6;
        }

        .brainbox-prompt-menu-item-title {
          color: #f9fafb;
        }

        .brainbox-prompt-menu-item-preview {
          color: #9ca3af;
        }

        .brainbox-prompt-menu-empty {
          color: #9ca3af;
        }

        .brainbox-prompt-menu-empty-hint {
          color: #6b7280;
        }
      }

      /* Compact Mode */
      .brainbox-prompt-menu-content.brainbox-compact {
        max-width: 450px;
        max-height: 60vh;
      }

      .brainbox-compact .brainbox-prompt-menu-header-main {
        padding: 12px 20px;
      }

      .brainbox-compact .brainbox-prompt-menu-search-container {
        padding: 0 20px 12px 20px;
      }

      .brainbox-compact .brainbox-prompt-menu-item {
        padding: 12px 16px;
      }

      .brainbox-compact .brainbox-prompt-menu-item-title {
        font-size: 14px;
        margin-bottom: 4px;
      }

      .brainbox-compact .brainbox-prompt-menu-item-preview {
        font-size: 12px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Create Prompt Dialog Styles */
      #brainbox-create-prompt-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      .brainbox-create-prompt-dialog-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .brainbox-create-prompt-dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
      }

      .brainbox-create-prompt-dialog-header h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #111827;
      }

      .brainbox-create-prompt-dialog-close {
        background: none;
        border: none;
        font-size: 28px;
        line-height: 1;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .brainbox-create-prompt-dialog-close:hover {
        background: #f3f4f6;
        color: #111827;
      }

      .brainbox-create-prompt-dialog-body {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .brainbox-create-prompt-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .brainbox-create-prompt-field label {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }

      .brainbox-create-prompt-field .required {
        color: #ef4444;
      }

      .brainbox-create-prompt-field input[type="text"] {
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }

      .brainbox-create-prompt-field input[type="text"]:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .brainbox-create-prompt-field textarea {
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        outline: none;
        resize: vertical;
        font-family: inherit;
        background: white;
        color: #111827;
      }

      .brainbox-create-prompt-field textarea:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .brainbox-folder-select {
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        outline: none;
        background: white;
        color: #111827;
        cursor: pointer;
        width: 100%;
      }

      .brainbox-folder-select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      /* Dropdown sizing logic */
      .brainbox-folder-select option {
        padding: 8px;
        background: white;
        color: #111827;
      }

      .brainbox-create-prompt-field input[type="checkbox"] {
        margin-right: 8px;
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .brainbox-create-prompt-field label:has(input[type="checkbox"]) {
        display: flex;
        align-items: center;
        cursor: pointer;
      }

      .brainbox-create-prompt-dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
      }

      .brainbox-folder-selection-list {
        max-height: 180px; /* Approx 5 items (36px each) */
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #f9fafb;
      }

      .brainbox-folder-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.2s;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        color: #4b5563;
      }

      .brainbox-folder-option:last-child {
        border-bottom: none;
      }

      .brainbox-folder-option:hover {
        background: #f3f4f6;
      }

      .brainbox-folder-option.selected {
        background: #e0e7ff;
        color: #4f46e5;
        font-weight: 600;
      }

      .brainbox-folder-option .folder-icon {
        font-size: 16px;
      }

      .brainbox-folder-option .folder-name {
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .brainbox-create-prompt-cancel,
      .brainbox-create-prompt-save {
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }

      .brainbox-create-prompt-cancel {
        background: #f3f4f6;
        color: #374151;
      }

      .brainbox-create-prompt-cancel:hover {
        background: #e5e7eb;
      }

      .brainbox-create-prompt-save {
        background: #3b82f6;
        color: white;
      }

      .brainbox-create-prompt-save:hover {
        background: #2563eb;
      }

      .brainbox-create-prompt-save:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }

      /* Dark mode for Create Prompt Dialog */
      @media (prefers-color-scheme: dark) {
        .brainbox-create-prompt-dialog-content {
          background: #1f2937;
        }

        .brainbox-create-prompt-dialog-header {
          border-bottom-color: #374151;
        }

        .brainbox-create-prompt-dialog-header h3 {
          color: #f9fafb;
        }

        .brainbox-create-prompt-dialog-close {
          color: #9ca3af;
        }

        .brainbox-create-prompt-dialog-close:hover {
          background: #374151;
          color: #f9fafb;
        }

        .brainbox-create-prompt-field label {
          color: #f3f4f6;
        }

        .brainbox-create-prompt-field input[type="text"],
        .brainbox-create-prompt-field textarea {
          background: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }

        .brainbox-create-prompt-field input[type="text"]:focus {
          border-color: #3b82f6;
        }

        .brainbox-create-prompt-field textarea {
          background: #374151;
          color: #9ca3af;
        }

        .brainbox-create-prompt-dialog-footer {
          border-top-color: #374151;
        }

        .brainbox-folder-selection-list {
          background: #374151;
          border-color: #4b5563;
        }

        .brainbox-folder-option {
          color: #9ca3af;
          border-bottom-color: rgba(255,255,255,0.05);
        }

        .brainbox-folder-option:hover {
          background: #4b5563;
          color: #f3f4f6;
        }

        .brainbox-folder-option.selected {
          background: rgba(79, 70, 229, 0.2);
          color: #818cf8;
        }

        .brainbox-create-prompt-cancel {
          background: #374151;
          color: #f3f4f6;
        }

        .brainbox-create-prompt-cancel:hover {
          background: #4b5563;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================
  
  function showNotification(message, type = 'info', requestDuration) {
    // Replace any existing notifications to avoid overlap
    const existing = document.querySelectorAll('.brainbox-prompt-notification');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `brainbox-prompt-notification brainbox-prompt-notification-${type}`;
    // Use innerHTML to support links in messages
    notification.innerHTML = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000000;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation keyframes if not exists
    if (!document.getElementById('brainbox-prompt-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'brainbox-prompt-notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    
    // Default duration is 3 seconds, unless specified (0 = manual removal)
    const duration = typeof requestDuration === 'number' ? requestDuration : 3000;

    if (duration > 0) {
      // Remove after duration
      setTimeout(() => {
        if (notification.parentElement) {
          notification.style.animation = 'slideIn 0.3s ease-out reverse';
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  window.BrainBoxPromptInject = {
    fetchPrompts,
    showPromptMenu,
    injectPrompt,
    findTextarea,
    findGeminiTextarea: findTextarea // Backward compatibility
  };

  // ============================================================================
  // STARTING
  // ============================================================================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

