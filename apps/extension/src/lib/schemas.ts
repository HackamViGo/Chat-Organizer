// BrainBox - Common Schema Definitions
// This file defines the target structure for all conversations regardless of platform

import { type Message } from '@brainbox/shared';

export const PLATFORMS = {
    CHATGPT: 'chatgpt',
    CLAUDE: 'claude',
    GEMINI: 'gemini',
    GROK: 'grok',
    PERPLEXITY: 'perplexity',
    DEEPSEEK: 'deepseek',
    QWEN: 'qwen',
    LMSYS: 'lmsys'
} as const;

export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];

export const ROLES = {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export type { Message };

export interface Conversation {
    id: string;
    platform: Platform;
    title: string;
    messages: Message[];
    url?: string;
    created_at: number;
    updated_at: number;
    metadata?: Record<string, any>;
}

/**
 * Validates a conversation object against the schema
 */
export function validateConversation(conversation: any): { valid: boolean; error: string | null } {
    if (!conversation) return { valid: false, error: 'Conversation object is null' };

    const requiredFields: (keyof Conversation)[] = ['id', 'platform', 'title', 'messages', 'created_at'];
    for (const field of requiredFields) {
        if (!conversation[field]) {
            return { valid: false, error: `Missing required field: ${field}` };
        }
    }

    if (!Array.isArray(conversation.messages)) {
        return { valid: false, error: 'messages must be an array' };
    }

    if (!Object.values(PLATFORMS).includes(conversation.platform)) {
        return { valid: false, error: `Invalid platform: ${conversation.platform}` };
    }

    // Validate individual messages
    for (let i = 0; i < conversation.messages.length; i++) {
        const msg = conversation.messages[i];
        if (msg.content === undefined || msg.content === null) {
            return { valid: false, error: `Message at index ${i} missing content` };
        }
        if (!msg.role) {
            return { valid: false, error: `Message at index ${i} missing role` };
        }
    }

    return { valid: true, error: null };
}

/**
 * Creates a compliant conversation object
 */
export function createConversation({
    id,
    platform,
    title,
    messages = [],
    created_at = Date.now(),
    updated_at = Date.now(),
    metadata = {}
}: Partial<Conversation> & { id: string; platform: Platform; title: string }): Conversation {
    return {
        id,
        platform,
        title: title || 'Untitled Conversation',
        messages,
        created_at,
        updated_at,
        metadata
    };
}

/**
 * Creates a compliant message object
 */
export function createMessage({
    id = crypto.randomUUID(),
    role,
    content,
    timestamp = Date.now(),
    metadata = {}
}: {
    id?: string;
    role: Role;
    content: string;
    timestamp?: number;
    metadata?: Record<string, any>;
}): Message {
    return {
        id,
        role,
        content,
        timestamp,
        metadata
    };
}
