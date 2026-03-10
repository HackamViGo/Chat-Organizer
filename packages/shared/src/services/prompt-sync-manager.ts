/**
 * PromptSyncManager
 * 
 * Logic for synchronizing user prompts between Dashboard and Extension.
 */

export interface UserPrompt {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  is_favorite: boolean;
  use_in_context_menu: boolean;
  created_at: string;
  updated_at: string;
}

export class PromptSyncManager {
  private static STORAGE_KEY = 'brainbox_user_prompts';
  private static LAST_SYNC_KEY = 'brainbox_prompts_last_sync';

  /**
   * Sync user prompts, folders, and settings from the server
   */
  static async sync(baseUrl: string, accessToken: string): Promise<UserPrompt[]> {
    try {
      // 1. Fetch Prompts
      const response = await fetch(`${baseUrl}/api/prompts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to sync prompts: ${response.statusText}`);
      }

      const data = await response.json();
      const prompts = Array.isArray(data) ? data : (data.prompts || []);
      
      // Save locally
      await this.saveLocal(prompts);
      this.updateLastSync();

      // 2. Fetch Folders (Background/Silent)
      fetch(`${baseUrl}/api/folders`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }).then(res => res.json()).then(data => {
        const folders = data.folders || [];
        this.saveData('brainbox_folders_cache', folders);
      }).catch(() => {});

      // 3. Fetch Settings (Background/Silent)
      fetch(`${baseUrl}/api/user/settings`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }).then(res => res.json()).then(data => {
        const settings = data.settings || {};
        this.saveData('brainbox_user_settings_cache', settings);
      }).catch(() => {});

      return prompts;
    } catch {
      // Use locally cached 
      return await this.getLocal();
    }
  }

  /**
   * Helper to redirect to auth page without tab spam
   */
  static async safeRedirect(url: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      return new Promise<void>((resolve) => {
        chrome.tabs.query({}, (tabs) => {
          const targetBase = url.split('?')[0];
          const alreadyOpen = tabs.find(t => t.url && t.url.includes(targetBase));
          if (alreadyOpen && alreadyOpen.id) {
            chrome.tabs.update(alreadyOpen.id, { active: true });
          } else {
            chrome.tabs.create({ url });
          }
          resolve();
        });
      });
    } else if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }

  private static async saveData(key: string, data: unknown): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [key]: data });
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  /**
   * Get prompts from local storage (works in both Web and Extension)
   */
  static async getLocal(): Promise<UserPrompt[]> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([this.STORAGE_KEY], (result) => {
          const data = result as Record<string, UserPrompt[]>;
          resolve(data[this.STORAGE_KEY] || []);
        });
      });
    } else if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  }

  /**
   * Save prompts to local storage
   */
  static async saveLocal(prompts: UserPrompt[]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: prompts });
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prompts));
    }
  }

  /**
   * Check if sync is needed based on timestamp
   */
  static shouldSync(intervalMs: number = 5 * 60 * 1000): boolean {
    const lastSync = this.getLastSync();
    return Date.now() - lastSync > intervalMs;
  }

  private static getLastSync(): number {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(this.LAST_SYNC_KEY);
      return val ? parseInt(val, 10) : 0;
    }
    return 0;
  }

  private static updateLastSync(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());
    }
  }

  /**
   * Deduplicate and merge prompts (e.g., during manual import)
   */
  static merge(existing: UserPrompt[], incoming: UserPrompt[]): UserPrompt[] {
    const map = new Map<string, UserPrompt>();
    
    // Add existing
    existing.forEach(p => map.set(p.id, p));
    
    // Merge incoming (overwrite if newer)
    incoming.forEach(p => {
      const current = map.get(p.id);
      if (!current || new Date(p.updated_at) > new Date(current.updated_at)) {
        map.set(p.id, p);
      }
    });

    return Array.from(map.values());
  }
}
