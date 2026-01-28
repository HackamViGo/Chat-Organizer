// ============================================================================
// BrainBox Prompt Inject
// Инжектиране на промптове от dashboard в Gemini textarea
// ============================================================================

(function () {
  'use strict';

  // ============================================================================
  // КОНФИГУРАЦИЯ
  // ============================================================================
  
  const CONFIG = {
    DASHBOARD_URL: window.BRAINBOX_CONFIG ? window.BRAINBOX_CONFIG.DASHBOARD_URL : 'https://brainbox-alpha.vercel.app',
    API_ENDPOINT: '/api/prompts', // API endpoint за prompts
    DEBUG_MODE: false
  };

  // Prevent multiple executions
  if (window.BRAINBOX_PROMPT_INJECT_LOADED) {
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⏹️ Script already loaded, skipping init.');
    return;
  }
  window.BRAINBOX_PROMPT_INJECT_LOADED = true;

  if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] Зареждане (v2.0.2)...');

  // ============================================================================
  // СЪСТОЯНИЕ
  // ============================================================================
  
  const STATE = {
    prompts: [],
    isLoading: false
  };

  // ============================================================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================================================
  
  async function init() {
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] Инициализация...');
    
    // Настройка на message listener
    setupMessageListener();
    
    // Notify background that we are ready
    chrome.runtime.sendMessage({ action: 'contentScriptReady', platform: 'universal' }).catch(() => {});
    
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Готово');
  }

  // ============================================================================
  // ИЗВЛИЧАНЕ НА ПРОМПТОВЕТЕ ОТ API
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
  // ПОКАЗВАНЕ НА МЕНЮ ЗА ИЗБОР НА ПРОМПТ
  // ============================================================================
  
  function showPromptMenu(prompts) {
    // Премахване на старо меню, ако съществува
    const existingMenu = document.getElementById('brainbox-prompt-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Показваме менюто дори ако няма промптове, за да може да се използва refresh бутонът
    // if (prompts.length === 0) {
    //   showNotification('Няма налични промптове', 'warning');
    //   return;
    // }

    // Създаване на меню контейнер
    const menu = document.createElement('div');
    menu.id = 'brainbox-prompt-menu';
    menu.innerHTML = `
      <div class="brainbox-prompt-menu-overlay"></div>
      <div class="brainbox-prompt-menu-content">
        <div class="brainbox-prompt-menu-header">
          <h3>Избери промпт</h3>
          <div class="brainbox-prompt-menu-header-actions">
            <button class="brainbox-prompt-menu-refresh" aria-label="Refresh" title="Обнови списъка с промптове">🔄</button>
            <button class="brainbox-prompt-menu-close" aria-label="Затвори">×</button>
          </div>
        </div>
        <div class="brainbox-prompt-menu-list">
          ${prompts.length > 0 ? prompts.map((prompt, index) => `
            <div class="brainbox-prompt-menu-item" data-prompt-id="${prompt.id}" data-index="${index}">
              <div class="brainbox-prompt-menu-item-title">${escapeHtml(prompt.title)}</div>
              ${prompt.content ? `<div class="brainbox-prompt-menu-item-preview">${escapeHtml(prompt.content.substring(0, 100))}${prompt.content.length > 100 ? '...' : ''}</div>` : ''}
            </div>
          `).join('') : `
            <div class="brainbox-prompt-menu-empty">
              <p>Няма налични промптове</p>
              <p class="brainbox-prompt-menu-empty-hint">Използвайте refresh бутона (🔄) за да заредите промптове от dashboard</p>
            </div>
          `}
        </div>
      </div>
    `;

    // Добавяне на стилове
    injectStyles();

    // Добавяне на event listeners
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
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⏳ Refresh вече е в процес...');
          return;
        }
        
        isRefreshing = true;
        refreshButton.style.animation = 'spin 1s linear infinite';
        refreshButton.style.pointerEvents = 'none';
        refreshButton.style.opacity = '0.7';
        
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 🔄 Стартиране на refresh...');
        showNotification('Обновяване на списъка...', 'info');
        
        try {
          // Презареждане на access token преди refresh
          // No auth required
          
          const newPrompts = await fetchPrompts(true); // Force refresh
          
          if (CONFIG.DEBUG_MODE) console.log(`[🧠 Prompt Inject] ✅ Refresh завършен: ${newPrompts.length} промпта`);
          
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
             showNotification('Няма намерени промптове за менюто.', 'warning');
          }
        } catch (error) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Грешка при refresh:', error);
          showNotification('Грешка при обновяване. Провери конзолата.', 'error');
        } finally {
          isRefreshing = false;
          refreshButton.style.animation = '';
          refreshButton.style.pointerEvents = 'auto';
          refreshButton.style.opacity = '1';
        }
      });
      
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Refresh бутон инициализиран');
    } else {
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⚠️ Refresh бутон не е намерен в менюто');
    }

    // Добавяне на менюто в DOM
    document.body.appendChild(menu);

    // Фокус на първия елемент
    const firstItem = menu.querySelector('.brainbox-prompt-menu-item');
    if (firstItem) {
      firstItem.focus();
    }
  }

  // ============================================================================
  // ИНЖЕКТИРАНЕ НА ПРОМПТ В TEXTAREA
  // ============================================================================
  
  function injectPrompt(prompt) {
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 💉 Инжектиране на промпт:', prompt.title);

    // Търсене на textarea (универсално за всички платформи)
    const textarea = findTextarea();
    
    if (!textarea) {
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Не е намерен textarea. Проверка на document.activeElement:', document.activeElement?.tagName);
      showNotification('Не е намерен textarea за инжектиране', 'error');
      return;
    }

    // Инжектиране на content
    const content = prompt.content || '';
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📝 Съдържание за инжектиране (дължина):', content.length);

    // Проверка дали е textarea или contenteditable div
    const isContentEditable = textarea.contentEditable === 'true' || 
                              textarea.getAttribute('contenteditable') === 'true';
    
    if (isContentEditable) {
      // За contenteditable div-ове
      // Имитираме по-деликатна поредица от събития за Gemini/React
      try {
        // 1. Първоначално фокусиране и подготовка на селекцията
        textarea.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textarea);
        range.collapse(false); // Отиди в края
        selection.removeAllRanges();
        selection.addRange(range);

        // 2. Симулираме започване на писане (за React/Gemini е важно)
        textarea.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        textarea.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));

        // 3. Използваме execCommand за вмъкване - това е най-нативния начин за React
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⌨️ Изпълнение на execCommand...');
        const success = document.execCommand('insertText', false, content);
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ execCommand резултат:', success, 'Нов текст:', textarea.innerText.substring(0, 30) + '...');
        
        // 4. Изпращаме стандартни събития
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: content
        });
        textarea.dispatchEvent(inputEvent);
        
        // Стандартно събитие за текст (някои по-стари версии го ползват)
        textarea.dispatchEvent(new Event('textInput', { bubbles: true }));

        // 5. Приключваме писането
        textarea.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: content }));
        
        // Малка принудителна синхронизация за Gemini
        if (textarea.innerText.length === 0 && content.length > 0) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⚠️ execCommand не промени текста, опит с innerText...');
          textarea.innerText = content;
        }
        
        // 6. Симулираме вдигане на клавиш
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
      // За обикновени textarea (ChatGPT/Claude)
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⌨️ Вмъкване в стандартно textarea...');
      textarea.value = value.substring(0, start) + content + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + content.length;
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Стойност обновена. Нова дължина:', textarea.value.length);
      
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Синхронизация на стейта
    setTimeout(() => {
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      textarea.blur();
      setTimeout(() => {
        textarea.focus();
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Инжектирането приключи');
      }, 50);
    }, 100);

    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Промпт инжектиран успешно');
    showNotification(`Промпт "${prompt.title}" инжектиран`, 'success');
  }

  // ============================================================================
  // СЪЗДАВАНЕ НА ПРОМПТ ОТ МАРКИРАН ТЕКСТ
  // ============================================================================
  
  function showCreatePromptDialog(selectedText) {
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📝 Показване на диалог за създаване на промпт');
    
    // Премахване на стар диалог, ако съществува
    const existingDialog = document.getElementById('brainbox-create-prompt-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    // Създаване на диалог контейнер
    const dialog = document.createElement('div');
    dialog.id = 'brainbox-create-prompt-dialog';
    dialog.innerHTML = `
      <div class="brainbox-prompt-menu-overlay"></div>
      <div class="brainbox-create-prompt-dialog-content">
        <div class="brainbox-create-prompt-dialog-header">
          <h3>Създай промпт</h3>
          <button class="brainbox-create-prompt-dialog-close" aria-label="Затвори">×</button>
        </div>
        <div class="brainbox-create-prompt-dialog-body">
          <div class="brainbox-create-prompt-field">
            <label for="brainbox-prompt-title">Заглавие <span class="required">*</span></label>
            <input type="text" id="brainbox-prompt-title" placeholder="Въведи заглавие за промпта..." maxlength="200" />
          </div>
          <div class="brainbox-create-prompt-field">
            <label for="brainbox-prompt-content">Съдържание</label>
            <textarea id="brainbox-prompt-content" readonly rows="6">${escapeHtml(selectedText)}</textarea>
          </div>
          <div class="brainbox-create-prompt-field">
            <label for="brainbox-prompt-use-in-context-menu" style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" id="brainbox-prompt-use-in-context-menu" checked style="margin-right: 8px;" />
              Използвай в context менюто (BrainBox Prompts)
            </label>
          </div>
        </div>
        <div class="brainbox-create-prompt-dialog-footer">
          <button class="brainbox-create-prompt-cancel">Отказ</button>
          <button class="brainbox-create-prompt-save">Запази</button>
        </div>
      </div>
    `;
    
    // Добавяне на стилове
    injectStyles();
    
    // Event listeners
    const closeButton = dialog.querySelector('.brainbox-create-prompt-dialog-close');
    const cancelButton = dialog.querySelector('.brainbox-create-prompt-cancel');
    const saveButton = dialog.querySelector('.brainbox-create-prompt-save');
    const overlay = dialog.querySelector('.brainbox-prompt-menu-overlay');
    const titleInput = dialog.querySelector('#brainbox-prompt-title');
    
    const closeDialog = () => {
      dialog.remove();
    };
    
    closeButton.addEventListener('click', closeDialog);
    cancelButton.addEventListener('click', closeDialog);
    overlay.addEventListener('click', closeDialog);
    
    saveButton.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      
      if (!title || title.length === 0) {
        showNotification('Моля, въведи заглавие', 'warning');
        titleInput.focus();
        return;
      }
      
      const useInContextMenu = dialog.querySelector('#brainbox-prompt-use-in-context-menu').checked;
      
      // Деактивиране на бутона по време на запазване
      saveButton.disabled = true;
      saveButton.textContent = 'Запазване...';
      
      try {
        const result = await createPrompt({
          title: title,
          content: selectedText,
          use_in_context_menu: useInContextMenu
        });
        
        if (result.success) {
          showNotification(`Промпт "${title}" създаден успешно!`, 'success');
          closeDialog();
        } else {
          throw new Error(result.error || 'Failed to create prompt');
        }
      } catch (error) {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Грешка при създаване на промпт:', error);
        showNotification(`Грешка: ${error.message}`, 'error');
        saveButton.disabled = false;
        saveButton.textContent = 'Запази';
      }
    });
    
    // Добавяне на диалога в DOM
    document.body.appendChild(dialog);
    
    // Фокус на input полето
    setTimeout(() => {
      titleInput.focus();
    }, 100);
  }
  
  // ============================================================================
  // СЪЗДАВАНЕ НА ПРОМПТ В API
  // ============================================================================
  
  async function createPrompt(promptData) {
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📤 Създаване на промпт:', promptData.title);
    
    try {
      // Get access token from storage
      const storage = await chrome.storage.local.get(['accessToken']);
      const accessToken = storage.accessToken;
      
      if (!accessToken) {
        const errorMsg = 'Не сте свързали разширението. Моля, посетете <a href="' + CONFIG.DASHBOARD_URL + '/extension-auth" target="_blank" style="color:white;text-decoration:underline;">тази страница</a> за синхронизация.';
        showNotification(errorMsg, 'warning');
        throw new Error('Missing access token');
      }
      
      const url = `${CONFIG.DASHBOARD_URL}${CONFIG.API_ENDPOINT}`;
      
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
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Промпт създаден успешно:', data.id);
      
      return { success: true, data: data };
      
    } catch (error) {
      if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Грешка при създаване на промпт:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // НАМИРАНЕ НА TEXTAREA (Универсално за всички платформи)
  // ============================================================================
  
  function findTextarea() {
    const hostname = window.location.hostname;
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 🔍 Търсене на textarea на:', hostname);
    
    // Платформо-специфични селектори
    const platformSelectors = {
      'gemini.google.com': [
        'textarea[aria-label*="Enter a prompt"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]'
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
      ],
      'x.com': [
        'div[contenteditable="true"][role="textbox"]',
        'div[data-testid="post-input"]',
        'textarea'
      ]
    };
    
    // Универсални селектори (работи навсякъде)
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
      'textarea:focus', // Активното textarea
      'textarea',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'input[type="text"][multiline]',
      'input[type="textarea"]'
    ];
    
    // Първо опитваме платформо-специфични селектори
    if (platformSelectors[hostname]) {
      for (const selector of platformSelectors[hostname]) {
        const element = document.querySelector(selector);
        if (element && isElementVisible(element)) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Намерен textarea (platform-specific):', selector);
          return element;
        }
      }
    }
    
    // След това опитваме универсални селектори
    for (const selector of universalSelectors) {
      const element = document.querySelector(selector);
      if (element && isElementVisible(element)) {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Намерен textarea (universal):', selector);
        return element;
      }
    }
    
    // Fallback: Търсене на всички textarea и contenteditable и избиране на най-подходящия
    const allTextareas = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"], input[type="text"]'));
    if (allTextareas.length > 0) {
      // Филтрираме само видимите
      const visibleTextareas = allTextareas.filter(ta => isElementVisible(ta));
      
      if (visibleTextareas.length > 0) {
        // Приоритизираме:
        // 1. Активното поле (focused)
        const focused = visibleTextareas.find(ta => ta === document.activeElement);
        if (focused) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Намерен textarea (focused)');
          return focused;
        }
        
        // 2. Най-долното textarea (обикновено е input полето)
        visibleTextareas.sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return rectB.bottom - rectA.bottom;
        });
        
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Намерен textarea (fallback)');
        return visibleTextareas[0];
      }
    }
    
    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ⚠️ Не е намерен textarea');
    return null;
  }
  
  // Helper функция за проверка дали елементът е видим
  function isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top >= -100 && // Позволяваме малко извън viewport
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
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Получено съобщение за показване на меню');
        
        (async () => {
          try {
            // Проверка за access token
            // No auth required
            
            // Зареждане на промптове
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 🔍 Зареждане на промптове...');
            const prompts = await fetchPrompts();
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📊 Заредени промптове:', prompts.length);
            
            // Показване на меню (дори ако няма промптове, за да се вижда refresh бутонът)
            showPromptMenu(prompts);
            
            if (prompts.length === 0) {
              showNotification('Няма налични промптове. Използвайте refresh бутона за да заредите нови.', 'warning');
            }
            
            sendResponse({ success: true, count: prompts.length });
          } catch (error) {
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Грешка:', error);
            showNotification(`Грешка: ${error.message}`, 'error');
            // Показваме менюто дори при грешка, за да може да се опита refresh
            showPromptMenu([]);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }

      if (request.action === 'injectPrompt') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Получено съобщение за инжектиране на промпт');
        
        if (request.prompt) {
          injectPrompt(request.prompt);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No prompt provided' });
        }
        
        return true;
      }

      if (request.action === 'refreshPrompts') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Получено съобщение за refresh на промптове');
        
        (async () => {
          try {
            const prompts = await fetchPrompts(true); // Force refresh
            sendResponse({ success: true, count: prompts.length });
          } catch (error) {
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Грешка при refresh:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }

      if (request.action === 'checkIfEditableField') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Проверка дали кликването е в editable поле');
        
        try {
          const { pageX, pageY } = request.clickInfo || {};
          
          if (typeof pageX === 'number' && typeof pageY === 'number' && 
              isFinite(pageX) && isFinite(pageY) && 
              pageX >= 0 && pageY >= 0) {
            const elementAtPoint = document.elementFromPoint(pageX, pageY);
            
            if (elementAtPoint) {
              // Проверка дали елементът или родител му е textarea/contenteditable
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
              
              if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Проверка завършена:', { isEditable });
              sendResponse({ success: true, isEditable });
              return true;
            }
          }
          
          sendResponse({ success: true, isEditable: false });
        } catch (error) {
          if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Грешка при проверка:', error);
          sendResponse({ success: false, isEditable: false });
        }
        
        return true;
      }

      if (request.action === 'showCreatePromptDialog') {
        if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] 📨 Получено съобщение за създаване на промпт');
        
        (async () => {
          try {
            const { selectedText } = request;
            
            if (!selectedText || selectedText.trim().length === 0) {
              showNotification('Няма маркиран текст', 'warning');
              sendResponse({ success: false, error: 'No text selected' });
              return;
            }
            
            // Показване на диалог за създаване на промпт
            showCreatePromptDialog(selectedText);
            
            sendResponse({ success: true });
          } catch (error) {
            if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ❌ Грешка:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }

      return false;
    });

    if (CONFIG.DEBUG_MODE) console.log('[🧠 Prompt Inject] ✅ Message listener активен');
  }

  // ============================================================================
  // СТИЛОВЕ
  // ============================================================================
  
  function injectStyles() {
    if (document.getElementById('brainbox-prompt-inject-styles')) {
      return; // Вече са инжектирани
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
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
      }

      .brainbox-prompt-menu-header h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #111827;
      }

      .brainbox-prompt-menu-header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .brainbox-prompt-menu-refresh {
        background: none;
        border: none;
        font-size: 20px;
        line-height: 1;
        color: #6b7280;
        cursor: pointer;
        padding: 4px;
        width: 36px;
        height: 36px;
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
        }

        .brainbox-prompt-menu-header h3 {
          color: #f9fafb;
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
        background: #f9fafb;
        color: #6b7280;
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
  
  function showNotification(message, type = 'info') {
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

    // Добавяне на animation keyframes ако не съществуват
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

    // Премахване след 3 секунди
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
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
  // ПУБЛИЧЕН API
  // ============================================================================
  
  window.BrainBoxPromptInject = {
    fetchPrompts,
    showPromptMenu,
    injectPrompt,
    findTextarea,
    findGeminiTextarea: findTextarea // Backward compatibility
  };

  // ============================================================================
  // СТАРТИРАНЕ
  // ============================================================================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

