import { PromptSyncManager as SharedSyncManager } from '../services/prompt-sync-manager';

/**
 * PromptSyncManager (Legacy Wrapper)
 * 
 * Maintained for backward compatibility in the extension.
 * Delegates work to the shared implementation in services/.
 */
export class PromptSyncManager {
    private dashboardUrl: string;

    constructor(dashboardUrl: string) {
        this.dashboardUrl = dashboardUrl;
    }

    async initialize() {
        await this.syncIfNeeded(true);
    }

    async syncIfNeeded(silent: boolean = true) {
        if (SharedSyncManager.shouldSync()) {
            await this.sync(silent);
        }
    }

    async sync(silent: boolean = false) {
        const result = await chrome.storage.local.get(['accessToken']);
        const accessToken = (result as Record<string, string>).accessToken;
        
        if (!accessToken) {
            if (!silent) {
                await SharedSyncManager.safeRedirect(`${this.dashboardUrl}/extension-auth`);
            }
            return { success: false, reason: 'no_auth' };
        }

        try {
            const prompts = await SharedSyncManager.sync(this.dashboardUrl, accessToken);
            return { success: true, count: prompts.length };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return { success: false, error: msg };
        }
    }

    async getQuickPrompt(id: string) {
        const prompts = await this.getAllPrompts();
        return prompts.find((p) => (p as any).id === id) || null;
    }

    async getAllPrompts() {
        return await SharedSyncManager.getLocal();
    }
}
