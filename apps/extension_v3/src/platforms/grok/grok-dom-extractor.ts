import { logger } from '../../shared/logger';
import type { Message } from '../../shared/types';

export function extractMessagesFromDOM(): Message[] {
  const messages: Message[] = [];

  try {
    const turns = document.querySelectorAll('[data-role]');

    turns.forEach((el, index) => {
      const roleAttr = el.getAttribute('data-role');
      if (roleAttr !== 'user' && roleAttr !== 'assistant') return;

      const content = el.textContent?.trim() ?? '';
      if (!content) return;

      messages.push({
        id: `dom_${Date.now()}_${index}`,
        role: roleAttr as 'user' | 'assistant',
        content,
        timestamp: Date.now() + index,
      });
    });

    logger.info(`Extracted ${messages.length} messages from Grok DOM`);
  } catch (error) {
    logger.error('Failed to extract messages from Grok DOM:', error);
  }

  return messages;
}
