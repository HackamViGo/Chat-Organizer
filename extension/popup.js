// Change to http://localhost:3000 for local testing
const API_BASE_URL = 'http://localhost:3000';
// const API_BASE_URL = 'https://brainbox-alpha.vercel.app';

let pendingChat = null;
let folders = [];

// DOM elements
const loadingState = document.getElementById('loading-state');
const saveForm = document.getElementById('save-form');
const messageContainer = document.getElementById('message-container');
const titleInput = document.getElementById('title');
const urlInput = document.getElementById('url');
const platformSelect = document.getElementById('platform');
const folderSelect = document.getElementById('folder');
const contentTextarea = document.getElementById('content');
const cancelBtn = document.getElementById('cancel-btn');

// Initialize popup
async function init() {
  showLoading(true);
  
  try {
    // Check if user is logged in (has access token)
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    
    if (!accessToken) {
      // Not logged in - show login prompt
      showLoginPrompt();
      showLoading(false);
      return;
    }

    // Load pending chat from storage
    const data = await chrome.storage.local.get(['pendingChat']);
    pendingChat = data.pendingChat;

    // Fetch folders from API
    await fetchFolders();

    // Populate form if pending chat exists
    if (pendingChat) {
      populateForm(pendingChat);
    } else {
      // Try to extract current tab data
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        titleInput.value = tabs[0].title || '';
        urlInput.value = tabs[0].url || '';
        platformSelect.value = detectPlatformFromUrl(tabs[0].url);
      }
    }

    showLoading(false);
    saveForm.style.display = 'block';
  } catch (error) {
    console.error('Init error:', error);
    showMessage('Failed to load chat data. Please try again.', 'error');
    showLoading(false);
  }
}

// Show login prompt
function showLoginPrompt() {
  loadingState.style.display = 'none';
  saveForm.style.display = 'none';
  
  const loginPrompt = document.createElement('div');
  loginPrompt.style.cssText = 'padding: 24px; text-align: center;';
  loginPrompt.innerHTML = `
    <h2 style="font-size: 20px; margin-bottom: 16px;">Login Required</h2>
    <p style="margin-bottom: 24px; opacity: 0.9;">Please login to your BrainBox account to use the extension.</p>
    <button id="login-btn" style="width: 100%; padding: 12px; background: white; color: #667eea; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">
      Login to BrainBox
    </button>
  `;
  
  document.querySelector('.content').appendChild(loginPrompt);
  
  document.getElementById('login-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: `${API_BASE_URL}/extension-auth` });
    window.close();
  });
}

// Fetch folders from API
async function fetchFolders() {
  try {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/api/folders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch folders');
    }

    const data = await response.json();
    folders = data.folders || [];

    // Populate folder dropdown
    folderSelect.innerHTML = '<option value="">No folder</option>';
    folders
      .filter(f => f.type === 'chat' || !f.type)
      .forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        folderSelect.appendChild(option);
      });
  } catch (error) {
    console.error('Fetch folders error:', error);
    // Continue without folders
  }
}

// Populate form with pending chat data
function populateForm(chat) {
  if (chat.title) titleInput.value = chat.title;
  if (chat.url) urlInput.value = chat.url;
  if (chat.platform) platformSelect.value = chat.platform;
  if (chat.content) contentTextarea.value = chat.content.substring(0, 500) + '...';
}

// Detect platform from URL
function detectPlatformFromUrl(url) {
  if (!url) return 'Other';
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'ChatGPT';
  if (url.includes('claude.ai')) return 'Claude';
  if (url.includes('gemini.google.com')) return 'Gemini';
  return 'Other';
}

// Handle form submission
saveForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = saveForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const chatData = {
      title: titleInput.value.trim(),
      url: urlInput.value.trim() || null,
      platform: platformSelect.value,
      folder_id: folderSelect.value || null,
      content: pendingChat?.content || contentTextarea.value || '',
      timestamp: pendingChat?.timestamp || new Date().toISOString()
    };

    // Validate required fields
    if (!chatData.title) {
      throw new Error('Title is required');
    }

    // Send to background script to save
    const response = await chrome.runtime.sendMessage({
      action: 'saveChat',
      data: chatData
    });

    if (response.success) {
      // Clear pending chat
      await chrome.storage.local.remove(['pendingChat']);
      
      showMessage('Chat saved successfully!', 'success');
      
      // Close popup after short delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      throw new Error(response.error || 'Failed to save chat');
    }
  } catch (error) {
    console.error('Save error:', error);
    showMessage(error.message || 'Failed to save chat. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Chat';
  }
});

// Handle cancel button
cancelBtn.addEventListener('click', () => {
  chrome.storage.local.remove(['pendingChat']);
  window.close();
});

// Show/hide loading state
function showLoading(show) {
  loadingState.style.display = show ? 'block' : 'none';
}

// Show message
function showMessage(text, type = 'error') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = text;
  messageContainer.innerHTML = '';
  messageContainer.appendChild(messageDiv);

  if (type === 'success') {
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }
}

// Start initialization
init();
