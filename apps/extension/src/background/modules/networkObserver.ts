import { logger } from '@/lib/logger';

export class NetworkObserver {
    private DEBUG_MODE: boolean;

    constructor(debug = false) {
        this.DEBUG_MODE = debug;
        this.handleClaudeRequest = this.handleClaudeRequest.bind(this);
    }

    initialize() {
        try {
            if (!chrome.webRequest?.onBeforeRequest) {
                logger.warn('NetworkObserver', '⚠️ chrome.webRequest API not available');
                return;
            }

            (chrome.webRequest.onBeforeRequest as any).addListener(
                this.handleClaudeRequest,
                { urls: ["https://claude.ai/api/organizations/*"] }
            );

            logger.info('NetworkObserver', '🕵️ Listening for Claude org_id...');
        } catch (e) {
            logger.error('NetworkObserver', '❌ Setup failed:', e);
        }
    }

    private handleClaudeRequest(details: any) {
        try {
            const match = details.url.match(/organizations\/([a-f0-9-]+)/i);
            if (!match?.[1]) return;

            const orgId = match[1];

            // Avoid excessive writes
            chrome.storage.local.get(['claude_org_id'], (result) => {
                if (result.claude_org_id !== orgId) {
                    if (this.DEBUG_MODE) {
                        logger.debug('NetworkObserver', '🎯 Captured Claude Org ID:', orgId);
                    }
                    chrome.storage.local.set({ claude_org_id: orgId });
                }
            });
        } catch (e) {
            // Silent fail
        }
    }
}
