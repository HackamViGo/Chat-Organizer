const API_BASE_URL = 'http://localhost:3000';

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

// Fetch folders from API
async function fetchFolders() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/folders`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
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
