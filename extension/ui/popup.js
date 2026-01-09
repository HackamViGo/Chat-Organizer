// BrainBox - Popup Manager
// Handles popup UI logic, auth state, and module toggles

class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    await this.checkAuth();
    this.setupEventListeners();
    this.loadSettings();
  }

  async checkAuth() {
    const auth = await chrome.storage.sync.get(['user', 'isLoggedIn']);
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    
    // Check if user is logged in (either sync storage or local storage)
    const isLoggedIn = auth.isLoggedIn || !!accessToken;
    
    if (isLoggedIn) {
      document.getElementById('login-section').classList.add('hidden');
      document.getElementById('user-section').classList.remove('hidden');
      document.getElementById('modules-section').classList.remove('hidden');
      
      // Set user name
      if (auth.user && auth.user.name) {
        document.getElementById('user-name').textContent = auth.user.name;
      } else {
        document.getElementById('user-name').textContent = 'User';
      }
    } else {
      document.getElementById('login-section').classList.remove('hidden');
      document.getElementById('user-section').classList.add('hidden');
      document.getElementById('modules-section').classList.add('hidden');
    }
  }

  setupEventListeners() {
    // Login button
    document.getElementById('login-btn').onclick = () => {
      chrome.runtime.sendMessage({ action: 'login' });
      window.close();
    };
    
    // Logout button
    document.getElementById('logout-btn').onclick = async () => {
      await chrome.runtime.sendMessage({ action: 'logout' });
      location.reload();
    };

    // Chat module toggle
    document.getElementById('chat-toggle').onchange = (e) => {
      chrome.storage.sync.set({ enableChats: e.target.checked });
      this.updateStatus(`Chats ${e.target.checked ? 'enabled' : 'disabled'}`);
    };
    
    // Prompts module toggle
    document.getElementById('prompt-toggle').onchange = (e) => {
      chrome.storage.sync.set({ enablePrompts: e.target.checked });
      this.updateStatus(`Prompts ${e.target.checked ? 'enabled' : 'disabled'}`);
    };
    
    // Sync prompts button
    document.getElementById('sync-btn').onclick = async () => {
      const btn = document.getElementById('sync-btn');
      const originalText = btn.textContent;
      
      btn.textContent = 'SYNCING...';
      btn.classList.add('syncing');
      btn.disabled = true;
      
      try {
        const result = await chrome.runtime.sendMessage({ action: 'sync_prompts' });
        
        if (result && result.success) {
          btn.textContent = 'SYNCED ✓';
          this.updateStatus(`Synced ${result.count || 0} prompts`);
        } else {
          btn.textContent = 'FAILED ✗';
          this.updateStatus(`Sync failed: ${result?.error || 'Unknown error'}`);
        }
      } catch (error) {
        btn.textContent = 'ERROR ✗';
        this.updateStatus(`Sync error: ${error.message}`);
      }
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('syncing');
        btn.disabled = false;
      }, 2000);
    };
  }

  async loadSettings() {
    const settings = await chrome.storage.sync.get(['enableChats', 'enablePrompts']);
    document.getElementById('chat-toggle').checked = settings.enableChats !== false;
    document.getElementById('prompt-toggle').checked = settings.enablePrompts !== false;
  }

  updateStatus(message) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    setTimeout(() => {
      statusEl.textContent = 'Ready';
    }, 2000);
  }
}

// Initialize popup manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
