import { logger } from '../../shared/logger';
import type { Message } from '../../shared/types';

export function extractMessagesFromDOM(): Message[] {
  const messages: Message[] = [];

  try {
    const messageElements = document.querySelectorAll('[data-message-author-role]');

    messageElements.forEach((el, index) => {
      const role = el.getAttribute('data-message-author-role');
      if (role !== 'user' && role !== 'assistant') return;

      const contentEl = el.querySelector('.markdown, .prose') || el;
      const content = contentEl.textContent?.trim() ?? '';

      // Extract images if any
      const images: string[] = [];
      const imgEls = el.querySelectorAll('img');
      imgEls.forEach(img => {
        if (img.src && (img.src.startsWith('http') || img.src.startsWith('blob:'))) {
          images.push(img.src);
        }
      });

      if (!content && images.length === 0) return;

      messages.push({
        id: `dom_${Date.now()}_${index}`,
        role: role as 'user' | 'assistant',
        content,
        timestamp: Date.now() + index,
        images: images.length > 0 ? images : undefined
      });
    });

    logger.info(`Extracted ${messages.length} messages from ChatGPT DOM`);
  } catch (error) {
    logger.error('Failed to extract messages from ChatGPT DOM:', error);
  }

  return messages;
}
