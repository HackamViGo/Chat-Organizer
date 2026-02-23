/**
 * SyncManager
 * 
 * Manages a persistent queue of items to be synchronized with the Dashboard.
 * Useful for offline support and retrying failed requests.
 */

import { decryptToken } from '@/lib/crypto';

export interface SyncItem {
    id: string;
    type: 'chat';
    data: any;
    timestamp: number;
    retries: number;
}

const QUEUE_KEY = 'brainbox_sync_queue';

export class SyncManager {
    /**
     * Get all items in the sync queue
     */
    static async getQueue(): Promise<SyncItem[]> {
        const result = await chrome.storage.local.get([QUEUE_KEY]);
        return result[QUEUE_KEY] || [];
    }

    /**
     * Add an item to the sync queue
     */
    static async addToQueue(type: 'chat', data: any): Promise<void> {
        const queue = await this.getQueue();
        const newItem: SyncItem = {
            id: crypto.randomUUID(),
            type,
            data,
            timestamp: Date.now(),
            retries: 0
        };
        queue.push(newItem);
        await chrome.storage.local.set({ [QUEUE_KEY]: queue });
        console.log(`[SyncManager] 📥 Added ${type} to sync queue. Items in queue: ${queue.length}`);
    }

    /**
     * Remove an item from the queue by ID
     */
    static async removeFromQueue(id: string): Promise<void> {
        const queue = await this.getQueue();
        const updated = queue.filter(item => item.id !== id);
        await chrome.storage.local.set({ [QUEUE_KEY]: updated });
    }

    /**
     * Clear the entire queue
     */
    static async clearQueue(): Promise<void> {
        await chrome.storage.local.remove([QUEUE_KEY]);
    }

    /**
     * Process the queue (attempt to sync all items)
     * This should be called when the extension comes back online
     */
    static async processQueue(syncFn: (item: SyncItem) => Promise<boolean>): Promise<void> {
        const queue = await this.getQueue();
        if (queue.length === 0) return;

        console.log(`[SyncManager] 🔄 Processing sync queue (${queue.length} items)...`);

        for (const item of queue) {
            try {
                const success = await syncFn(item);
                if (success) {
                    await this.removeFromQueue(item.id);
                    console.log(`[SyncManager] ✅ Successfully synced item: ${item.id}`);
                } else {
                    item.retries++;
                    if (item.retries > 5) {
                        console.warn(`[SyncManager] ⚠️ Item ${item.id} exceeded max retries. Dropping.`);
                        await this.removeFromQueue(item.id);
                    } else {
                        // Update retry count in storage
                        const currentQueue = await this.getQueue();
                        const target = currentQueue.find(qi => qi.id === item.id);
                        if (target) {
                            target.retries = item.retries;
                            await chrome.storage.local.set({ [QUEUE_KEY]: currentQueue });
                        }
                    }
                }
            } catch (error) {
                console.error(`[SyncManager] ❌ Failed to process item ${item.id}:`, error);
            }
        }
    }

    /**
     * Initialize periodic sync or startup sync
     */
    static async initialize(accessTokenParam: string | null) {
        const accessToken = await decryptToken(accessTokenParam);
        if (!accessToken) return;
        
        // Initial sync on startup
        this.processQueue(async (item) => {
            const { CONFIG } = await import('@/lib/config');
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/api/chats`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                        'X-Extension-Key': CONFIG.EXTENSION_KEY
                    },
                    body: JSON.stringify(item.data)
                });
                return response.ok;
            } catch {
                return false;
            }
        }).catch(err => console.error('[SyncManager] Startup sync failed:', err));
    }
}
