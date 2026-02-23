/**
 * Base Platform Adapter
 * 
 * Provides common interface and utilities for all platform adapters
 */

export interface Conversation {
    id: string;
    title: string;
    platform: string;
    messages: Message[];
    url?: string;
    created_at?: number;
    updated_at?: number;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

/**
 * Platform Adapter Interface
 * All platform-specific adapters must implement this interface
 */
export interface IPlatformAdapter {
    readonly platform: string;
    fetchConversation(id: string, url?: string, payload?: any): Promise<Conversation>;
}

/**
 * Base adapter class with shared utilities
 */
export abstract class BasePlatformAdapter implements IPlatformAdapter {
    abstract readonly platform: string;

    /**
     * Get token from chrome.storage.local
     */
    protected async getStorageToken(key: string): Promise<string> {
        const result = await chrome.storage.local.get([key]);
        if (!result[key]) {
            throw new Error(`Token not found: ${key}. Please refresh the page.`);
        }
        return result[key];
    }

    /**
     * Get multiple values from chrome.storage.local
     */
    protected async getStorageValues(keys: string[]): Promise<Record<string, any>> {
        const result = await chrome.storage.local.get(keys);
        return result;
    }

    /**
     * Remove tokens from storage (on expiration)
     */
    protected async removeStorageKeys(keys: string[]): Promise<void> {
        await chrome.storage.local.remove(keys);
    }

    /**
     * Fetch conversation from platform API
     */
    abstract fetchConversation(conversationId: string, url?: string, payload?: any): Promise<Conversation>;
}
