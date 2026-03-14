import type { QueueItem, DashboardPayload } from '../shared/types';

const QUEUE_KEY = 'syncQueue';
const MAX_ATTEMPTS = 3;

export const SyncQueue = {
  async add(payload: DashboardPayload, folderId: string | null): Promise<void> {
    const queue = await this.getAll();
    const item: QueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      payload,
      folderId,
      attempts: 0,
      createdAt: Date.now()
    };
    queue.push(item);
    await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  },

  async getAll(): Promise<QueueItem[]> {
    const stored = await chrome.storage.local.get(QUEUE_KEY);
    return stored[QUEUE_KEY] ?? [];
  },

  async remove(id: string): Promise<void> {
    const queue = await this.getAll();
    const filtered = queue.filter(item => item.id !== id);
    await chrome.storage.local.set({ [QUEUE_KEY]: filtered });
  },

  async incrementAttempts(id: string): Promise<void> {
    const queue = await this.getAll();
    const item = queue.find(i => i.id === id);
    if (item) {
      item.attempts++;
      item.lastAttempt = Date.now();
      await chrome.storage.local.set({ [QUEUE_KEY]: queue });
    }
  },

  async flush(
    saveFn: (payload: DashboardPayload, folderId: string | null) => Promise<{ success: boolean }>
  ): Promise<void> {
    const queue = await this.getAll();
    for (const item of queue) {
      if (item.attempts >= MAX_ATTEMPTS) {
        await this.remove(item.id);
        continue;
      }
      try {
        const result = await saveFn(item.payload, item.folderId);
        if (result.success) {
          await this.remove(item.id);
        } else {
          await this.incrementAttempts(item.id);
        }
      } catch {
        await this.incrementAttempts(item.id);
      }
    }
  }
};

// Слуша за reconnect и автоматично flush-ва
export function initOfflineQueueListener(
  saveFn: (payload: DashboardPayload, folderId: string | null) => Promise<{ success: boolean }>
) {
  // Chrome service worker се събужда при network events
  // Note: 'online' event doesn't always fire in SW reliably, 
  // but we can also trigger flush on navigation or periodic alarm.
  self.addEventListener('online', () => {
    SyncQueue.flush(saveFn);
  });
}
