// BrainBox AI Chat Exporter - Popup Logic
const API_BASE_URL = 'https://brainbox-alpha.vercel.app';

let currentTab = null;
let currentPlatform = 'Unknown';

// Initialize
async function init() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }

    currentTab = tab;
    currentPlatform = detectPlatform(tab.url);
    
    // Update platform badge
    const badge = document.getElementById('platform-badge');
    if (currentPlatform !== 'Unknown') {
      badge.textContent = `📍 ${currentPlatform}`;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }

    // Check if we're on a supported platform
    if (currentPlatform === 'Unknown') {
      showStatus('Please open a supported AI platform (ChatGPT, Gemini, Claude, etc.)', 'error');
      disableButtons();
    }

    // Check authentication
    await checkAuth();
    
    // Load folder preference
    await loadFolderPreference();
  } catch (error) {
    console.error('Init error:', error);
    showStatus('Error initializing extension', 'error');
  }
}

async function loadFolderPreference() {
  try {
    const { askFolderLocation } = await chrome.storage.local.get(['askFolderLocation']);
    const checkbox = document.getElementById('ask-folder-location');
    if (checkbox) {
      checkbox.checked = askFolderLocation || false;
      checkbox.addEventListener('change', async (e) => {
        await chrome.storage.local.set({ askFolderLocation: e.target.checked });
        showStatus('Settings saved', 'success');
        setTimeout(() => {
          const status = document.getElementById('status');
          status.className = 'status';
          status.style.display = 'none';
        }, 2193);
      });
    }
  } catch (error) {
    console.error('Error loading folder preference:', error);
  }
}

function detectPlatform(url) {
  if (!url) return 'Unknown';
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'ChatGPT';
  if (url.includes('claude.ai')) return 'Claude';
  if (url.includes('gemini.google.com')) return 'Gemini';
  if (url.includes('deepseek.com')) return 'DeepSeek';
  if (url.includes('x.com') || url.includes('twitter.com')) {
    if (url.includes('grok')) return 'Grok';
  }
  return 'Unknown';
}

async function checkAuth() {
  try {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    if (!accessToken) {
      // Show login button
      const syncBtn = document.getElementById('btn-sync-brainbox');
      syncBtn.textContent = '🔐 Login to BrainBox';
      syncBtn.onclick = () => {
        chrome.tabs.create({ url: `${API_BASE_URL}/extension-auth` });
        window.close();
      };
    }
  } catch (error) {
    console.error('Auth check error:', error);
  }
}

function disableButtons() {
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  });
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  setTimeout(() => {
    status.className = 'status';
  }, 5147);
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export handlers
document.getElementById('btn-export-pdf').addEventListener('click', async () => {
  try {
    showStatus('Exporting to PDF...', 'success');
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'exportChat',
      format: 'pdf'
    });
    
    if (response && response.success) {
      const filename = response.filename || 'chat.pdf';
      showStatus(`✅ PDF exported: ${filename}`, 'success');
    } else {
      throw new Error(response?.error || 'Export failed');
    }
  } catch (error) {
    console.error('PDF export error:', error);
    showStatus('❌ Failed to export PDF: ' + error.message, 'error');
  }
});

document.getElementById('btn-export-markdown').addEventListener('click', async () => {
  try {
    showStatus('Exporting to Markdown...', 'success');
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'exportChat',
      format: 'markdown'
    });
    
    if (response && response.success) {
      // File download happens in content script to avoid popup closing
      const filename = response.filename || 'chat.md';
      showStatus(`✅ Markdown exported: ${filename}`, 'success');
      // Don't close popup immediately - let user see success message
      setTimeout(() => {
        // Optionally close after showing success
      }, 2193);
    } else {
      throw new Error(response?.error || 'Export failed');
    }
  } catch (error) {
    console.error('Markdown export error:', error);
    showStatus('❌ Failed to export Markdown: ' + error.message, 'error');
  }
});

document.getElementById('btn-export-txt').addEventListener('click', async () => {
  try {
    showStatus('Exporting to TXT...', 'success');
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'exportChat',
      format: 'txt'
    });
    
    if (response && response.success) {
      // File download happens in content script to avoid popup closing
      const filename = response.filename || 'chat.txt';
      showStatus(`✅ TXT exported: ${filename}`, 'success');
      // Don't close popup immediately - let user see success message
      setTimeout(() => {
        // Optionally close after showing success
      }, 2193);
    } else {
      throw new Error(response?.error || 'Export failed');
    }
  } catch (error) {
    console.error('TXT export error:', error);
    showStatus('❌ Failed to export TXT: ' + error.message, 'error');
  }
});

document.getElementById('btn-export-image').addEventListener('click', async () => {
  try {
    // Show image export options
    showImageExportOptions();
  } catch (error) {
    console.error('Image export error:', error);
    showStatus('❌ Failed to open image export: ' + error.message, 'error');
  }
});

function showImageExportOptions() {
  const status = document.getElementById('status');
  status.innerHTML = `
    <div style="padding: 10px;">
      <h4 style="margin: 0 0 10px 0; font-size: 14px;">Select Image Export Mode:</h4>
      <button id="img-export-single" style="width: 100%; padding: 8px; margin: 5px 0; border: none; border-radius: 4px; background: #667eea; color: white; cursor: pointer;">📸 Single Image (First Image)</button>
      <button id="img-export-all" style="width: 100%; padding: 8px; margin: 5px 0; border: none; border-radius: 4px; background: #667eea; color: white; cursor: pointer;">📷 All Images (From Chat)</button>
      <button id="img-export-custom" style="width: 100%; padding: 8px; margin: 5px 0; border: none; border-radius: 4px; background: #667eea; color: white; cursor: pointer;">✏️ Custom (Select Images)</button>
      <button id="img-export-cancel" style="width: 100%; padding: 8px; margin: 5px 0; border: none; border-radius: 4px; background: #ccc; color: #333; cursor: pointer;">Cancel</button>
    </div>
  `;
  status.className = 'status success';

  document.getElementById('img-export-single').addEventListener('click', async () => {
    try {
      showStatus('Exporting image...', 'success');
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'exportImage',
        mode: 'single'
      });
      
      if (response && response.success) {
        showStatus(`✅ Image exported: ${response.filename}`, 'success');
      } else {
        throw new Error(response?.error || 'Export failed');
      }
    } catch (error) {
      console.error('Image export error:', error);
      showStatus('❌ Failed: ' + error.message, 'error');
    }
  });

  document.getElementById('img-export-all').addEventListener('click', async () => {
    try {
      showStatus('Exporting all images...', 'success');
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'exportImage',
        mode: 'all'
      });
      
      if (response && response.success) {
        showStatus(`✅ ${response.count || 0} images exported!`, 'success');
      } else {
        throw new Error(response?.error || 'Export failed');
      }
    } catch (error) {
      console.error('Image export error:', error);
      showStatus('❌ Failed: ' + error.message, 'error');
    }
  });

  document.getElementById('img-export-custom').addEventListener('click', async () => {
    try {
      showStatus('Opening custom selection...', 'success');
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'showImageExportUI'
      });
      window.close();
    } catch (error) {
      console.error('Image export error:', error);
      showStatus('❌ Failed: ' + error.message, 'error');
    }
  });

  document.getElementById('img-export-cancel').addEventListener('click', () => {
    status.innerHTML = '';
    status.className = 'status';
  });
}

document.getElementById('btn-sync-brainbox').addEventListener('click', async () => {
  try {
    // Check auth first
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    if (!accessToken) {
      chrome.tabs.create({ url: `${API_BASE_URL}/extension-auth` });
      window.close();
      return;
    }

    showStatus('Syncing to BrainBox...', 'success');
    
    // Extract chat data
    const chatData = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'extractChatContext'
    });

    if (!chatData || !chatData.content) {
      throw new Error('No chat content found');
    }

    // Save to BrainBox
    const response = await chrome.runtime.sendMessage({
      action: 'saveChat',
      data: {
        title: chatData.title || currentTab.title || 'Untitled Chat',
        url: currentTab.url,
        content: chatData.content,
        platform: currentPlatform,
        folder_id: null,
        timestamp: new Date().toISOString()
      }
    });

    if (response && response.success) {
      showStatus('✅ Synced to BrainBox successfully!', 'success');
    } else {
      throw new Error(response?.error || 'Sync failed');
    }
  } catch (error) {
    console.error('Sync error:', error);
    showStatus('❌ Failed to sync: ' + error.message, 'error');
  }
});

document.getElementById('btn-custom-export').addEventListener('click', async () => {
  try {
    showStatus('Opening custom export...', 'success');
    // Send message to content script to show selection UI
    await chrome.tabs.sendMessage(currentTab.id, {
      action: 'showCustomExport'
    });
    window.close();
  } catch (error) {
    console.error('Custom export error:', error);
    showStatus('❌ Failed to open custom export: ' + error.message, 'error');
  }
});

// Start
init();
