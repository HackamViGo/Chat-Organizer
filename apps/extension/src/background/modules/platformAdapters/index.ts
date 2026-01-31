/**
 * Platform Adapters Index
 * Factory pattern for platform-specific adapters
 */

import { ChatGPTAdapter } from './chatgpt.adapter';
import { ClaudeAdapter } from './claude.adapter';
import { GeminiAdapter } from './gemini.adapter';
import type { IPlatformAdapter } from './base';

// Adapter registry
const adapters: Record<string, IPlatformAdapter> = {
    chatgpt: new ChatGPTAdapter(),
    claude: new ClaudeAdapter(),
    gemini: new GeminiAdapter()
};

/**
 * Get platform adapter by name
 * @throws Error if platform is not supported
 */
export function getAdapter(platform: string): IPlatformAdapter {
    const adapter = adapters[platform];
    if (!adapter) {
        throw new Error(`Unsupported platform: ${platform}`);
    }
    return adapter;
}

/**
 * Fetch conversation from any supported platform
 * Delegates to the appropriate platform adapter
 */
export async function fetchConversation(platform: string, id: string, url?: string) {
    return getAdapter(platform).fetchConversation(id, url);
}

// Export adapters for testing
export { ChatGPTAdapter, ClaudeAdapter, GeminiAdapter };
export type { IPlatformAdapter } from './base';
