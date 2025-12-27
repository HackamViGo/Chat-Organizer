// BrainBox - Data Normalizers
// Transforms platform-specific API responses into the Common Schema

import { createConversation, createMessage, ROLES, PLATFORMS } from './schemas.js';

// ============================================================================
// CHATGPT NORMALIZER
// ============================================================================

export function normalizeChatGPT(rawData) {
    const messages = [];
    const visited = new Set();

    // ChatGPT data is a tree (mapping), we need to reconstruct the linear path
    let currentNodeId = rawData.current_node;

    if (currentNodeId && rawData.mapping[currentNodeId]) {
        // Linear reconstruction (backwards)
        while (currentNodeId) {
            const node = rawData.mapping[currentNodeId];
            if (node.message) {
                processChatGPTMessage(node.message, messages);
            }
            currentNodeId = node.parent;
        }
        messages.reverse();
    } else {
        // Fallback: Dump all messages (might include alternate branches)
        const allNodes = Object.values(rawData.mapping)
            .filter(node => node.message)
            .sort((a, b) => a.message.create_time - b.message.create_time);

        allNodes.forEach(node => {
            processChatGPTMessage(node.message, messages);
        });
    }

    return createConversation({
        id: rawData.id || rawData.conversation_id || rawData.uuid,
        platform: PLATFORMS.CHATGPT,
        title: rawData.title,
        messages: messages,
        created_at: rawData.create_time * 1000,
        updated_at: rawData.update_time * 1000,
        metadata: {
            model: rawData.model_slug
        }
    });
}

function processChatGPTMessage(msg, targetArray) {
    // Skip system messages usually, or empty ones
    if (!msg.content || !msg.content.parts) return;

    // Handle content parts (usually array of strings)
    const content = msg.content.parts.join('\n');
    if (!content.trim()) return;

    const role = msg.author.role === 'user' ? ROLES.USER :
        msg.author.role === 'assistant' ? ROLES.ASSISTANT :
            msg.author.role === 'system' ? ROLES.SYSTEM : ROLES.ASSISTANT;

    targetArray.push(createMessage({
        id: msg.id,
        role: role,
        content: content,
        timestamp: msg.create_time * 1000,
        metadata: msg.metadata
    }));
}

// ============================================================================
// CLAUDE NORMALIZER
// ============================================================================

export function normalizeClaude(rawData) {
    const messages = rawData.chat_messages.map(msg => {
        return createMessage({
            id: msg.uuid,
            role: msg.sender === 'human' ? ROLES.USER : ROLES.ASSISTANT,
            content: msg.text,
            timestamp: new Date(msg.created_at).getTime(),
            metadata: {
                attachments: msg.attachments,
                files: msg.files
            }
        });
    });

    return createConversation({
        id: rawData.uuid,
        platform: PLATFORMS.CLAUDE,
        title: rawData.name,
        messages: messages,
        created_at: new Date(rawData.created_at).getTime(),
        updated_at: new Date(rawData.updated_at).getTime(),
        metadata: {
            model: rawData.model
        }
    });
}

// ============================================================================
// GEMINI NORMALIZER
// ============================================================================

export function normalizeGemini(parsedData, conversationId) {
    // Gemini API (batchexecute) returns a deeply nested array structure.
    // The 'parsedData' passed here is usually the inner array from the second JSON.parse.

    const messages = [];

    try {
        // Note: Gemini structure is unstable and minimized. 
        // This is a BEST EFFORT heuristic based on observed patterns.

        // Pattern 1: Search for text segments recursively
        // If exact path is unknown, we look for strings that look like message content
        // and try to pair them with roles (0 = user, 1 = model usually)

        // For now, if we can't reliably parse the tree without a live reference, 
        // we should create a "raw" storage or use a simplified extractor.

        // Let's attempt to find the main conversation array.
        // Usually it's in a large array at index 0 or 1.

        // TODO: Implement actual traversal once we have sample data dump.
        // For MVP safety, we return a valid object but potentially empty messages 
        // if we can't match. Or we add a "Raw Data" message.

        // Placeholder message to ensure it saves even if parsing fails partially
        messages.push(createMessage({
            id: 'raw-export',
            role: ROLES.SYSTEM,
            content: 'Gemini export for this conversation is raw JSON dump until parsing is perfected: \n\n' + JSON.stringify(parsedData).slice(0, 500) + '...',
            timestamp: Date.now()
        }));

    } catch (e) {
        console.warn('Gemini normalization error', e);
    }

    return createConversation({
        id: conversationId,
        platform: PLATFORMS.GEMINI,
        title: 'Gemini Conversation', // Extract from data if available
        messages: messages,
        created_at: Date.now(),
        updated_at: Date.now(),
        metadata: {
            raw_structure: true
        }
    });
}
