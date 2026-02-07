/**
 * Gemini Platform Adapter
 */

import { BasePlatformAdapter, type Conversation } from './base';
import { normalizeGemini } from '../../../lib/normalizers';
import { limiters } from '../../../lib/rate-limiter';
import { logger } from '../../../lib/logger';

export class GeminiAdapter extends BasePlatformAdapter {
    readonly platform = 'gemini';

    async fetchConversation(id: string): Promise<Conversation> {
        return limiters.gemini.schedule(async () => {
            // Get tokens from storage
            const { gemini_at_token, gemini_dynamic_key } = await this.getStorageValues([
                'gemini_at_token',
                'gemini_dynamic_key'
            ]);

            if (!gemini_at_token) {
                throw new Error('Gemini AT token not found. Refresh page.');
            }
            if (!gemini_dynamic_key) {
                throw new Error('Gemini dynamic key not found. Open a conversation.');
            }

            // Construct payload (Double serialized - Gemini quirk)
            const innerPayload = JSON.stringify([`c_${id}`, 10, null, 1, [1], [4], null, 1]);
            const middlePayload = [[[gemini_dynamic_key, innerPayload, null, "generic"]]];
            const outerPayload = JSON.stringify(middlePayload);

            const body = new URLSearchParams({
                'f.req': outerPayload,
                'at': gemini_at_token
            });

            const url = `https://gemini.google.com/u/0/_/BardChatUi/data/batchexecute?rpcids=${gemini_dynamic_key}`;

            // Fetch from Gemini API
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'X-Same-Domain': '1'
                },
                credentials: 'include',
                body: body.toString()
            });

            // Handle key expiration
            if (response.status === 400 || response.status === 403) {
                const txt = await response.text();
                logger.error('GeminiAdapter', '400/403:', txt.substring(0, 200));
                await this.removeStorageKeys(['gemini_dynamic_key']);
                throw new Error('Gemini key expired/invalid. Re-sync required.');
            }

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            // Parse Gemini response (complex format)
            const rawText = await response.text();
            try {
                const cleaned = rawText.slice(5); // Remove ")]}'\n" prefix
                const firstLevel = JSON.parse(cleaned);
                const dataString = firstLevel[0][2];
                const secondLevel = JSON.parse(dataString);

                return normalizeGemini(secondLevel, id);
            } catch (error) {
                logger.error('GeminiAdapter', 'Parse error:', error);
                throw new Error('Failed to parse Gemini response.');
            }
        });
    }
}
