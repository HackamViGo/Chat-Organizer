/**
 * @deprecated 2026-02-27 — Unused duplicate of lib/normalizers.js.
 * Retained only for backwards compatibility reference. Do NOT import from here.
 * Use apps/extension/src/lib/normalizers.js instead.
 */
// BrainBox - Data Normalizers
// Transforms platform-specific API responses into the Common Schema

import { createConversation, createMessage, ROLES, PLATFORMS } from './schemas.js'

// ============================================================================
// CHATGPT NORMALIZER
// ============================================================================

export function normalizeChatGPT(rawData) {
  const messages = []
  const visited = new Set()

  // ChatGPT data is a tree (mapping), we need to reconstruct the linear path
  let currentNodeId = rawData.current_node

  if (currentNodeId && rawData.mapping[currentNodeId]) {
    // Linear reconstruction (backwards)
    while (currentNodeId) {
      const node = rawData.mapping[currentNodeId]
      if (node.message) {
        processChatGPTMessage(node.message, messages)
      }
      currentNodeId = node.parent
    }
    messages.reverse()
  } else {
    // Fallback: Dump all messages (might include alternate branches)
    const allNodes = Object.values(rawData.mapping)
      .filter((node) => node.message)
      .sort((a, b) => a.message.create_time - b.message.create_time)

    allNodes.forEach((node) => {
      processChatGPTMessage(node.message, messages)
    })
  }

  return createConversation({
    id: rawData.id || rawData.conversation_id || rawData.uuid,
    platform: PLATFORMS.CHATGPT,
    title: rawData.title,
    messages: messages,
    created_at: rawData.create_time * 1000,
    updated_at: rawData.update_time * 1000,
    metadata: {
      model: rawData.model_slug,
    },
  })
}

function processChatGPTMessage(msg, targetArray) {
  // Skip system messages usually, or empty ones
  if (!msg.content || !msg.content.parts) return

  // Handle content parts (usually array of strings)
  const content = msg.content.parts.join('\n')
  if (!content.trim()) return

  const role =
    msg.author.role === 'user'
      ? ROLES.USER
      : msg.author.role === 'assistant'
        ? ROLES.ASSISTANT
        : msg.author.role === 'system'
          ? ROLES.SYSTEM
          : ROLES.ASSISTANT

  targetArray.push(
    createMessage({
      id: msg.id,
      role: role,
      content: content,
      timestamp: msg.create_time * 1000,
      metadata: msg.metadata,
    })
  )
}

// ============================================================================
// CLAUDE NORMALIZER
// ============================================================================

export function normalizeClaude(rawData) {
  const messages = rawData.chat_messages.map((msg) => {
    return createMessage({
      id: msg.uuid,
      role: msg.sender === 'human' ? ROLES.USER : ROLES.ASSISTANT,
      content: msg.text,
      timestamp: new Date(msg.created_at).getTime(),
      metadata: {
        attachments: msg.attachments,
        files: msg.files,
      },
    })
  })

  return createConversation({
    id: rawData.uuid,
    platform: PLATFORMS.CLAUDE,
    title: rawData.name,
    messages: messages,
    created_at: new Date(rawData.created_at).getTime(),
    updated_at: new Date(rawData.updated_at).getTime(),
    metadata: {
      model: rawData.model,
    },
  })
}

// ============================================================================
// GEMINI NORMALIZER
// ============================================================================

export function normalizeGemini(parsedData, conversationId) {
  // Gemini API (batchexecute) returns a deeply nested array structure.
  // Structure: [[[["c_conversationId","r_messageId"],["c_conversationId","r_messageId2",...],[[messageText, null, null, null, [images...]], ...]]]]

  const messages = []
  let title = 'Gemini Conversation'

  try {
    // Recursively extract messages from nested structure with role context
    const extractedMessages = extractGeminiMessages(parsedData)

    // Extract title if available
    title = extractGeminiTitle(parsedData) || title

    // Convert extracted messages to schema format
    // Filter and deduplicate messages, then determine roles properly
    const uniqueMessages = []
    const seenContent = new Set()

    // Track message order to help determine roles (alternating pattern)
    let messageIndex = 0

    extractedMessages.forEach((msg, index) => {
      const text = msg.text ? msg.text.trim() : ''

      // Skip empty messages or messages with only technical data
      if (!text || text.length === 0) return
      if (isTechnicalData(text)) return

      // Skip messages that are just headers or labels without content
      if (
        text.match(
          /^(Генерация|Генерация \(Лице|Изображение|Поза|Фон|Контрол|Prompt|Приключихме|Желаете ли):?\s*$/i
        )
      )
        return

      // Skip duplicates (same text content)
      // Use normalized text (lowercase, remove extra spaces) for comparison
      const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim()
      const contentKey = normalizedText.substring(0, 150) // Use first 150 chars as key
      if (seenContent.has(contentKey)) return
      seenContent.add(contentKey)

      // Only include messages with meaningful content
      // Skip messages that are only image URLs or IDs
      if (text.match(/^https?:\/\/[^\s]+$/) && !text.includes(' ')) return

      // Skip very short fragments that are likely parts of larger messages
      if (text.length < 20 && !text.match(/[а-яА-Яa-zA-Z]{5,}/)) return

      // Determine role more accurately based on content and position
      const role = determineGeminiRoleImproved(text, messageIndex, uniqueMessages)

      uniqueMessages.push(
        createMessage({
          id: msg.id || `gemini_msg_${uniqueMessages.length}`,
          role: role,
          content: formatGeminiMessageContent(msg),
          timestamp: msg.timestamp || Date.now(),
          metadata: {
            images: (msg.images || []).filter(
              (img) => img && !img.match(/image_generation_content\/\d+$/)
            ),
            attachments: msg.attachments || [],
          },
        })
      )

      messageIndex++
    })

    messages.push(...uniqueMessages)

    // If no messages found, add a fallback message
    if (messages.length === 0) {
      messages.push(
        createMessage({
          id: 'parse-fallback',
          role: ROLES.SYSTEM,
          content:
            'Could not parse Gemini conversation structure. Raw data: ' +
            JSON.stringify(parsedData).slice(0, 1000) +
            '...',
          timestamp: Date.now(),
        })
      )
    }
  } catch (e) {
    console.warn('Gemini normalization error', e)
    // Fallback: add error message
    messages.push(
      createMessage({
        id: 'parse-error',
        role: ROLES.SYSTEM,
        content:
          'Error parsing Gemini conversation: ' +
          e.message +
          '\n\nRaw data: ' +
          JSON.stringify(parsedData).slice(0, 500) +
          '...',
        timestamp: Date.now(),
      })
    )
  }

  return createConversation({
    id: conversationId,
    platform: PLATFORMS.GEMINI,
    title: title,
    messages: messages,
    created_at: Date.now(),
    updated_at: Date.now(),
    metadata: {
      parsed: messages.length > 0 && messages[0].id !== 'parse-error',
    },
  })
}

/**
 * Recursively extract messages from Gemini's nested array structure
 */
function extractGeminiMessages(data, depth = 0, maxDepth = 10) {
  const messages = []
  const seenTexts = new Set() // Track seen messages to avoid duplicates

  if (depth > maxDepth) return messages
  if (!data) return messages

  // If it's an array, process each element
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i]

      // Check if this looks like a message array
      // Pattern: [messageText, null, null, null, [images...]]
      if (Array.isArray(item) && item.length > 0) {
        const firstElement = item[0]

        // If first element is a string (message text)
        if (typeof firstElement === 'string' && firstElement.length > 0) {
          // Skip IDs (c_, r_, rc_)
          if (firstElement.match(/^[cr]c?_[a-zA-Z0-9_-]+$/)) {
            // This is an ID, skip it but continue searching
            const nested = extractGeminiMessages(item, depth + 1, maxDepth)
            messages.push(...nested)
          } else if (!isTechnicalData(firstElement)) {
            // This looks like actual message text
            const message = parseGeminiMessageArray(item)
            if (message && !seenTexts.has(message.text)) {
              seenTexts.add(message.text)
              messages.push(message)
            }
          }
        } else {
          // Recursively search nested arrays
          const nested = extractGeminiMessages(item, depth + 1, maxDepth)
          messages.push(...nested)
        }
      } else if (typeof item === 'string' && item.length > 10) {
        // Standalone string that looks like message content
        if (!isTechnicalData(item) && !seenTexts.has(item)) {
          seenTexts.add(item)
          messages.push({
            id: `gemini_msg_${messages.length}`,
            role: determineGeminiRole(item, i),
            text: item,
            timestamp: Date.now(),
          })
        }
      } else {
        // Recursively search
        const nested = extractGeminiMessages(item, depth + 1, maxDepth)
        messages.push(...nested)
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    // If it's an object, search its values
    for (const key in data) {
      const nested = extractGeminiMessages(data[key], depth + 1, maxDepth)
      messages.push(...nested)
    }
  }

  return messages
}

/**
 * Check if a string is technical data (ID, tool name, placeholder URL, etc.)
 */
function isTechnicalData(text) {
  if (!text || typeof text !== 'string') return true

  const trimmed = text.trim()

  // Skip empty strings
  if (trimmed.length === 0) return true

  // Skip IDs (c_, r_, rc_)
  if (trimmed.match(/^[cr]c?_[a-zA-Z0-9_-]+$/)) return true

  // Skip hash-like strings (hex strings longer than 20 chars)
  if (trimmed.match(/^[0-9a-f]{20,}$/i)) return true

  // Skip tool names
  if (trimmed.match(/^(data_analysis_tool|image_generation|function_call)$/i)) return true

  // Skip placeholder URLs
  if (trimmed.match(/^http:\/\/googleusercontent\.com\/image_generation_content\/\d+$/)) return true

  // Skip very short strings (likely IDs, codes, or fragments)
  if (trimmed.length < 15) return true

  // Skip strings that are only URLs without context
  if (trimmed.match(/^https?:\/\/[^\s]+$/) && !trimmed.includes(' ')) return true

  // Skip strings that look like file names or IDs
  if (trimmed.match(/^[a-zA-Z0-9_-]{8,}$/) && !trimmed.includes(' ')) {
    // Allow if it contains meaningful words (has vowels and consonants)
    const hasVowels = /[aeiouаеиоу]/i.test(trimmed)
    const hasConsonants = /[bcdfghjklmnpqrstvwxyzбвгджзклмнпрсттфхцчшщ]/i.test(trimmed)
    if (!hasVowels || !hasConsonants) return true
  }

  // Skip strings that are just numbers or codes
  if (trimmed.match(/^[\d\s-]+$/) && trimmed.length < 30) return true

  return false
}

/**
 * Parse a Gemini message array structure
 * Pattern: [text, null, null, null, [images...]] or similar
 */
function parseGeminiMessageArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null

  const text = arr[0]
  if (typeof text !== 'string' || text.length === 0) return null

  // Skip if it's technical data
  if (isTechnicalData(text)) return null

  // Extract images from nested arrays
  const images = []
  for (let i = 1; i < arr.length; i++) {
    if (Array.isArray(arr[i])) {
      extractImagesFromArray(arr[i], images)
    } else if (typeof arr[i] === 'string' && arr[i].match(/^https?:\/\//)) {
      // Only add real image URLs, not placeholders
      if (!arr[i].match(/image_generation_content\/\d+$/)) {
        images.push(arr[i])
      }
    }
  }

  // Filter out placeholder image URLs
  const realImages = images.filter((img) => !img.match(/image_generation_content\/\d+$/))

  return {
    id: `gemini_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: determineGeminiRole(text, 0),
    text: text.trim(),
    images: realImages,
    timestamp: Date.now(),
  }
}

/**
 * Extract image URLs from nested arrays
 */
function extractImagesFromArray(arr, images, depth = 0) {
  if (depth > 5) return // Prevent infinite recursion

  if (Array.isArray(arr)) {
    for (const item of arr) {
      if (typeof item === 'string' && item.match(/^https?:\/\//)) {
        // Only add real image URLs, not placeholders
        if (!item.match(/image_generation_content\/\d+$/)) {
          images.push(item)
        }
      } else if (Array.isArray(item)) {
        extractImagesFromArray(item, images, depth + 1)
      }
    }
  }
}

/**
 * Determine message role based on context
 * Gemini structure: usually alternates user/assistant or has indicators
 * @deprecated Use determineGeminiRoleImproved instead
 */
function determineGeminiRole(text, index) {
  return determineGeminiRoleImproved(text, index, [])
}

/**
 * Determine message role based on context and content analysis
 * Improved version that uses multiple heuristics
 */
function determineGeminiRoleImproved(text, index, previousMessages) {
  const trimmed = text.trim()

  // Heuristic 1: Strong user indicators (commands, questions, short requests)
  const strongUserIndicators = [
    /^Продължи/i, // "Continue"
    /^Отлично!?\s*Продължаваме/i, // "Excellent! Continuing..."
    /^(Генерирай|Направи|Създай|Покажи|Дай|Искам|Моля)/i, // Bulgarian commands
    /^(Continue|Generate|Create|Show|Give|I want|Please)/i, // English commands
    /\?[^?]*$/, // Ends with question mark
    /^[А-ЯA-Z][а-яa-z]{1,30}[!?]?$/, // Short capitalized sentence (1-30 chars)
  ]

  for (const pattern of strongUserIndicators) {
    if (pattern.test(trimmed)) {
      return ROLES.USER
    }
  }

  // Heuristic 2: Strong assistant indicators (structured, detailed responses)
  const strongAssistantIndicators = [
    /^\d+\.\s+\d+\s+Изображения/i, // "1. 20 Images"
    /^Генерация\s*\(/i, // "Generation (Face 1/20):"
    /^\*\*.*\*\*:?\s*$/m, // Markdown bold headers
    /^(Генерация|Изображение|Поза|Фон|Контрол|Prompt|Приключихме|Желаете ли)/i, // Structured patterns
    /^(Generation|Image|Pose|Background|Control|Prompt|Finished|Would you like)/i,
    /^[А-ЯA-Z][а-яa-z\s]{100,}/, // Very long detailed text (100+ chars)
    /\*\*.*\*\*/m, // Contains markdown formatting
    /^\d+\.\s+[А-ЯA-Z]/m, // Numbered list with capital letter
  ]

  for (const pattern of strongAssistantIndicators) {
    if (pattern.test(trimmed)) {
      return ROLES.ASSISTANT
    }
  }

  // Heuristic 3: Context-based (use previous message role)
  if (previousMessages.length > 0) {
    const lastRole = previousMessages[previousMessages.length - 1].role

    // If last was user, this is likely assistant (alternating pattern)
    if (lastRole === ROLES.USER) {
      // But check for strong user indicators first
      for (const pattern of strongUserIndicators) {
        if (pattern.test(trimmed)) {
          return ROLES.USER
        }
      }
      return ROLES.ASSISTANT
    }
    // If last was assistant, this is likely user
    else if (lastRole === ROLES.ASSISTANT) {
      // Check for strong assistant indicators first
      for (const pattern of strongAssistantIndicators) {
        if (pattern.test(trimmed)) {
          return ROLES.ASSISTANT
        }
      }
      // If short and looks like command/question, it's user
      if (
        trimmed.length < 150 &&
        (trimmed.includes('?') || trimmed.match(/^(Продължи|Генерирай|Направи|Отлично)/i))
      ) {
        return ROLES.USER
      }
      return ROLES.USER // Default to user after assistant
    }
  }

  // Heuristic 4: Length and content analysis
  if (trimmed.length < 50) {
    // Very short messages are usually user commands
    if (trimmed.match(/[?]|^(Продължи|Генерирай|Направи|Създай|Покажи|Дай|Отлично)/i)) {
      return ROLES.USER
    }
    // But if it's structured (numbered list), it's assistant
    if (trimmed.match(/^\d+\./)) {
      return ROLES.ASSISTANT
    }
  } else if (trimmed.length > 300) {
    // Very long messages are usually assistant responses
    return ROLES.ASSISTANT
  }

  // Heuristic 5: Check for structured content (lists, formatting, markdown)
  if (trimmed.match(/\*\*|###|^\d+\.\s+\d+|^[-•]\s+[А-ЯA-Z]/m)) {
    return ROLES.ASSISTANT
  }

  // Heuristic 6: Check for future tense planning (user planning actions)
  if (
    trimmed.match(/^(Ще генерирам|Ще създам|Ще покажа|Ще направя|I will)/i) &&
    trimmed.length < 200
  ) {
    return ROLES.USER
  }

  // Default: if first message, assume user (conversations usually start with user)
  if (index === 0) {
    return ROLES.USER
  }

  // Final fallback: alternate pattern (user, assistant, user, assistant...)
  return index % 2 === 0 ? ROLES.USER : ROLES.ASSISTANT
}

/**
 * Format Gemini message content with images
 */
function formatGeminiMessageContent(msg) {
  let content = msg.text || ''

  if (msg.images && msg.images.length > 0) {
    content += '\n\n[Images: ' + msg.images.length + ']'
    msg.images.forEach((img, idx) => {
      content += `\n${idx + 1}. ${img}`
    })
  }

  return content
}

/**
 * Extract conversation title from Gemini data
 */
function extractGeminiTitle(data) {
  // Try to find title in the structure
  // Usually in metadata or first few elements

  if (!data) return null

  const dataStr = JSON.stringify(data)

  // Look for title patterns
  const titleMatch = dataStr.match(/"title":\s*"([^"]+)"/)
  if (titleMatch) return titleMatch[1]

  // Look for "name" field
  const nameMatch = dataStr.match(/"name":\s*"([^"]+)"/)
  if (nameMatch) return nameMatch[1]

  return null
}
