import { logger } from '../../shared/logger';
import type { Message } from '../../shared/types';

export function extractMessagesFromDOM(): Message[] {
  const messages: Message[] = [];

  try {
    // Gemini DOM selectors
    // USER messages
    const userTurns = document.querySelectorAll('.user-query-container, [data-turn-role="user"]');
    // ASSISTANT messages  
    const modelTurns = document.querySelectorAll('.model-response-text, [data-turn-role="model"]');

    // Merge and track DOM elements
    const allTurns: Array<{ role: 'user' | 'assistant'; el: Element }> = [];

    userTurns.forEach(el => allTurns.push({ role: 'user', el }));
    modelTurns.forEach(el => allTurns.push({ role: 'assistant', el }));

    // Sort by document position
    allTurns.sort((a, b) =>
      a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );

    allTurns.forEach((turn, index) => {
      const content = turn.el.textContent?.trim() ?? '';
      
      // Намиране на прикачените изображения в рамките на този turn
      const attachments: string[] = [];
      const imageEls = turn.el.querySelectorAll('img');
      imageEls.forEach(img => {
        if (img.src && img.src.startsWith('http')) {
          attachments.push(img.src);
        }
      });

      if (!content && attachments.length === 0) return;

      messages.push({
        id: `msg_${Date.now()}_${index}`,
        role: turn.role,
        content,
        timestamp: Date.now() + index,
        attachments: attachments.length > 0 ? attachments : undefined
      });
    });

    logger.info(`Extracted ${messages.length} messages from DOM`);
  } catch (error) {
    logger.error('Failed to extract messages from DOM:', error);
  }

  return messages;
}
