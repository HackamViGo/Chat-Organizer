// Background Service Worker for AI Chat Organizer Extension

// Change to http://localhost:3000 for local testing
// const API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'https://brainbox-alpha.vercel.app';

// Initialize context menu on install
chrome.runtime.onInstalled.addListener(() => {
  // Right-click on selection: Add to Chat Organizer (direct to My Chats)
  chrome.contextMenus.create({
    id: 'add-to-chat-organizer',
    title: '🎯 Save Full Chat to BrainBox',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'add-all-images',
    title: '📸 Save All Images to BrainBox',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'add-single-image',
    title: '💾 Save Image to BrainBox',
    contexts: ['image']
  });

  chrome.contextMenus.create({
    id: 'insert-prompt',
    title: '⌨️ Insert BrainBox Prompt',
    contexts: ['editable']
  });

  console.log('AI Chat Organizer extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-to-chat-organizer') {
    handleAddToChatOrganizer(info, tab);
  } else if (info.menuItemId === 'insert-prompt') {
    handleInsertPrompt(info, tab);
  } else if (info.menuItemId === 'add-single-image') {
    handleAddSingleImage(info, tab);
  } else if (info.menuItemId === 'add-all-images') {
    handleAddAllImages(info, tab);
  }
});

// Handle "Add to Chat Organizer" (direct save to My Chats)
async function handleAddToChatOrganizer(info, tab) {
  const selectedText = info.selectionText || '';
  const pageUrl = tab.url;
  const pageTitle = tab.title;
  const platform = detectPlatform(pageUrl);

  try {
    // Check if we have token first
    const { accessToken } = await chrome.storage.local.get(['accessToken']);

    if (!accessToken) {
      // No token - open auth page
      chrome.tabs.create({
        url: `${API_BASE_URL}/extension-auth`
      });
      chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        message: 'Please authenticate the extension first',
        type: 'error'
      });
      return;
    }

    // Try to extract full chat context
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractChatContext'
    });

    // Save directly to My Chats (no folder_id)
    await handleSaveChat({
      title: response.title || pageTitle,
      url: pageUrl,
      content: response.content || selectedText || 'Saved from ' + platform,
      platform: platform,
      folder_id: null, // Save to My Chats
      timestamp: new Date().toISOString()
    });

    // Show success notification
    chrome.tabs.sendMessage(tab.id, {
      action: 'showNotification',
      message: '✓ Added to My Chats!',
      type: 'success'
    });
  } catch (error) {
    console.error('Error adding to chat organizer:', error);

    // Check if it's a login error
    const errorMessage = error.message || '';
    if (errorMessage.includes('login') || errorMessage.includes('Session expired') || errorMessage.includes('unauthorized')) {
      // Token expired - open auth page
      chrome.tabs.create({
        url: `${API_BASE_URL}/extension-auth`
      });
      chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        message: 'Session expired - please re-authenticate',
        type: 'error'
      });
    } else {
      // Fallback: open popup for manual save
      openSaveDialog({
        title: pageTitle,
        url: pageUrl,
        content: selectedText,
        platform: platform
      });
    }
  }
}

// Handle "Add Single Image"
async function handleAddSingleImage(info, tab) {
  const imageUrl = info.srcUrl;
  const pageUrl = tab.url;
  const pageTitle = tab.title;

  if (!imageUrl) {
    console.error('No image URL found');
    return;
  }

  try {
    await handleSaveImage({
      url: imageUrl,
      source_url: pageUrl,
      title: pageTitle || 'Image from ' + new URL(pageUrl).hostname,
      timestamp: new Date().toISOString()
    });

    chrome.tabs.sendMessage(tab.id, {
      action: 'showNotification',
      message: '✓ Image saved!',
      type: 'success'
    });
  } catch (error) {
    console.error('Error saving image:', error);
    chrome.tabs.sendMessage(tab.id, {
      action: 'showNotification',
      message: '✗ Failed to save image',
      type: 'error'
    });
  }
}

// Handle "Add All Images (Bulk)"
async function handleAddAllImages(info, tab) {
  try {
    // Extract all images from page
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractAllImages'
    });

    const images = response.images || [];

    if (images.length === 0) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        message: 'No images found on page',
        type: 'error'
      });
      return;
    }

    // Save all images - now using BULK API for speed
    try {
      // Prepare bulk data
      const bulkData = {
        source_url: tab.url,
        images: images.map(url => ({
          url: url,
          name: `Image from ${tab.title}`
        }))
      };

      await handleSaveImage(bulkData);

      chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        message: `✓ Saved all ${images.length} images!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Bulk save error:', error);
      chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        message: '✗ Failed to save images',
        type: 'error'
      });
    }
  } catch (error) {
    console.error('Error in handleAddAllImages:', error);
    chrome.tabs.sendMessage(tab.id, {
      action: 'showNotification',
      message: '✗ Failed to extract images',
      type: 'error'
    });
  }
}

// Handle insert prompt
async function handleInsertPrompt(info, tab) {
  // Fetch prompts from API
  try {
    const prompts = await fetchPrompts();

    // Send message to content script to show prompt selector
    chrome.tabs.sendMessage(tab.id, {
      action: 'showPromptSelector',
      prompts: prompts
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
  }
}

// Detect platform from URL
function detectPlatform(url) {
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
    return 'ChatGPT';
  } else if (url.includes('claude.ai')) {
    return 'Claude';
  } else if (url.includes('gemini.google.com')) {
    return 'Gemini';
  } else if (url.includes('lmarena.ai') || url.includes('lmsys.org')) {
    return 'LMArena';
  } else {
    return 'Other';
  }
}

// Open save dialog (popup window)
function openSaveDialog(chatData) {
  // Store chat data temporarily
  chrome.storage.local.set({ pendingChat: chatData });

  // Open popup
  chrome.action.openPopup();
}

// Fetch prompts from API
async function fetchPrompts() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prompts`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch prompts');
    }

    const data = await response.json();
    return data.prompts || [];
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return [];
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveChat') {
    handleSaveChat(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'getPrompts') {
    fetchPrompts()
      .then(prompts => sendResponse({ success: true, prompts: prompts }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'createFolder') {
    handleCreateFolder(request.data)
      .then(folder => sendResponse({ success: true, folder: folder }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getFolders') {
    fetchFolders()
      .then(folders => sendResponse({ success: true, folders: folders }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'storeAuthToken') {
    // Store auth tokens
    chrome.storage.local.set({
      accessToken: request.data.accessToken,
      refreshToken: request.data.refreshToken,
      expiresAt: request.data.expiresAt
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'saveImage') {
    handleSaveImage(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'saveAllImages') {
    handleSaveImage(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Save chat to API
async function handleSaveChat(chatData) {
  try {
    console.log('[BrainBox Background] 📤 Saving chat:', {
      title: chatData.title,
      platform: chatData.platform,
      contentLength: chatData.content?.length || 0,
      url: chatData.url
    });

    // Get stored access token and expiry
    const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);

    // Check if token exists and is not expired
    if (!accessToken || (expiresAt && Date.now() > expiresAt)) {
      console.warn('[BrainBox Background] ⚠️ Token missing or expired');
      // Open auth page
      chrome.tabs.create({
        url: `${API_BASE_URL}/extension-auth`
      });
      throw new Error('Please authenticate the extension first');
    }

    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(chatData),
      credentials: 'omit'
    });

    console.log('[BrainBox Background] 📡 API Response status:', response.status);

    if (response.status === 401 || response.status === 403) {
      console.error('[BrainBox Background] ❌ Authentication failed');
      // Token expired - clear and open auth page
      await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt']);
      chrome.tabs.create({
        url: `${API_BASE_URL}/extension-auth`
      });
      throw new Error('Session expired - please re-authenticate');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BrainBox Background] ❌ API Error:', errorText);
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('[BrainBox Background] ✅ Chat saved successfully:', result.id);
    return result;
  } catch (error) {
    console.error('[BrainBox Background] ❌ Save failed:', error);
    throw error;
  }
}

// Create folder via API
// Create folder via API
async function handleCreateFolder(folderData) {
  try {
    // Get stored access token
    const { accessToken, expiresAt } = await chrome.storage.local.get(['accessToken', 'expiresAt']);

    // Check if token exists and is not expired
    if (!accessToken || (expiresAt && Date.now() > expiresAt)) {
      chrome.tabs.create({
        url: `${API_BASE_URL}/extension-auth`
      });
      throw new Error('Please authenticate the extension first');
    }

    const response = await fetch(`${API_BASE_URL}/api/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(folderData),
      credentials: 'omit'
    });

    if (response.status === 401 || response.status === 403) {
      await chrome.storage.local.remove(['accessToken', 'refreshToken', 'expiresAt']);
      chrome.tabs.create({
        url: `${API_BASE_URL}/extension-auth`
      });
      throw new Error('Session expired - please re-authenticate');
    }

    if (!response.ok) {
      throw new Error('Failed to create folder');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

// Fetch folders from API
async function fetchFolders() {
  try {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);

    if (!accessToken) return [];

    const response = await fetch(`${API_BASE_URL}/api/folders`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch folders');
    }

    const data = await response.json();
    return data.folders || [];
  } catch (error) {
    console.error('Error fetching folders:', error);
    return [];
  }
}

// Save image to API
async function handleSaveImage(imageData) {
  try {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);

    if (!accessToken) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/api/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(imageData),
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error('Failed to save image');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}
