// ============================================================================
// BRAINBOX IMAGE SAVER
// ============================================================================
// Content script for saving images from web pages to BrainBox dashboard
// Features:
// - Batch mode: Show checkboxes on images for selection
// - Single save: Right-click on image to save
// - Upload selected images to dashboard

(function() {
  'use strict';

  // ============================================================================
  // КОНФИГУРАЦИЯ
  // ============================================================================
  
  const CONFIG = {
    DASHBOARD_URL: 'https://brainbox-alpha.vercel.app',
    API_ENDPOINT: '/api/images',
    DB_NAME: 'BrainBoxGeminiMaster',
    DB_VERSION: 6, // Match with brainbox_master.js
    DEBUG_MODE: true,
    SYNC_ENABLED: true,
    SCRAPING_ENABLED: false // Изолираме изображенията (спряно по желание на потребителя)
  };

  // ============================================================================
  // СЪСТОЯНИЕ
  // ============================================================================
  
  const STATE = {
    batchMode: false,
    selectedImages: new Set(),
    db: null,
    accessToken: null
  };

  // ============================================================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================================================
  
  console.log('[🖼️ Image Saver] Зареждане...');

  // ============================================================================
  // INDEXEDDB INITIALIZATION
  // ============================================================================
  
  async function initIndexedDB() {
    return new Promise((resolve, reject) => {
      console.log('[🖼️ Image Saver] Opening IndexedDB:', CONFIG.DB_NAME, 'v', CONFIG.DB_VERSION);
      const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
      
      request.onerror = () => {
        console.error('[🖼️ Image Saver] IndexedDB грешка:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        STATE.db = request.result;
        console.log('[🖼️ Image Saver] ✅ IndexedDB свързана (v' + STATE.db.version + ')');
        resolve(STATE.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[🖼️ Image Saver] 🆙 Upgrade needed to version', CONFIG.DB_VERSION);
        
        // Images store
        if (!db.objectStoreNames.contains('images')) {
          const store = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('source_url', 'source_url', { unique: false });
          console.log('[🖼️ Image Saver] ✅ Създаден images store');
        }
      };
    });
  }

  // Download image as blob and convert to base64
  async function downloadImageAsBlob(imageUrl) {
    try {
      console.log('[🖼️ Image Saver] 📥 Downloading image via proxy:', imageUrl);
      
      // Use proxy endpoint to bypass CORS restrictions
      // This is necessary for Google CDN images (lh3.googleusercontent.com) which block direct access
      const proxyUrl = `${CONFIG.DASHBOARD_URL}/api/proxy-image`;
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download image via proxy: ${response.status} ${response.statusText}. ${errorText}`);
      }
      
      const blob = await response.blob();
      console.log('[🖼️ Image Saver] ✅ Image downloaded via proxy:', {
        size: blob.size,
        type: blob.type
      });
      
      // Convert blob to base64 for storage in IndexedDB
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      return {
        blob: blob,
        base64: base64,
        mimeType: blob.type || 'image/jpeg',
        size: blob.size
      };
    } catch (error) {
      console.error('[🖼️ Image Saver] ❌ Error downloading image:', error);
      throw error;
    }
  }

  // Save image to IndexedDB (with blob data)
  async function saveImageToIndexedDB({ imageUrl, imageName, blob, source_url }) {
    if (!STATE.db) {
      await initIndexedDB();
    }
    
    let imageBlobData = null;
    
    // Ако вече имаме blob (от blob URL или директно подаден), използвай го
    if (blob) {
      console.log('[🖼️ Image Saver] 💾 Using provided blob data:', blob.size, 'bytes');
      
      // Convert blob to base64 for storage in IndexedDB
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      imageBlobData = {
        blob: blob,
        base64: base64,
        mimeType: blob.type || 'image/jpeg',
        size: blob.size
      };
    }
    // Ако е HTTP/HTTPS URL, опитай да го свалиш чрез proxy
    else if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      try {
        imageBlobData = await downloadImageAsBlob(imageUrl);
        console.log('[🖼️ Image Saver] ✅ Image downloaded and converted to base64');
      } catch (error) {
        console.warn('[🖼️ Image Saver] ⚠️ Failed to download image, saving URL only:', error);
        // Fallback: save URL only if download fails
      }
    }
    // Ако е blob: URL, трябва да е обработен преди да стигне тук
    else if (imageUrl && imageUrl.startsWith('blob:')) {
      console.warn('[🖼️ Image Saver] ⚠️ Blob URL not converted, attempting to fetch...');
      try {
        const response = await fetch(imageUrl);
        const fetchedBlob = await response.blob();
        
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(fetchedBlob);
        });
        
        imageBlobData = {
          blob: fetchedBlob,
          base64: base64,
          mimeType: fetchedBlob.type || 'image/jpeg',
          size: fetchedBlob.size
        };
      } catch (error) {
        console.warn('[🖼️ Image Saver] ⚠️ Failed to fetch blob URL:', error);
      }
    }
    
    return new Promise((resolve, reject) => {
      const transaction = STATE.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      
      const imageRecord = {
        url: imageUrl, // Keep original URL for reference (може да е null за blob URL-и)
        name: imageName || 'Saved Image',
        source_url: source_url || window.location.href,
        timestamp: Date.now(),
        synced: false,
        // Store blob data
        imageData: imageBlobData ? imageBlobData.base64 : null, // Base64 string
        mimeType: imageBlobData ? imageBlobData.mimeType : null,
        size: imageBlobData ? imageBlobData.size : null
      };
      
      const request = store.add(imageRecord);
      
      request.onsuccess = async () => {
        const savedRecord = { id: request.result, ...imageRecord };
        console.log('[🖼️ Image Saver] ✅ Image saved to IndexedDB:', {
          id: savedRecord.id,
          name: savedRecord.name,
          hasImageData: !!savedRecord.imageData,
          size: savedRecord.size
        });
        
        // Sync to API immediately after saving (only if we have image data)
        if (CONFIG.SYNC_ENABLED && savedRecord.imageData) {
          try {
            await syncImageToAPI(savedRecord);
          } catch (syncError) {
            console.warn('[🖼️ Image Saver] ⚠️ Sync failed, will retry later:', syncError);
          }
        } else if (!savedRecord.imageData) {
          console.warn('[🖼️ Image Saver] ⚠️ No image data available, skipping sync');
        }
        
        resolve(savedRecord);
      };
      
      request.onerror = () => {
        console.error('[🖼️ Image Saver] ❌ Error saving to IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  // Convert base64 to Blob
  function base64ToBlob(base64String, mimeType) {
    // Remove data URL prefix if present
    const base64Data = base64String.includes(',') 
      ? base64String.split(',')[1] 
      : base64String;
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType || 'image/jpeg' });
  }

  // Sync image from IndexedDB to API
  async function syncImageToAPI(imageRecord) {
    console.log('[🖼️ Image Saver] 🔄 Syncing image to API:', imageRecord.id);
    
    // Ensure we have a valid token
    const hasValidToken = await ensureValidToken();
    if (!hasValidToken) {
      throw new Error('No valid access token. Please log in to BrainBox dashboard first.');
    }
    
    // Check if we have image data (blob) to upload
    if (!imageRecord.imageData) {
      console.warn('[🖼️ Image Saver] ⚠️ No image data found, skipping sync');
      throw new Error('No image data available for sync');
    }
    
    try {
      // Convert base64 back to Blob
      const blob = base64ToBlob(imageRecord.imageData, imageRecord.mimeType);
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Create a File object from blob with proper name
      const fileName = imageRecord.name || 'saved-image.jpg';
      const fileExtension = imageRecord.mimeType?.split('/')[1] || 'jpg';
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const file = new File([blob], `${sanitizedName}.${fileExtension}`, {
        type: imageRecord.mimeType || 'image/jpeg'
      });
      
      formData.append('file', file);
      
      const uploadUrl = `${CONFIG.DASHBOARD_URL}/api/upload`;
      console.log('[🖼️ Image Saver] 📤 Uploading image file:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STATE.accessToken}`
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // If 401, try to refresh token and retry once
        if (response.status === 401) {
          console.log('[🖼️ Image Saver] 🔄 401 Unauthorized, refreshing token...');
          
          // Open login page for user to refresh token
          await openLoginPage();
          
          // Wait a bit for user to potentially refresh token
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try to reload token
          await loadAccessToken();
          
          if (STATE.accessToken) {
            // Retry with new token
            const retryFormData = new FormData();
            retryFormData.append('file', file);
            
            const retryResponse = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${STATE.accessToken}`
              },
              body: retryFormData
            });
            
            if (!retryResponse.ok) {
              const retryErrorText = await retryResponse.text();
              throw new Error(`Session expired. Please log in again. HTTP ${retryResponse.status}: ${retryErrorText}`);
            }
            
            const retryResult = await retryResponse.json();
            console.log('[🖼️ Image Saver] ✅ Image synced to API (after retry):', retryResult);
            
            // Mark as synced
            await markImageAsSynced(imageRecord.id);
            return retryResult;
          } else {
            throw new Error('Session expired. Please log in to BrainBox dashboard to sync images.');
          }
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[🖼️ Image Saver] ✅ Image synced to API:', result);

      // Mark as synced in IndexedDB
      await markImageAsSynced(imageRecord.id);

      return result;
    } catch (error) {
      console.error('[🖼️ Image Saver] ❌ Error syncing image to API:', error);
      throw error;
    }
  }

  // Mark image as synced in IndexedDB
  async function markImageAsSynced(imageId) {
    if (!STATE.db || !imageId) return;
    
    return new Promise((resolve) => {
      const transaction = STATE.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const getRequest = store.get(imageId);
      
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.synced = true;
          record.synced_at = Date.now();
          store.put(record);
          console.log('[🖼️ Image Saver] ✅ Image marked as synced in IndexedDB');
        }
        resolve();
      };
      
      getRequest.onerror = () => {
        console.warn('[🖼️ Image Saver] ⚠️ Error marking image as synced:', getRequest.error);
        resolve();
      };
    });
  }

  // Sync all unsynced images
  async function syncAllUnsyncedImages() {
    if (!STATE.db) {
      await initIndexedDB();
    }

    // Check for valid token first
    const hasValidToken = await ensureValidToken();
    if (!hasValidToken) {
      console.warn('[🖼️ Image Saver] ⚠️ No valid token for sync, opening login page');
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = STATE.db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const index = store.index('synced');
      const request = index.getAll(false); // Get all unsynced images

      request.onsuccess = async () => {
        const unsyncedImages = request.result || [];
        console.log(`[🖼️ Image Saver] 🔄 Found ${unsyncedImages.length} unsynced images`);

        if (unsyncedImages.length === 0) {
          resolve([]);
          return;
        }

        const results = [];
        for (const image of unsyncedImages) {
          try {
            const result = await syncImageToAPI(image);
            results.push({ success: true, image, result });
          } catch (error) {
            console.warn(`[🖼️ Image Saver] ⚠️ Failed to sync image ${image.id}:`, error);
            results.push({ success: false, image, error: error.message });
            
            // If auth error, stop syncing and notify user
            if (error.message && (error.message.includes('Session expired') || error.message.includes('401'))) {
              console.log('[🖼️ Image Saver] 🔑 Auth error detected, stopping sync');
              break;
            }
          }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`[🖼️ Image Saver] ✅ Synced ${successCount}/${unsyncedImages.length} images`);
        resolve(results);
      };

      request.onerror = () => {
        console.error('[🖼️ Image Saver] ❌ Error fetching unsynced images:', request.error);
        reject(request.error);
      };
    });
  }

  // Load access token
  async function loadAccessToken() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['accessToken', 'expiresAt'], (result) => {
          if (result.accessToken) {
            // Check if token is expired (with 5 minute buffer)
            const bufferTime = 5 * 60 * 1000; // 5 minutes
            const isExpired = result.expiresAt && (result.expiresAt - bufferTime) < Date.now();
            
            if (isExpired) {
              console.warn('[🖼️ Image Saver] ⚠️ Access token е изтекъл или скоро ще изтече');
              STATE.accessToken = null;
              STATE.isExpired = true;
            } else {
              STATE.accessToken = result.accessToken;
              STATE.isExpired = false;
              console.log('[🖼️ Image Saver] ✅ Access token зареден');
            }
          } else {
            console.warn('[🖼️ Image Saver] ⚠️ Няма access token');
            STATE.accessToken = null;
            STATE.isExpired = false;
          }
          resolve();
        });
      } catch (error) {
        console.error('[🖼️ Image Saver] ❌ Грешка при зареждане на access token:', error);
        STATE.accessToken = null;
        resolve();
      }
    });
  }

  // Open login page for token refresh
  async function openLoginPage() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'openLoginPage' });
      if (response && response.success) {
        console.log('[🖼️ Image Saver] ✅ Login page opened');
        showNotification('Please log in to sync images. Opening login page...', 'info');
      }
    } catch (error) {
      console.error('[🖼️ Image Saver] ❌ Error opening login page:', error);
      // Fallback: open directly
      window.open(`${CONFIG.DASHBOARD_URL}/extension-auth`, '_blank');
    }
  }

  // Check and refresh token if needed
  async function ensureValidToken() {
    await loadAccessToken();
    
    // If token is missing or expired, try to refresh it
    if (!STATE.accessToken) {
      console.log('[🖼️ Image Saver] 🔄 Attempting to refresh token...');
      try {
        const response = await chrome.runtime.sendMessage({ action: 'refreshAuthToken' });
        if (response && response.success) {
          STATE.accessToken = response.accessToken;
          console.log('[🖼️ Image Saver] ✅ Token refreshed successfully');
          return true;
        }
      } catch (refreshError) {
        console.error('[🖼️ Image Saver] ❌ Token refresh failed:', refreshError);
      }
    }

    // Still no token? Show notification with link
    if (!STATE.accessToken) {
      const authUrl = `${CONFIG.DASHBOARD_URL}/extension-auth`;
      const errorMsg = 'Не сте свързали разширението. Моля, посетете <a href="' + authUrl + '" target="_blank" style="color:white;text-decoration:underline;font-weight:bold;">тази страница</a> за синхронизация.';
      showNotification(errorMsg, 'warning');
      return false;
    }
    
    return true;
  }

  // Initialize
  (async () => {
    try {
      await initIndexedDB();
      await loadAccessToken();
      console.log('[🖼️ Image Saver] ✅ Готово');
    } catch (error) {
      console.error('[🖼️ Image Saver] ❌ Initialization error:', error);
    }
  })();

  // ============================================================================
  // BATCH MODE - CHECKBOXES
  // ============================================================================
  
  function toggleBatchMode(enabled) {
    console.log(`[🖼️ Image Saver] 🔄 toggleBatchMode called with:`, enabled);
    STATE.batchMode = enabled;
    
    if (enabled) {
      console.log(`[🖼️ Image Saver] ✅ Enabling batch mode...`);
      const imageCount = document.querySelectorAll('img').length;
      console.log(`[🖼️ Image Saver] 📊 Found ${imageCount} images on page`);
      addCheckboxesToImages();
      observeImages();
      showBatchSaveButton();
      console.log(`[🖼️ Image Saver] ✅ Batch mode enabled`);
    } else {
      console.log(`[🖼️ Image Saver] ❌ Disabling batch mode...`);
      removeCheckboxes();
      STATE.selectedImages.clear();
      stopObserving();
      hideBatchSaveButton();
      console.log(`[🖼️ Image Saver] ✅ Batch mode disabled`);
    }
    
    console.log(`[🖼️ Image Saver] Batch mode: ${enabled ? 'ON' : 'OFF'}`);
  }
  
  function showBatchSaveButton() {
    if (document.getElementById('brainbox-batch-save-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'brainbox-batch-save-btn';
    btn.textContent = `💾 Save Selected (0)`;
    btn.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      padding: 12px 24px !important;
      background: #667eea !important;
      color: white !important;
      border: none !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      z-index: 999999 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
    
    btn.addEventListener('click', () => {
      saveSelectedImages();
    });
    
    document.body.appendChild(btn);
    updateBatchSaveButton();
  }
  
  function hideBatchSaveButton() {
    const btn = document.getElementById('brainbox-batch-save-btn');
    if (btn) btn.remove();
  }
  
  function updateBatchSaveButton() {
    const btn = document.getElementById('brainbox-batch-save-btn');
    if (btn) {
      const count = STATE.selectedImages.size;
      btn.textContent = `💾 Save Selected (${count})`;
      btn.disabled = count === 0;
      btn.style.opacity = count === 0 ? '0.5' : '1';
    }
  }
  
  // Update button when selection changes
  const originalAdd = STATE.selectedImages.add.bind(STATE.selectedImages);
  const originalDelete = STATE.selectedImages.delete.bind(STATE.selectedImages);
  STATE.selectedImages.add = function(...args) {
    const result = originalAdd(...args);
    updateBatchSaveButton();
    return result;
  };
  STATE.selectedImages.delete = function(...args) {
    const result = originalDelete(...args);
    updateBatchSaveButton();
    return result;
  };

  function addCheckboxesToImages() {
    if (!CONFIG.SCRAPING_ENABLED) return;
    
    // For Gemini: prioritize specific image classes
    const isGemini = window.location.hostname.includes('gemini.google.com');
    let images;
    
    if (isGemini) {
      // Gemini-specific: look for images with class "image loaded" and "thumbnail"
      const imageLoaded = document.querySelectorAll('img.image.loaded, img[class*="image"][class*="loaded"]');
      const thumbnails = document.querySelectorAll('img.thumbnail, img[class*="thumbnail"]');
      const allImages = document.querySelectorAll('img');
      
      console.log(`[🖼️ Image Saver] 🔍 Gemini detected:`);
      console.log(`  - Found ${imageLoaded.length} images with class "image loaded"`);
      console.log(`  - Found ${thumbnails.length} thumbnails`);
      console.log(`  - Found ${allImages.length} total images`);
      
      // Combine prioritized images: image.loaded first, then thumbnails, then others
      const prioritizedImages = new Set();
      
      // Add image.loaded images first (highest priority)
      imageLoaded.forEach(img => prioritizedImages.add(img));
      
      // Add thumbnails (second priority)
      thumbnails.forEach(img => {
        if (!prioritizedImages.has(img)) {
          prioritizedImages.add(img);
        }
      });
      
      // Add other images that aren't already included
      allImages.forEach(img => {
        const hasImageLoaded = img.classList.contains('image') && img.classList.contains('loaded');
        const hasThumbnail = img.classList.contains('thumbnail') || img.className.includes('thumbnail');
        
        if (!hasImageLoaded && !hasThumbnail && !prioritizedImages.has(img)) {
          prioritizedImages.add(img);
        }
      });
      
      images = Array.from(prioritizedImages);
    } else {
      images = document.querySelectorAll('img');
      console.log(`[🖼️ Image Saver] 🔍 Found ${images.length} total images`);
    }
    
    console.log(`[🖼️ Image Saver] 📍 Current page: ${window.location.href}`);
    
    let added = 0;
    let skipped = 0;
    
    images.forEach((img, index) => {
      // Skip if already has checkbox (check both dataset and attribute)
      if (img.dataset.brainboxCheckboxAdded || img.getAttribute('data-brainbox-checkbox-added')) {
        skipped++;
        return;
      }
      
      // Check image dimensions - use both natural and displayed size
      const rect = img.getBoundingClientRect();
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      const naturalWidth = img.naturalWidth || displayWidth;
      const naturalHeight = img.naturalHeight || displayHeight;
      
      // For Gemini images, be more lenient with size checks
      const isImageLoaded = img.classList.contains('image') && img.classList.contains('loaded');
      const isThumbnail = img.classList.contains('thumbnail') || img.className.includes('thumbnail');
      const isGeminiImage = isImageLoaded || isThumbnail;
      const minSize = isGeminiImage ? 30 : 50; // Smaller threshold for Gemini images
      
      // Skip very small images (likely icons) - check both natural and displayed size
      if ((naturalWidth < minSize && naturalHeight < minSize) || (displayWidth < minSize && displayHeight < minSize)) {
        skipped++;
        console.log(`[🖼️ Image Saver] ⏭️ Skipping small image ${index}: natural=${naturalWidth}x${naturalHeight}, display=${displayWidth}x${displayHeight}, isThumbnail=${isThumbnail}`);
        return;
      }
      
      // Skip if image is in extension UI
      if (img.closest('.brainbox-image-checkbox')) {
        skipped++;
        return;
      }
      
      // Use setAttribute instead of dataset to avoid conflicts with Gemini's code
      try {
        img.setAttribute('data-brainbox-checkbox-added', 'true');
        const imageId = `img-${index}-${Date.now()}`;
        img.setAttribute('data-brainbox-image-id', imageId);
        
        console.log(`[🖼️ Image Saver] 📸 Processing image ${index}:`, {
          src: img.src?.substring(0, 50),
          naturalSize: `${naturalWidth}x${naturalHeight}`,
          displaySize: `${displayWidth}x${displayHeight}`,
          isVisible: rect.width > 0 && rect.height > 0
        });
      } catch (e) {
        console.warn(`[🖼️ Image Saver] ⚠️ Error setting attributes on image ${index}:`, e);
        skipped++;
        return;
      }
      
      // Create checkbox container
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'brainbox-image-checkbox';
      checkboxContainer.style.cssText = `
        position: absolute;
        top: 4px;
        left: 4px;
        z-index: 999998;
        background: rgba(102, 126, 234, 0.9);
        border-radius: 4px;
        padding: 4px;
        cursor: pointer;
        transition: all 0.2s;
      `;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'brainbox-checkbox';
      // Use getAttribute to avoid conflicts with Gemini's code
      const imageId = img.getAttribute('data-brainbox-image-id') || img.dataset.brainboxImageId;
      checkbox.setAttribute('data-image-id', String(imageId || ''));
      checkbox.style.cssText = `
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: #667eea;
      `;
      
      checkbox.addEventListener('change', (e) => {
        try {
          const imageId = e.target.getAttribute('data-image-id') || e.target.dataset.imageId;
          if (!imageId) {
            console.warn(`[🖼️ Image Saver] ⚠️ No image ID found for checkbox`);
            return;
          }
          console.log(`[🖼️ Image Saver] ☑️ Checkbox changed for image ${imageId}: ${e.target.checked ? 'checked' : 'unchecked'}`);
          if (e.target.checked) {
            STATE.selectedImages.add(String(imageId));
            console.log(`[🖼️ Image Saver] ➕ Added to selection. Total selected: ${STATE.selectedImages.size}`);
          } else {
            STATE.selectedImages.delete(String(imageId));
            console.log(`[🖼️ Image Saver] ➖ Removed from selection. Total selected: ${STATE.selectedImages.size}`);
          }
          updateCheckboxStyle(checkboxContainer, e.target.checked);
          updateBatchSaveButton();
        } catch (err) {
          console.warn(`[🖼️ Image Saver] ⚠️ Error handling checkbox change:`, err);
        }
      });
      
      checkboxContainer.appendChild(checkbox);
      
      // Make checkbox container clickable
      checkboxContainer.style.pointerEvents = 'auto';
      
      // Make image position relative if not already (for Gemini compatibility)
      const originalPosition = window.getComputedStyle(img).position;
      if (originalPosition === 'static') {
        img.style.position = 'relative';
      }
      
      // Add checkbox to image's parent or create wrapper
      let container = img.parentElement;
      
      // For Gemini: images might be in complex nested structures
      if (container && container.classList.contains('brainbox-image-wrapper')) {
        container.appendChild(checkboxContainer);
      } else {
        // Try to find a suitable parent container (for Gemini compatibility)
        let parent = img.parentElement;
        let suitableParent = null;
        
        // Look for a parent with position relative/absolute or inline-block
        while (parent && parent !== document.body) {
          const parentStyle = window.getComputedStyle(parent);
          const parentPos = parentStyle.position;
          const parentDisplay = parentStyle.display;
          
          if (parentPos === 'relative' || parentPos === 'absolute' || 
              parentDisplay === 'inline-block' || parentDisplay === 'block') {
            suitableParent = parent;
            break;
          }
          parent = parent.parentElement;
        }
        
        if (suitableParent && suitableParent !== img.parentElement && 
            suitableParent.contains(img)) {
          // Use existing suitable parent
          if (window.getComputedStyle(suitableParent).position === 'static') {
            suitableParent.style.position = 'relative';
          }
          checkboxContainer.style.position = 'absolute';
          checkboxContainer.style.top = '4px';
          checkboxContainer.style.left = '4px';
          suitableParent.appendChild(checkboxContainer);
          console.log(`[🖼️ Image Saver] ✅ Used existing parent container for image ${index}`);
        } else {
          // Create wrapper
          const wrapper = document.createElement('div');
          wrapper.className = 'brainbox-image-wrapper';
          wrapper.style.cssText = `
            position: relative;
            display: inline-block;
          `;
          
          if (img.parentNode) {
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);
            wrapper.appendChild(checkboxContainer);
            console.log(`[🖼️ Image Saver] ✅ Created wrapper for image ${index}`);
          } else {
            console.warn(`[🖼️ Image Saver] ⚠️ Could not find parent for image ${index}`);
          }
        }
      }
      
      added++;
      console.log(`[🖼️ Image Saver] ✅ Added checkbox to image ${index}: ${img.src?.substring(0, 50)}...`);
    });
    
    console.log(`[🖼️ Image Saver] 📊 Summary: Added ${added} checkboxes, Skipped ${skipped} images`);
  }

  function updateCheckboxStyle(container, checked) {
    if (checked) {
      container.style.background = 'rgba(16, 185, 129, 0.9)';
    } else {
      container.style.background = 'rgba(102, 126, 234, 0.9)';
    }
  }

  function updateCheckboxPosition(container, img) {
    const imgRect = img.getBoundingClientRect();
    container.style.top = `${imgRect.top + window.scrollY}px`;
    container.style.left = `${imgRect.left + window.scrollX}px`;
    container.style.width = `${imgRect.width}px`;
    container.style.height = `${imgRect.height}px`;
  }

  function removeCheckboxes() {
    document.querySelectorAll('.brainbox-image-checkbox').forEach(el => {
      el.remove();
    });
    document.querySelectorAll('.brainbox-image-wrapper').forEach(wrapper => {
      const img = wrapper.querySelector('img');
      if (img && img.parentElement === wrapper) {
        wrapper.parentNode.insertBefore(img, wrapper);
        wrapper.remove();
      }
    });
    document.querySelectorAll('img[data-brainbox-checkbox-added]').forEach(img => {
      delete img.dataset.brainboxCheckboxAdded;
    });
  }

  // Observe new images
  let imageObserver = null;
  function observeImages() {
    if (!CONFIG.SCRAPING_ENABLED) return;
    
    if (imageObserver) {
      imageObserver.disconnect();
    }
    
    imageObserver = new MutationObserver(() => {
      if (STATE.batchMode) {
        addCheckboxesToImages();
      }
    });
    
    imageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  function stopObserving() {
    if (imageObserver) {
      imageObserver.disconnect();
      imageObserver = null;
    }
  }

  // ============================================================================
  // SAVE IMAGES
  // ============================================================================
  
  async function saveImage(imageUrl, imageName = null) {
    console.log('[🖼️ Image Saver] 💾 saveImage called:', { imageUrl, imageName });
    
    try {
      // Ако е blob URL, конвертирай го в реален blob
      let finalImageUrl = imageUrl;
      let blobData = null;

      if (imageUrl && imageUrl.startsWith('blob:')) {
        console.log('[🖼️ Image Saver] 🔄 Converting blob URL to blob data...');
        
        try {
          // Fetch blob URL-а (работи само в същия браузър)
          const response = await fetch(imageUrl);
          blobData = await response.blob();
          
          console.log('[🖼️ Image Saver] ✅ Blob converted:', blobData.size, 'bytes', blobData.type);
          
          // За blob URL-и, не запазваме URL-а (той е временен)
          finalImageUrl = null;
        } catch (error) {
          console.error('[🖼️ Image Saver] ❌ Failed to convert blob URL:', error);
          throw new Error(`Failed to convert blob URL: ${error.message}`);
        }
      }

      // Запази в IndexedDB
      const savedImage = await saveImageToIndexedDB({
        imageUrl: finalImageUrl,
        imageName: imageName || 'Saved Image',
        blob: blobData, // Подай blob-а директно ако е конвертиран от blob URL
        source_url: window.location.href
      });

      console.log('[🖼️ Image Saver] ✅ Image saved to IndexedDB:', savedImage);
      showNotification('✅ Image saved and synced', 'success');
      return savedImage;
    } catch (error) {
      console.error('[🖼️ Image Saver] ❌ Error in saveImage:', error);
      showNotification(`Error: ${error.message}`, 'error');
      throw error;
    }
  }

  async function saveSelectedImages() {
    console.log(`[🖼️ Image Saver] 💾 saveSelectedImages called`);
    console.log(`[🖼️ Image Saver] 📊 Selected images count: ${STATE.selectedImages.size}`);
    
    if (STATE.selectedImages.size === 0) {
      console.warn(`[🖼️ Image Saver] ⚠️ No images selected`);
      showNotification('No images selected', 'warning');
      return;
    }

    showNotification(`Saving ${STATE.selectedImages.size} images...`, 'info');

    console.log(`[🖼️ Image Saver] 🔍 Processing selected image IDs:`, Array.from(STATE.selectedImages));
    
    const images = Array.from(STATE.selectedImages).map(imageId => {
      const img = document.querySelector(`img[data-brainbox-image-id="${imageId}"]`);
      console.log(`[🖼️ Image Saver] 🔍 Looking for image with ID: ${imageId}`, img ? 'Found' : 'NOT FOUND');
      if (img) {
        const imageData = {
          url: img.src || img.currentSrc,
          name: img.alt || img.title || 'Saved Image',
          source_url: window.location.href
        };
        console.log(`[🖼️ Image Saver] ✅ Image data:`, imageData);
        return imageData;
      }
      return null;
    }).filter(Boolean);

    console.log(`[🖼️ Image Saver] 📊 Valid images to save: ${images.length}`);

    if (images.length === 0) {
      console.error(`[🖼️ Image Saver] ❌ No valid images found after processing`);
      showNotification('No valid images found', 'error');
      return;
    }

    try {
      // Save all images to IndexedDB
      const savedImages = [];
      for (const imageData of images) {
        // Обработвай blob URL-и преди запазване
        let finalImageUrl = imageData.url;
        let blobData = null;

        if (imageData.url && imageData.url.startsWith('blob:')) {
          console.log('[🖼️ Image Saver] 🔄 Converting blob URL to blob data for batch save...');
          try {
            const response = await fetch(imageData.url);
            blobData = await response.blob();
            console.log('[🖼️ Image Saver] ✅ Blob converted:', blobData.size, 'bytes');
            finalImageUrl = null; // Не запазваме blob URL-а
          } catch (error) {
            console.warn('[🖼️ Image Saver] ⚠️ Failed to convert blob URL, will try to download:', error);
            // Продължи с оригиналния URL, функцията ще опита да го свали
          }
        }

        const result = await saveImageToIndexedDB({
          imageUrl: finalImageUrl,
          imageName: imageData.name,
          blob: blobData,
          source_url: imageData.source_url
        });
        savedImages.push(result);
      }
      
      console.log(`[🖼️ Image Saver] ✅ ${savedImages.length} images saved to IndexedDB`);
      showNotification(`✅ Saved ${savedImages.length} images`, 'success');
      
      // Clear selection
      STATE.selectedImages.clear();
      document.querySelectorAll('.brainbox-checkbox:checked').forEach(cb => {
        cb.checked = false;
        updateCheckboxStyle(cb.closest('.brainbox-image-checkbox'), false);
      });
      
    } catch (error) {
      console.error('[🖼️ Image Saver] ❌ Error saving images:', error);
      showNotification(`Error: ${error.message}`, 'error');
    }
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================
  
  function showNotification(message, type = 'info') {
    const existing = document.querySelector('.brainbox-image-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'brainbox-image-notification';
    
    const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
    
    notification.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      padding: 16px 20px !important;
      border-radius: 12px !important;
      background: ${bgColor} !important;
      color: white !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
      z-index: 999999 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      max-width: 300px !important;
    `;
    
    // Use innerHTML to support links
    notification.innerHTML = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ============================================================================
  // MESSAGE LISTENER
  // ============================================================================
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Only handle messages intended for image saver
    // Ignore messages from brainbox_master.js (processBatchexecuteResponse, extractConversationFromContextMenu, etc.)
    const imageSaverActions = ['toggleBatchMode', 'saveSelectedImages', 'saveImage'];
    
    if (!imageSaverActions.includes(request.action)) {
      // Not for us, ignore silently
      return false;
    }
    
    console.log(`[🖼️ Image Saver] 📨 Message received:`, request.action, request);
    
    if (request.action === 'toggleBatchMode') {
      console.log(`[🖼️ Image Saver] 🔄 toggleBatchMode message received:`, request.enabled);
      toggleBatchMode(request.enabled);
      sendResponse({ success: true });
      return true;
    }
    
    if (request.action === 'saveSelectedImages') {
      console.log(`[🖼️ Image Saver] 💾 saveSelectedImages message received`);
      saveSelectedImages().then(() => {
        console.log(`[🖼️ Image Saver] ✅ saveSelectedImages completed`);
        sendResponse({ success: true });
      }).catch(error => {
        console.error(`[🖼️ Image Saver] ❌ saveSelectedImages error:`, error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
    
    if (request.action === 'saveImage') {
      console.log(`[🖼️ Image Saver] 💾 saveImage message received:`, request.imageUrl);
      saveImage(request.imageUrl, request.imageName).then(result => {
        console.log(`[🖼️ Image Saver] ✅ saveImage completed:`, result);
        showNotification('✅ Image saved successfully', 'success');
        sendResponse({ success: true, data: result });
      }).catch(error => {
        console.error(`[🖼️ Image Saver] ❌ saveImage error:`, error);
        showNotification(`❌ Error: ${error.message}`, 'error');
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
    
    return false;
  });

  console.log('[🖼️ Image Saver] ✅ Message listener активен');

})();

