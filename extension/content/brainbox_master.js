// ============================================================================
// BrainBox Master Coordinator
// Централна система за хващане на ВСИЧКИ Gemini разговори
// ============================================================================

(function () {
  'use strict';

  console.log('[🧠 BrainBox Master] Зареждане...');

  // ============================================================================
  // КОНФИГУРАЦИЯ
  // ============================================================================
  
  const CONFIG = {
    DB_NAME: 'BrainBoxGeminiMaster',
    DB_VERSION: 4, // Incremented to add images store
    AUTO_SAVE_ENABLED: true,
    SAVE_INTERVAL: 5000, // Проверка на всеки 5 секунди
    MAX_RETRIES: 3,
    DEBUG_MODE: true
  };

  // ============================================================================
  // ГЛОБАЛНО СЪСТОЯНИЕ
  // ============================================================================
  
  const STATE = {
    db: null,
    isInitialized: false,
    capturedConversations: new Map(), // conversationId -> full data
    encryptionKeys: new Map(), // conversationId -> key
    batchMessageCache: new Map(), // batch_key -> messages (за временно съхранение)
    processedCount: 0,
    failedCount: 0,
    lastSync: null
  };

  // ============================================================================
  // INDEXEDDB - ЕДИННА БАЗА ДАННИ
  // ============================================================================
  
  async function initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
      
      request.onerror = () => {
        console.error('[🧠 BrainBox Master] IndexedDB грешка:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        STATE.db = request.result;
        console.log('[🧠 BrainBox Master] ✅ IndexedDB свързана');
        resolve(STATE.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[🧠 BrainBox Master] Създаване на схема...');
        
        // Store 1: RAW BATCHEXECUTE DATA (както идва от мрежата)
        if (!db.objectStoreNames.contains('rawBatchData')) {
          const store = db.createObjectStore('rawBatchData', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('processed', 'processed', { unique: false });
          console.log('[🧠 BrainBox Master] ✅ Създаден rawBatchData store');
        }
        
        // Store 2: ENCRYPTION KEYS (ключове за декриптиране)
        if (!db.objectStoreNames.contains('encryptionKeys')) {
          const store = db.createObjectStore('encryptionKeys', { keyPath: 'conversationId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[🧠 BrainBox Master] ✅ Създаден encryptionKeys store');
        }
        
        // Store 3: DECODED CONVERSATIONS (отключени разговори)
        if (!db.objectStoreNames.contains('conversations')) {
          const store = db.createObjectStore('conversations', { keyPath: 'conversationId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          console.log('[🧠 BrainBox Master] ✅ Създаден conversations store');
        }
        
        // Store 4: SYNC QUEUE (опашка за синхронизация към dashboard)
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('retries', 'retries', { unique: false });
          console.log('[🧠 BrainBox Master] ✅ Създаден syncQueue store');
        }
        
        // Store 5: IMAGES (запазени изображения)
        if (!db.objectStoreNames.contains('images')) {
          const store = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('source_url', 'source_url', { unique: false });
          console.log('[🧠 BrainBox Master] ✅ Създаден images store');
        }
      };
    });
  }

  // ============================================================================
  // BATCHEXECUTE INTERCEPTOR - ХВАЩА ВСИЧКИ ЗАЯВКИ
  // ============================================================================
  
  function setupBatchexecuteInterceptor() {
    console.log('[🧠 BrainBox Master] Настройка на interceptor...');
    
    // Запазване на оригиналните функции
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalFetch = window.fetch;
    
    // ========== XMLHttpRequest Intercept ==========
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._brainbox_url = url;
      this._brainbox_method = method;
      return originalOpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      const url = this._brainbox_url;
      
      // Хващаме ВСИЧКИ batchexecute заявки
      if (url && url.includes('batchexecute')) {
        console.log('[🧠 BrainBox Master] 🎯 Хванат XHR batchexecute:', url);
        
        // Interceptваме request body (може да има ключове тук)
        if (args[0]) {
          captureRequestData(args[0], 'xhr_request');
        }
        
        // Interceptваме response
        this.addEventListener('load', function() {
          if (this.status === 200 && this.responseText) {
            console.log('[🧠 BrainBox Master] 📦 Получен XHR response');
            captureResponseData(this.responseText, url, 'xhr_response');
          }
        });
      }
      
      return originalSend.apply(this, args);
    };
    
    // ========== Fetch API Intercept ==========
    window.fetch = async function(url, options = {}) {
      const urlStr = url.toString();
      
      if (urlStr.includes('batchexecute')) {
        console.log('[🧠 BrainBox Master] 🎯 Хванат Fetch batchexecute:', urlStr);
        
        // Захващаме request body
        if (options.body) {
          captureRequestData(options.body, 'fetch_request');
        }
        
        // Викаме оригиналния fetch
        const response = await originalFetch(url, options);
        
        // Клонираме response за да можем да го прочетем без да го "консумираме"
        const clonedResponse = response.clone();
        
        try {
          const responseText = await clonedResponse.text();
          console.log('[🧠 BrainBox Master] 📦 Получен Fetch response');
          captureResponseData(responseText, urlStr, 'fetch_response');
        } catch (error) {
          console.error('[🧠 BrainBox Master] Грешка при четене на fetch response:', error);
        }
        
        return response; // Връщаме оригиналния response
      }
      
      return originalFetch(url, options);
    };
    
    console.log('[🧠 BrainBox Master] ✅ Interceptor активен');
  }

  // ============================================================================
  // ЗАХВАЩАНЕ НА REQUEST DATA (търсене на ключове)
  // ============================================================================
  
  async function captureRequestData(requestBody, source) {
    try {
      let bodyStr = requestBody;
      
      // Конвертиране на FormData/Blob в string
      if (requestBody instanceof FormData) {
        bodyStr = new URLSearchParams(requestBody).toString();
      } else if (requestBody instanceof Blob) {
        bodyStr = await requestBody.text();
      }
      
      if (CONFIG.DEBUG_MODE) {
        console.log('[🧠 BrainBox Master] 🔍 Request body:', bodyStr.substring(0, 200) + '...');
      }
      
      // Търсене на ключове в request body
      extractKeys(bodyStr, source);
      
      // Запазване на raw request data
      await saveRawData({
        type: 'request',
        source: source,
        data: bodyStr,
        timestamp: Date.now(),
        processed: false
      });
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Грешка при обработка на request:', error);
    }
  }

  // ============================================================================
  // ЗАХВАЩАНЕ НА RESPONSE DATA (разговори)
  // ============================================================================
  
  async function captureResponseData(responseText, url, source) {
    try {
      if (!responseText || responseText.length < 10) return;
      
      if (CONFIG.DEBUG_MODE) {
        console.log('[🧠 BrainBox Master] 📊 Response size:', responseText.length, 'chars');
      }
      
      // Запазване на raw response
      await saveRawData({
        type: 'response',
        source: source,
        url: url,
        data: responseText,
        timestamp: Date.now(),
        processed: false
      });
      
      // Обработка на response
      await processBatchexecuteResponse(responseText);
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Грешка при обработка на response:', error);
    }
  }

  // ============================================================================
  // ОБРАБОТКА НА BATCHEXECUTE RESPONSE
  // ============================================================================
  
  async function processBatchexecuteResponse(responseText) {
    try {
      // Стъпка 1: Премахване на security prefix )]}'\n (според разговора)
      const cleaned = responseText.replace(/^\)\]\}'\s*/, '');
      
      // Стъпка 2: Parse outer JSON
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        console.warn('[🧠 BrainBox Master] Не може да се parse-не outer JSON');
        return;
      }
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.warn('[🧠 BrainBox Master] Outer JSON не е масив или е празен');
        return;
      }
      
      console.log('[🧠 BrainBox Master] 🔎 Намерени', parsed.length, 'batch-a');
      console.log('[🧠 BrainBox Master] 📊 Response size:', responseText.length, 'bytes');
      
      // Стъпка 3: ИСТИНАТА - Текстът винаги е в parsed[0][2] (според разговора)
      const stats = {
        conversations: 0,
        messages: 0
      };
      
      for (let i = 0; i < parsed.length; i++) {
        const batch = parsed[i];
        
        if (!Array.isArray(batch) || batch.length === 0) continue;
        
        // ИСТИНАТА: Текстът винаги е в parsed[0][2] като JSON string
        if (batch[0] && Array.isArray(batch[0]) && batch[0][2]) {
          try {
            // Parse inner JSON string
            const innerJson = JSON.parse(batch[0][2]);
            console.log(`[🧠 BrainBox Master] ✅ Batch ${i}: Успешно parse-нат inner JSON от [0][2]`);
            await processInnerJson(innerJson, i, stats);
          } catch (innerError) {
            console.warn(`[🧠 BrainBox Master] ⚠️ Batch ${i}: Не може да се parse-не [0][2]:`, innerError.message);
            
            // Fallback: Опит за директно извличане на съобщения от batch[0][2] като string
            if (typeof batch[0][2] === 'string' && batch[0][2].length > 50) {
              console.log(`[🧠 BrainBox Master] 🔍 Batch ${i}: Опит за директно извличане от string...`);
              const decoded = await attemptDecoding({
                conversationId: null,
                fullData: batch[0][2],
                rawJson: batch[0][2]
              });
              
              if (decoded.messages.length > 0) {
                stats.messages += decoded.messages.length;
                console.log(`[🧠 BrainBox Master] ✅ Batch ${i}: Извлечени ${decoded.messages.length} съобщения директно от string`);
              }
            }
          }
        } else if (batch[0] && batch[0][1]) {
          // Fallback: Опит на друга позиция
          try {
            const innerJson = JSON.parse(batch[0][1]);
            await processInnerJson(innerJson, i, stats);
          } catch (e) {
            // Игнорираме този batch
          }
        }
        
        // Допълнително: Търсене на ключове навсякъде в batch
        extractKeysFromObject(batch, `batch_${i}`);
      }
      
      console.log(`[🧠 BrainBox Master] 📈 Общо: ${stats.conversations} разговора, ${stats.messages} съобщения`);
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Грешка при обработка:', error);
    }
  }

  // ============================================================================
  // ОБРАБОТКА НА INNER JSON (извличане на разговори)
  // ============================================================================
  
  async function processInnerJson(data, batchIndex, stats = { conversations: 0, messages: 0 }) {
    try {
      const conversations = extractConversationsFromData(data);
      
      if (conversations.length > 0) {
        console.log(`[🧠 BrainBox Master] ✨ Batch ${batchIndex}: Намерени ${conversations.length} разговора`);
        
        // Обновяване на статистиката
        stats.conversations += conversations.length;
        
        for (const conv of conversations) {
          // Използваме новия начин за намиране на id, title, url от DOM
          const domData = extractConversationDataFromDOM(conv.conversationId);
          if (domData) {
            conv.title = domData.title || conv.title;
            conv.url = domData.url || conv.url;
          }
          
          // Логване за debugging
          if (conv.hasMessages) {
            console.log(`[🧠 BrainBox Master] 📝 Разговор ${conv.conversationId} съдържа данни за съобщения`);
          } else {
            console.log(`[🧠 BrainBox Master] ⚠️ Разговор ${conv.conversationId} няма данни за съобщения в този batch`);
          }
          
          await processConversation(conv);
        }
      } else {
        // Ако не намерим conversations, опитай да извлечеш съобщения директно от data
        console.log(`[🧠 BrainBox Master] 🔍 Batch ${batchIndex}: Няма намерени conversations, опит за директно извличане на съобщения...`);
        
        // Опит за извличане на съобщения от целия data обект
        try {
          const decoded = await attemptDecoding({
            conversationId: null,
            fullData: data,
            rawJson: JSON.stringify(data)
          });
          
          if (decoded.messages.length > 0) {
            console.log(`[🧠 BrainBox Master] ✅ Намерени ${decoded.messages.length} съобщения в batch ${batchIndex}`);
            // Обновяване на статистиката
            stats.messages += decoded.messages.length;
            // Запази в cache за по-късно свързване с conversation ID
            STATE.batchMessageCache = STATE.batchMessageCache || new Map();
            STATE.batchMessageCache.set(`batch_${batchIndex}`, decoded.messages);
          }
        } catch (error) {
          // Игнорираме грешките
        }
      }
      
      // Търсене на ключове
      extractKeysFromObject(data, `inner_${batchIndex}`);
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Грешка при обработка на inner JSON:', error);
    }
  }

  // ============================================================================
  // ИЗВЛИЧАНЕ НА РАЗГОВОРИ ОТ DATA
  // ============================================================================
  
  function extractConversationsFromData(data) {
    const conversations = [];
    
    // Рекурсивно търсене на conversation IDs (c_XXXXX)
    function searchObject(obj, depth = 0) {
      if (depth > 10) return; // Защита от безкраен loop
      
      if (!obj || typeof obj !== 'object') return;
      
      // Проверка дали е разговор
      const jsonStr = JSON.stringify(obj);
      const idMatches = jsonStr.match(/"c_([a-zA-Z0-9_-]{10,})"/g);
      
      if (idMatches && idMatches.length > 0) {
        // Намерен потенциален разговор
        const conversationId = idMatches[0].replace(/"/g, '').replace('c_', '');
        
        if (conversationId && conversationId.length > 10) {
          // Проверка дали обектът съдържа съобщения (текстови полета)
          const hasMessages = jsonStr.length > 100 && (
            jsonStr.includes('"text"') || 
            jsonStr.includes('"content"') || 
            jsonStr.includes('"message"') ||
            jsonStr.match(/"[^"]{20,}"/g)?.length > 5 // Поне 5 дълги текстови полета
          );
          
          conversations.push({
            conversationId: conversationId,
            fullData: obj,
            rawJson: jsonStr,
            extractedAt: Date.now(),
            hasMessages: hasMessages
          });
        }
      }
      
      // Рекурсивно търсене
      if (Array.isArray(obj)) {
        obj.forEach(item => searchObject(item, depth + 1));
      } else if (typeof obj === 'object') {
        Object.values(obj).forEach(value => searchObject(value, depth + 1));
      }
    }
    
    searchObject(data);
    
    // Премахване на дубликати по conversationId
    const unique = Array.from(
      new Map(conversations.map(c => [c.conversationId, c])).values()
    );
    
    return unique;
  }

  // ============================================================================
  // ИЗВЛИЧАНЕ НА КЛЮЧОВЕ (encryption/session keys)
  // ============================================================================
  
  function extractKeys(data, source) {
    try {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Pattern 1: Търсене на "key" полета
      const keyPatterns = [
        /"key":\s*"([^"]{10,})"/g,
        /"apiKey":\s*"([^"]{10,})"/g,
        /"sessionKey":\s*"([^"]{10,})"/g,
        /"token":\s*"([^"]{10,})"/g,
        /"cipher":\s*"([^"]{10,})"/g
      ];
      
      const foundKeys = [];
      
      keyPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(dataStr)) !== null) {
          foundKeys.push({
            key: match[1],
            type: match[0].split(':')[0].replace(/"/g, ''),
            source: source,
            timestamp: Date.now()
          });
        }
      });
      
      // Pattern 2: Base64 encoded keys (поне 20 символа)
      const base64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g;
      let match;
      while ((match = base64Pattern.exec(dataStr)) !== null) {
        if (match[0].length >= 20 && match[0].length <= 200) {
          foundKeys.push({
            key: match[0],
            type: 'base64_potential',
            source: source,
            timestamp: Date.now()
          });
        }
      }
      
      if (foundKeys.length > 0) {
        console.log(`[🧠 BrainBox Master] 🔑 Намерени ${foundKeys.length} ключа в ${source}`);
        foundKeys.forEach(k => saveEncryptionKey(k));
      }
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Грешка при извличане на ключове:', error);
    }
  }
  
  function extractKeysFromObject(obj, source) {
    try {
      const jsonStr = JSON.stringify(obj);
      extractKeys(jsonStr, source);
    } catch (error) {
      // Игнорираме
    }
  }

  // ============================================================================
  // ЗАПАЗВАНЕ В INDEXEDDB
  // ============================================================================
  
  async function saveRawData(data) {
    if (!STATE.db) return;
    
    return new Promise((resolve) => {
      try {
        const tx = STATE.db.transaction(['rawBatchData'], 'readwrite');
        const store = tx.objectStore('rawBatchData');
        store.add(data);
        
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (error) {
        console.error('[🧠 BrainBox Master] Грешка при запазване на raw data:', error);
        resolve(false);
      }
    });
  }
  
  async function saveEncryptionKey(keyData) {
    if (!STATE.db) return;
    
    return new Promise((resolve) => {
      try {
        const tx = STATE.db.transaction(['encryptionKeys'], 'readwrite');
        const store = tx.objectStore('encryptionKeys');
        
        // Използваме ключа като conversationId (може да се промени)
        const record = {
          conversationId: keyData.key.substring(0, 32), // Първите 32 символа като ID
          key: keyData.key,
          type: keyData.type,
          source: keyData.source,
          timestamp: keyData.timestamp
        };
        
        store.put(record);
        
        tx.oncomplete = () => {
          STATE.encryptionKeys.set(record.conversationId, keyData.key);
          console.log('[🧠 BrainBox Master] ✅ Ключ запазен:', record.conversationId.substring(0, 10) + '...');
          resolve(true);
        };
        
        tx.onerror = () => resolve(false);
      } catch (error) {
        resolve(false);
      }
    });
  }
  
  async function processConversation(convData) {
    if (!STATE.db) return;
    
    const conversationId = convData.conversationId;
    
    // Проверка дали вече е обработен
    if (STATE.capturedConversations.has(conversationId)) {
      console.log('[🧠 BrainBox Master] ⚓ Вече обработен:', conversationId);
      return;
    }
    
    console.log('[🧠 BrainBox Master] 🆕 Нов разговор:', conversationId);
    
    // Опит за декодиране/декриптиране
    const decoded = await attemptDecoding(convData);
    
    // Запазване в conversations store
    return new Promise((resolve) => {
      try {
        const tx = STATE.db.transaction(['conversations'], 'readwrite');
        const store = tx.objectStore('conversations');
        
        const record = {
          conversationId: conversationId,
          title: decoded.title || 'Untitled',
          messages: decoded.messages || [],
          rawData: convData.fullData,
          decoded: decoded.decoded,
          url: `https://gemini.google.com/u/0/app/${conversationId}`,
          platform: 'gemini',
          timestamp: Date.now(),
          synced: false // Още не е синхронизиран към dashboard
        };
        
        store.put(record);
        
        tx.oncomplete = () => {
          STATE.capturedConversations.set(conversationId, record);
          STATE.processedCount++;
          
          console.log('[🧠 BrainBox Master] ✅ Запазен разговор:', conversationId);
          
          // Добавяне в опашка за синхронизация
          addToSyncQueue(conversationId);
          
          resolve(true);
        };
        
        tx.onerror = () => {
          STATE.failedCount++;
          resolve(false);
        };
      } catch (error) {
        console.error('[🧠 BrainBox Master] Грешка при запазване на разговор:', error);
        STATE.failedCount++;
        resolve(false);
      }
    });
  }

  // ============================================================================
  // DEEP TEXT EXTRACTION (Рекурсивно извличане на текст)
  // ============================================================================

  function deepExtractText(obj, depth = 0, maxDepth = 8) {
    const result = {
      messages: [],
      title: null
    };
    
    if (depth > maxDepth || !obj) return result;
    
    const seen = new Set();
    
    function traverse(data, level = 0) {
      if (level > maxDepth) return;
      
      // Ако е string - провери дали е валиден текст
      if (typeof data === 'string') {
        const cleaned = data.trim();
        
        // Филтър: Игнорирай short strings, URLs, JSON keys
        if (cleaned.length < 15 || cleaned.length > 5000) return;
        if (cleaned.includes('http://') || cleaned.includes('https://')) return;
        if (/^[a-z_]+$/.test(cleaned)) return; // JSON keys
        if (seen.has(cleaned)) return; // Дубликати
        
        // Валиден текст - добави като съобщение
        seen.add(cleaned);
        result.messages.push({
          text: cleaned,
          role: result.messages.length % 2 === 0 ? 'user' : 'assistant',
          index: result.messages.length
        });
        
        // Първото съобщение като заглавие
        if (!result.title && cleaned.length > 10) {
          result.title = cleaned.substring(0, 100);
        }
      }
      
      // Ако е array - обходи елементите
      else if (Array.isArray(data)) {
        data.forEach(item => traverse(item, level + 1));
      }
      
      // Ако е object - обходи стойностите
      else if (data && typeof data === 'object') {
        // Специални полета които често съдържат текст
        const textFields = ['text', 'content', 'message', 'body', 'data', 'value'];
        
        textFields.forEach(field => {
          if (data[field]) {
            traverse(data[field], level + 1);
          }
        });
        
        // Обходи всички останали полета
        Object.values(data).forEach(value => {
          traverse(value, level + 1);
        });
      }
    }
    
    traverse(obj);
    return result;
  }

  // ============================================================================
  // ИЗВЛИЧАНЕ НА СЪОБЩЕНИЯ ОТ DOM
  // ============================================================================
  
  /**
   * Extract messages from current page DOM
   * Използва същите селектори като работещия extension
   */
  function extractMessagesFromDOM() {
    const messages = [];
    
    try {
      // Използваме същите селектори като работещия extension
      const chatHistoryContainer = document.querySelector('#chat-history');
      if (!chatHistoryContainer) {
        console.log('[🧠 BrainBox Master] Не е намерен #chat-history контейнер');
        return messages;
      }

      const conversationBlocks = chatHistoryContainer.querySelectorAll('.conversation-container');
      if (conversationBlocks.length === 0) {
        console.log('[🧠 BrainBox Master] Не са намерени .conversation-container елементи');
        return messages;
      }

      console.log(`[🧠 BrainBox Master] Намерени ${conversationBlocks.length} conversation блока`);

      // Проверка за редактиране (ако има активен textarea, пропускаме)
      const existTextarea = Array.from(conversationBlocks).find(block => {
        const activeTextarea = block.querySelector('textarea:focus');
        return !!activeTextarea;
      });
      if (existTextarea) {
        console.log('[🧠 BrainBox Master] Потребителят редактира, пропускаме извличане');
        return [];
      }

      conversationBlocks.forEach((block, blockIndex) => {
        // Извличане на user съобщения (като работещия extension)
        const userQueryContainer = block.querySelector('user-query .query-text');
        if (userQueryContainer) {
          const userContent = extractFormattedContent(userQueryContainer);
          
          if (userContent && userContent.trim()) {
            const position = blockIndex * 2; // User съобщенията са на четни позиции
            
            messages.push({
              text: userContent,
              role: 'user',
              index: position
            });
          }
        }

        // Извличане на assistant съобщения (като работещия extension)
        const modelResponseEntity = block.querySelector('model-response');
        if (modelResponseEntity) {
          const messageContentContainer = modelResponseEntity.querySelector('.model-response-text');
          if (messageContentContainer) {
            const aiContent = extractFormattedContent(messageContentContainer);
            
            if (aiContent && aiContent.trim()) {
              const position = blockIndex * 2 + 1; // Assistant съобщенията са на нечетни позиции
              
              messages.push({
                text: aiContent,
                role: 'assistant',
                index: position
              });
            }
          }
        }
      });

      console.log(`[🧠 BrainBox Master] Успешно извлечени ${messages.length} съобщения`);
      
      const userCount = messages.filter(m => m.role === 'user').length;
      const assistantCount = messages.filter(m => m.role === 'assistant').length;
      console.log(`[🧠 BrainBox Master] Детайли: ${userCount} user, ${assistantCount} assistant`);
      
      return messages;
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Грешка при извличане на съобщения от DOM:', error);
      return [];
    }
  }
  
  /**
   * Extract formatted content (като работещия extension)
   */
  function extractFormattedContent(element) {
    if (!element) return '';
    
    const textContent = element.innerText || element.textContent || '';
    
    return textContent
      .split('\n')
      .map(line => line.trim())
      .filter((line, index, array) => {
        if (line) return true;
        const prevLine = array[index - 1];
        const nextLine = array[index + 1];
        return prevLine && nextLine && prevLine.trim() && nextLine.trim();
      })
      .join('\n')
      .trim();
  }
  
  // ============================================================================
  // ИЗВЛИЧАНЕ НА ДАННИ ОТ DOM (НОВИЯТ НАЧИН)
  // ============================================================================
  
  /**
   * Extract conversation ID from Gemini's jslog attribute
   * jslog format: "186014;track:generic_click;BardVeMetadataKey:[null,null,null,null,null,null,null,[\"c_172daee57be1f794\",null,1,2]]"
   */
  function extractConversationIdFromJslog(element) {
    try {
      const jslog = element.getAttribute('jslog');
      if (!jslog) return null;
      
      // Parse jslog - it contains JSON array with conversation ID
      // Pattern: ["c_CONVERSATION_ID",null,1,2]
      const match = jslog.match(/\["c_([a-zA-Z0-9_]+)"/);
      if (match && match[1]) {
        return match[1];
      }
      
      // Fallback: try to extract any c_* pattern
      const fallbackMatch = jslog.match(/c_([a-zA-Z0-9_]+)/);
      if (fallbackMatch && fallbackMatch[1]) {
        return fallbackMatch[1];
      }
      
      return null;
    } catch (error) {
      console.error('[🧠 BrainBox Master] Error parsing jslog:', error);
      return null;
    }
  }
  
  /**
   * Extract conversation title from div
   */
  function extractConversationTitle(element) {
    try {
      // Find conversation-title div
      const titleDiv = element.querySelector('.conversation-title, [class*="conversation-title"]');
      if (!titleDiv) {
        return 'Untitled Chat';
      }
      
      // Get text content (remove child elements like cover divs)
      let title = '';
      
      // Method 1: Get direct text nodes only (skip child divs)
      titleDiv.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          title += node.textContent.trim() + ' ';
        }
      });
      
      title = title.trim();
      
      // Fallback: if no text nodes, get full textContent
      if (!title || title.length < 2) {
        title = titleDiv.textContent?.trim() || '';
      }
      
      // Remove "Фиксиран чат" and other UI text
      title = title.replace(/Фиксиран чат/gi, '').trim();
      
      return title || 'Untitled Chat';
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Error extracting title:', error);
      return 'Untitled Chat';
    }
  }
  
  /**
   * Нова функция за извличане на title от .conversation-title div
   * Правилно обработва структурата с child div-ове като .conversation-title-cover
   * Извлича само първия ред или първите 100 символа
   * @param {HTMLElement} element - Елементът, от който да се извлече title
   * @returns {string} - Извлеченият title или 'Untitled Chat'
   */
  function extractTitleFromConversationDiv(element) {
    try {
      console.log('[🧠 BrainBox Master] 📋 ========== TITLE EXTRACTION START ==========');
      console.log('[🧠 BrainBox Master] 📋 Element:', element);
      
      // Намери .conversation-title div
      const titleDiv = element.querySelector('.conversation-title');
      if (!titleDiv) {
        console.log('[🧠 BrainBox Master] ⚠️ Не е намерен .conversation-title');
        return 'Untitled Chat';
      }
      
      console.log('[🧠 BrainBox Master] ✅ Намерен .conversation-title');
      console.log('[🧠 BrainBox Master] 📋 TitleDiv HTML (първи 500 символа):', titleDiv.outerHTML.substring(0, 500));
      console.log('[🧠 BrainBox Master] 📋 TitleDiv textContent (първи 200 символа):', titleDiv.textContent?.substring(0, 200));
      console.log('[🧠 BrainBox Master] 📋 TitleDiv innerText (първи 200 символа):', titleDiv.innerText?.substring(0, 200));
      
      // Метод 1: Клониране на елемента и премахване на child div-овете
      const clone = titleDiv.cloneNode(true);
      
      // Премахни всички child div-ове (като .conversation-title-cover)
      const childDivs = clone.querySelectorAll('div');
      console.log('[🧠 BrainBox Master] 🔍 Намерени child div-ове:', childDivs.length);
      childDivs.forEach(div => {
        console.log('[🧠 BrainBox Master] 🗑️ Премахване на div:', div.className);
        div.remove();
      });
      
      // Вземи текста след премахване на div-овете
      let title = clone.textContent?.trim() || '';
      console.log('[🧠 BrainBox Master] 📝 Метод 1 (clone) - пълна дължина:', title.length);
      console.log('[🧠 BrainBox Master] 📝 Метод 1 (clone) - първи 200 символа:', title.substring(0, 200));
      
      // Метод 2: Fallback - обхождане на child nodes и вземане само на текстовите
      if (!title || title.length < 2) {
        console.log('[🧠 BrainBox Master] 🔄 Опит с Метод 2 (child nodes)...');
        title = '';
        titleDiv.childNodes.forEach((node, index) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
              console.log(`[🧠 BrainBox Master] 📋 Node ${index} (TEXT_NODE): "${text.substring(0, 50)}"`);
              title += text + ' ';
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName !== 'DIV' && node.textContent) {
              const text = node.textContent.trim();
              if (text) {
                console.log(`[🧠 BrainBox Master] 📋 Node ${index} (${node.tagName}): "${text.substring(0, 50)}"`);
                title += text + ' ';
              }
            }
          }
        });
        title = title.trim();
        console.log('[🧠 BrainBox Master] 📝 Метод 2 (child nodes) - първи 200 символа:', title.substring(0, 200));
      }
      
      // Метод 3: Последен fallback - директно textContent
      if (!title || title.length < 2) {
        console.log('[🧠 BrainBox Master] 🔄 Опит с Метод 3 (textContent)...');
        title = titleDiv.textContent?.trim() || '';
        title = title.replace(/\s+/g, ' ').trim();
        console.log('[🧠 BrainBox Master] 📝 Метод 3 (textContent) - първи 200 символа:', title.substring(0, 200));
      }
      
      // Почистване на текста
      const beforeClean = title;
      title = title
        .replace(/Фиксиран чат/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      console.log('[🧠 BrainBox Master] 🧹 Преди почистване - дължина:', beforeClean.length);
      console.log('[🧠 BrainBox Master] 🧹 След почистване - дължина:', title.length);
      
      // ВАЖНО: Извличаме само първия ред или първите 100 символа
      const beforeFirstLine = title;
      if (title) {
        // Раздели по нови редове и вземи първия ред
        const lines = title.split('\n');
        console.log('[🧠 BrainBox Master] 📊 Брой редове:', lines.length);
        console.log('[🧠 BrainBox Master] 📊 Първи ред (първи 100 символа):', lines[0]?.substring(0, 100));
        
        const firstLine = lines[0].trim();
        
        // Ако първият ред е твърде дълъг, вземи първите 100 символа
        if (firstLine.length > 100) {
          title = firstLine.substring(0, 100).trim();
          const lastSpace = title.lastIndexOf(' ');
          if (lastSpace > 50) {
            title = title.substring(0, lastSpace);
          }
          console.log('[🧠 BrainBox Master] ✂️ Първият ред беше > 100 символа, изрязан до:', title);
        } else {
          title = firstLine;
          console.log('[🧠 BrainBox Master] ✅ Използва се първият ред:', title);
        }
      }
      
      console.log('[🧠 BrainBox Master] ✅ ФИНАЛЕН TITLE:', title);
      console.log('[🧠 BrainBox Master] 📋 ========== TITLE EXTRACTION END ==========');
      
      return title || 'Untitled Chat';
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] ❌ Error extracting title from conversation div:', error);
      return 'Untitled Chat';
    }
  }
  
  /**
   * Find all conversation divs in sidebar
   */
  function findAllConversationDivs() {
    const selectors = [
      '[data-test-id="conversation"]',
      '.conversation',
      'div[jslog*="c_"]',
      'div.mat-ripple.conversation'
    ];
    
    let elements = [];
    
    for (const selector of selectors) {
      elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        break;
      }
    }
    
    return elements;
  }
  
  /**
   * Find conversation div by conversation ID
   */
  function findConversationDivById(conversationId) {
    const elements = findAllConversationDivs();
    
    for (const element of elements) {
      const id = extractConversationIdFromJslog(element);
      if (id === conversationId) {
        return element;
      }
    }
    
    return null;
  }
  
  /**
   * Extract conversation data from DOM using new method
   */
  function extractConversationDataFromDOM(conversationId) {
    try {
      console.log('[🧠 BrainBox Master] 🔍 ========== EXTRACT CONVERSATION DATA START ==========');
      console.log('[🧠 BrainBox Master] 🔍 Conversation ID:', conversationId);
      
      // Try to find conversation div by ID
      const element = findConversationDivById(conversationId);
      
      if (element) {
        console.log('[🧠 BrainBox Master] ✅ Намерен conversation element');
        // Използваме новата функция за по-добро извличане на title
        const title = extractTitleFromConversationDiv(element);
        const result = {
          conversationId: conversationId,
          title: title,
          url: `https://gemini.google.com/u/0/app/${conversationId}`,
          extractedAt: Date.now()
        };
        console.log('[🧠 BrainBox Master] ✅ Резултат от extractConversationDataFromDOM:', result);
        console.log('[🧠 BrainBox Master] 🔍 ========== EXTRACT CONVERSATION DATA END ==========');
        return result;
      }
      
      // Fallback: Try to extract from current page URL
      const urlMatch = window.location.href.match(/\/app\/([a-zA-Z0-9_-]+)/);
      if (urlMatch && urlMatch[1] === conversationId) {
        // Try to get title from page
        const pageTitle = document.querySelector('title')?.textContent || 'Untitled Chat';
        return {
          conversationId: conversationId,
          title: pageTitle,
          url: `https://gemini.google.com/u/0/app/${conversationId}`,
          extractedAt: Date.now()
        };
      }
      
      return null;
    } catch (error) {
      console.error('[🧠 BrainBox Master] Error extracting from DOM:', error);
      return null;
    }
  }
  
  // ============================================================================
  // ДЕКОДИРАНЕ/ДЕКРИПТИРАНЕ (НОВИЯТ НАЧИН)
  // ============================================================================
  
  async function attemptDecoding(convData) {
    const result = {
      decoded: false,
      title: null,
      messages: []
    };
    
    try {
      // Проверка дали има данни за обработка
      if (!convData || (!convData.fullData && !convData.rawJson)) {
        console.log('[🧠 BrainBox Master] ⚠️ Няма данни за декодиране');
        return result;
      }
      
      // Опит 1: Използваме новия начин - deepExtractText (рекурсивно извличане)
      // Това е основният метод според инструкциите
      if (convData.fullData) {
        try {
          console.log('[🧠 BrainBox Master] 🔍 Опит за декодиране с deepExtractText...');
          const parsed = deepExtractText(convData.fullData);
          
          if (parsed.messages.length > 0) {
            result.decoded = true;
            result.messages = parsed.messages;
            result.title = parsed.title || result.title;
            console.log('[🧠 BrainBox Master] ✅ Декодирано с deepExtractText:', parsed.messages.length, 'съобщения');
            if (result.title) {
              console.log('[🧠 BrainBox Master] 📝 Заглавие:', result.title);
            }
            return result; // Успешно декодирано, не продължаваме
          } else {
            console.log('[🧠 BrainBox Master] ⚠️ deepExtractText не намери съобщения');
          }
        } catch (error) {
          console.error('[🧠 BrainBox Master] ❌ Deep parse грешка:', error);
        }
      }
      
      // Опит 2: Regex за дълги стрингове (според разговора - "Не парсвай целия масив")
      // "Използвай Regex, за да намериш всичко, което прилича на съобщение"
      if (!result.decoded || result.messages.length === 0) {
        console.log('[🧠 BrainBox Master] 🔍 Опит за Regex декодиране (според разговора)...');
        const jsonStr = convData.rawJson || JSON.stringify(convData.fullData);
        
        // Според разговора: Филтрираме за дълги стрингове (20+ символа)
        const textMatches = jsonStr.match(/"([^"]{20,5000})"/g) || [];
        const potentialMessages = [];
        const seenTexts = new Set();
        
        textMatches.forEach((match) => {
          const text = match.replace(/"/g, '').trim();
          
          // Филтри според разговора
          if (text.includes('http') || text.includes('://') || text.includes('https://')) return;
          if (text.length < 20 || text.length > 5000) return;
          
          // Пропускаме технически данни (според разговора)
          const skipWords = [
            'conversation_id', 'timestamp', 'user_id', 'model_id', 
            'undefined', 'null', 'true', 'false',
            'bard_activity_enabled', 'adaptive_device_responses',
            'side_nav_open_by_default', 'person.photo', 'person.name', 'person.email',
            'generic', 'c_', 'r_', 'rc_'
          ];
          if (skipWords.some(w => text.toLowerCase().includes(w))) return;
          
          // Пропускаме JSON структури (масиви, обекти)
          if (text.startsWith('[') || text.startsWith('{')) return;
          if (text.match(/^\[.*\]$/) || text.match(/^\{.*\}$/)) return;
          
          // Пропускаме дубликати
          const textKey = text.substring(0, 200);
          if (seenTexts.has(textKey)) return;
          seenTexts.add(textKey);
          
          potentialMessages.push({
            text: text,
            role: potentialMessages.length % 2 === 0 ? 'user' : 'assistant',
            index: potentialMessages.length
          });
        });
        
        if (potentialMessages.length > 0) {
          result.decoded = true;
          result.messages = potentialMessages;
          result.title = potentialMessages[0]?.text.substring(0, 100) || 'Untitled';
          console.log('[🧠 BrainBox Master] ✅ Декодирано с Regex метод (според разговора):', potentialMessages.length, 'съобщения');
          if (result.title) {
            console.log('[🧠 BrainBox Master] 📝 Заглавие:', result.title);
          }
        } else {
          console.log('[🧠 BrainBox Master] ⚠️ Regex метод не намери съобщения');
        }
      }
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] ❌ Критична грешка при декодиране:', error);
    }
    
    if (!result.decoded) {
      console.log('[🧠 BrainBox Master] ⚠️ Неуспешно декодиране - няма намерени съобщения');
    }
    
    return result;
  }

  // ============================================================================
  // SYNC QUEUE - Синхронизация към Dashboard
  // ============================================================================
  
  async function addToSyncQueue(conversationId) {
    if (!STATE.db) return;
    
    return new Promise((resolve) => {
      try {
        const tx = STATE.db.transaction(['syncQueue'], 'readwrite');
        const store = tx.objectStore('syncQueue');
        
        store.add({
          conversationId: conversationId,
          addedAt: Date.now(),
          retries: 0,
          lastAttempt: null,
          status: 'pending'
        });
        
        tx.oncomplete = () => {
          console.log('[🧠 BrainBox Master] 📤 Добавен в опашка за sync:', conversationId);
          resolve(true);
        };
        
        tx.onerror = () => resolve(false);
      } catch (error) {
        resolve(false);
      }
    });
  }
  
  async function processSyncQueue() {
    if (!STATE.db) return;
    
    return new Promise((resolve) => {
      try {
        const tx = STATE.db.transaction(['syncQueue', 'conversations'], 'readwrite');
        const queueStore = tx.objectStore('syncQueue');
        const convStore = tx.objectStore('conversations');
        
        const queueRequest = queueStore.getAll();
        
        queueRequest.onsuccess = () => {
          // Използваме IIFE за async логика
          (async () => {
          const queueItems = queueRequest.result || [];
          
          // Филтър: Само pending и с retries < MAX_RETRIES
          const pendingItems = queueItems.filter(item => 
            item.status === 'pending' && item.retries < CONFIG.MAX_RETRIES
          );
          
          // Логваме само ако има разговори за синхронизация
          if (pendingItems.length > 0) {
            console.log(`[🧠 BrainBox Master] 📤 Синхронизация на ${pendingItems.length} разговора...`);
          }
          
          // ВЗЕМИ ВСИЧКИ РАЗГОВОРИ ПРЕДИ ДА ПРИКЛЮЧИ ТРАНЗАКЦИЯТА
          const allConversations = await new Promise((resolve) => {
            const convGetAll = convStore.getAll();
            convGetAll.onsuccess = () => {
              const conversations = convGetAll.result || [];
              const convMap = new Map(conversations.map(c => [c.conversationId, c]));
              resolve(convMap);
            };
            convGetAll.onerror = () => resolve(new Map());
          });
          
          // СЕГА ОБРАБОТВАМЕ РАЗГОВОРИТЕ ИЗВЪН ТРАНЗАКЦИЯТА
          for (const item of pendingItems) {
            const conversation = allConversations.get(item.conversationId);
            
            if (!conversation) {
              console.warn('[🧠 BrainBox Master] ⚠️ Conversation не намерен:', item.conversationId);
              continue;
            }
            
            await (async () => {
                // =====================================================
                // ЗАПАЗВАНЕ КЪМ DASHBOARD
                // =====================================================
                try {
                  // Конвертиране на messages формат за dashboard
                  const dashboardMessages = conversation.messages.map(msg => ({
                    id: `msg_${Date.now()}_${msg.index || 0}`,
                    role: msg.role || (msg.text ? 'user' : 'assistant'),
                    content: msg.text || msg.content || '',
                    timestamp: Date.now()
                  }));
                  
                  // Изпращане към service worker за запазване
                  const response = await chrome.runtime.sendMessage({
                    action: 'saveToDashboard',
                    data: {
                      id: conversation.conversationId,
                      conversationId: conversation.conversationId,
                      title: conversation.title,
                      messages: dashboardMessages,
                      platform: 'gemini',
                      url: conversation.url,
                      created_at: conversation.timestamp,
                      updated_at: conversation.timestamp,
                      metadata: {
                        decoded: conversation.decoded,
                        source: 'brainbox_master'
                      }
                    },
                    folderId: null
                  });
                  
                  if (response && response.success) {
                    // ✅ УСПЕХ
                    console.log('[🧠 BrainBox Master] ✅ Синхронизиран:', conversation.conversationId);
                    
                    // Маркирай като synced в IndexedDB (с нова транзакция)
                    conversation.synced = true;
                    conversation.syncedAt = Date.now();
                    conversation.dashboardId = response.result?.id; // Ако dashboard-а върне ID
                    
                    // Създаваме нова транзакция за update
                    const updateTx = STATE.db.transaction(['conversations'], 'readwrite');
                    const updateStore = updateTx.objectStore('conversations');
                    updateStore.put(conversation);
                    await new Promise((resolveUpdate) => {
                      updateTx.oncomplete = () => resolveUpdate();
                      updateTx.onerror = () => resolveUpdate();
                    });
                    
                    // Премахни от опашката (с нова транзакция)
                    const deleteTx = STATE.db.transaction(['syncQueue'], 'readwrite');
                    const deleteStore = deleteTx.objectStore('syncQueue');
                    deleteStore.delete(item.id);
                    await new Promise((resolveDelete) => {
                      deleteTx.oncomplete = () => resolveDelete();
                      deleteTx.onerror = () => resolveDelete();
                    });
                    
                  } else {
                    throw new Error(response?.error || 'Save failed');
                  }
                  
                } catch (error) {
                  // ❌ ГРЕШКА
                  const errorMessage = error?.message || String(error) || 'Unknown error';
                  console.error('[🧠 BrainBox Master] ❌ Грешка при sync:', errorMessage, error);
                  
                  try {
                    // Увеличи retry counter
                    item.retries++;
                    item.lastAttempt = Date.now();
                    item.lastError = errorMessage;
                    
                    // Ако надхвърлихме max retries, маркирай като failed
                    if (item.retries >= CONFIG.MAX_RETRIES) {
                      item.status = 'failed';
                      console.error('[🧠 BrainBox Master] 💀 Максимален брой опити достигнат за:', item.conversationId);
                    }
                    
                    // Обнови статуса в опашката (с нова транзакция)
                    if (STATE.db) {
                      const updateQueueTx = STATE.db.transaction(['syncQueue'], 'readwrite');
                      const updateQueueStore = updateQueueTx.objectStore('syncQueue');
                      updateQueueStore.put(item);
                      await new Promise((resolveUpdate) => {
                        updateQueueTx.oncomplete = () => resolveUpdate();
                        updateQueueTx.onerror = () => resolveUpdate();
                      });
                    }
                  } catch (updateError) {
                    console.error('[🧠 BrainBox Master] Грешка при обновяване на sync queue:', updateError);
                  }
                }
                // =====================================================
            })();
          }
          
          STATE.lastSync = Date.now();
          resolve(true);
          })(); // Затваряне на IIFE
        };
        
        queueRequest.onerror = () => resolve(false);
        
      } catch (error) {
        console.error('[🧠 BrainBox Master] Грешка при sync:', error);
        resolve(false);
      }
    });
  }

  // ============================================================================
  // MESSAGE LISTENER (за съобщения от service-worker)
  // ============================================================================
  
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'processBatchexecuteResponse') {
        // Content script вече хваща responses чрез interceptors,
        // но това съобщение може да се използва за допълнителна обработка
        // Не логваме всеки път за да не нарушаваме конзолата
        sendResponse({ success: true });
        return true;
      }
      
      // Context menu: Extract conversation from clicked element
      if (request.action === 'extractConversationFromContextMenu') {
        console.log('[🧠 BrainBox Master] 📨 Context menu: Извличане на conversation от кликнат елемент');
        
        try {
          const { pageX, pageY } = request.clickInfo || {};
          
          // Валидация на координатите
          if (typeof pageX !== 'number' || typeof pageY !== 'number' || 
              !isFinite(pageX) || !isFinite(pageY) || 
              pageX < 0 || pageY < 0) {
            // Fallback: Използваме текущия URL (не показваме предупреждение ако успеем)
            const urlMatch = window.location.href.match(/\/app\/([a-zA-Z0-9_-]+)/);
            if (urlMatch && urlMatch[1]) {
              const conversationId = urlMatch[1];
              const title = document.querySelector('title')?.textContent || 'Untitled Chat';
              console.log('[🧠 BrainBox Master] ✅ Извлечен conversation ID от URL (fallback):', conversationId);
              sendResponse({
                success: true,
                conversationId: conversationId,
                title: title,
                url: window.location.href
              });
              return true;
            }
            // Само ако и URL fallback не работи, показваме предупреждение
            console.warn('[🧠 BrainBox Master] ⚠️ Невалидни координати и не може да се извлече ID от URL:', { pageX, pageY });
            sendResponse({ success: false, error: 'Invalid click coordinates and could not extract ID from URL' });
            return true;
          }
          
          // Намиране на елемента на координатите
          const elementAtPoint = document.elementFromPoint(pageX, pageY);
          if (!elementAtPoint) {
            sendResponse({ success: false, error: 'No element found at click position' });
            return true;
          }
          
          // Търсене на conversation div (може да е кликнато на child елемент)
          let conversationElement = elementAtPoint;
          let found = false;
          
          // Търсим нагоре в DOM дървото за conversation div
          for (let i = 0; i < 10 && conversationElement; i++) {
            const jslog = conversationElement.getAttribute('jslog');
            if (jslog && jslog.includes('c_')) {
              found = true;
              break;
            }
            conversationElement = conversationElement.parentElement;
          }
          
          if (!found) {
            // Fallback: Търсим всички conversation divs и намираме най-близкия
            const allConversations = findAllConversationDivs();
            let closestElement = null;
            let minDistance = Infinity;
            
            allConversations.forEach(conv => {
              const rect = conv.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              const distance = Math.sqrt(
                Math.pow(pageX - centerX, 2) + Math.pow(pageY - centerY, 2)
              );
              
              if (distance < minDistance) {
                minDistance = distance;
                closestElement = conv;
              }
            });
            
            if (closestElement && minDistance < 200) {
              conversationElement = closestElement;
              found = true;
            }
          }
          
          if (found && conversationElement) {
            const conversationId = extractConversationIdFromJslog(conversationElement);
            // Използваме новата функция за по-добро извличане на title
            const title = extractTitleFromConversationDiv(conversationElement);
            const url = conversationId ? `https://gemini.google.com/u/0/app/${conversationId}` : null;
            
            if (conversationId) {
              console.log('[🧠 BrainBox Master] ✅ Намерен conversation:', conversationId, title);
              sendResponse({
                success: true,
                conversationId: conversationId,
                title: title,
                url: url
              });
              return true;
            }
          }
          
          sendResponse({ success: false, error: 'Could not extract conversation ID from clicked element' });
          return true;
          
        } catch (error) {
          console.error('[🧠 BrainBox Master] Грешка при извличане на conversation:', error);
          sendResponse({ success: false, error: error.message });
          return true;
        }
      }
      
      // Context menu: Save conversation
      if (request.action === 'saveConversationFromContextMenu') {
        console.log('[🧠 BrainBox Master] 📨 Context menu: Запазване на conversation');
        
        (async () => {
          try {
            const { conversationId, title, url } = request;
            
            if (!conversationId) {
              sendResponse({ success: false, error: 'No conversation ID provided' });
              return;
            }
            
            // Валидация на conversation ID (не трябва да е "view", "edit", и т.н.)
            const invalidIds = ['view', 'edit', 'delete', 'new', 'create', 'undefined', 'null', ''];
            if (invalidIds.includes(conversationId.toLowerCase()) || conversationId.length < 10) {
              console.error('[🧠 BrainBox Master] ❌ Невалиден conversation ID:', conversationId);
              sendResponse({ success: false, error: `Invalid conversation ID: ${conversationId}` });
              return;
            }
            
            // Проверка дали вече е запазен
            if (STATE.capturedConversations.has(conversationId)) {
              console.log('[🧠 BrainBox Master] ⚓ Conversation вече е запазен, синхронизиране...');
              
              // Добавяне в sync queue
              await addToSyncQueue(conversationId);
              
              // Пържествено синхронизиране
              await processSyncQueue();
              
              sendResponse({ success: true, message: 'Conversation already saved, syncing...' });
              return;
            }
            
            // Опит за извличане на данни от DOM
            console.log('[🧠 BrainBox Master] 🔍 ========== SAVE CONVERSATION START ==========');
            console.log('[🧠 BrainBox Master] 🔍 Request data:', { conversationId, title, url });
            console.log('[🧠 BrainBox Master] 🔍 Опит за извличане на DOM данни за conversation:', conversationId);
            const domData = extractConversationDataFromDOM(conversationId);
            console.log('[🧠 BrainBox Master] 🔍 DOM данни извлечени:', domData);
            
            // ВАЖНО: Приоритизираме domData.title, защото той е по-точен от title от request-а
            // title от request-а често е "Google Gemini" или друг generic title
            const finalTitle = (domData?.title && domData.title !== 'Untitled Chat') 
              ? domData.title 
              : (title && title !== 'Google Gemini' && title !== 'Untitled Chat') 
                ? title 
                : 'Untitled Chat';
            const finalUrl = domData?.url || url || `https://gemini.google.com/u/0/app/${conversationId}`;
            
            console.log('[🧠 BrainBox Master] 📝 Request title:', title);
            console.log('[🧠 BrainBox Master] 📝 DOM title:', domData?.title);
            console.log('[🧠 BrainBox Master] 📝 Финален title (след приоритизация):', finalTitle);
            console.log('[🧠 BrainBox Master] 🔗 Финален URL:', finalUrl);
            
            // Създаване на conversation record
            const convData = {
              conversationId: conversationId,
              title: finalTitle,
              url: finalUrl,
              platform: 'gemini',
              timestamp: Date.now(),
              synced: false
            };
            
            console.log('[🧠 BrainBox Master] 💾 Conversation data за запазване:', convData);
            console.log('[🧠 BrainBox Master] 🔍 ========== SAVE CONVERSATION END ==========');
            
            // Запазване в IndexedDB
            if (STATE.db) {
              const tx = STATE.db.transaction(['conversations'], 'readwrite');
              const store = tx.objectStore('conversations');
              
              // Опит за декодиране (ако има данни в batchexecute cache или DOM)
              let decoded = await attemptDecoding({
                conversationId: conversationId,
                fullData: null,
                rawJson: null
              });
              
              // Ако няма декодирани съобщения, опитай да извлечеш от DOM
              if (!decoded.decoded || decoded.messages.length === 0) {
                console.log('[🧠 BrainBox Master] 🔍 Опит за извличане на съобщения от DOM...');
                const domMessages = extractMessagesFromDOM();
                if (domMessages.length > 0) {
                  decoded.messages = domMessages;
                  decoded.decoded = true;
                  console.log('[🧠 BrainBox Master] ✅ Извлечени', domMessages.length, 'съобщения от DOM');
                }
              }
              
              const record = {
                ...convData,
                messages: decoded.messages || [],
                decoded: decoded.decoded,
                rawData: null
              };
              
              await new Promise((resolve) => {
                store.put(record);
                tx.oncomplete = () => {
                  STATE.capturedConversations.set(conversationId, record);
                  console.log('[🧠 BrainBox Master] ✅ Conversation запазен:', conversationId);
                  resolve();
                };
                tx.onerror = () => resolve();
              });
              
              // Добавяне в sync queue
              await addToSyncQueue(conversationId);
              
              // Пържествено синхронизиране
              await processSyncQueue();
              
              sendResponse({ success: true, message: 'Conversation saved and synced' });
            } else {
              sendResponse({ success: false, error: 'Database not initialized' });
            }
            
          } catch (error) {
            console.error('[🧠 BrainBox Master] Грешка при запазване:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        
        return true; // Keep channel open for async response
      }
      
      return false;
    });
    
    console.log('[🧠 BrainBox Master] ✅ Message listener активен');
  }
  
  // ============================================================================
  // AUTO SYNC LOOP
  // ============================================================================
  
  function startAutoSync() {
    if (!CONFIG.AUTO_SAVE_ENABLED) return;
    
    console.log('[🧠 BrainBox Master] 🔄 Auto-sync стартиран');
    
    setInterval(async () => {
      await processSyncQueue();
    }, CONFIG.SAVE_INTERVAL);
  }

  // ============================================================================
  // СТАТИСТИКА И DEBUGGING
  // ============================================================================
  
  async function getStats() {
    if (!STATE.db) return null;
    
    return new Promise((resolve) => {
      const stats = {
        rawBatchData: 0,
        encryptionKeys: 0,
        conversations: 0,
        syncQueue: 0,
        synced: 0,
        pending: 0
      };
      
      const tx = STATE.db.transaction(['rawBatchData', 'encryptionKeys', 'conversations', 'syncQueue'], 'readonly');
      
      // Count rawBatchData
      const rawReq = tx.objectStore('rawBatchData').count();
      rawReq.onsuccess = () => stats.rawBatchData = rawReq.result;
      
      // Count encryptionKeys
      const keysReq = tx.objectStore('encryptionKeys').count();
      keysReq.onsuccess = () => stats.encryptionKeys = keysReq.result;
      
      // Count conversations
      const convReq = tx.objectStore('conversations').getAll();
      convReq.onsuccess = () => {
        const convs = convReq.result || [];
        stats.conversations = convs.length;
        stats.synced = convs.filter(c => c.synced).length;
      };
      
      // Count syncQueue
      const queueReq = tx.objectStore('syncQueue').getAll();
      queueReq.onsuccess = () => {
        const items = queueReq.result || [];
        stats.syncQueue = items.length;
        stats.pending = items.filter(i => i.status === 'pending').length;
      };
      
      tx.oncomplete = () => resolve(stats);
      tx.onerror = () => resolve(stats);
    });
  }
  
  async function printStats() {
    const stats = await getStats();
    if (!stats) return;
    
    // Statistics log removed to reduce console noise
  }

  // ============================================================================
  // ПУБЛИЧЕН API
  // ============================================================================
  
  window.BrainBoxMaster = {
    // Статистика
    getStats: getStats,
    printStats: printStats,
    
    // Ръчна синхронизация
    syncNow: processSyncQueue,
    
    // Достъп до данни
    getCapturedConversations: () => Array.from(STATE.capturedConversations.values()),
    getEncryptionKeys: () => Array.from(STATE.encryptionKeys.entries()),
    
    // Конфигурация
    enableAutoSync: () => { CONFIG.AUTO_SAVE_ENABLED = true; startAutoSync(); },
    disableAutoSync: () => { CONFIG.AUTO_SAVE_ENABLED = false; },
    
    // Debugging
    enableDebug: () => { CONFIG.DEBUG_MODE = true; },
    disableDebug: () => { CONFIG.DEBUG_MODE = false; },
    
    // Достъп до database
    getDB: () => STATE.db,
    
    // Състояние
    isInitialized: () => STATE.isInitialized
  };

  // ============================================================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================================================
  
  async function init() {
    // Init banner log removed to reduce console noise
    
    try {
      // 1. Инициализиране на IndexedDB
      console.log('[🧠 BrainBox Master] Стъпка 1: IndexedDB...');
      await initIndexedDB();
      
      // 2. Настройка на interceptors
      console.log('[🧠 BrainBox Master] Стъпка 2: Interceptors...');
      setupBatchexecuteInterceptor();
      
      // 2.5. Настройка на message listener (за съобщения от service-worker)
      console.log('[🧠 BrainBox Master] Стъпка 2.5: Message listener...');
      setupMessageListener();
      
      // 3. Стартиране на auto-sync
      console.log('[🧠 BrainBox Master] Стъпка 3: Auto-sync...');
      startAutoSync();
      
      // 4. Готово
      STATE.isInitialized = true;
      console.log('[🧠 BrainBox Master] ✅ Системата е активна!');
      
      // Покажи статистика след 5 секунди
      setTimeout(printStats, 5000);
      
      // Периодична статистика на всеки 30 секунди (ако debug mode)
      if (CONFIG.DEBUG_MODE) {
        setInterval(printStats, 30000);
      }
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] ❌ Критична грешка при инициализация:', error);
    }
  }

  // Стартиране
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

