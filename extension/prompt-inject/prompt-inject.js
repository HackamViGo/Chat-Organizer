// ============================================================================
// BrainBox Prompt Inject
// Инжектиране на промптове от dashboard в Gemini textarea
// ============================================================================

(function () {
  'use strict';

  console.log('[🧠 Prompt Inject] Зареждане...');

  // ============================================================================
  // КОНФИГУРАЦИЯ
  // ============================================================================
  
  // ============================================================================
  // КОНФИГУРАЦИЯ - VERCEL PRODUCTION
  // ============================================================================
  
  const CONFIG = {
    DASHBOARD_URL: 'https://brainbox-alpha.vercel.app',
    API_ENDPOINT: '/api/prompts', // API endpoint за prompts
    DEBUG_MODE: true
  };

  // ============================================================================
  // СЪСТОЯНИЕ
  // ============================================================================
  
  const STATE = {
    prompts: [],
    isLoading: false,
    accessToken: null
  };

  // ============================================================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================================================
  
  async function init() {
    console.log('[🧠 Prompt Inject] Инициализация...');
    
    // Зареждане на access token
    await loadAccessToken();
    
    // Настройка на message listener
    setupMessageListener();
    
    console.log('[🧠 Prompt Inject] ✅ Готово');
  }

  // ============================================================================
  // ЗАРЕЖДАНЕ НА ACCESS TOKEN
  // ============================================================================
  
  async function loadAccessToken() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['accessToken', 'expiresAt'], (result) => {
          if (result.accessToken) {
            // Проверка дали token е изтекъл
            const isExpired = result.expiresAt && result.expiresAt < Date.now();
            
            if (isExpired) {
              console.warn('[🧠 Prompt Inject] ⚠️ Access token е изтекъл');
              STATE.accessToken = null;
            } else {
              STATE.accessToken = result.accessToken;
              console.log('[🧠 Prompt Inject] ✅ Access token зареден');
            }
          } else {
            console.warn('[🧠 Prompt Inject] ⚠️ Няма access token');
            STATE.accessToken = null;
          }
          resolve();
        });
      } catch (error) {
        console.error('[🧠 Prompt Inject] ❌ Грешка при зареждане на access token:', error);
        STATE.accessToken = null;
        resolve();
      }
    });
  }

  // ============================================================================
  // ИЗВЛИЧАНЕ НА ПРОМПТОВЕТЕ ОТ API
  // ============================================================================
  
  async function fetchPrompts(forceRefresh = false) {
    if (!STATE.accessToken) {
      console.error('[🧠 Prompt Inject] ❌ Няма access token');
      return [];
    }

    if (STATE.isLoading && !forceRefresh) {
      console.log('[🧠 Prompt Inject] ⏳ Вече се зареждат промптове...');
      return STATE.prompts;
    }

    STATE.isLoading = true;
    console.log('[🧠 Prompt Inject] 📥 Зареждане на промптове от API...');

    try {
      // Fetch only prompts marked for context menu
      const url = `${CONFIG.DASHBOARD_URL}${CONFIG.API_ENDPOINT}?use_in_context_menu=true`;
      
      console.log('[🧠 Prompt Inject] 🔑 Access token:', STATE.accessToken ? `${STATE.accessToken.substring(0, 20)}...` : 'НЯМА');
      
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${STATE.accessToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      const response = await fetch(url, options);

      console.log('[🧠 Prompt Inject] 📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        // Опит за четене на error message от response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.text();
          console.error('[🧠 Prompt Inject] ❌ Error response body:', errorData);
          if (errorData) {
            errorMessage += ` - ${errorData}`;
          }
        } catch (e) {
          console.error('[🧠 Prompt Inject] ❌ Не може да се прочете error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Проверка за правилна структура на response
      if (!data || typeof data !== 'object') {
        console.warn('[🧠 Prompt Inject] ⚠️ Неочакван response формат:', data);
        STATE.prompts = [];
        return [];
      }
      
      STATE.prompts = Array.isArray(data.prompts) ? data.prompts : (Array.isArray(data) ? data : []);
      
      console.log(`[🧠 Prompt Inject] ✅ Заредени ${STATE.prompts.length} промпта (за context menu)`);
      
      if (CONFIG.DEBUG_MODE && STATE.prompts.length > 0) {
        console.log('[🧠 Prompt Inject] 📋 Първи промпт:', {
          id: STATE.prompts[0].id,
          title: STATE.prompts[0].title,
          use_in_context_menu: STATE.prompts[0].use_in_context_menu
        });
      }
      
      return STATE.prompts;

    } catch (error) {
      console.error('[🧠 Prompt Inject] ❌ Грешка при зареждане на промптове:', error);
      console.error('[🧠 Prompt Inject] ❌ Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        url: `${CONFIG.DASHBOARD_URL}${CONFIG.API_ENDPOINT}?use_in_context_menu=true`,
        hasToken: !!STATE.accessToken
      });
      
      // По-подробна информация за грешката
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('[🧠 Prompt Inject] ❌ Network error - проверь дали dashboard URL е правилен');
        console.error('[🧠 Prompt Inject] ❌ URL:', `${CONFIG.DASHBOARD_URL}${CONFIG.API_ENDPOINT}?use_in_context_menu=true`);
      } else if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        console.error('[🧠 Prompt Inject] ❌ Unauthorized - access token може да е изтекъл');
        // Опит за презареждане на token
        await loadAccessToken();
        console.log('[🧠 Prompt Inject] 🔄 Token презареден, опит за повторна заявка...');
        // Опит за повторна заявка след презареждане на token
        try {
          const url = `${CONFIG.DASHBOARD_URL}${CONFIG.API_ENDPOINT}?use_in_context_menu=true`;
          const retryOptions = {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${STATE.accessToken}`,
              'Content-Type': 'application/json'
            }
          };
          const retryResponse = await fetch(url, retryOptions);
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            STATE.prompts = Array.isArray(retryData.prompts) ? retryData.prompts : [];
            console.log(`[🧠 Prompt Inject] ✅ Успешно заредени ${STATE.prompts.length} промпта след retry`);
            return STATE.prompts;
          }
        } catch (retryError) {
          console.error('[🧠 Prompt Inject] ❌ Retry също не успее:', retryError);
        }
      } else if (error.message && error.message.includes('404')) {
        console.error('[🧠 Prompt Inject] ❌ API endpoint не е намерен');
        console.error('[🧠 Prompt Inject] ❌ Провери дали API endpoint е правилен:', CONFIG.API_ENDPOINT);
      } else {
        console.error('[🧠 Prompt Inject] ❌ Неочаквана грешка:', error);
      }
      
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
          console.log('[🧠 Prompt Inject] ⏳ Refresh вече е в процес...');
          return;
        }
        
        isRefreshing = true;
        refreshButton.style.animation = 'spin 1s linear infinite';
        refreshButton.style.pointerEvents = 'none';
        refreshButton.style.opacity = '0.7';
        
        console.log('[🧠 Prompt Inject] 🔄 Стартиране на refresh...');
        showNotification('Обновяване на списъка...', 'info');
        
        try {
          // Презареждане на access token преди refresh
          await loadAccessToken();
          
          const newPrompts = await fetchPrompts(true); // Force refresh
          
          console.log(`[🧠 Prompt Inject] ✅ Refresh завършен: ${newPrompts.length} промпта`);
          
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
              
              showNotification(`Обновено: ${newPrompts.length} промпта`, 'success');
            }
          } else {
            showNotification('Няма промптове за context menu', 'warning');
            console.log('[🧠 Prompt Inject] ⚠️ Няма промптове с use_in_context_menu=true');
          }
        } catch (error) {
          console.error('[🧠 Prompt Inject] ❌ Грешка при refresh:', error);
          showNotification('Грешка при обновяване. Провери конзолата.', 'error');
        } finally {
          isRefreshing = false;
          refreshButton.style.animation = '';
          refreshButton.style.pointerEvents = 'auto';
          refreshButton.style.opacity = '1';
        }
      });
      
      console.log('[🧠 Prompt Inject] ✅ Refresh бутон инициализиран');
    } else {
      console.warn('[🧠 Prompt Inject] ⚠️ Refresh бутон не е намерен в менюто');
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
    console.log('[🧠 Prompt Inject] 💉 Инжектиране на промпт:', prompt.title);

    // Търсене на textarea (универсално за всички платформи)
    const textarea = findTextarea();
    
    if (!textarea) {
      console.error('[🧠 Prompt Inject] ❌ Не е намерен textarea');
      showNotification('Не е намерен textarea за инжектиране', 'error');
      return;
    }

    // Инжектиране на content
    const content = prompt.content || '';
    
    // Проверка дали е textarea или contenteditable div
    const isContentEditable = textarea.contentEditable === 'true' || 
                              textarea.getAttribute('contenteditable') === 'true';
    
    if (isContentEditable) {
      // За contenteditable div-ове
      textarea.textContent = content;
      textarea.innerText = content;
      
      // Тригериране на input event
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      textarea.dispatchEvent(inputEvent);
      
      // Тригериране на compositionend (за някои frameworks)
      const compositionEndEvent = new Event('compositionend', { bubbles: true });
      textarea.dispatchEvent(compositionEndEvent);
      
      // Тригериране на keydown и keyup (за някои frameworks)
      const keydownEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true });
      const keyupEvent = new KeyboardEvent('keyup', { bubbles: true, cancelable: true });
      textarea.dispatchEvent(keydownEvent);
      textarea.dispatchEvent(keyupEvent);
    } else {
      // За обикновени textarea
      textarea.value = content;
      
      // Тригериране на input event за да се актуализира UI-то на Gemini
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);
      
      // Тригериране на change event
      const changeEvent = new Event('change', { bubbles: true });
      textarea.dispatchEvent(changeEvent);
    }

    // Фокус на textarea
    textarea.focus();
    
    // Скролване до textarea
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });

    console.log('[🧠 Prompt Inject] ✅ Промпт инжектиран успешно');
    showNotification(`Промпт "${prompt.title}" инжектиран`, 'success');
  }

  // ============================================================================
  // СЪЗДАВАНЕ НА ПРОМПТ ОТ МАРКИРАН ТЕКСТ
  // ============================================================================
  
  function showCreatePromptDialog(selectedText) {
    console.log('[🧠 Prompt Inject] 📝 Показване на диалог за създаване на промпт');
    
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
            <label>Заглавие <span class="required">*</span></label>
            <input type="text" id="brainbox-prompt-title" placeholder="Въведи заглавие за промпта..." maxlength="200" />
          </div>
          <div class="brainbox-create-prompt-field">
            <label>Съдържание</label>
            <textarea id="brainbox-prompt-content" readonly rows="6">${escapeHtml(selectedText)}</textarea>
          </div>
          <div class="brainbox-create-prompt-field">
            <label>
              <input type="checkbox" id="brainbox-prompt-use-in-context-menu" checked />
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
        console.error('[🧠 Prompt Inject] ❌ Грешка при създаване на промпт:', error);
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
    if (!STATE.accessToken) {
      console.error('[🧠 Prompt Inject] ❌ Няма access token');
      await loadAccessToken();
      
      if (!STATE.accessToken) {
        return { success: false, error: 'No access token. Please log in to dashboard first.' };
      }
    }
    
    console.log('[🧠 Prompt Inject] 📤 Създаване на промпт:', promptData.title);
    console.log('[🧠 Prompt Inject] 🔑 Access token преди заявка:', STATE.accessToken ? `${STATE.accessToken.substring(0, 30)}...` : 'НЯМА');
    
    // Презареждане на token преди заявка (за всеки случай)
    await loadAccessToken();
    
    if (!STATE.accessToken) {
      console.error('[🧠 Prompt Inject] ❌ Все още няма access token след презареждане');
      return { success: false, error: 'No access token. Please log in to dashboard first and refresh the page.' };
    }
    
    console.log('[🧠 Prompt Inject] 🔑 Access token след презареждане:', `${STATE.accessToken.substring(0, 30)}...`);
    
    try {
      const url = `${CONFIG.DASHBOARD_URL}${CONFIG.API_ENDPOINT}`;
      
      const options = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STATE.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: promptData.title,
          content: promptData.content,
          color: '#6366f1', // Default color
          use_in_context_menu: promptData.use_in_context_menu || false
        })
      };
      
      console.log('[🧠 Prompt Inject] 📋 Request details:', {
        url,
        title: promptData.title,
        contentLength: promptData.content.length,
        use_in_context_menu: promptData.use_in_context_menu,
        hasAuthHeader: !!options.headers['Authorization']
      });
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        // При 401, опитваме да презаредим token и да повторим
        if (response.status === 401) {
          console.log('[🧠 Prompt Inject] ⚠️ 401 Unauthorized - опит за презареждане на token...');
          await loadAccessToken();
          
          if (STATE.accessToken) {
            // Опит за повторна заявка с новия token
            options.headers['Authorization'] = `Bearer ${STATE.accessToken}`;
            console.log('[🧠 Prompt Inject] 🔄 Повторна заявка с нов token...');
            
            const retryResponse = await fetch(url, options);
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              console.log('[🧠 Prompt Inject] ✅ Промпт създаден успешно след retry:', retryData.id);
              return { success: true, data: retryData };
            }
          }
        }
        
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
      console.log('[🧠 Prompt Inject] ✅ Промпт създаден успешно:', data.id);
      
      return { success: true, data: data };
      
    } catch (error) {
      console.error('[🧠 Prompt Inject] ❌ Грешка при създаване на промпт:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // НАМИРАНЕ НА TEXTAREA (Универсално за всички платформи)
  // ============================================================================
  
  function findTextarea() {
    const hostname = window.location.hostname;
    console.log('[🧠 Prompt Inject] 🔍 Търсене на textarea на:', hostname);
    
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
          console.log('[🧠 Prompt Inject] ✅ Намерен textarea (platform-specific):', selector);
          return element;
        }
      }
    }
    
    // След това опитваме универсални селектори
    for (const selector of universalSelectors) {
      const element = document.querySelector(selector);
      if (element && isElementVisible(element)) {
        console.log('[🧠 Prompt Inject] ✅ Намерен textarea (universal):', selector);
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
          console.log('[🧠 Prompt Inject] ✅ Намерен textarea (focused)');
          return focused;
        }
        
        // 2. Най-долното textarea (обикновено е input полето)
        visibleTextareas.sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return rectB.bottom - rectA.bottom;
        });
        
        console.log('[🧠 Prompt Inject] ✅ Намерен textarea (fallback)');
        return visibleTextareas[0];
      }
    }
    
    console.warn('[🧠 Prompt Inject] ⚠️ Не е намерен textarea');
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
        console.log('[🧠 Prompt Inject] 📨 Получено съобщение за показване на меню');
        
        (async () => {
          try {
            // Проверка за access token
            if (!STATE.accessToken) {
              console.log('[🧠 Prompt Inject] ⚠️ Няма access token, опит за зареждане...');
              await loadAccessToken();
              
              if (!STATE.accessToken) {
                console.error('[🧠 Prompt Inject] ❌ Все още няма access token');
                showNotification('Няма access token. Моля, влезте в dashboard първо.', 'error');
                sendResponse({ success: false, error: 'No access token' });
                return;
              }
            }
            
            // Зареждане на промптове
            console.log('[🧠 Prompt Inject] 🔍 Зареждане на промптове...');
            const prompts = await fetchPrompts();
            console.log('[🧠 Prompt Inject] 📊 Заредени промптове:', prompts.length);
            
            // Показване на меню (дори ако няма промптове, за да се вижда refresh бутонът)
            showPromptMenu(prompts);
            
            if (prompts.length === 0) {
              showNotification('Няма налични промптове. Използвайте refresh бутона за да заредите нови.', 'warning');
            }
            
            sendResponse({ success: true, count: prompts.length });
          } catch (error) {
            console.error('[🧠 Prompt Inject] ❌ Грешка:', error);
            showNotification(`Грешка: ${error.message}`, 'error');
            // Показваме менюто дори при грешка, за да може да се опита refresh
            showPromptMenu([]);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }

      if (request.action === 'injectPrompt') {
        console.log('[🧠 Prompt Inject] 📨 Получено съобщение за инжектиране на промпт');
        
        if (request.prompt) {
          injectPrompt(request.prompt);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No prompt provided' });
        }
        
        return true;
      }

      if (request.action === 'refreshPrompts') {
        console.log('[🧠 Prompt Inject] 📨 Получено съобщение за refresh на промптове');
        
        (async () => {
          try {
            const prompts = await fetchPrompts(true); // Force refresh
            sendResponse({ success: true, count: prompts.length });
          } catch (error) {
            console.error('[🧠 Prompt Inject] ❌ Грешка при refresh:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }

      if (request.action === 'checkIfEditableField') {
        console.log('[🧠 Prompt Inject] 📨 Проверка дали кликването е в editable поле');
        
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
              
              console.log('[🧠 Prompt Inject] ✅ Проверка завършена:', { isEditable });
              sendResponse({ success: true, isEditable });
              return true;
            }
          }
          
          sendResponse({ success: true, isEditable: false });
        } catch (error) {
          console.error('[🧠 Prompt Inject] ❌ Грешка при проверка:', error);
          sendResponse({ success: false, isEditable: false });
        }
        
        return true;
      }

      if (request.action === 'showCreatePromptDialog') {
        console.log('[🧠 Prompt Inject] 📨 Получено съобщение за създаване на промпт');
        
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
            console.error('[🧠 Prompt Inject] ❌ Грешка:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }

      return false;
    });

    console.log('[🧠 Prompt Inject] ✅ Message listener активен');
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
    notification.textContent = message;
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

