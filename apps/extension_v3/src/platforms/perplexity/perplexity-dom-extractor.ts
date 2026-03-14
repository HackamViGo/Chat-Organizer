import { logger } from '../../shared/logger';
import type { Message } from '../../shared/types';

export function extractMessagesFromDOM(): Message[] {
  const messages: Message[] = [];

  try {
    // Perplexity uses specific classes for queries and answers
    const queries = document.querySelectorAll('.query-text, .text-userSelection');
    const answers = document.querySelectorAll('.answer-text, .text-prose');

    const allItems: Array<{ role: 'user' | 'assistant'; el: Element }> = [];
    
    queries.forEach(el => allItems.push({ role: 'user', el }));
    answers.forEach(el => allItems.push({ role: 'assistant', el }));

    allItems.sort((a, b) =>
      a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );

    allItems.forEach((item, index) => {
      const content = item.el.textContent?.trim() ?? '';
      if (!content) return;

      messages.push({
        id: `dom_${Date.now()}_${index}`,
        role: item.role,
        content,
        timestamp: Date.now() + index,
      });
    });

    logger.info(`Extracted ${messages.length} messages from Perplexity DOM`);
  } catch (error) {
    logger.error('Failed to extract messages from Perplexity DOM:', error);
  }

  return messages;
}
