// BrainBox - Data Normalizers
// Transforms platform-specific API responses into the Common Schema

import { createConversation, createMessage, ROLES, PLATFORMS, type Conversation, type Message, type Role, type Platform } from './schemas';
import { logger } from './logger';

// ============================================================================
// CHATGPT NORMALIZER
// ============================================================================

export function normalizeChatGPT(rawData: any): Conversation {
    const messages: Message[] = [];

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
        const allNodes = (Object.values(rawData.mapping) as any[])
            .filter(node => node.message)
            .sort((a, b) => a.message.create_time - b.message.create_time);

        allNodes.forEach(node => {
            processChatGPTMessage(node.message, messages);
        });
    }

    return createConversation({
        id: (rawData.id || rawData.conversation_id || rawData.uuid) as string,
        platform: PLATFORMS.CHATGPT,
        title: (rawData.title || 'ChatGPT Chat') as string,
        messages: messages,
        created_at: (rawData.create_time || Date.now() / 1000) * 1000,
        updated_at: (rawData.update_time || Date.now() / 1000) * 1000,
        metadata: {
            model: rawData.model_slug
        }
    });
}

function processChatGPTMessage(msg: any, targetArray: Message[]) {
    // Skip system messages usually, or empty ones
    if (!msg.content || !msg.content.parts) return;

    // Handle content parts (usually array of strings)
    const content = msg.content.parts.join('\n');
    if (!content.trim()) return;

    const role: Role = msg.author.role === 'user' ? ROLES.USER :
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

export function normalizeClaude(rawData: any): Conversation {
    const messages = (rawData.chat_messages || []).map((msg: any) => {
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
        id: rawData.uuid as string,
        platform: PLATFORMS.CLAUDE,
        title: (rawData.name || 'Claude Chat') as string,
        messages: messages,
        created_at: rawData.created_at ? new Date(rawData.created_at).getTime() : Date.now(),
        updated_at: rawData.updated_at ? new Date(rawData.updated_at).getTime() : Date.now(),
        metadata: {
            model: rawData.model
        }
    });
}

// ============================================================================
// GEMINI NORMALIZER
// ============================================================================

export function normalizeGemini(parsedData: any, conversationId: string): Conversation {
    const messages: Message[] = [];
    let title = 'Gemini Conversation';

    try {
        const extracted = extractGeminiMessages(parsedData);
        title = extractGeminiTitle(parsedData) || title;
        
        const uniqueMessages: Message[] = [];
        const seenContent = new Set<string>();
        let messageIndex = 0;
        
        extracted.forEach((msg) => {
            const text = msg.text ? msg.text.trim() : '';
            if (!text || isTechnicalData(text)) return;
            
            if (text.match(/^(Генерация|Генерация \(Лице|Изображение|Поза|Фон|Контрол|Prompt|Приключихме|Желаете ли):?\s*$/i)) return;
            
            const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
            const contentKey = normalizedText.substring(0, 150);
            if (seenContent.has(contentKey)) return;
            seenContent.add(contentKey);
            
            if (text.match(/^https?:\/\/[^\s]+$/) && !text.includes(' ')) return;
            if (text.length < 20 && !text.match(/[а-яА-Яa-zA-Z]{5,}/)) return;
            
            const role = determineGeminiRoleImproved(text, messageIndex, uniqueMessages);
            
            uniqueMessages.push(createMessage({
                id: msg.id || `gemini_msg_${uniqueMessages.length}`,
                role: role,
                content: formatGeminiMessageContent(msg),
                timestamp: msg.timestamp || Date.now(),
                metadata: {
                    images: (msg.images || []).filter((img: string) => img && !img.match(/image_generation_content\/\d+$/)),
                    attachments: msg.attachments || []
                }
            }));
            
            messageIndex++;
        });
        
        messages.push(...uniqueMessages);

        if (messages.length === 0) {
            messages.push(createMessage({
                id: 'parse-fallback',
                role: ROLES.SYSTEM,
                content: 'Could not parse Gemini conversation structure. Raw data: ' + JSON.stringify(parsedData).slice(0, 500) + '...',
                timestamp: Date.now()
            }));
        }
    } catch (e: any) {
        logger.warn('Gemini normalization error', e);
        messages.push(createMessage({
            id: 'parse-error',
            role: ROLES.SYSTEM,
            content: 'Error parsing Gemini: ' + e.message,
            timestamp: Date.now()
        }));
    }

    return createConversation({
        id: conversationId,
        platform: PLATFORMS.GEMINI,
        title: title,
        messages: messages,
        created_at: Date.now(),
        updated_at: Date.now(),
        metadata: {
            parsed: messages.length > 0 && messages[0].id !== 'parse-error'
        }
    });
}

function extractGeminiMessages(data: any, depth = 0, maxDepth = 10): any[] {
    const messages: any[] = [];
    const seenTexts = new Set<string>();
    
    if (depth > maxDepth || !data) return messages;
    
    if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            if (Array.isArray(item) && item.length > 0) {
                const firstElement = item[0];
                if (typeof firstElement === 'string' && firstElement.length > 0) {
                    if (firstElement.match(/^[cr]c?_[a-zA-Z0-9_-]+$/)) {
                        messages.push(...extractGeminiMessages(item, depth + 1, maxDepth));
                    } else if (!isTechnicalData(firstElement)) {
                        const message = parseGeminiMessageArray(item);
                        if (message && !seenTexts.has(message.text)) {
                            seenTexts.add(message.text);
                            messages.push(message);
                        }
                    }
                } else {
                    messages.push(...extractGeminiMessages(item, depth + 1, maxDepth));
                }
            } else if (typeof item === 'string' && item.length > 10) {
                if (!isTechnicalData(item) && !seenTexts.has(item)) {
                    seenTexts.add(item);
                    messages.push({
                        id: `gemini_msg_${messages.length}`,
                        role: determineGeminiRoleImproved(item, i, []),
                        text: item,
                        timestamp: Date.now()
                    });
                }
            } else {
                messages.push(...extractGeminiMessages(item, depth + 1, maxDepth));
            }
        }
    } else if (typeof data === 'object' && data !== null) {
        for (const key in data) {
            messages.push(...extractGeminiMessages(data[key], depth + 1, maxDepth));
        }
    }
    return messages;
}

function isTechnicalData(text: string): boolean {
    if (!text || typeof text !== 'string') return true;
    const trimmed = text.trim();
    if (trimmed.length === 0) return true;
    if (trimmed.match(/^[cr]c?_[a-zA-Z0-9_-]+$/)) return true;
    if (trimmed.match(/^[0-9a-f]{20,}$/i)) return true;
    if (trimmed.match(/^(data_analysis_tool|image_generation|function_call)$/i)) return true;
    if (trimmed.match(/^http:\/\/googleusercontent\.com\/image_generation_content\/\d+$/)) return true;
    if (trimmed.length < 15) return true;
    if (trimmed.match(/^https?:\/\/[^\s]+$/) && !trimmed.includes(' ')) return true;
    if (trimmed.match(/^[a-zA-Z0-9_-]{8,}$/) && !trimmed.includes(' ')) {
        const hasVowels = /[aeiouаеиоу]/i.test(trimmed);
        const hasConsonants = /[bcdfghjklmnpqrstvwxyzбвгджзклмнпрсттфхцчшщ]/i.test(trimmed);
        if (!hasVowels || !hasConsonants) return true;
    }
    if (trimmed.match(/^[\d\s-]+$/) && trimmed.length < 30) return true;
    return false;
}

function parseGeminiMessageArray(arr: any[]): any {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const text = arr[0];
    if (typeof text !== 'string' || text.length === 0 || isTechnicalData(text)) return null;
    
    const images: string[] = [];
    for (let i = 1; i < arr.length; i++) {
        if (Array.isArray(arr[i])) {
            extractImagesFromArray(arr[i], images);
        } else if (typeof arr[i] === 'string' && arr[i].match(/^https?:\/\//)) {
            if (!arr[i].match(/image_generation_content\/\d+$/)) {
                images.push(arr[i]);
            }
        }
    }
    
    return {
        id: `gemini_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: text.trim(),
        images: images.filter(img => !img.match(/image_generation_content\/\d+$/)),
        timestamp: Date.now()
    };
}

function extractImagesFromArray(arr: any, images: string[], depth = 0) {
    if (depth > 5 || !Array.isArray(arr)) return;
    for (const item of arr) {
        if (typeof item === 'string' && item.match(/^https?:\/\//)) {
            if (!item.match(/image_generation_content\/\d+$/)) {
                images.push(item);
            }
        } else if (Array.isArray(item)) {
            extractImagesFromArray(item, images, depth + 1);
        }
    }
}

function determineGeminiRoleImproved(text: string, index: number, previousMessages: Message[]): Role {
    const trimmed = text.trim();
    const strongUserIndicators = [
        /^Продължи/i, /^Отлично!?\s*Продължаваме/i,
        /^(Генерирай|Направи|Създай|Покажи|Дай|Искам|Моля)/i,
        /^(Continue|Generate|Create|Show|Give|I want|Please)/i,
        /\?[^?]*$/, /^[А-ЯA-Z][а-яa-z]{1,30}[!?]?$/
    ];
    
    for (const pattern of strongUserIndicators) {
        if (pattern.test(trimmed)) return ROLES.USER;
    }
    
    const strongAssistantIndicators = [
        /^\d+\.\s+\d+\s+Изображения/i, /^Генерация\s*\(/i, /^\*\*.*\*\*:?\s*$/m,
        /^(Генерация|Изображение|Поза|Фон|Контрол|Prompt|Приключихме|Желаете ли)/i,
        /^(Generation|Image|Pose|Background|Control|Prompt|Finished|Would you like)/i,
        /^[А-ЯA-Z][а-яa-z\s]{100,}/, /\*\*.*\*\*/m, /^\d+\.\s+[А-ЯA-Z]/m
    ];
    
    for (const pattern of strongAssistantIndicators) {
        if (pattern.test(trimmed)) return ROLES.ASSISTANT;
    }
    
    if (previousMessages.length > 0) {
        const lastRole = previousMessages[previousMessages.length - 1].role;
        if (lastRole === ROLES.USER) {
            for (const pattern of strongUserIndicators) {
                if (pattern.test(trimmed)) return ROLES.USER;
            }
            return ROLES.ASSISTANT;
        } else if (lastRole === ROLES.ASSISTANT) {
            for (const pattern of strongAssistantIndicators) {
                if (pattern.test(trimmed)) return ROLES.ASSISTANT;
            }
            if (trimmed.length < 150 && (trimmed.includes('?') || trimmed.match(/^(Продължи|Генерирай|Направи|Отлично)/i))) {
                return ROLES.USER;
            }
            return ROLES.USER;
        }
    }
    
    if (trimmed.length < 50) {
        if (trimmed.match(/[?]|^(Продължи|Генерирай|Направи|Създай|Покажи|Дай|Отлично)/i)) return ROLES.USER;
        if (trimmed.match(/^\d+\./)) return ROLES.ASSISTANT;
    } else if (trimmed.length > 300) {
        return ROLES.ASSISTANT;
    }
    
    if (trimmed.match(/\*\*|###|^\d+\.\s+\d+|^[-•]\s+[А-ЯA-Z]/m)) return ROLES.ASSISTANT;
    if (trimmed.match(/^(Ще генерирам|Ще създам|Ще покажа|Ще направя|I will)/i) && trimmed.length < 200) return ROLES.USER;
    
    return index % 2 === 0 ? ROLES.USER : ROLES.ASSISTANT;
}

function formatGeminiMessageContent(msg: any): string {
    let content = msg.text || '';
    if (msg.images && msg.images.length > 0) {
        content += '\n\n[Images: ' + msg.images.length + ']';
        msg.images.forEach((img: string, idx: number) => {
            content += `\n${idx + 1}. ${img}`;
        });
    }
    return content;
}

function extractGeminiTitle(data: any): string | null {
    if (!data) return null;
    const dataStr = JSON.stringify(data);
    const titleMatch = dataStr.match(/"title":\s*"([^"]+)"/);
    if (titleMatch) return titleMatch[1];
    const nameMatch = dataStr.match(/"name":\s*"([^"]+)"/);
    if (nameMatch) return nameMatch[1];
    return null;
}

export function normalizeOpenAICompatible(rawData: any, platform: Platform): Conversation {
    const messages = (rawData.messages || []).map((msg: any) => {
        return createMessage({
            role: msg.role === 'user' ? ROLES.USER : ROLES.ASSISTANT,
            content: msg.content,
            timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
        });
    });

    if (rawData.choices && rawData.choices[0]) {
        const choice = rawData.choices[0];
        if (choice.message) {
            messages.push(createMessage({
                role: choice.message.role === 'user' ? ROLES.USER : ROLES.ASSISTANT,
                content: choice.message.content,
                timestamp: rawData.created ? rawData.created * 1000 : Date.now()
            }));
        }
    }

    return createConversation({
        id: (rawData.id || `conv_${Date.now()}`) as string,
        platform: platform,
        title: (rawData.title || (messages.length > 0 ? messages[0].content.substring(0, 50) : 'Untitled')) as string,
        messages: messages,
        created_at: rawData.created ? rawData.created * 1000 : Date.now(),
        metadata: {
            model: rawData.model,
            usage: rawData.usage,
            citations: rawData.citations
        }
    });
}

export function normalizeGrok(rawData: any): Conversation {
    const rawItems = rawData.items || [];
    const messages = rawItems.map((item: any) => {
        return createMessage({
            role: item.sender === 1 ? ROLES.USER : ROLES.ASSISTANT,
            content: item.message,
            timestamp: Date.now()
        });
    });

    return createConversation({
        id: (rawData.conversation_id || `conv_${Date.now()}`) as string,
        platform: PLATFORMS.GROK,
        title: (messages.length > 0 ? messages[0].content.substring(0, 50) : 'Grok Chat') as string,
        messages: messages,
        created_at: Date.now()
    });
}

export function normalizePerplexity(rawData: any): Conversation {
    const thread = rawData.thread || {};
    const messages = (thread.messages || []).map((msg: any) => {
        return createMessage({
            role: msg.role === 'user' ? ROLES.USER : ROLES.ASSISTANT,
            content: msg.text,
            timestamp: Date.now()
        });
    });

    return createConversation({
        id: (thread.slug || `conv_${Date.now()}`) as string,
        platform: PLATFORMS.PERPLEXITY,
        title: (thread.title || (messages.length > 0 ? messages[0].content.substring(0, 50) : 'Perplexity Thread')) as string,
        messages: messages,
        created_at: Date.now(),
        metadata: {
            citations: rawData.citations
        }
    });
}

export function normalizeDeepSeek(rawData: any): Conversation {
    const data = rawData.data || {};
    const selectionList = data.selection_list || [];
    const messages = selectionList.map((msg: any) => {
        return createMessage({
            role: msg.role === 'user' ? ROLES.USER : ROLES.ASSISTANT,
            content: msg.content,
            timestamp: Date.now()
        });
    });

    return createConversation({
        id: (data.session_id || `conv_${Date.now()}`) as string,
        platform: PLATFORMS.DEEPSEEK,
        title: (selectionList.length > 0 ? selectionList[0].content.substring(0, 50) : 'DeepSeek Chat') as string,
        messages: messages,
        created_at: Date.now()
    });
}

export function normalizeQwen(rawData: any): Conversation {
    const messages = (rawData.messages || []).map((msg: any) => {
        return createMessage({
            role: msg.role === 'user' ? ROLES.USER : ROLES.ASSISTANT,
            content: msg.content,
            timestamp: Date.now()
        });
    });

    return createConversation({
        id: (rawData.session_id || `conv_${Date.now()}`) as string,
        platform: PLATFORMS.QWEN,
        title: (messages.length > 0 ? messages[0].content.substring(0, 50) : 'Qwen Chat') as string,
        messages: messages,
        created_at: Date.now()
    });
}
