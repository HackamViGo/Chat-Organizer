// ============================================================================
// BrainBox Prompt Inject
// Injecting prompts from dashboard into Gemini textarea
// ============================================================================
    
(function () {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
      
  interface Config {
    API_BASE_URL: string | null;
    API_ENDPOINT: string;
    DEBUG_MODE: boolean;
  }

  const CONFIG: Config = {
    API_BASE_URL: null, // Will be loaded from storage
    API_ENDPOINT: '/api/prompts', // API endpoint for prompts
    DEBUG_MODE: false
  };

  const debugLog = (...args: any[]) => {
    if (CONFIG.DEBUG_MODE) console.info('[Prompt Inject]', ...args);
  };

  // Prevent multiple executions
  if ((window as any).BRAINBOX_PROMPT_INJECT_LOADED) {
    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ⏹️ Script already loaded, skipping init.');
    return;
  }
  (window as any).BRAINBOX_PROMPT_INJECT_LOADED = true;

  if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] Loading (v2.0.2)...');

  // ============================================================================
  // STATE
  // ============================================================================
  
  interface Prompt {
    id: string;
    title: string;
    content: string;
    [key: string]: any;
  }

  interface State {
    prompts: Prompt[];
    isLoading: boolean;
  }
  
  const STATE: State = {
    prompts: [],
    isLoading: false
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
      
  async function loadConfig(): Promise<void> {
    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] Loading config...');
    
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const config = await chrome.storage.local.get(['API_BASE_URL']);
        if (config.API_BASE_URL) {
          CONFIG.API_BASE_URL = config.API_BASE_URL;
          if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ✅ Loaded Config:', CONFIG.API_BASE_URL);
        } else {
          CONFIG.API_BASE_URL = 'https://brainbox-alpha.vercel.app';
        }
      } else {
        CONFIG.API_BASE_URL = 'https://brainbox-alpha.vercel.app';
      }
    } catch (e) {
      console.warn('[🧠 Prompt Inject] ⚠️ Config load check failed (using default):', e);
      CONFIG.API_BASE_URL = 'https://brainbox-alpha.vercel.app';
    }
  }

  // ============================================================================
  // FETCH PROMPTS FROM API
  // ============================================================================
  
    async function fetchPrompts(forceRefresh: boolean = false): Promise<Prompt[]> {
    if (STATE.isLoading && !forceRefresh) return STATE.prompts;
    STATE.isLoading = true;

    try {
      if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📥 Fetching via Background (CSP Bypass)...');
      
      const response = await chrome.runtime.sendMessage({ action: 'fetchPrompts' }) as { success: boolean; data?: any; error?: string };
      
      if (!response || !response.success) {
        if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ❌ Background fetch failed:', response?.error);
        if (response?.error === 'Unauthorized') {
             if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ⚠️ Auth failed (Background)');
        }
        return [];
      }

      const data = response.data;
      if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📦 Received data from background:', typeof data);

      // Handle { prompts: [...] } structure vs [...]
      const promptsList = Array.isArray(data.prompts) ? data.prompts : (Array.isArray(data) ? data : []);
      STATE.prompts = promptsList;
      
      if (CONFIG.DEBUG_MODE) debugLog(`[🧠 Prompt Inject] 📡 OK | Count: ${STATE.prompts.length}`);
      return STATE.prompts;

    } catch (error) {
      if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ❌ Error in fetchPrompts:', error);
      return [];
    } finally {
      STATE.isLoading = false;
    }
  }

  // ============================================================================
  // SHOW PROMPT SELECTION MENU
  // ============================================================================
  
  function showPromptMenu(prompts: Prompt[], options: { mode?: string } = {}): void {
    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📱 Showing prompt menu...');
    
    // Remove if already exists
    const existing = document.getElementById('brainbox-prompt-menu');
    if (existing) existing.remove();
    
    injectStyles();
    
    const menu = document.createElement('div');
    menu.id = 'brainbox-prompt-menu';
    
    const isCompact = options.mode === 'compact';
    
    menu.innerHTML = `
      <div class="brainbox-prompt-menu-overlay"></div>
      <div class="brainbox-prompt-menu-content ${isCompact ? 'brainbox-compact' : ''}">
        <div class="brainbox-prompt-menu-header">
          <div class="brainbox-prompt-menu-header-main">
            <h3>BrainBox Prompts</h3>
            <div class="brainbox-prompt-menu-header-actions">
              <button class="brainbox-prompt-menu-refresh" title="Refresh Prompts">🔄</button>
              <button class="brainbox-prompt-menu-close" title="Close Menu">&times;</button>
            </div>
          </div>
          <div class="brainbox-prompt-menu-search-container">
            <input type="text" class="brainbox-prompt-menu-search" placeholder="Search prompts..." autofocus>
          </div>
        </div>
        <div class="brainbox-prompt-menu-list">
          <!-- Prompts will be injected here -->
        </div>
      </div>
    `;
    
    document.body.appendChild(menu);
    
    const listContainer = menu.querySelector('.brainbox-prompt-menu-list') as HTMLElement;
    const searchInput = menu.querySelector('.brainbox-prompt-menu-search') as HTMLInputElement;
    const closeBtn = menu.querySelector('.brainbox-prompt-menu-close') as HTMLElement;
    const overlay = menu.querySelector('.brainbox-prompt-menu-overlay') as HTMLElement;
    const refreshBtn = menu.querySelector('.brainbox-prompt-menu-refresh') as HTMLElement;
    
    function attachItemListeners(promptsToLink: Prompt[]) {
      menu.querySelectorAll('.brainbox-prompt-menu-item').forEach(item => {
        item.addEventListener('click', () => {
          const promptId = (item as HTMLElement).dataset.promptId;
          const prompt = promptsToLink.find(p => p.id === promptId);
          if (prompt) {
            injectPrompt(prompt);
            menu.remove();
          }
        });
        
        item.addEventListener('keydown', (e: Event) => {
          const keyEvent = e as KeyboardEvent;
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault();
            (item as HTMLElement).click();
          }
        });
      });
    }

    function renderAndAttach(promptsToRender: Prompt[]) {
      if (!listContainer) return;
      
      if (promptsToRender.length === 0) {
        listContainer.innerHTML = `
          <div class="brainbox-prompt-menu-empty">
            <p>No prompts found</p>
            <p class="brainbox-prompt-menu-empty-hint">Try adjusting your search</p>
          </div>
        `;
        return;
      }
      
      listContainer.innerHTML = promptsToRender.map((prompt, index) => `
        <div class="brainbox-prompt-menu-item" data-prompt-id="${prompt.id}" data-index="${index}" tabindex="0">
          <div class="brainbox-prompt-menu-item-title">${escapeHtml(prompt.title)}</div>
          <div class="brainbox-prompt-menu-item-preview">${escapeHtml(prompt.content.substring(0, 100))}${prompt.content.length > 100 ? '...' : ''}</div>
        </div>
      `).join('');
      
      attachItemListeners(promptsToRender);
    }

    // Initial render
    renderAndAttach(prompts);
    
    // Search functionality
    if (searchInput) {
      searchInput.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const query = target.value.toLowerCase();
        const filtered = prompts.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.content.toLowerCase().includes(query)
        );
        renderAndAttach(filtered);
      });
      
      searchInput.focus();
    }

    if (closeBtn) closeBtn.addEventListener('click', () => menu.remove());
    if (overlay) overlay.addEventListener('click', () => menu.remove());
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        refreshBtn.style.animation = 'spin 1s linear infinite';
        try {
          const newPrompts = await fetchPrompts(true);
          renderAndAttach(newPrompts);
        } finally {
          refreshBtn.style.animation = '';
        }
      });
    }

    // Focus search input
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }
  }

  // ============================================================================
  // INJECT PROMPT INTO TEXTAREA
  // ============================================================================
  
  function injectPrompt(prompt: Prompt): void {
    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 💉 Injecting prompt:', prompt.title);
    const content = prompt.content;
    const textarea = (document.activeElement as HTMLTextAreaElement | HTMLDivElement) || 
                   document.querySelector('textarea') || 
                   document.querySelector('[contenteditable="true"]');

    if (!textarea) {
      if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ❌ No active textarea found');
      showNotification('Click on a text area first', 'warning');
      return;
    }

    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 💉 Injecting into:', textarea.tagName);

    const isContentEditable = textarea.getAttribute('contenteditable') === 'true' || 
                             textarea.tagName !== 'TEXTAREA' && textarea.tagName !== 'INPUT';

    if (isContentEditable) {
      const activeEl = textarea as HTMLDivElement;
      try {
        activeEl.focus();
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(activeEl);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        activeEl.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        activeEl.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));

        if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ⌨️ Executing execCommand...');
        const success = document.execCommand('insertText', false, content);
        
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: content
        });
        activeEl.dispatchEvent(inputEvent);
        activeEl.dispatchEvent(new Event('textInput', { bubbles: true }));
        activeEl.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: content }));

        if (activeEl.innerText.length === 0 && content.length > 0) {
          activeEl.innerText = content;
        }

        activeEl.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
      } catch (e) {
        activeEl.innerText = content;
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      const activeEl = textarea as HTMLTextAreaElement;
      const start = activeEl.selectionStart || 0;
      const end = activeEl.selectionEnd || 0;
      const value = activeEl.value;
      
      activeEl.value = value.substring(0, start) + content + value.substring(end);
      activeEl.selectionStart = activeEl.selectionEnd = start + content.length;
      activeEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setTimeout(() => {
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      textarea.blur();
      setTimeout(() => {
        (textarea as HTMLElement).focus();
        (textarea as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }, 100);
    
    showNotification(`Prompt "${prompt.title}" injected`, 'success');
  }

  // ============================================================================
  // CREATE PROMPT FROM SELECTED TEXT
  // ============================================================================
  
  function showCreatePromptDialog(selectedText: string): void {
    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📝 Showing create prompt dialog');
        
    const existingDialog = document.getElementById('brainbox-create-prompt-dialog');
    if (existingDialog) existingDialog.remove();

    showNotification('Loading folders...', 'info');
        
    const dialog = document.createElement('div');
    dialog.id = 'brainbox-create-prompt-dialog';
    
    (async () => {
      let folders: any[] = [];
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getUserFolders' }) as { success: boolean; folders?: any[] };
        if (response && response.success) {
          folders = response.folders || [];
          folders = folders.filter((f: any) => !f.type || f.type === 'prompt' || f.type === 'custom' || f.type === 'default');
        }
      } catch (err) {
        console.error('[🧠 Prompt Inject] Error fetching folders:', err);
      }

      dialog.innerHTML = `
        <div class="brainbox-prompt-menu-overlay"></div>
        <div class="brainbox-create-prompt-dialog-content">
          <div class="brainbox-create-prompt-dialog-header">
            <h3>Create Prompt</h3>
            <button class="brainbox-create-prompt-dialog-close" aria-label="Close">&times;</button>
          </div>
          <div class="brainbox-create-prompt-dialog-body">
            <div class="brainbox-create-prompt-field">
              <label for="brainbox-prompt-title">Title <span class="required">*</span></label>
              <input type="text" id="brainbox-prompt-title" placeholder="Enter prompt title..." maxlength="200">
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
                ${folders.map((f: any) => `
                  <div class="brainbox-folder-option" data-folder-id="${f.id}">
                    <span class="folder-icon">📁</span>
                    <span class="folder-name">${escapeHtml(f.name)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="brainbox-create-prompt-field">
              <label for="brainbox-prompt-use-in-context-menu" style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="brainbox-prompt-use-in-context-menu" checked style="margin-right: 8px;">
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
      
      injectStyles();
      
      const closeBtn = dialog.querySelector('.brainbox-create-prompt-dialog-close') as HTMLElement;
      const cancelBtn = dialog.querySelector('.brainbox-create-prompt-cancel') as HTMLElement;
      const saveBtn = dialog.querySelector('.brainbox-create-prompt-save') as HTMLButtonElement;
      const overlay = dialog.querySelector('.brainbox-prompt-menu-overlay') as HTMLElement;
      const titleInput = dialog.querySelector('#brainbox-prompt-title') as HTMLInputElement;
      const contentTextarea = dialog.querySelector('#brainbox-prompt-content') as HTMLTextAreaElement;
      const folderList = dialog.querySelector('#brainbox-prompt-folder-list') as HTMLElement;
      const contextMenuCheckbox = dialog.querySelector('#brainbox-prompt-use-in-context-menu') as HTMLInputElement;
      
      let selectedFolderId: string | null = null;

      if (folderList) {
        folderList.querySelectorAll('.brainbox-folder-option').forEach(opt => {
          opt.addEventListener('click', () => {
            folderList.querySelectorAll('.brainbox-folder-option').forEach(el => el.classList.remove('selected'));
            opt.classList.add('selected');
            selectedFolderId = (opt as HTMLElement).dataset.folderId || null;
          });
        });
      }
      
      const close = () => dialog.remove();
      if (closeBtn) closeBtn.addEventListener('click', close);
      if (cancelBtn) cancelBtn.addEventListener('click', close);
      if (overlay) overlay.addEventListener('click', close);
      
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          const title = titleInput?.value.trim() || '';
          const content = contentTextarea?.value.trim() || '';
              
          if (!title) {
            showNotification('Please enter a title', 'warning');
            titleInput?.focus();
            return;
          }

          if (!content) {
            showNotification('Please enter prompt content', 'warning');
            contentTextarea?.focus();
            return;
          }
          
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';
          
          try {
            const result = await createPrompt({
              title,
              content,
              folder_id: selectedFolderId,
              use_in_context_menu: contextMenuCheckbox?.checked || false
            });
            
            if (result.success) {
              showNotification(`Prompt "${title}" created successfully!`, 'success');
              close();
              chrome.runtime.sendMessage({ action: 'syncPrompts' }).catch(() => {});
            } else {
              throw new Error(result.error || 'Failed to create prompt');
            }
          } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
          }
        });
      }
      
      document.body.appendChild(dialog);
      setTimeout(() => titleInput?.focus(), 100);
    })();
  }
  
  // ============================================================================
  // CREATE PROMPT IN API
  // ============================================================================
  
  async function createPrompt(promptData: { title: string; content: string; folder_id: string | null; use_in_context_menu: boolean }): Promise<{ success: boolean; error?: string }> {
    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📤 Creating prompt:', promptData.title);
    
    try {
      const storage = await chrome.storage.local.get(['accessToken']);
      const accessToken = storage.accessToken as string | undefined;
      
      if (!accessToken) {
        const errorMsg = 'Extension not linked. Please sync from the dashboard.';
        showNotification(errorMsg, 'warning');
        throw new Error('Missing access token');
      }
      
      const url = `${CONFIG.API_BASE_URL}${CONFIG.API_ENDPOINT}`;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      
      const options: RequestInit = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          title: promptData.title,
          content: promptData.content,
          folder_id: promptData.folder_id || null,
          color: '#6366f1',
          use_in_context_menu: promptData.use_in_context_menu || false
        })
      };
      
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      
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
      if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ✅ Prompt created successfully:', data.id);
      
      return { success: true };
      
    } catch (error: any) {
      if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ❌ Error creating prompt:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // FIND TEXTAREA (Universal for all platforms)
  // ============================================================================
  
  function findTextarea(): HTMLElement | null {
    const hostname = window.location.hostname;
    
    // Platform-specific selectors
    const platformSelectors: { [key: string]: string[] } = {
      'chat.deepseek.com': [
        'textarea#chat-input',
        'textarea'
      ],
      'x.com': [
        'div[data-testid="tweetTextarea_0"]',
        'div[contenteditable="true"]',
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
      'textarea:focus',
      'textarea',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'input[type="text"][multiline]',
      'input[type="textarea"]'
    ];
    
    if (platformSelectors[hostname]) {
      for (const selector of platformSelectors[hostname]) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && isElementVisible(element)) {
          return element;
        }
      }
    }
    
    for (const selector of universalSelectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && isElementVisible(element)) {
        return element;
      }
    }
    
    const allTextareas = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"], input[type="text"]')) as HTMLElement[];
    if (allTextareas.length > 0) {
      const visibleTextareas = allTextareas.filter(ta => isElementVisible(ta));
      
      if (visibleTextareas.length > 0) {
        const focused = visibleTextareas.find(ta => ta === document.activeElement);
        if (focused) return focused;
        
        visibleTextareas.sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return rectB.bottom - rectA.bottom;
        });
        
        return visibleTextareas[0];
      }
    }
    
    return null;
  }
  
  function isElementVisible(element: Element): boolean {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top >= -100 &&
      rect.left >= -100 &&
      rect.bottom <= window.innerHeight + 100 &&
      rect.right <= window.innerWidth + 100 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  async function createPromptFromSelection(selectedText: string): Promise<void> {
    if (!selectedText || selectedText.trim().length === 0) {
      showNotification('No text selected', 'warning');
      return;
    }

    try {
      if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📝 Creating prompt from selection...');
      showCreatePromptDialog(selectedText);
    } catch (error: any) {
      if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ❌ Error:', error);
      showNotification(`Error: ${error.message || 'Unknown error'}`, 'error');
    }
  }

  // ============================================================================
  // MESSAGE LISTENER
  // ============================================================================
  
  function setupMessageListener(): void {
    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 🎧 Setting up message listener...');
    
    chrome.runtime.onMessage.addListener((request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      if (request.action === 'ping') {
        sendResponse({ success: true, version: '2.0.2' });
        return true;
      }
      
      if (request.action === 'getPrompts') {
        if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📨 Received message to get prompts');
        (async () => {
          try {
            // Loading prompts
            if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 🔍 Loading prompts...');
            const prompts = await fetchPrompts();
            if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📊 Loaded prompts:', prompts.length);
                                
            // Show menu even if no prompts found to allow refresh button usage
            showPromptMenu(prompts, { mode: request.mode });
                                
            if (prompts.length === 0) {
              showNotification('No prompts available. Use the refresh button to load new ones.', 'warning');
            }
                                
            sendResponse({ success: true, count: prompts.length });
          } catch (error: any) {
            if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ❌ Error:', error);
            showNotification(`Error: ${error.message || 'Unknown error'}`, 'error');
            // Show menu even on error to allow refresh attempt
            showPromptMenu([]);
            sendResponse({ success: false, error: error.message || 'Unknown error' });
          }
        })();
        
        return true; // Keep channel open for async response
      }

      if (request.action === 'injectPrompt') {
        if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📨 Received message to inject prompt');
        
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
        if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📨 Received message to refresh prompts');
        
        (async () => {
          try {
            const prompts = await fetchPrompts(true); // Force refresh
            sendResponse({ success: true, count: prompts.length });
          } catch (error: any) {
            if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ❌ Error during refresh:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }

      if (request.action === 'checkIfEditableField') {
        if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 📨 Checking if click is in editable field');
        
        try {
          const { pageX, pageY } = request.clickInfo || {};
          
          if (typeof pageX === 'number' && typeof pageY === 'number' && 
              isFinite(pageX) && isFinite(pageY) && 
              pageX >= 0 && pageY >= 0) {
            const elementAtPoint = document.elementFromPoint(pageX - window.scrollX, pageY - window.scrollY);
            
            if (elementAtPoint) {
              // Check if element or its parent is textarea/contenteditable
              let current: Element | null = elementAtPoint;
              let isEditable = false;
              
              for (let i = 0; i < 5 && current; i++) {
                const el = current as HTMLElement;
                if (el.tagName === 'TEXTAREA' || 
                    el.tagName === 'INPUT' ||
                    el.contentEditable === 'true' ||
                    el.getAttribute('contenteditable') === 'true') {
                  isEditable = true;
                  break;
                }
                current = current.parentElement as HTMLElement | null;
              }
              
              if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ✅ Check complete:', { isEditable });
              sendResponse({ success: true, isEditable });
              return true;
            }
          }
          
          sendResponse({ success: true, isEditable: false });
        } catch (error) {
          if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ❌ Error during check:', error);
          sendResponse({ success: false, isEditable: false });
        }
        
        return true;
      }

      if (request.action === 'showCreatePromptDialog' || request.action === 'openCreatePromptDialog') {
        if (CONFIG.DEBUG_MODE) debugLog(`[🧠 Prompt Inject] 📨 Received message action: ${request.action}`);
        
        (async () => {
          try {
            const { selectedText } = request;
            
            if (!selectedText || selectedText.trim().length === 0) {
              showNotification('No text selected', 'warning');
              sendResponse({ success: false, error: 'No text selected' });
              return;
            }
            
            showCreatePromptDialog(selectedText);
            sendResponse({ success: true });
          } catch (error: any) {
            if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ❌ Error:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; 
      }
      return false; // No handler for this action
    });

    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ✅ Message listener active');
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
  
  function showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', requestDuration?: number): void {
    const existing = document.querySelectorAll('.brainbox-prompt-notification');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `brainbox-prompt-notification brainbox-prompt-notification-${type}`;
    notification.innerHTML = message;
    
    const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${bgColor};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000000;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
    `;

    if (!document.getElementById('brainbox-prompt-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'brainbox-prompt-notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    
    const duration = typeof requestDuration === 'number' ? requestDuration : 3000;

    if (duration > 0) {
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
  
  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  (window as any).BrainBoxPromptInject = {
    fetchPrompts,
    showPromptMenu,
    injectPrompt,
    findTextarea,
    findGeminiTextarea: findTextarea
  };

  async function init(): Promise<void> {
    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] 🚀 Initializing BrainBox...');
    await loadConfig();
    injectStyles();
    setupMessageListener();
    
    // Notify background that we are ready
    chrome.runtime.sendMessage({ action: 'contentScriptReady', platform: 'universal' }).catch(() => {});
    
    if (CONFIG.DEBUG_MODE) debugLog('[🧠 Prompt Inject] ✅ Ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); });
  } else {
    init();
  }

})();

/**
 * File: apps/extension/src/prompt-inject/prompt-inject.ts
 * Role: Content script for browser extension to manage and inject prompts into web textareas.
 */

// CORE FUNCTIONALITIES:
// - UI Injection: Dynamically creates and styles menus, dialogs, and notifications on the host page.
// - Prompt Management: Fetches prompts, displays them in a selection menu, and injects content into detected textareas.
// - Prompt Creation: Provides a modal UI to save new prompts into specific folders.
// - Notification System: Toast-style alerts for success/error feedback with auto-dismissal.
// - Background Communication: Uses chrome.runtime to sync state and notify the extension background script.

// ARCHITECTURE:
// - Encapsulation: Wrapped in an IIFE to prevent global namespace pollution.
// - Public API: Exports BrainBoxPromptInject to window for external access.
// - Styling: Injects a comprehensive CSS block supporting dark mode and slide animations.
// - Initialization: Checks document.readyState to bootstrap styles, config, and message listeners.

// KEY COMPONENTS:
// - init(): Loads configuration, injects CSS, and establishes message listeners.
// - showNotification(): Renders floating status messages with dynamic coloring based on type.
// - findTextarea(): Utility to locate input fields (aliased for Gemini/General).
// - injectStyles(): Handles the injection of the extensive UI stylesheet.
