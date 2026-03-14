import { logger } from '../../shared/logger';
import type { Message } from '../../shared/types';

export function extractMessagesFromDOM(): Message[] {
  const messages: Message[] = [];

  try {
    const turns = document.querySelectorAll('.human-turn, .assistant-turn, [data-testid="user-message"], [data-testid="claude-message"]');

    turns.forEach((el, index) => {
      let role: 'user' | 'assistant' | null = null;
      if (el.classList.contains('human-turn') || el.getAttribute('data-testid') === 'user-message') {
        role = 'user';
      } else if (el.classList.contains('assistant-turn') || el.getAttribute('data-testid') === 'claude-message') {
        role = 'assistant';
      }

      if (!role) return;

      const content = el.textContent?.trim() ?? '';
      
      if (!content) return;

      messages.push({
        id: `dom_${Date.now()}_${index}`,
        role,
        content,
        timestamp: Date.now() + index,
      });
    });

    logger.info(`Extracted ${messages.length} messages from Claude DOM`);
  } catch (error) {
    logger.error('Failed to extract messages from Claude DOM:', error);
  }

  return messages;
}
