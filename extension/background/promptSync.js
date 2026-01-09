// BrainBox - Prompt Sync Manager
// Handles syncing prompts between local storage and backend

const DASHBOARD_URL = 'https://brainbox-alpha.vercel.app';

export class PromptSyncManager {
  static LOCAL_KEY = 'local_prompts';
  static SYNC_KEY = 'synced_prompts';

  // 🔄 SYNC FUNCTION
  static async syncPrompts() {
    try {
      console.log('[PromptSync] 🔄 Starting prompt sync...');
      
      // 1. Get local prompts
      const localPrompts = await this.getLocalPrompts();
      console.log('[PromptSync] Found local prompts:', localPrompts.length);
      
      // 2. Get auth token
      const { accessToken } = await chrome.storage.local.get(['accessToken']);
      
      if (!accessToken) {
        console.warn('[PromptSync] ⚠️ No access token, skipping sync');
        return { success: false, error: 'Not authenticated' };
      }
      
      // 3. Send to backend
      const response = await fetch(`${DASHBOARD_URL}/api/prompts/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ prompts: localPrompts })
      });
      
      if (response.ok) {
        const serverPrompts = await response.json();
        
        // 4. Update local storage
        await chrome.storage.local.set({ 
          [this.LOCAL_KEY]: serverPrompts,
          [this.SYNC_KEY]: { lastSync: Date.now(), status: 'synced' }
        });
        
        console.log('[PromptSync] ✅ Prompts synced:', serverPrompts.length);
        
        // Update context menu with new prompts
        if (typeof SimpleDynamicMenus !== 'undefined') {
          const { SimpleDynamicMenus } = await import('./dynamicMenus.js');
          await SimpleDynamicMenus.updateRecentPrompts();
        }
        
        return { success: true, count: serverPrompts.length };
      } else {
        const errorText = await response.text();
        console.error('[PromptSync] ❌ Sync failed:', response.status, errorText);
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error('[PromptSync] ❌ Sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 📥 Pull from server
  static async pullPrompts() {
    try {
      console.log('[PromptSync] 📥 Pulling prompts from server...');
      
      const { accessToken } = await chrome.storage.local.get(['accessToken']);
      
      if (!accessToken) {
        console.warn('[PromptSync] ⚠️ No access token, skipping pull');
        return { success: false, error: 'Not authenticated' };
      }
      
      const response = await fetch(`${DASHBOARD_URL}/api/prompts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const prompts = await response.json();
        await chrome.storage.local.set({ [this.LOCAL_KEY]: prompts });
        console.log('[PromptSync] ✅ Pulled prompts:', prompts.length);
        
        // Update context menu
        if (typeof SimpleDynamicMenus !== 'undefined') {
          const { SimpleDynamicMenus } = await import('./dynamicMenus.js');
          await SimpleDynamicMenus.updateRecentPrompts();
        }
        
        return { success: true, count: prompts.length };
      } else {
        console.error('[PromptSync] ❌ Pull failed:', response.status);
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error('[PromptSync] ❌ Pull failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 💾 Get local prompts
  static async getLocalPrompts() {
    const result = await chrome.storage.local.get(this.LOCAL_KEY);
    return result[this.LOCAL_KEY] || [];
  }

  // ➕ Add prompt locally + queue for sync
  static async addPrompt(prompt) {
    const prompts = await this.getLocalPrompts();
    const newPrompt = {
      ...prompt,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    prompts.unshift(newPrompt);
    await chrome.storage.local.set({ [this.LOCAL_KEY]: prompts });
    
    console.log('[PromptSync] ➕ Added prompt locally:', newPrompt.id);
    
    // Queue for next sync
    this.queueSync();
    return newPrompt.id;
  }

  // 🔄 Auto-sync queue
  static syncQueue = [];
  
  static queueSync() {
    if (this.syncQueue.length === 0) {
      console.log('[PromptSync] ⏱️ Queueing sync for 5 seconds...');
      const timeout = setTimeout(async () => {
        await this.syncPrompts();
        this.syncQueue = [];
      }, 5000); // Sync after 5s idle
      
      this.syncQueue.push(timeout);
    }
  }
}
