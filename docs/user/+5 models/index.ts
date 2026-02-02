/**
 * Platform Adapters Index
 * Factory pattern for platform-specific adapters
 */

import { ChatGPTAdapter } from './chatgpt.adapter';
import { ClaudeAdapter } from './claude.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { DeepSeekAdapter } from './deepseek.adapter';
import { PerplexityAdapter } from './perplexity.adapter';
import { GrokAdapter } from './grok.adapter';
import { QwenAdapter } from './qwen.adapter';
import { LMArenaAdapter } from './lmarena.adapter';
import type { IPlatformAdapter } from './base';

// Adapter registry
const adapters: Record<string, IPlatformAdapter> = {
    // Original platforms
    chatgpt: new ChatGPTAdapter(),
    claude: new ClaudeAdapter(),
    gemini: new GeminiAdapter(),
    
    // New platforms (2026)
    deepseek: new DeepSeekAdapter(),
    perplexity: new PerplexityAdapter(),
    grok: new GrokAdapter(),
    qwen: new QwenAdapter(),
    lmarena: new LMArenaAdapter()
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
 * Check if platform is supported
 */
export function isPlatformSupported(platform: string): boolean {
    return platform in adapters;
}

/**
 * Get list of all supported platforms
 */
export function getSupportedPlatforms(): string[] {
    return Object.keys(adapters);
}

/**
 * Fetch conversation from any supported platform
 * Delegates to the appropriate platform adapter
 */
export async function fetchConversation(platform: string, id: string, url?: string) {
    return getAdapter(platform).fetchConversation(id, url);
}

// Export adapters for testing
export {
    ChatGPTAdapter,
    ClaudeAdapter,
    GeminiAdapter,
    DeepSeekAdapter,
    PerplexityAdapter,
    GrokAdapter,
    QwenAdapter,
    LMArenaAdapter
};

export type { IPlatformAdapter } from './base';
