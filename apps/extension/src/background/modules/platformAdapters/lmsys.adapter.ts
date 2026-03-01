/**
 * LMSYS Platform Adapter (Gradio-based)
 */

import { createConversation, createMessage, ROLES, PLATFORMS } from '../../../lib/schemas.js'

import { BasePlatformAdapter, type Conversation } from './base'

import { logger } from '@/lib/logger'

export class LmsysAdapter extends BasePlatformAdapter {
  readonly platform = 'lmsys'

  async fetchConversation(id: string): Promise<Conversation> {
    logger.debug('lmsys', `Fetching conversation for platform: ${this.platform}`)

    // LMSYS uses Gradio and stores configuration in window.gradio_config
    // However, since we are in the background worker, we can't access window directly.
    // We'll return a placeholder or attempt to fetch from a known Gradio endpoint
    // if we had the session ID.

    return createConversation({
      id: id || `lmsys_${Date.now()}`,
      platform: PLATFORMS.LMSYS || 'lmsys',
      title: 'LMSYS Conversation',
      messages: [
        createMessage({
          role: ROLES.SYSTEM,
          content:
            'LMSYS conversation capture via internal API is technically restricted due to Gradio architecture. Please use the "Save" feature in the UI if available.',
          timestamp: Date.now(),
        }) as any,
      ],
      created_at: Date.now(),
    } as any)
  }
}
