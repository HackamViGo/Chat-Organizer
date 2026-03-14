/**
 * Platform Configuration
 * 
 * Central registry for all supported AI platforms
 */

export interface PlatformConfig {
    id: string;
    name: string;
    domain: string;
    icon: string;
    color: string;
    features: {
        saveChat: boolean;
        promptInjection: boolean;
        streaming: boolean;
    };
    selectors: {
        inputField: string;
        sendButton: string;
        chatContainer?: string;
    };
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
    chatgpt: {
        id: 'chatgpt',
        name: 'ChatGPT',
        domain: 'chatgpt.com',
        icon: '🤖',
        color: '#10a37f',
        features: {
            saveChat: true,
            promptInjection: true,
            streaming: true
        },
        selectors: {
            inputField: 'textarea#prompt-textarea',
            sendButton: 'button[data-testid="send-button"]',
            chatContainer: 'main'
        }
    },

    claude: {
        id: 'claude',
        name: 'Claude',
        domain: 'claude.ai',
        icon: '🧠',
        color: '#cc785c',
        features: {
            saveChat: true,
            promptInjection: true,
            streaming: true
        },
        selectors: {
            inputField: 'div[contenteditable="true"]',
            sendButton: 'button[aria-label="Send Message"]',
            chatContainer: 'main'
        }
    },

    gemini: {
        id: 'gemini',
        name: 'Gemini',
        domain: 'gemini.google.com',
        icon: '✨',
        color: '#4285f4',
        features: {
            saveChat: true,
            promptInjection: true,
            streaming: true
        },
        selectors: {
            inputField: 'rich-textarea',
            sendButton: 'button[aria-label*="Send"]',
            chatContainer: 'chat-window'
        }
    },

    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        domain: 'chat.deepseek.com',
        icon: '🔍',
        color: '#00a67e',
        features: {
            saveChat: true,
            promptInjection: true,
            streaming: true
        },
        selectors: {
            inputField: 'textarea#chat-input',
            sendButton: 'div[role="button"].ds-send-button',
            chatContainer: '#chat-container'
        }
    },

    perplexity: {
        id: 'perplexity',
        name: 'Perplexity',
        domain: 'perplexity.ai',
        icon: '🔮',
        color: '#20808d',
        features: {
            saveChat: true,
            promptInjection: true,
            streaming: true
        },
        selectors: {
            inputField: 'textarea[placeholder*="Ask anything"]',
            sendButton: 'button:has(svg[data-icon="arrow-right"])',
            chatContainer: 'main'
        }
    },

    grok: {
        id: 'grok',
        name: 'Grok',
        domain: 'x.com',
        icon: '🐦',
        color: '#1da1f2',
        features: {
            saveChat: true,
            promptInjection: true,
            streaming: true
        },
        selectors: {
            inputField: 'div[role="textbox"][data-testid="grok_input_field"]',
            sendButton: 'div[data-testid="grok_send_button"]',
            chatContainer: 'div[aria-label="Grok"]'
        }
    },

    qwen: {
        id: 'qwen',
        name: 'Qwen',
        domain: 'chat.qwenlm.ai',
        icon: '🌐',
        color: '#ff6600',
        features: {
            saveChat: true,
            promptInjection: true,
            streaming: true
        },
        selectors: {
            inputField: 'textarea.qwen-input',
            sendButton: 'button.qwen-send-btn',
            chatContainer: '#chat-messages'
        }
    },

    lmarena: {
        id: 'lmarena',
        name: 'Chatbot Arena',
        domain: 'chat.lmsys.org',
        icon: '🏟️',
        color: '#7c3aed',
        features: {
            saveChat: true,
            promptInjection: true,
            streaming: false
        },
        selectors: {
            inputField: 'textarea[data-testid="textbox"]',
            sendButton: 'button:contains("Send")',
            chatContainer: '#chatbot'
        }
    }
};

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): string | null {
    for (const [id, config] of Object.entries(PLATFORM_CONFIGS)) {
        if (url.includes(config.domain)) {
            // Special case for Grok (only /i/grok URLs)
            if (id === 'grok' && !url.includes('/i/grok')) {
                continue;
            }
            return id;
        }
    }
    return null;
}

/**
 * Get platform config
 */
export function getPlatformConfig(platformId: string): PlatformConfig | null {
    return PLATFORM_CONFIGS[platformId] || null;
}

/**
 * Get all supported platforms
 */
export function getAllPlatforms(): PlatformConfig[] {
    return Object.values(PLATFORM_CONFIGS);
}

/**
 * Extract conversation ID from URL
 */
export function extractConversationId(url: string, platform: string): string | null {
    const patterns: Record<string, RegExp> = {
        chatgpt: /chatgpt\.com\/c\/([a-f0-9-]+)/i,
        claude: /claude\.ai\/chat\/([a-f0-9-]+)/i,
        gemini: /gemini\.google\.com\/app\/([a-f0-9-]+)/i,
        deepseek: /deepseek\.com\/chat\/([a-zA-Z0-9_-]+)/i,
        perplexity: /perplexity\.ai\/search\/([a-zA-Z0-9_-]+)/i,
        grok: /conversation_id=([a-zA-Z0-9_-]+)/i,
        qwen: /qwenlm\.ai\/chat\/([a-zA-Z0-9_-]+)/i,
        lmarena: /session=([a-zA-Z0-9_-]+)/i
    };

    const pattern = patterns[platform];
    if (!pattern) return null;

    const match = url.match(pattern);
    return match ? match[1] : null;
}
