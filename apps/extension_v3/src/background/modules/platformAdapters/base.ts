import type { Conversation } from '@/lib/schemas'
export type { Conversation }
export type { Message } from '@/lib/schemas'

export interface IPlatformAdapter {
  readonly platform: string
  fetchConversation(id: string, url?: string, payload?: unknown): Promise<Conversation>
}

export abstract class BasePlatformAdapter implements IPlatformAdapter {
  abstract readonly platform: string
  abstract fetchConversation(id: string, url?: string, payload?: unknown): Promise<Conversation>

  protected async getStorageValues(keys: string[]): Promise<Record<string, string>> {
    return chrome.storage.local.get(keys)
  }

  protected async getStorageToken(key: string): Promise<string> {
    const result = await chrome.storage.local.get([key])
    if (!result[key]) throw new Error(`Token not found: ${key}. Refresh the page.`)
    return result[key]
  }

  protected async removeStorageKeys(keys: string[]): Promise<void> {
    await chrome.storage.local.remove(keys)
  }
}
