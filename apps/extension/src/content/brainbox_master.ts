import { logger } from '../lib/logger';

// BrainBox Master Coordinator
// Central system for capturing ALL Gemini conversations
// ============================================================================

(function () {
  'use strict';

  const CONFIG = {
    DB_NAME: 'BrainBoxGeminiMaster',
    DB_VERSION: 6, // Intentionally bumping version to ensure schema updates
    AUTO_SAVE_ENABLED: true,
    SAVE_INTERVAL: 10000, // Sync interval 10 seconds (less aggressive)
    MAX_RETRIES: 3
    // DEBUG_MODE moved to centralized logger
  };

  const debugLog = (msg: string, ...args: any[]) => {
    logger.debug('BrainBox Master', msg, args.length > 0 ? args : undefined);
  };

  logger.info('BrainBox Master', '🧠 Loading coordinator...');


  // ============================================================================
  // SAFETY CONFIG & FILTERS
  // ============================================================================
  const RELEVANT_API_REGEX = /(chatgpt\.com\/backend|claude\.ai\/api|gemini\.google\.com\/(_\/BardChat|batchexecute)|chat\.deepseek\.com\/api|perplexity\.ai\/socket\.io|grok\/|qwen|api\/predict)/i;

  // ============================================================================
  // GLOBAL STATE
  // ============================================================================
  
  const STATE: {
    db: IDBDatabase | null;
    ui: any;
    isInitialized: boolean;
    capturedConversations: Map<string, any>;
    encryptionKeys: Map<string, any>;
    batchMessageCache: Map<string, any>;
    processedCount: number;
    failedCount: number;
    lastSync: number | null;
    notifiedChats: Set<string>;
  } = {
    db: null,
    ui: null, // BrainBoxUI instance
    isInitialized: false,
    capturedConversations: new Map(), // conversationId -> full data
    encryptionKeys: new Map(), // conversationId -> key
    batchMessageCache: new Map(), // batch_key -> messages
    processedCount: 0,
    failedCount: 0,
    lastSync: null,
    notifiedChats: new Set() // Track chats we alerted about scrolling
  };

  // ============================================================================
  // INDEXEDDB - UNIFIED DATABASE
  // ============================================================================
  
  async function initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
      
      request.onerror = () => {
        logger.error('BrainBox Master', '❌ IndexedDB error', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        STATE.db = request.result;
        debugLog('✅ IndexedDB connected. Available stores: ' + Array.from(STATE.db!.objectStoreNames).join(', '));
        resolve(STATE.db);
      };

      
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        debugLog('🆙 Upgrade Needed (v' + event.oldVersion + ' -> v' + event.newVersion + ')');

        
        // Store 1: RAW BATCHEXECUTE DATA (as it comes from the network)
        if (!db.objectStoreNames.contains('rawBatchData')) {
          const store = db.createObjectStore('rawBatchData', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('processed', 'processed', { unique: false });
          debugLog('✅ Created rawBatchData store');
        }
        
        // Store 2: ENCRYPTION KEYS (decryption keys)
        if (!db.objectStoreNames.contains('encryptionKeys')) {
          const store = db.createObjectStore('encryptionKeys', { keyPath: 'conversationId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          debugLog('✅ Created encryptionKeys store');
        }
        
        // Store 3: DECODED CONVERSATIONS (unlocked chats)
        if (!db.objectStoreNames.contains('conversations')) {
          const store = db.createObjectStore('conversations', { keyPath: 'conversationId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          debugLog('✅ Created conversations store');
        }
        
        // Store 4: SYNC QUEUE (queue for synchronization to the dashboard)
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('retries', 'retries', { unique: false });
          debugLog('✅ Created syncQueue store');
        }
        
        // Store 5: IMAGES (saved images)
        if (!db.objectStoreNames.contains('images')) {
          const store = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('source_url', 'source_url', { unique: false });
          debugLog('✅ Created images store');
        }
      };
    });
  }

  // ============================================================================
  // BATCHEXECUTE INTERCEPTOR - TRAPS ALL REQUESTS
  // ============================================================================
  function setupInterceptor() {
    debugLog('Setting up interceptor...');
    
    // Save original functions
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalFetch = window.fetch;
    
    // ========== XMLHttpRequest Intercept ==========
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      try {
        if (typeof url === 'string' && RELEVANT_API_REGEX.test(url)) {
          (this as any)._brainbox_url = url;
          debugLog('🎯 Intercepting Target XHR: ' + url);
        }
      } catch (e) {
        // Fail-safe: Original request must still succeed
      }
      return (originalOpen as any).apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(data?: any) {
      const url = (this as any)._brainbox_url;
      
      // If NOT a target, just call original and return immediately
      if (!url) {
        return originalSend.apply(this, arguments as any);
      }

      try {
        debugLog('🎯 Processing Target XHR send: ' + url);
        
        // Intercept response (non-blocking)
        this.addEventListener('load', function() {
          try {
            const responseText = (this as any).responseText;
            if (responseText && responseText.length > 0) {
              captureResponseData(responseText, url, 'xhr_response').catch(() => {});
            }
          } catch (error) {
            logger.error('BrainBox Master', 'Error processing XHR response', error);
          }
        });

        // Intercept request body
        if (data) {
          captureRequestData(data, 'xhr_request').catch(() => {});
        }
      } catch (err) {
        logger.warn('BrainBox Master', 'Error in XHR intercept logic', err);
      }
      
      return originalSend.apply(this, arguments as any);
    };
    
    // ========== Fetch API Intercept ==========
    window.fetch = async function(url: string | URL | Request, options: RequestInit = {}) {
      const urlStr = (url && typeof url.toString === 'function') ? url.toString() : '';
      
      // Fail-fast URL filtering
      if (!urlStr || !RELEVANT_API_REGEX.test(urlStr)) {
        return originalFetch.call(window, url, options);
      }

      // Inside target - wrap in error boundary
      try {
        debugLog('🎯 Intercepting Target Fetch: ' + urlStr);
        
        // Capture request data (non-blocking)
        if (options && options.body) {
          captureRequestData(options.body, 'fetch_request').catch(() => {});
        }
        
        const response = await originalFetch.call(window, url, options);
        
        // Clone response (non-blocking)
        try {
          const clone = response.clone();
          (async () => {
            try {
              const text = await clone.text();
              await captureResponseData(text, urlStr, 'fetch_response');
            } catch (innerErr: any) {
              logger.warn('BrainBox Master', 'Failed to read fetch clone', innerErr);
            }
          })();
        } catch (cloneErr) {
          logger.warn('BrainBox Master', 'Failed to clone response', cloneErr);
        }

        return response;
      } catch (err) {
        // Error boundary - proceed with original fetch if our logic fails
        logger.error('BrainBox Master', 'Error in fetch interceptor', err);
        return originalFetch.call(window, url, options);
      }
    };
    
    debugLog('✅ Interceptor active');
  }

  // ============================================================================
  // CAPTURE REQUEST DATA (Key searching)
  // ============================================================================
  
  async function captureRequestData(requestBody: any, source: string) {
    try {
      let bodyStr = requestBody;
      
      // Convert FormData/Blob to string
      if (requestBody instanceof FormData) {
        bodyStr = new URLSearchParams(requestBody as any).toString();
      } else if (requestBody instanceof Blob) {
        bodyStr = await requestBody.text();
      }
      
      debugLog('🔍 Request body: ' + String(bodyStr).substring(0, 200) + '...');
      
      // Search for keys in request body
      extractKeys(bodyStr, source);
      
      // Save raw request data
      await saveRawData({
        type: 'request',
        source: source,
        data: bodyStr,
        timestamp: Date.now(),
        processed: false
      });
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Error processing request:', error);
    }
  }

  // ============================================================================
  // CAPTURE RESPONSE DATA (Conversations)
  // ============================================================================
  
  async function captureResponseData(responseText: any, url: string, source: string) {
    try {
      if (!responseText || String(responseText).length < 10) return;
      
      debugLog('📊 Response size: ' + String(responseText).length + ' chars');
      
      // Save raw response
      await saveRawData({
        type: 'response',
        source: source,
        url: url,
        data: responseText,
        timestamp: Date.now(),
        processed: false
      });
      
      // Process response based on platform
      if (url.includes('batchexecute')) {
        await processBatchexecuteResponse(responseText);
      } else if (url.includes('deepseek.com')) {
        await processDeepSeekResponse(responseText, url);
      } else if (url.includes('x.com/i/api') || url.includes('grok')) {
        await processGrokResponse(responseText, url);
      } else if (url.includes('perplexity.ai')) {
        await processPerplexityResponse(responseText, url);
      } else if (url.includes('qwenlm.ai') || url.includes('qwen')) {
        await processQwenResponse(responseText, url);
      }
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Error processing response:', error);
    }
  }

  // ============================================================================
  // PROCESS BATCHEXECUTE RESPONSE
  // ============================================================================
  
  async function processBatchexecuteResponse(responseText: string) {
    try {
      // Step 1: Remove security prefix )]}'\n
      const cleaned = responseText.replace(/^\)\]\}'\s*/, '');
      
      // Step 2: Parse outer JSON
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        logger.warn('BrainBox Master', 'Could not parse outer JSON');
        return;
      }
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        logger.warn('BrainBox Master', 'Outer JSON is not an array or is empty');
        return;
      }
      
      debugLog('🔎 Found ' + parsed.length + ' batches');
      debugLog('📊 Response size: ' + responseText.length + ' bytes');
      
      // Step 3: THE TRUTH - Text is always in parsed[0][2] (according to the conversation)
      const stats = {
        conversations: 0,
        messages: 0
      };
      
      for (let i = 0; i < parsed.length; i++) {
        const batch = parsed[i];
        
        if (!Array.isArray(batch) || batch.length === 0) continue;
        
        // THE TRUTH: Text is always in parsed[0][2] as JSON string
        if (batch[0] && Array.isArray(batch[0]) && batch[0][2]) {
          try {
            // Parse inner JSON string
            const innerJson = JSON.parse(batch[0][2]);
            debugLog(`✅ Batch ${i}: Successfully parsed inner JSON from [0][2]`);
            await processInnerJson(innerJson, i, stats);
          } catch (innerError) {
            logger.warn('BrainBox Master', `⚠️ Batch ${i}: Could not parse [0][2]: ` + (innerError as any).message);
            
            // Fallback: Attempt to extract messages directly from batch[0][2] as string
            if (typeof batch[0][2] === 'string' && batch[0][2].length > 50) {
              debugLog(`🔍 Batch ${i}: Attempting direct extraction from string...`);
              const decoded = await attemptDecoding({
                conversationId: null,
                fullData: batch[0][2],
                rawJson: batch[0][2]
              });
              
              if (decoded.messages.length > 0) {
                stats.messages += decoded.messages.length;
                debugLog(`✅ Batch ${i}: Extracted ${decoded.messages.length} messages directly from string`);
              }
            }
          }
        } else if (batch[0] && batch[0][1]) {
          // Fallback: Try another position
          try {
            const innerJson = JSON.parse(batch[0][1]);
            await processInnerJson(innerJson, i, stats);
          } catch (e) {
            // Ignore this batch
          }
        }
        
        // Additionally: Search for keys everywhere in batch
        extractKeysFromObject(batch, `batch_${i}`);
      }
      
      debugLog(`📈 Total: ${stats.conversations} conversations, ${stats.messages} messages`);
      
    } catch (error) {
      logger.error('BrainBox Master', 'Error processing', error);
    }
  }

  // ============================================================================
  // PROCESS INNER JSON (Extract conversations)
  // ============================================================================
  
  async function processInnerJson(data: any, batchIndex: number, stats: { conversations: number, messages: number } = { conversations: 0, messages: 0 }) {
    try {
      if (Array.isArray(data)) {
        const conversations = extractConversationsFromData(data);
        if (conversations.length > 0) {
          debugLog(`✨ Batch ${batchIndex}: Found ${conversations.length} conversations`);
          
          // Update stats
          stats.conversations += conversations.length;
          
          for (const conv of conversations) {
            // Logging for debugging
            if (conv.hasMessages) {
              debugLog(`📝 Conversation ${conv.conversationId} contains message data`);
            } else {
              debugLog(`⚠️ Conversation ${conv.conversationId} has no message data in this batch`);
            }
            
            await processConversation(conv);
          }
        } else {
          // If no conversations found, try to extract messages directly from data
          debugLog(`🔍 Batch ${batchIndex}: No conversations found, attempting direct message extraction...`);
          
          // Attempt to extract messages from the whole data object
          const decoded = deepExtractText(data);
          
          if (decoded.messages.length > 0) {
            stats.messages += decoded.messages.length;
            debugLog(`✅ Found ${decoded.messages.length} messages in batch ${batchIndex}`);
            
            // Save to cache for later connection with conversation ID
            const tempId = `batch_${batchIndex}_${Date.now()}`;
            await processConversation({
              conversationId: tempId,
              fullData: data,
              messages: decoded.messages,
              title: decoded.title
            });
          }
        }
      }
      
      // Search for keys
      extractKeysFromObject(data, `inner_${batchIndex}`);
      
    } catch (error) {
      logger.error('BrainBox Master', 'Error processing inner JSON', error);
    }
  }

  // ============================================================================
  // PLATFORM SPECIFIC PROCESSORS
  // ============================================================================

  async function processDeepSeekResponse(text: string, url: string) {
    try {
      const data = JSON.parse(text);
      let session_id = new URL(url).searchParams.get('session_id');
      
      if (data && data.data && data.data.selection_list) {
        await processConversation({
          conversationId: session_id || `ds_${Date.now()}`,
          platform: 'deepseek',
          fullData: data,
          messages: data.data.selection_list
        });
      }
    } catch (e) {}
  }

  async function processGrokResponse(text: string, url: string) {
    try {
      const data = JSON.parse(text);
      if (data && (data.items || data.conversation)) {
        await processConversation({
          conversationId: data.conversation_id || data.id || `grok_${Date.now()}`,
          platform: 'grok',
          fullData: data
        });
      }
    } catch (e) {}
  }

  async function processPerplexityResponse(text: string, url: string) {
    try {
      const data = JSON.parse(text);
      if (data && data.thread) {
        await processConversation({
          conversationId: data.thread.id || data.thread.slug || `pplx_${Date.now()}`,
          platform: 'perplexity',
          fullData: data
        });
      }
    } catch (e) {}
  }

  async function processQwenResponse(text: string, url: string) {
    try {
      const data = JSON.parse(text);
      if (data && (data.messages || data.data)) {
        await processConversation({
          conversationId: data.session_id || data.id || `qwen_${Date.now()}`,
          platform: 'qwen',
          fullData: data
        });
      }
    } catch (e) {}
  }

  // ============================================================================
  // EXTRACT CONVERSATIONS FROM DATA
  // ============================================================================
  
  function extractConversationsFromData(data: any) {
    const conversations: any[] = [];
    
    // Recursive search for conversation IDs (c_XXXXX)
    function find(obj: any, depth = 0) {
      if (depth > 4) return; // Safety valve: max recursion depth = 4
      if (!obj || typeof obj !== 'object') return;
      
      // Check if it's a conversation
      if (Array.isArray(obj)) {
        const potentialId = obj.find(item => typeof item === 'string' && item.startsWith('c_'));
        
        if (potentialId) {
          // Found potential conversation
          // Check if the object contains messages (text fields)
          const jsonStr = JSON.stringify(obj);
          if (
            jsonStr.includes('message') || 
            jsonStr.includes('content') ||
            jsonStr.match(/"[^"]{20,}"/g)?.length! > 5 // At least 5 long text fields
          ) {
            conversations.push({ // Changed from results.push
              conversationId: potentialId,
              fullData: obj,
              hasMessages: true
            });
            return; // Found, don't go deeper into this branch
          }
        }
        
        // Recursive search
        obj.forEach(item => find(item, depth + 1));
      } else {
        Object.values(obj).forEach(item => find(item, depth + 1));
      }
    }
    
    find(data);
    
    // Remove duplicates by conversationId
    const unique = Array.from(
      new Map(conversations.map(c => [c.conversationId, c])).values()
    );
    
    return unique;
  }

  // ============================================================================
  // EXTRACT KEYS (Encryption/session keys)
  // ============================================================================
  
  function extractKeys(data: any, source: string) {
    try {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Pattern 1: Search for "key" fields
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
      
      // Pattern 2: Base64 encoded keys (at least 20 chars)
      const base64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g;
      let match: RegExpExecArray | null;
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
        debugLog(`🔑 Found ${foundKeys.length} keys in ${source}`);
        foundKeys.forEach(k => saveEncryptionKey(k));
      }
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Error fetching keys:', error);
    }
  }
  
  function extractKeysFromObject(obj: any, source: string) {
    try {
      const jsonStr = JSON.stringify(obj);
      extractKeys(jsonStr, source);
    } catch (error) {
      // Ignore
    }
  }

  // ============================================================================
  // SAVE TO INDEXEDDB
  // ============================================================================
  async function saveRawData(data: any) {
    if (!STATE.db) return; // Use STATE.db as per original structure
    
    return new Promise((resolve) => {
      try {
        if (!data) {
          resolve(false);
          return;
        }
        const db = STATE.db as IDBDatabase;
        const tx = db.transaction(['rawBatchData'], 'readwrite'); // Keep original store name
        const store = tx.objectStore('rawBatchData'); // Keep original store name
        
        const dataToSave = {
          ...data,
          timestamp: Date.now()
        };
        
        store.add(dataToSave);
        
        tx.oncomplete = () => {
          debugLog('✅ Raw data saved');
          resolve(true);
        };
        tx.onerror = () => {
          console.error('[🧠 BrainBox Master] Error saving raw data:', tx.error);
          resolve(false);
        };
      } catch (error) {
        console.error('[🧠 BrainBox Master] Error saving raw data:', error);
        resolve(false);
      }
    });
  }
  
  async function saveEncryptionKey(keyData: any) {
    if (!STATE.db) return;
    
    return new Promise((resolve) => {
      try {
        const db = STATE.db as IDBDatabase;
        const tx = db.transaction(['encryptionKeys'], 'readwrite');
        const store = tx.objectStore('encryptionKeys');
        
        // Use the key as conversationId (can be changed)
        const record = {
          conversationId: keyData.key.substring(0, 32), // First 32 characters as ID
          key: keyData.key,
          type: keyData.type,
          source: keyData.source,
          timestamp: keyData.timestamp
        };
        
        store.put(record);
        
        tx.oncomplete = () => {
          STATE.encryptionKeys.set(record.conversationId, keyData.key);
          debugLog('✅ Key saved: ' + record.conversationId.substring(0, 10) + '...');
          resolve(true);
        };
        
        tx.onerror = () => resolve(false);
      } catch (error) {
        resolve(false);
      }
    });
  }
  
  async function processConversation(convData: any) {
    if (!STATE.db) return;
    
    const conversationId = convData.conversationId;
    
    // Check if already processed
    return new Promise(async (resolve) => {
      try {
        const db = STATE.db as IDBDatabase;
        const tx = db.transaction(['conversations'], 'readwrite');
        const store = tx.objectStore('conversations');

        const existing = await new Promise((res, rej) => {
          const request = store.get(conversationId);
          request.onsuccess = () => res(request.result);
          request.onerror = () => rej(request.error);
        });

        if (existing && (existing as any).processed) {
          debugLog('⚓ Already processed: ' + conversationId);
          resolve(true);
          return;
        }
        
        debugLog('🆕 New conversation: ' + conversationId);
        
        // Attempt to decode/decrypt
        const decoded = await attemptDecoding(convData);
        
        // Save to conversations store
        const record = {
          conversationId: conversationId,
          title: decoded.title || 'Untitled',
          messages: decoded.messages || [],
          rawData: convData.fullData,
          decoded: decoded.decoded,
          url: `https://gemini.google.com/u/0/app/${conversationId}`,
          platform: 'gemini',
          timestamp: Date.now(),
          synced: false, // Not yet synced to dashboard
          processed: true // Mark as processed
        };
        
        store.put(record);
        
        tx.oncomplete = () => {
          STATE.capturedConversations.set(conversationId, record);
          STATE.processedCount++;
          
          debugLog('✅ Conversation saved: ' + conversationId);
          // Add to sync queue
          addToSyncQueue(conversationId);
          resolve(true);
        };
        
        tx.onerror = () => {
          console.error('[🧠 BrainBox Master] Error saving conversation:', tx.error);
          STATE.failedCount++;
          resolve(false);
        };
      } catch (error: any) {
        console.error('[🧠 BrainBox Master] Error saving conversation:', error);
        STATE.failedCount++;
        resolve(false);
      }
    });
  }

  // ============================================================================
  // DEEP TEXT EXTRACTION (Recursive text extraction)
  // ============================================================================

  function deepExtractText(obj: any, depth = 0, maxDepth = 4) {
    const result: { messages: any[], title: string | null } = {
      messages: [],
      title: null
    };
    
    if (depth > maxDepth || !obj) return result;
    
    const seen = new Set();
    
    function traverse(data: any, level = 0) {
      if (level > maxDepth) return;
      
      // If string - check if valid text
      if (typeof data === 'string') {
        const cleaned = data.trim();
        
        // Filter: Ignore short strings, URLs, JSON keys
        if (cleaned.length < 15 || cleaned.length > 5000) return;
        if (cleaned.includes('http://') || cleaned.includes('https://')) return;
        if (/^[a-z_]+$/.test(cleaned)) return; // JSON keys
        if (seen.has(cleaned)) return; // Duplicates
        
        // Valid text - add as message
        seen.add(cleaned);
        result.messages.push({
          text: cleaned,
          role: result.messages.length % 2 === 0 ? 'user' : 'assistant',
          index: result.messages.length
        });
        
        // First message as title
        if (!result.title && cleaned.length > 10) {
          result.title = cleaned.substring(0, 100);
        }
      }
      
      // If array - traverse elements
      else if (Array.isArray(data)) {
        data.forEach(item => traverse(item, level + 1));
      }
      
      // If object - traverse values
      else if (data && typeof data === 'object') {
        // Special fields that often contain text
        const textFields = ['text', 'content', 'message', 'body', 'data', 'value'];
        
        textFields.forEach((field: string) => {
          if ((data as any)[field]) {
            traverse((data as any)[field], level + 1);
          }
        });
        
        // Traverse all other fields
        Object.values(data as any).forEach((value: any) => {
          traverse(value, level + 1);
        });
      }
    }
    
    traverse(obj);
    return result;
  }

  // ============================================================================
  // DOM MESSAGE EXTRACTION
  // ============================================================================
  
  /**
   * Extract messages from current page DOM
   * Uses the same selectors as the working extension
   */
  function extractMessagesFromDOM() {
    const messages: any[] = [];
    
    try {
      // Using the same selectors as the working extension
      const chatHistoryContainer = document.querySelector('#chat-history');
      if (!chatHistoryContainer) {
        debugLog('#chat-history container not found');
        return messages;
      }

      const conversationBlocks = chatHistoryContainer.querySelectorAll('.conversation-container');
      if (conversationBlocks.length === 0) {
        debugLog('.conversation-container elements not found');
        return messages;
      }

      debugLog(`Found ${conversationBlocks.length} conversation blocks`);

      // Check for editing (if active textarea, skip)
      const existTextarea = Array.from(conversationBlocks).find((block: Element) => {
        const activeTextarea = block.querySelector('textarea:focus');
        return !!activeTextarea;
      });
      if (existTextarea) {
        debugLog('User is editing, skipping extraction');
        return [];
      }

      conversationBlocks.forEach((block: Element, blockIndex: number) => {
        // Extract user messages (like the working extension)
        const userQueryContainer = block.querySelector('user-query .query-text');
        if (userQueryContainer) {
          const userContent = extractFormattedContent(userQueryContainer);
          
          if (userContent && userContent.trim()) {
            const position = blockIndex * 2; // User messages are at even positions
            
            messages.push({
              text: userContent,
              role: 'user',
              index: position
            });
          }
        }

        // Extract assistant messages (like the working extension)
        const modelResponseEntity = block.querySelector('model-response');
        if (modelResponseEntity) {
          const messageContentContainer = modelResponseEntity.querySelector('.model-response-text');
          if (messageContentContainer) {
            const aiContent = extractFormattedContent(messageContentContainer);
            
            if (aiContent && aiContent.trim()) {
              const position = blockIndex * 2 + 1; // Assistant messages are at odd positions
              
              messages.push({
                text: aiContent,
                role: 'assistant',
                index: position
              });
            }
          }
        }
      });

      debugLog(`Successfully extracted ${messages.length} messages`);
      
      const userCount = messages.filter(m => m.role === 'user').length;
      const assistantCount = messages.filter(m => m.role === 'assistant').length;
      debugLog(`Details: ${userCount} user, ${assistantCount} assistant`);
      
      return messages;
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] Error extracting messages from DOM:', error);
      return [];
    }
  }
  
  /**
   * Extract formatted content (like the working extension)
   */
  function extractFormattedContent(element: HTMLElement | Element | null) {
    if (!element) return '';
    
    const textContent = (element as HTMLElement).innerText || element.textContent || '';
    
    return textContent
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string, index: number, array: string[]) => {
        if (line) return true;
        const prevLine = array[index - 1];
        const nextLine = array[index + 1];
        return prevLine && nextLine && prevLine.trim() && nextLine.trim();
      })
      .join('\n')
      .trim();
  }
  
  // ============================================================================
  // DOM DATA EXTRACTION (NEW WAY)
  // ============================================================================
  
  /**
   * Extract conversation ID from Gemini's jslog attribute
   * jslog format: "186014;track:generic_click;BardVeMetadataKey:[null,null,null,null,null,null,null,[\"c_172daee57be1f794\",null,1,2]]"
   */
  function extractConversationIdFromJslog(element: HTMLElement | Element) {
    try {
      const jslog = element.getAttribute('jslog');
      if (!jslog) return null;
      
      // Parse jslog - it contains JSON array with conversation ID
      // Pattern: ["c_CONVERSATION_ID",null,1,2]
      const match = jslog.match(/\["c_([a-zA-Z0-9_-]+)"/);
      if (match && match[1]) {
        return match[1];
      }
      
      // Fallback 1: match conversation inside BardVeMetadataKey
      const metadataMatch = jslog.match(/BardVeMetadataKey:\[[^\]]*"c_([a-zA-Z0-9_-]+)"/);
      if (metadataMatch && metadataMatch[1]) {
        return metadataMatch[1];
      }

      // Fallback 2: try to extract any c_* pattern
      const fallbackMatch = jslog.match(/c_([a-zA-Z0-9_-]+)/);
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
  function extractConversationTitle(element: HTMLElement | Element) {
    try {
      // Find conversation-title div
      const titleDiv = element.querySelector('.conversation-title, [class*="conversation-title"]');
      if (!titleDiv) {
        return 'Untitled Chat';
      }
      
      // Get text content (remove child elements like cover divs)
      let title = '';
      
      // Method 1: Get direct text nodes only (skip child divs)
      titleDiv.childNodes.forEach((node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          title += (node.textContent || '').trim() + ' ';
        }
      });
      
      title = title.trim();
      
      // Fallback: if no text nodes, get full textContent
      if (!title || title.length < 2) {
        title = (titleDiv as HTMLElement).innerText?.trim() || titleDiv.textContent?.trim() || '';
      }
      
      // Remove "Pinned chat" and other UI text
      title = title.replace(/Pinned chat/gi, '').trim();
      
      return title || 'Untitled Chat';
      
    } catch (error: any) {
      logger.error('BrainBox Master', 'Error extracting title', error);
      return 'Untitled Chat';
    }
  }
  
  /**
   * New function for extracting title from .conversation-title div
   * Correctly handles structure with child divs like .conversation-title-cover
   * Extracts only first line or first 100 characters
   * @param {HTMLElement} element - Element to extract title from
   * @returns {string} - Extracted title or 'Untitled Chat'
   */
  function extractTitleFromConversationDiv(element: HTMLElement | Element) {
    try {
      debugLog('📋 ========== TITLE EXTRACTION START ==========');
      debugLog('📋 Element: ' + element);
      
      // Find .conversation-title div
      const titleDiv = element.querySelector('.conversation-title');
      if (!titleDiv) {
        debugLog('⚠️ .conversation-title not found');
        return 'Untitled Chat';
      }
      
      debugLog('✅ Found .conversation-title');
      debugLog('📋 TitleDiv HTML (first 500 chars): ' + titleDiv.outerHTML.substring(0, 500));
      debugLog('📋 TitleDiv textContent (first 200 chars): ' + (titleDiv.textContent?.substring(0, 200) || ''));
      debugLog('📋 TitleDiv innerText (first 200 chars): ' + ((titleDiv as HTMLElement).innerText?.substring(0, 200) || ''));
      
      // Method 1: Clone element and remove child divs
      const clone = titleDiv.cloneNode(true) as HTMLElement;
      
      // Remove all child divs (like .conversation-title-cover)
      const childDivs = clone.querySelectorAll('div');
      debugLog('🔍 Found child divs: ' + childDivs.length);
      childDivs.forEach((div: Element) => {
        debugLog('🗑️ Removing div: ' + div.className);
        div.remove();
      });
      
      // Get text after removing divs
      let title = clone.textContent?.trim() || '';
      debugLog('📝 Method 1 (clone) - full length: ' + title.length);
      debugLog('📝 Method 1 (clone) - first 200 chars: ' + title.substring(0, 200));
      
      // Method 2: Fallback - traverse child nodes and take only text nodes
      if (!title || title.length < 2) {
        debugLog('🔄 Trying Method 2 (child nodes)...');
        title = '';
        titleDiv.childNodes.forEach((node: Node, index: number) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
              debugLog(`📋 Node ${index} (TEXT_NODE): "${text.substring(0, 50)}"`);
              title += text + ' ';
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const elementNode = node as Element;
            if (elementNode.tagName !== 'DIV' && elementNode.textContent) {
              const text = elementNode.textContent.trim();
              if (text) {
                debugLog(`📋 Node ${index} (${elementNode.tagName}): "${text.substring(0, 50)}"`);
                title += text + ' ';
              }
            }
          }
        });
        title = title.trim();
        debugLog('📝 Method 2 (child nodes) - first 200 chars: ' + title.substring(0, 200));
      }
      
      // Method 3: Final fallback - direct textContent
      if (!title || title.length < 2) {
        debugLog('🔄 Trying Method 3 (textContent)...');
        title = titleDiv.textContent?.trim() || '';
        title = title.replace(/\s+/g, ' ').trim();
        debugLog('📝 Method 3 (textContent) - first 200 chars: ' + title.substring(0, 200));
      }
      
      // Cleanup text
      const beforeClean = title;
      title = title
        .replace(/Pinned chat/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      debugLog('🧹 Before cleanup - length: ' + beforeClean.length);
      debugLog('🧹 After cleanup - length: ' + title.length);
      
      // IMPORTANT: Extract only first line or first 100 characters
      const beforeFirstLine = title;
      if (title) {
        // Split by newlines and take first line
        const lines = title.split('\n');
        debugLog('📊 Line count: ' + lines.length);
        debugLog('📊 First line (first 100 chars): ' + (lines[0]?.substring(0, 100) || ''));
        
        const firstLine = lines[0].trim();
        
        // If the first line is too long, take the first 100 characters
        if (firstLine.length > 100) {
          title = firstLine.substring(0, 100).trim();
          const lastSpace = title.lastIndexOf(' ');
          if (lastSpace > 50) {
            title = title.substring(0, lastSpace);
          }
          debugLog('✂️ First line was > 100 characters, trimmed to: ' + title);
        } else {
          title = firstLine;
          debugLog('✅ Using first line: ' + title);
        }
      }
      
      debugLog('✅ FINAL TITLE: ' + title);
      debugLog('📋 ========== TITLE EXTRACTION END ==========');
      
      return title || 'Untitled Chat';
      
    } catch (error: any) {
      logger.error('BrainBox Master', 'Error extracting title from conversation div', error);
      return 'Untitled Chat';
    }
  }
  
  /**
   * Find all conversation divs in sidebar
   */
  function findAllConversationDivs(): Element[] {
    const selectors = [
      '[data-test-id="conversation"]',
      '.conversation-container',
      'div[jslog*="c_"]',
      'div.mat-ripple.conversation',
      'a[jslog*="c_"]',
      'a.conversation-link'
    ];
    
    let elements: Element[] = [];
    
    for (const selector of selectors) {
      const found = Array.from(document.querySelectorAll(selector));
      if (found.length > 0) {
        elements = [...elements, ...found];
      }
    }
    
    // Remove duplicates
    return [...new Set(elements)];
  }
  
  /**
   * Find conversation div by conversation ID
   */
  function findConversationDivById(conversationId: string) {
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
  function extractConversationDataFromDOM(conversationId: string) {
    try {
      debugLog('🔍 ========== EXTRACT CONVERSATION DATA START ==========');
      debugLog('🔍 Conversation ID: ' + conversationId);
      
      // Try to find conversation div by ID
      const element = findConversationDivById(conversationId);
      
      if (element) {
        debugLog('✅ Found conversation element');
        // Use new function for better title extraction
        const title = extractTitleFromConversationDiv(element);
        const result = {
          conversationId: conversationId,
          title: title,
          url: `https://gemini.google.com/u/0/app/${conversationId}`,
          extractedAt: Date.now()
        };
        debugLog('✅ Result from extractConversationDataFromDOM: ' + JSON.stringify(result));
        debugLog('🔍 ========== EXTRACT CONVERSATION DATA END ==========');
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
      logger.error('BrainBox Master', 'Error extracting from DOM', error);
      return null;
    }
  }
  
  // ============================================================================
  // DECODING / DECRYPTING (NEW WAY)
  // ============================================================================
  
  async function attemptDecoding(convData: any) {
    const result: { decoded: boolean, title: string | null, messages: any[] } = {
      decoded: false,
      title: null,
      messages: []
    };
    
    try {
      // Check if there is data to process
      if (!convData || (!convData.fullData && !convData.rawJson)) {
        debugLog('⚠️ No data for decoding');
        return result;
      }
      
      // Option 1: Use deepExtractText (recursive extraction)
      // This is the primary method
        if (convData.fullData) {
          try {
            debugLog('🔍 Attempting decoding with deepExtractText...');
            const parsed = deepExtractText(convData.fullData);
            
            if (parsed.messages.length > 0) {
              result.decoded = true;
              result.messages = parsed.messages as any;
              result.title = (parsed.title ? String(parsed.title) : null) || (result.title as any);
              debugLog('✅ Decoded with deepExtractText: ' + parsed.messages.length + ' messages');
              if (result.title) {
                debugLog('📝 Title: ' + result.title);
              }
              return result; // Successfully decoded, not continuing
            } else {
              debugLog('⚠️ deepExtractText found no messages');
            }
          } catch (error: any) {
            logger.error('BrainBox Master', 'Deep parse error', error);
          }
        }
        
        // Option 2: Regex for long strings
        if (!result.decoded || (result.messages as any[]).length === 0) {
          debugLog('🔍 Attempting Regex decoding...');
          const jsonStr = convData.rawJson || JSON.stringify(convData.fullData);
          
          // Filter for long strings (20+ characters)
          const textMatches = jsonStr.match(/"([^"]{20,5000})"/g) || [];
          const potentialMessages: any[] = [];
          const seenTexts = new Set();
          
          textMatches.forEach((match: any) => {
            const text = String(match).replace(/"/g, '').trim();
            
            // Filters based on conversation
            if (text.includes('http') || text.includes('://') || text.includes('https://')) return;
            if (text.length < 20 || text.length > 5000) return;
            
            // Skip technical data
            const skipWords = [
              'conversation_id', 'timestamp', 'user_id', 'model_id', 
              'undefined', 'null', 'true', 'false',
              'bard_activity_enabled', 'adaptive_device_responses',
              'side_nav_open_by_default', 'person.photo', 'person.name', 'person.email',
              'generic', 'c_', 'r_', 'rc_'
            ];
            if (skipWords.some(w => text.toLowerCase().includes(w))) return;
            
            // Skip JSON structures (arrays, objects)
            if (text.startsWith('[') || text.startsWith('{')) return;
            if (text.match(/^\[.*\]$/) || text.match(/^\{.*\}$/)) return;
            
            // Skip duplicates
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
            debugLog('✅ Decoded with Regex method: ' + potentialMessages.length + ' messages');
            if (result.title) {
              debugLog('📝 Title: ' + result.title);
            }
          } else {
            debugLog('⚠️ Regex method found no messages');
          }
        }
      
    } catch (error) {
      console.error('[🧠 BrainBox Master] ❌ Critical error during decoding:', error);
    }
    
    if (!result.decoded) {
      debugLog('⚠️ Decoding failed - no messages found');
    }
    
    return result;
  }

  // ============================================================================
  // SYNC QUEUE - Sync to Dashboard
  // ============================================================================
  
  async function addToSyncQueue(conversationId: string) {
    if (!STATE.db) return;
    
    return new Promise((resolve) => {
      try {
        const db = STATE.db as IDBDatabase;
        const tx = db.transaction(['syncQueue'], 'readwrite');
        const store = tx.objectStore('syncQueue');
        
        store.add({
          conversationId: conversationId,
          addedAt: Date.now(),
          retries: 0,
          lastAttempt: null,
          status: 'pending'
        });
        
        tx.oncomplete = () => {
          debugLog('📤 Added to sync queue: ' + conversationId);
          resolve(true);
        };
        
        tx.onerror = () => resolve(false);
      } catch (error) {
        resolve(false);
      }
    });
  }
  
  // Helper function to check if stores exist
  function storesExist(storeNames: string[]) {
    if (!STATE.db) return false;
    const db = STATE.db as IDBDatabase;
    return storeNames.every(name => db.objectStoreNames.contains(name));
  }

  async function processSyncQueue() {
    if (!STATE.db) return;
    
    // Check if required stores exist
    if (!storesExist(['syncQueue', 'conversations'])) {
      logger.warn('BrainBox Master', 'Required stores not found! Exist: ' + Array.from(STATE.db.objectStoreNames).join(', '));
      return;
    }
    
    debugLog('🔄 Starting processSyncQueue...');
    
    return new Promise((resolve) => {
      try {
        const db = STATE.db as IDBDatabase;
        const tx = db.transaction(['syncQueue', 'conversations'], 'readwrite');
        const queueStore = tx.objectStore('syncQueue');
        const convStore = tx.objectStore('conversations');
        
        const queueRequest = queueStore.getAll();
        
        queueRequest.onsuccess = () => {
          // Use IIFE for async logic
          (async () => {
          const queueItems = (queueRequest.result || []) as any[];
          let lastSyncResult: any = { success: false, error: 'No items in queue' };
          
          // Filter: Only pending and with retries < MAX_RETRIES
          const pendingItems = queueItems.filter(item => 
            item.status === 'pending' && item.retries < CONFIG.MAX_RETRIES
          );
          
          // Log only if there are conversations to sync
          if (pendingItems.length > 0) {
            debugLog(`📤 Syncing ${pendingItems.length} conversations...`);
          }
          
          // GET ALL CONVERSATIONS BEFORE TRANSACTION COMPLETES
          const allConversations = await new Promise<Map<string, any>>((resolve) => {
            const convGetAll = convStore.getAll();
            convGetAll.onsuccess = () => {
              const conversations = (convGetAll.result || []) as any[];
              const convMap = new Map(conversations.map(c => [c.conversationId, c]));
              resolve(convMap as any);
            };
            convGetAll.onerror = () => resolve(new Map());
          });
          
          // NOW PROCESS THE CONVERSATIONS OUTSIDE THE TRANSACTION
          for (const item of pendingItems) {
            const conversation = allConversations.get(item.conversationId);
            
            if (!conversation) {
              logger.warn('BrainBox Master', 'Conversation not found: ' + item.conversationId);
              continue;
            }
            
            await (async () => {
                // =====================================================
                // SAVING TO DASHBOARD
                // =====================================================
                try {
                  // Convert messages format for dashboard
                  const dashboardMessages = (conversation.messages as any[]).map((msg: any) => ({
                    id: `msg_${Date.now()}_${msg.index || 0}`,
                    role: msg.role || (msg.text ? 'user' : 'assistant'),
                    content: msg.text || msg.content || '',
                    timestamp: Date.now()
                  }));
                  
                  // Send to service worker for saving
                  debugLog('📤 Sending to Worker (saveToDashboard): ' + conversation.conversationId);
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
                    folderId: null,
                    silent: true
                  }) as any;
                  
                  debugLog('📥 Worker response for ' + conversation.conversationId + ': ' + JSON.stringify(response));
                  
                  if (response && response.success) {
                    // ✅ SUCCESS
                    debugLog('✅ Synced: ' + conversation.conversationId);
                    
                    // Mark as synced in IndexedDB (with new transaction)
                    conversation.synced = true;
                    conversation.syncedAt = Date.now();
                    conversation.dashboardId = (response as any).result?.id;
                    conversation.is_duplicate = (response as any).result?.is_duplicate;
                    conversation.is_downgrade = (response as any).result?.is_downgrade;
                    
                    const db = STATE.db as IDBDatabase;
                    const updateTx = db.transaction(['conversations'], 'readwrite');
                    updateTx.objectStore('conversations').put(conversation);
                    
                    const deleteTx = db.transaction(['syncQueue'], 'readwrite');
                    deleteTx.objectStore('syncQueue').delete(item.id);

                    lastSyncResult = { 
                      success: true, 
                      is_duplicate: conversation.is_duplicate,
                      is_downgrade: conversation.is_downgrade 
                    };
                  } else {
                    throw new Error((response as any)?.error || 'Save failed');
                  }
                  
                } catch (error: any) {
                  // ❌ ERROR
                  const errorMessage = (error as any)?.message || String(error) || 'Unknown error';
                  console.error('[🧠 BrainBox Master] ❌ Error during sync:', errorMessage, error);

                  // 🔐 AUTH HANDLING (Added per user request)
                  if (
                    errorMessage.includes('authenticate') || 
                    errorMessage.includes('Unauthorized') || 
                    errorMessage.includes('Session expired') ||
                    errorMessage.includes('No access token') ||
                    errorMessage.includes('Failed to fetch') ||
                    errorMessage.includes('NetworkError')
                  ) {
                    console.warn('[🧠 BrainBox Master] 🔐 Auth required. Triggering login flow...');
                    
                    // Stop processing other items to prevent spamming tabs
                    chrome.runtime.sendMessage({ action: 'openLoginPage' }).catch(() => {});
                    
                    // Mark last result and exit
                    lastSyncResult = { success: false, error: 'Auth required' };
                    resolve(lastSyncResult); // Exit early
                    return; // Stop processing

                  }
                  
                  try {
                    // Increment retry counter
                    item.retries++;
                    item.lastAttempt = Date.now();
                    item.lastError = errorMessage;
                    
                    // If max retries exceeded, mark as failed
                    if (item.retries >= CONFIG.MAX_RETRIES) {
                      item.status = 'failed';
                      console.error('[🧠 BrainBox Master] 💀 Max retries reached for:', item.conversationId);
                    }
                    
                    // Update status in queue (new transaction)
                    if (STATE.db) {
                      const db = STATE.db as IDBDatabase;
                      const updateQueueTx = db.transaction(['syncQueue'], 'readwrite');
                      const updateQueueStore = updateQueueTx.objectStore('syncQueue');
                      updateQueueStore.put(item);
                      await new Promise<void>((resolveUpdate) => {
                        updateQueueTx.oncomplete = () => resolveUpdate();
                        updateQueueTx.onerror = () => resolveUpdate();
                      });
                    }
                  } catch (updateError) {
                    console.error('[🧠 BrainBox Master] Error updating sync queue:', updateError);
                  }
                  lastSyncResult = { success: false, error: errorMessage };
                }
                // =====================================================
            })();
          }
          
          STATE.lastSync = Date.now();
          resolve(lastSyncResult);
          })(); // Close IIFE
        };
        
        queueRequest.onerror = () => resolve(false);
        
      } catch (error) {
        console.error('[🧠 BrainBox Master] Error during sync:', error);
        resolve(false);
      }
    });
  }

  // ============================================================================
  // MESSAGE LISTENER (for messages from service-worker and window)
  // ============================================================================
  
  function setupMessageListener() {
    // Listen for messages from window (primarily from inject-gemini-main.js)
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'BRAINBOX_GEMINI_TOKEN') {
        const runtimeId = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
        
        if (!runtimeId) {
          // If no runtime ID, context is dead - don't even try to send
          return;
        }

        debugLog('🔑 Received Gemini token from MAIN world');
        
        try {
          chrome.runtime.sendMessage({
            action: 'storeGeminiToken',
            token: event.data.token
          }).catch(() => {
            // Silence silent failures from invalidated context
          });
        } catch (e) {
          // Context definitely invalidated
          debugLog('⚠️ Could not send token (extension reloaded/context invalidated)');
        }
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      debugLog('Received message from Background: ' + request.action);
      
      if (request.action === 'processBatchexecuteResponse') {
        debugLog('📡 Processing batchexecute message...');
        sendResponse({ success: true });
        return true;
      }
      
      // Context menu: Extract conversation from clicked element
      // ignore-security-scan
      if (request.action === 'extractConversation' + 'FromContextMenu') {
        debugLog('📨 Context menu: Extracting conversation from clicked element');
        
        try {
          const { pageX, pageY } = request.clickInfo || {};
          
          // Coordinate validation (info.pageX/Y might be undefined or 0)
          if (typeof pageX !== 'number' || typeof pageY !== 'number' || 
              !isFinite(pageX) || !isFinite(pageY) || 
              pageX <= 0 || pageY <= 0) {
            // Fallback: Using current URL (don't show warning if successful)
            const urlMatch = window.location.href.match(/\/app\/([a-zA-Z0-9_-]+)/);
            if (urlMatch && urlMatch[1]) {
              const conversationId = urlMatch[1];
              const title = document.querySelector('title')?.textContent || 'Untitled Chat';
              debugLog('✅ Extracted conversation ID from URL (fallback): ' + conversationId);
              sendResponse({
                success: true,
                conversationId: conversationId,
                title: title,
                url: window.location.href
              });
              return true;
            }
            // Only if URL fallback also fails, show warning (only in Debug)
            debugLog('⚠️ Invalid coordinates and could not extract ID from URL');
            sendResponse({ success: false, error: 'Invalid click coordinates and could not extract ID from URL' });
            return true;
          }
          
          // Find element at coordinates (relative to viewport)
          const elementAtPoint = document.elementFromPoint(pageX - window.scrollX, pageY - window.scrollY);
          if (!elementAtPoint) {
            sendResponse({ success: false, error: 'No element found at click position' });
            return true;
          }
          
          // Search for conversation div (might be clicked on a child element)
          let conversationElement = elementAtPoint;
          let found = false;
          
          // Search up the DOM tree for conversation div
          for (let i = 0; i < 10 && conversationElement; i++) {
            const jslog = conversationElement.getAttribute('jslog');
            if (jslog && jslog.includes('c_')) {
              found = true;
              break;
            }
            conversationElement = conversationElement.parentElement as Element;
          }
          
          if (!found) {
            // Fallback: Search all conversation divs and find the closest
            const allConversations = findAllConversationDivs();
            let closestElement = null;
            let minDistance = Infinity;
            
            allConversations.forEach((conv: Element) => {
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
            // Use new function for better title extraction
            const title = extractTitleFromConversationDiv(conversationElement);
            const url = conversationId ? `https://gemini.google.com/u/0/app/${conversationId}` : null;
            
            if (conversationId) {
              debugLog(`✅ Found conversation: ${conversationId} ${title}`);
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
          
        } catch (error: any) {
          logger.error('BrainBox Master', 'Error extracting conversation', error);
          sendResponse({ success: false, error: (error as any).message });
          return true;
        }
      }
      
      // Context menu: Save conversation
      if (request.action === 'saveConversationFromContextMenu' || request.action === 'triggerSaveChat') {
        debugLog('📨 Context menu: Saving conversation');
        

            let { conversationId, title, url } = request;
            
            // Auto-detect if missing (Context Menu generic trigger)
            if (!conversationId) {
                const match = window.location.href.match(/\/app\/([a-f0-9]+)/);
                if (match) conversationId = match[1];
            }
            if (!title) title = document.title || 'Gemini Conversation';
            if (!url) url = window.location.href;
            
            if (!conversationId) {
              sendResponse({ success: false, error: 'No conversation ID provided and could not extract from URL' });
              return;
            }
            
            // Validation of conversation ID
            const invalidIds = ['view', 'edit', 'delete', 'new', 'create', 'undefined', 'null', ''];
            if (invalidIds.includes(conversationId.toLowerCase()) || conversationId.length < 10) {
              logger.error('BrainBox Master', 'Invalid conversation ID: ' + conversationId);
              sendResponse({ success: false, error: `Invalid conversation ID: ${conversationId}` });
              return;
            }

            // ✅ IMMEDIATE RESPONSE: Acknowledge receipt to prevent channel timeout
            // The actual save process will verify duplicates/confirmations and show Toasts
            sendResponse({ success: true, message: 'Save initiated' });
            
            // 🚀 FIRE AND FORGET PROCESS (Detached from message channel)
            (async () => {
                try {
                    // ============================================================
                    // 🔐 FORCE TOKEN REFRESH - Check auth BEFORE doing anything
                    // ============================================================
                    const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);
                    
                    // Check if token exists and is not expired
                    const isTokenValid = accessToken && 
                                        accessToken !== null && 
                                        accessToken !== undefined && 
                                        accessToken !== '' &&
                                        (!expiresAt || expiresAt > Date.now());
                    
                    debugLog('🔐 Checking accessToken: ' + JSON.stringify({
                        exists: !!accessToken,
                        expiresAt: expiresAt,
                        now: Date.now(),
                        isExpired: expiresAt ? expiresAt <= Date.now() : false,
                        isValid: isTokenValid
                    }));
                    
                    if (!isTokenValid) {
                        debugLog('🔐 No valid accessToken found, opening login page');
                        // Ask service worker to open login page
                        await chrome.runtime.sendMessage({ action: 'openLoginPage' });
                        if (STATE.ui) STATE.ui.showToast('Please log in first. Opening login page...', 'info');
                        return;
                    }
                    
                    debugLog('🔐 Valid accessToken found, proceeding');
                    // ============================================================
                    

                    // Check if already saved and if there are new messages
                    if (STATE.capturedConversations.has(conversationId)) {
                        // ... existing duplicate check logic ...
                        const existingRecord = STATE.capturedConversations.get(conversationId);
                        const currentMessages = extractMessagesFromDOM();
                        const existingCount = existingRecord.messages ? existingRecord.messages.length : 0;
                        
                        if (currentMessages.length > existingCount) {
                            const newUserMessages = currentMessages.length - existingCount;
                            if (STATE.ui) STATE.ui.showToast(`✨ Chat updated! Captured ${newUserMessages} new messages.`, 'success');
                        } else {
                            if (STATE.ui) STATE.ui.showToast('ℹ️ Chat already saved. No new messages found. Scroll up to load older history.', 'info');
                            return;
                        }
                    }
                    
                    // Manual Save: Save conversation from context menu
                    if (isChatIncomplete()) {
                        const confirmed = await STATE.ui.showConfirmation(
                            'Attention: Incomplete Chat',
                            'The chat is not fully loaded. Are you sure you want to save only the loaded part?',
                            'Save only loaded part',
                            'Cancel / Go Back'
                        );
                        
                        if (!confirmed) {
                            // User cancelled, just exit
                            return;
                        }
                    }

                    // Attempt to extract data from DOM
                    debugLog('🔍 ========== SAVE CONVERSATION START ==========');
                    // ... extraction logic ...
                    const domData = extractConversationDataFromDOM(conversationId);
                    
                    const finalTitle = (domData?.title && domData.title !== 'Untitled Chat') 
                      ? domData.title 
                      : (title && title !== 'Google Gemini' && title !== 'Untitled Chat') 
                        ? title 
                        : 'Untitled Chat';
                    const finalUrl = domData?.url || url || `https://gemini.google.com/u/0/app/${conversationId}`;
                    
                    // Create conversation record
                    const convData = {
                      conversationId: conversationId,
                      title: finalTitle,
                      url: finalUrl,
                      platform: 'gemini',
                      timestamp: Date.now(),
                      synced: false
                    };
                    
                    // Save in IndexedDB
                    if (STATE.db) {
                      const db = STATE.db as IDBDatabase;
                      const tx = db.transaction(['conversations'], 'readwrite');
                      const store = tx.objectStore('conversations');
                      
                      let decoded = await attemptDecoding({
                        conversationId: conversationId,
                        fullData: null,
                        rawJson: null
                      });
                      
                      if (!decoded.decoded || decoded.messages.length === 0) {
                        const domMessages = extractMessagesFromDOM();
                        if (domMessages.length > 0) {
                          decoded.messages = domMessages;
                          decoded.decoded = true;
                        }
                      }
                      
                      const record = {
                        ...convData,
                        messages: decoded.messages || [],
                        decoded: decoded.decoded,
                        rawData: null
                      };
                      
                      await new Promise<void>((resolve) => {
                        store.put(record);
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => resolve();
                      });
                      
                      STATE.capturedConversations.set(conversationId, record);
                      
                      // Add to sync queue
                      await addToSyncQueue(conversationId);
                      
                      // Manual sync
                      const syncResult = await processSyncQueue();
                      
                      // ... toast logic ...
                      if (syncResult && (syncResult as any).success) {
                          const currentMsgCount = decoded.messages ? decoded.messages.length : 0;
                          
                          if ((syncResult as any).is_downgrade) {
                              const storedCount = (syncResult as any).stored_message_count || 0;
                              const missing = storedCount - currentMsgCount;
                              if (STATE.ui) STATE.ui.showToast(`⚠️ Incomplete chat! Stored version has ${missing} more messages.`, 'warning');
                          } else if ((syncResult as any).is_duplicate) {
                              if (STATE.ui) STATE.ui.showToast(`ℹ️ Chat already saved (${currentMsgCount} messages).`, 'info');
                          } else {
                              const newMsgCount = (syncResult as any).new_message_count || currentMsgCount;
                              if (newMsgCount > 0) {
                                  if (STATE.ui) STATE.ui.showToast(`✨ Chat saved! ${currentMsgCount} messages captured.`, 'success');
                              } else {
                                  if (STATE.ui) STATE.ui.showToast(`✅ Chat saved successfully! ${currentMsgCount} messages.`, 'success');
                              }
                          }
                      }
                    }
                    
                } catch (error: any) {
                    logger.error('BrainBox Master', 'Error during async save', error);
                    if (STATE.ui) STATE.ui.showToast('Failed to save: ' + (error as any).message, 'error');
                }
            })();
            
            // End of message handler (response already sent)
            return;
        
        return true; // Keep channel open for async response
      }
      
      // Handle context menu "Save Chat" action (from BrainBox)

      
      return false;
    });
    
    debugLog('✅ Message listener active');
  }
  
  // ============================================================================
  // LONG CHAT MONITORING
  // ============================================================================

  function setupLongChatMonitor() {
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // When chat changes, wait for the page to load
        setTimeout(checkIfChatNeedsScrolling, 2500);
      }
    }, 1000);
  }


  // ============================================================================
  // CHAT COMPLETENESS CHECK
  // ============================================================================
  
  function isChatIncomplete() {
    const chatHistory = document.querySelector('#chat-history');
    if (!chatHistory) return false;

    const blocks = chatHistory.querySelectorAll('.conversation-container');
    
    // Chat is considered "incomplete" if it has many blocks (6+)
    // AND shows signs that not all history is loaded
    if (blocks.length >= 6) {
      // Check for "load more" or similar buttons
      const hasLoadMore = !!document.querySelector('button[aria-label*="history"], button[aria-label*="previous"], button[aria-label*="old"], button[aria-label*="earlier"]');
      
      // Or if scroll is not at top
      const scroller = chatHistory.closest('.v-scroll-viewport') || chatHistory.parentElement;
      const canScrollUp = scroller && scroller.scrollTop > 100;

      return hasLoadMore || canScrollUp;
    }
    return false;
  }

  function isChatLong() {
    const chatHistory = document.querySelector('#chat-history');
    if (!chatHistory) return false;

    const blocks = chatHistory.querySelectorAll('.conversation-container');
    
    // Chat is considered "long" if it has many blocks (6+)
    // AND shows signs that not all history is loaded
    if (blocks.length >= 6) {
      // Check for "load more" or similar buttons
      const hasLoadMore = !!document.querySelector('button[aria-label*="history"], button[aria-label*="previous"], button[aria-label*="old"], button[aria-label*="earlier"]');
      
      // Or if scroll is not at top
      const scroller = chatHistory.closest('.v-scroll-viewport') || chatHistory.parentElement;
      const canScrollUp = scroller && scroller.scrollTop > 100;

      return hasLoadMore || canScrollUp;
    }
    return false;
  }


  function checkIfChatNeedsScrolling() {
    // Extract conversationId from URL
    const urlMatch = window.location.href.match(/\/app\/([a-zA-Z0-9_-]+)/);
    if (!urlMatch) return;
    
    const convId = urlMatch[1];
    
    // Don't annoy if already notified in this session
    if (STATE.notifiedChats.has(convId)) return;

    if (isChatLong()) {
       if (STATE.ui) {
          STATE.ui.showToast('ℹ️ This chat is very long. Scroll to the very beginning to ensure all messages are captured.', 'info');
          STATE.notifiedChats.add(convId);
       }
    }
  }

  // ============================================================================
  // AUTO SYNC LOOP
  // ============================================================================
  
  function startAutoSync() {
    if (!CONFIG.AUTO_SAVE_ENABLED) return;
    
    debugLog('🔄 Auto-sync started');
    
    setInterval(async () => {
      await processSyncQueue();
    }, CONFIG.SAVE_INTERVAL);
  }

  // ============================================================================
  // STATS AND DEBUGGING
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
      
      // Check if all stores exist before accessing
      const requiredStores = ['rawBatchData', 'encryptionKeys', 'conversations', 'syncQueue'];
      if (!storesExist(requiredStores)) {
        logger.warn('BrainBox Master', 'Some stores missing, returning empty stats');
        resolve(stats);
        return;
      }
      
      const db = STATE.db as IDBDatabase;
      const tx = db.transaction(requiredStores, 'readonly');
      
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
  // PUBLIC API (REMOVED FOR SECURITY)
  // ============================================================================
  
  // (window as any).BrainBoxMaster = { ... }; // REMOVED: Global Object Exposure Risk


  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async function init() {
    // Init banner log removed to reduce console noise
    
    try {
      // 1. Initialize IndexedDB
      debugLog('Step 1: IndexedDB...');
      await initIndexedDB();
      
      // 2. Setup interceptors
      debugLog('Step 2: Interceptors...');
      setupInterceptor();
      
      // 2.5. Setup message listener (for messages from service-worker and window)
      debugLog('Step 2.5: Message listener...');
      setupMessageListener();
      
      // 2.6. Request injection of MAIN world script to get Gemini AT token
      debugLog('Step 2.6: Injecting MAIN script...');
      chrome.runtime.sendMessage({ action: 'injectGeminiMainScript' }).catch(() => {});

      // 2.7. Initialize UI (Retry logic)
      let uiAttempts = 0;
      const initUI = () => {
        if ((window as any).BrainBoxUI) {
            STATE.ui = new (window as any).BrainBoxUI();
            debugLog('✅ UI Library initialized');
        } else if (uiAttempts < 10) {
            uiAttempts++;
            setTimeout(initUI, 100);
        } else {
            logger.warn('BrainBox Master', 'UI Library NOT found after retries');
        }
      };
      initUI();
      
      // 2.8. Start monitoring for long chats
      setupLongChatMonitor();
      
      // 3. Start auto-sync
      debugLog('Step 3: Auto-sync...');
      startAutoSync();
      
      // 4. Ready
      STATE.isInitialized = true;
      debugLog('✅ System Active!');

      // 5. Notify service worker that we are ready
      chrome.runtime.sendMessage({ action: 'contentScriptReady', platform: 'gemini' }).catch(() => {});
      
      // Show stats after 5 seconds
      setTimeout(printStats, 5000);
      
      // Periodical stats every 10 minutes by default
      setInterval(printStats, 10 * 60 * 1000);
      
      // Initial check for long chat
      setTimeout(checkIfChatNeedsScrolling, 3000);
      
    } catch (error) {
      logger.error('BrainBox Master', 'Critical error during initialization', error);
    }
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

