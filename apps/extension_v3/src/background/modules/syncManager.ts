/**
 * SyncManager
 *
 * Manages a persistent queue of items to be synchronized with the Dashboard.
 * Useful for offline support and retrying failed requests.
 */

import { CONFIG } from '@/lib/config'
import { decryptToken } from '@/lib/crypto'
import { logger } from '@/lib/logger'

export interface SyncItem {
  id: string
  type: 'chat'
  data: unknown
  timestamp: number
  retries: number
}

const QUEUE_KEY = 'brainbox_sync_queue'

export class SyncManager {
  /**
   * Get all items in the sync queue
   */
  static async getQueue(): Promise<SyncItem[]> {
    const result = await chrome.storage.local.get([QUEUE_KEY])
    const data = result as Record<string, SyncItem[]>
    return data[QUEUE_KEY] || []
  }

  /**
   * Add an item to the sync queue
   */
  static async addToQueue(type: 'chat', data: unknown): Promise<void> {
    const queue = await this.getQueue()
    const newItem: SyncItem = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    }
    queue.push(newItem)
    await chrome.storage.local.set({ [QUEUE_KEY]: queue })
    logger.debug('sync', `Added ${type} to sync queue. Items in queue: ${queue.length}`)
  }

  /**
   * Remove an item from the queue by ID
   */
  static async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue()
    const updated = queue.filter((item) => item.id !== id)
    await chrome.storage.local.set({ [QUEUE_KEY]: updated })
  }

  /**
   * Clear the entire queue
   */
  static async clearQueue(): Promise<void> {
    await chrome.storage.local.remove([QUEUE_KEY])
  }

  /**
   * Process the queue (attempt to sync all items)
   * This should be called when the extension comes back online
   */
  static async processQueue(syncFn: (item: SyncItem) => Promise<boolean>): Promise<void> {
    const queue = await this.getQueue()
    if (queue.length === 0) return

    logger.debug('sync', `Processing sync queue (${queue.length} items)...`)

    for (const item of queue) {
      try {
        const success = await syncFn(item)
        if (success) {
          await this.removeFromQueue(item.id)
          logger.debug('sync', `Successfully synced item: ${item.id}`)
        } else {
          item.retries++
          if (item.retries > 5) {
            logger.warn('sync', `Item ${item.id} exceeded max retries. Dropping.`)
            await this.removeFromQueue(item.id)
          } else {
            // Update retry count in storage
            const currentQueue = await this.getQueue()
            const target = currentQueue.find((qi) => qi.id === item.id)
            if (target) {
              target.retries = item.retries
              await chrome.storage.local.set({ [QUEUE_KEY]: currentQueue })
            }
          }
        }
      } catch (error) {
        logger.error('sync', `Failed to process item ${item.id}`, error)
      }
    }
  }

  /**
   * Initialize periodic sync or startup sync
   */
  static async initialize() {
    // Register alarm for periodic sync (every 5 minutes)
    chrome.alarms.create('brainbox-sync-queue', { periodInMinutes: 5 })
    
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'brainbox-sync-queue') {
        const { accessToken: encryptedToken } = await chrome.storage.local.get(['accessToken'])
        if (encryptedToken) {
          const token = await decryptToken(encryptedToken)
          if (token) this.runSync(token)
        }
      }
    })

    // Initial sync
    const { accessToken: encryptedToken } = await chrome.storage.local.get(['accessToken'])
    if (encryptedToken) {
      const token = await decryptToken(encryptedToken)
      if (token) this.runSync(token)
    }
  }

  private static async runSync(accessToken: string) {
    this.processQueue(async (item) => {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/chats/extension`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'X-Extension-Key': CONFIG.EXTENSION_KEY,
          },
          body: JSON.stringify(item.data),
        })
        
        // If 429 (Rate Limit), stop procession for this cycle
        if (response.status === 429) {
          logger.warn('sync', 'Rate limited, stopping sync cycle')
          return false
        }
        
        return response.ok
      } catch (error) {
        logger.error('sync', 'Network error during sync', error)
        return false
      }
    }).catch((err) => logger.error('sync', 'Sync execution failed', err))
  }
}
