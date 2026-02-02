// BrainBox - Common Schema Definitions
// This file defines the target structure for all conversations regardless of platform

export const PLATFORMS = {
    CHATGPT: 'chatgpt',
    CLAUDE: 'claude',
    GEMINI: 'gemini',
    GROK: 'grok',
    PERPLEXITY: 'perplexity',
    DEEPSEEK: 'deepseek',
    QWEN: 'qwen'
};

export const ROLES = {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system'
};

/**
 * Validates a conversation object against the schema
 * @param {Object} conversation - The conversation to validate
 * @returns {Object} - { valid: boolean, error: string | null }
 */
export function validateConversation(conversation) {
    if (!conversation) return { valid: false, error: 'Conversation object is null' };

    const requiredFields = ['id', 'platform', 'title', 'messages', 'created_at'];
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
        if (!msg.content && msg.content !== '') {
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
}) {
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
}) {
    return {
        id,
        role,
        content,
        timestamp,
        metadata
    };
}
