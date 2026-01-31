/**
 * DynamicMenus
 * 
 * Responsible for:
 * 1. Managing Chrome Context Menus.
 * 2. Subscribing to PromptSyncManager updates.
 * 3. Rendering a hierarchical menu structure (Tree/Grid).
 * 4. Handling menu clicks to inject prompts.
 */
import { PromptSyncManager } from '@brainbox/shared/logic/promptSync';

// We need a way to message the tab, currently utilizing the service worker's helper or rewriting it here.
// For now, we'll assume we can emit a message or use chrome.tabs.

export class DynamicMenus {
    private syncManager: PromptSyncManager;
    private DEBUG_MODE: boolean = false;

    constructor(syncManager: PromptSyncManager) {
        this.syncManager = syncManager;
        this.handleMenuClick = this.handleMenuClick.bind(this);
    }

    initialize() {
        // Register click handler
        chrome.contextMenus.onClicked.addListener(this.handleMenuClick);
        
        // Initial build
        this.rebuildMenus();
        
        // Listen for storage changes to trigger rebuild
        // This acts as a "subscription" to the sync manager's data
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes['brainbox_prompts_cache']) {
                if (this.DEBUG_MODE) console.log('[DynamicMenus] 🔄 Prompts updated, rebuilding menus...');
                this.rebuildMenus();
            }
        });
        
        console.log('[DynamicMenus] 🖱️ Context menus initialized.');
    }

    // Track ALL menu IDs for selective removal
    private allMenuIds: string[] = [];

    async rebuildMenus() {
        try {
            // Remove ALL existing BrainBox menus
            for (const menuId of this.allMenuIds) {
                try {
                    await new Promise<void>((resolve) => {
                        chrome.contextMenus.remove(menuId, () => {
                            if (chrome.runtime.lastError) {
                                // Menu item might not exist, ignore
                            }
                            resolve();
                        });
                    });
                } catch {
                    // Ignore removal errors
                }
            }
            this.allMenuIds = [];

            // ========================================================================
            // 1. SAVE CHAT MENU (contexts: page, on AI platforms)
            // ========================================================================
            const saveChatId = 'brainbox_save_chat';
            chrome.contextMenus.create({
                id: saveChatId,
                title: '💾 Save Chat to BrainBox',
                contexts: ['page'],
                documentUrlPatterns: [
                    'https://chatgpt.com/*',
                    'https://chat.openai.com/*',
                    'https://claude.ai/*',
                    'https://gemini.google.com/*'
                ]
            });
            this.allMenuIds.push(saveChatId);

            // ========================================================================
            // 2. CREATE PROMPT MENU (contexts: selection, anywhere)
            // ========================================================================
            const createPromptId = 'brainbox_create_prompt';
            chrome.contextMenus.create({
                id: createPromptId,
                title: '📝 Create Prompt from Selection',
                contexts: ['selection']
            });
            this.allMenuIds.push(createPromptId);

            // ========================================================================
            // 3. INJECT PROMPTS MENU (contexts: editable, in textareas)
            // ========================================================================
            const injectRootId = 'brainbox_inject_root';
            chrome.contextMenus.create({
                id: injectRootId,
                title: '🧠 Inject Prompt',
                contexts: ['editable']
            });
            this.allMenuIds.push(injectRootId);

            // Get prompts from cache
            const prompts = await this.syncManager.getAllPrompts();

            if (!prompts || prompts.length === 0) {
                const emptyId = 'brainbox_inject_empty';
                chrome.contextMenus.create({
                    id: emptyId,
                    parentId: injectRootId,
                    title: '(No prompts synced)',
                    contexts: ['editable'],
                    enabled: false
                });
                this.allMenuIds.push(emptyId);
                return;
            }

            // Sync/Refresh Action
            const syncId = 'brainbox_inject_sync';
            chrome.contextMenus.create({
                id: syncId,
                parentId: injectRootId,
                title: '🔄 Sync Now',
                contexts: ['editable']
            });
            this.allMenuIds.push(syncId);

            const sepId = 'brainbox_inject_sep';
            chrome.contextMenus.create({
                id: sepId,
                parentId: injectRootId,
                type: 'separator',
                contexts: ['editable']
            });
            this.allMenuIds.push(sepId);

            // Limit to top 20 to be safe for now
            const maxItems = 20;
            const itemsToShow = prompts.slice(0, maxItems);

            itemsToShow.forEach(prompt => {
                const promptMenuId = `brainbox_inject_prompt_${prompt.id}`;
                chrome.contextMenus.create({
                    id: promptMenuId,
                    parentId: injectRootId,
                    title: prompt.title || 'Untitled Prompt',
                    contexts: ['editable']
                });
                this.allMenuIds.push(promptMenuId);
            });

            if (prompts.length > maxItems) {
                const moreId = 'brainbox_inject_more';
                chrome.contextMenus.create({
                    id: moreId,
                    parentId: injectRootId,
                    title: `...and ${prompts.length - maxItems} more in Dashboard`,
                    contexts: ['editable'],
                    enabled: false
                });
                this.allMenuIds.push(moreId);
            }

            if (this.DEBUG_MODE) console.log('[DynamicMenus] ✅ All context menus created');

        } catch (error) {
            console.error('[DynamicMenus] ❌ Failed to rebuild menus:', error);
        }
    }

    async handleMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
        if (!tab || !tab.id) return;

        // ========================================================================
        // SAVE CHAT - Trigger save flow in content script
        // ========================================================================
        if (info.menuItemId === 'brainbox_save_chat') {
            chrome.tabs.sendMessage(tab.id, { action: 'triggerSaveChat' }).catch(err => {
                console.error('[DynamicMenus] ❌ Save chat failed:', err);
            });
            return;
        }

        // ========================================================================
        // CREATE PROMPT - Open dialog with selected text
        // ========================================================================
        if (info.menuItemId === 'brainbox_create_prompt') {
            chrome.tabs.sendMessage(tab.id, { 
                action: 'openCreatePromptDialog',
                selectedText: info.selectionText 
            }).catch(err => {
                console.error('[DynamicMenus] ❌ Create prompt failed:', err);
            });
            return;
        }

        // ========================================================================
        // SYNC PROMPTS - Force refresh from dashboard
        // ========================================================================
        if (info.menuItemId === 'brainbox_inject_sync') {
            await this.syncManager.sync();
            return;
        }

        // ========================================================================
        // INJECT PROMPT - Insert prompt content into textarea
        // ========================================================================
        if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('brainbox_inject_prompt_')) {
            const promptId = info.menuItemId.replace('brainbox_inject_prompt_', '');
            
            // Fetch content (quick cache lookup)
            const prompt = await this.syncManager.getQuickPrompt(promptId);
            
            if (prompt && prompt.content) {
                this.injectPrompt(tab.id, prompt);
            }
        }
    }

    injectPrompt(tabId: number, prompt: any) {
        // Send message to content script to insert text
        // Must match API expected by apps/extension/src/prompt-inject/prompt-inject.js
        chrome.tabs.sendMessage(tabId, {
            action: 'injectPrompt',
            prompt: prompt
        }).catch(err => {
            console.error('[DynamicMenus] ❌ Injection failed:', err);
            // Fallback?
        });
    }
}
