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
import { enhancePrompt } from './dashboardApi';
import { CONFIG } from '../../lib/config.js';

// We need a way to message the tab, currently utilizing the service worker's helper or rewriting it here.
// For now, we'll assume we can emit a message or use chrome.tabs.

export class DynamicMenus {
    private syncManager: PromptSyncManager;
    private DEBUG_MODE: boolean = true;

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
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && (changes['brainbox_prompts_cache'] || changes['brainbox_user_settings_cache'] || changes['brainbox_folders_cache'])) {
                if (this.DEBUG_MODE) console.log('[DynamicMenus] 🔄 Data updated, rebuilding menus...');
                this.rebuildMenus();
            }
        });
        
        console.log('[DynamicMenus] 🖱️ Context menus initialized.');
    }

    private isRebuilding = false;
    private needsRebuild = false;

    async rebuildMenus() {
        if (this.isRebuilding) {
            this.needsRebuild = true;
            return;
        }

        this.isRebuilding = true;
        this.needsRebuild = false;

        try {
            // Step 1: Remove ALL existing menus to ensure a clean slate
            // Using removeAll is more efficient and reliable than individual removals
            await new Promise<void>((resolve) => {
                chrome.contextMenus.removeAll(() => {
                    const error = chrome.runtime.lastError;
                    if (error && this.DEBUG_MODE) {
                        console.warn('[DynamicMenus] Context menu removal warning:', error.message);
                    }
                    resolve();
                });
            });

            // ========================================================================
            // 1. SAVE CHAT MENU (contexts: page, on AI platforms)
            // ========================================================================
            const saveChatId = 'brainbox_save_chat';
            chrome.contextMenus.create({
                id: saveChatId,
                title: '💾 Save Chat to BrainBox',
                contexts: ['page'],
                documentUrlPatterns: [
                    // Original platforms
                    'https://chatgpt.com/*',
                    'https://chat.openai.com/*',
                    'https://claude.ai/*',
                    'https://gemini.google.com/*',
                    // New platforms (2026)
                    'https://chat.deepseek.com/*',
                    'https://www.perplexity.ai/*',
                    'https://*.perplexity.ai/*',
                    'https://x.com/i/grok*',
                    'https://grok.com/*',
                    'https://chat.qwen.ai/*',
                    'https://chat.lmsys.org/*',
                    'https://arena.ai/*',
                    'https://lmarena.ai/*'
                ]
            });

            // ========================================================================
            // 2. CREATE PROMPT MENU (contexts: selection, anywhere)
            // ========================================================================
            const createPromptId = 'brainbox_create_prompt';
            chrome.contextMenus.create({
                id: createPromptId,
                title: '📝 Create Prompt from Selection',
                contexts: ['selection']
            });

            // Enhance Selection (context: selection + editable)
            const enhanceId = 'brainbox_enhance_selection';
            chrome.contextMenus.create({
                id: enhanceId,
                title: '✨ AI Enhance Selection',
                contexts: ['selection', 'editable']
            });

            // ========================================================================
            // 3. INJECT PROMPTS MENU (contexts: editable, in textareas)
            // ========================================================================
            const injectRootId = 'brainbox_inject_root';
            chrome.contextMenus.create({
                id: injectRootId,
                title: '🧠 Inject Prompt',
                contexts: ['editable']
            });

            // 1. Search Action
            const searchId = 'brainbox_inject_search';
            chrome.contextMenus.create({
                id: searchId,
                parentId: injectRootId,
                title: '🔍 Search Prompts...',
                contexts: ['editable']
            });

            chrome.contextMenus.create({
                id: 'brainbox_inject_sep_1',
                parentId: injectRootId,
                type: 'separator',
                contexts: ['editable']
            });

            // Get data from cache
            const prompts = await this.syncManager.getAllPrompts();
            const { brainbox_user_settings_cache: settings } = await chrome.storage.local.get(['brainbox_user_settings_cache']);
            const { brainbox_folders_cache: folders } = await chrome.storage.local.get(['brainbox_folders_cache']);

            const quickAccessFolderIds = (settings?.quickAccessFolders || []).slice(0, 3);
            
            // ========================================================================
            // 📂 SECTION: FOLDERS (Selected by user)
            // ========================================================================
            if (quickAccessFolderIds.length > 0 && folders) {
                quickAccessFolderIds.forEach((folderId: string) => {
                    const folder = folders.find((f: any) => f.id === folderId);
                    if (folder) {
                        const folderMenuId = `brainbox_folder_${folder.id}`;
                        chrome.contextMenus.create({
                            id: folderMenuId,
                            parentId: injectRootId,
                            title: `📂 ${folder.name}`,
                            contexts: ['editable']
                        });

                        // Prompts in this folder
                        const folderPrompts = prompts.filter(p => p.folder_id === folder.id).slice(0, 7);
                        if (folderPrompts.length > 0) {
                            folderPrompts.forEach(prompt => {
                                chrome.contextMenus.create({
                                    id: `brainbox_inject_prompt_${prompt.id}`,
                                    parentId: folderMenuId,
                                    title: prompt.title || 'Untitled',
                                    contexts: ['editable']
                                });
                            });
                        } else {
                            chrome.contextMenus.create({
                                id: `brainbox_folder_empty_${folder.id}`,
                                parentId: folderMenuId,
                                title: '(Empty folder)',
                                contexts: ['editable'],
                                enabled: false
                            });
                        }
                    }
                });

                chrome.contextMenus.create({
                    id: 'brainbox_inject_sep_2',
                    parentId: injectRootId,
                    type: 'separator',
                    contexts: ['editable']
                });
            }


            // ========================================================================
            // ⚡ SECTION: QUICK (Last 7 prompts in submenu)
            // ========================================================================
            const quickPrompts = [...prompts]
                .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
                .slice(0, 7);

            if (quickPrompts.length > 0) {
                // Create "Quick" submenu
                const quickMenuId = 'brainbox_quick_submenu';
                chrome.contextMenus.create({
                    id: quickMenuId,
                    parentId: injectRootId,
                    title: '⚡ Quick',
                    contexts: ['editable']
                });

                // Add prompts inside "Quick" submenu
                quickPrompts.forEach(prompt => {
                    chrome.contextMenus.create({
                        id: `brainbox_inject_prompt_quick_${prompt.id}`,
                        parentId: quickMenuId, // Inside Quick submenu
                        title: prompt.title || 'Untitled',
                        contexts: ['editable']
                    });
                });
            } else if (!prompts || prompts.length === 0) {
                chrome.contextMenus.create({
                    id: 'brainbox_inject_empty',
                    parentId: injectRootId,
                    title: '(No prompts synced)',
                    contexts: ['editable'],
                    enabled: false
                });
            }


            if (this.DEBUG_MODE) console.log('[DynamicMenus] ✅ All context menus created');

        } catch (error) {
            console.error('[DynamicMenus] ❌ Failed to rebuild menus:', error);
        } finally {
            this.isRebuilding = false;
            // If another request came in while we were busy, rebuild again
            if (this.needsRebuild) {
                this.rebuildMenus();
            }
        }
    }


    async handleMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
        if (!tab || !tab.id) return;

        // Check login state for protected actions
        const protectedActions = ['brainbox_save_chat', 'brainbox_create_prompt', 'brainbox_enhance_selection', 'brainbox_inject_search'];
        const isProtected = protectedActions.includes(info.menuItemId as string) || 
                           (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('brainbox_inject_prompt_'));

        if (isProtected) {
            const { accessToken } = await chrome.storage.local.get(['accessToken']);
            if (!accessToken) {
                if (this.DEBUG_MODE) console.warn('[DynamicMenus] ⛔ User not logged in, redirecting...');
                chrome.tabs.create({ url: `${CONFIG.API_BASE_URL}/auth/signin?redirect=/extension-auth` });
                return;
            }
        }

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
        // ENHANCE SELECTION - Improve text using AI
        // ========================================================================
        if (info.menuItemId === 'brainbox_enhance_selection') {
            const selectedText = info.selectionText;
            if (!selectedText) return;

            try {
                // Show loading toast in the active tab
                chrome.tabs.sendMessage(tab.id, { 
                    action: 'showNotification', 
                    message: '✨ Enhancing selection...', 
                    type: 'info',
                    duration: 0 // Persist until we manually remove or update
                });

                const enhanced = await enhancePrompt(selectedText);

                // Send the result to the content script for injection
                chrome.tabs.sendMessage(tab.id, {
                    action: 'injectPrompt',
                    prompt: { content: enhanced }
                });

                // Standard notifications handle the "Success" part if needed, 
                // but we definitely want to clear the loading one
            } catch (err) {
                console.error('[DynamicMenus] ❌ Enhance failed:', err);
                chrome.tabs.sendMessage(tab.id, { 
                    action: 'showNotification', 
                    message: '❌ Failed to enhance selection.', 
                    type: 'error' 
                });
            }
            return;
        }

        // ========================================================================
        // SYNC PROMPTS - Force refresh from dashboard
        // ========================================================================
        // ========================================================================
        // SEARCH PROMPTS - Open search overlay
        // ========================================================================
        if (info.menuItemId === 'brainbox_inject_search') {
            chrome.tabs.sendMessage(tab.id, { 
                action: 'showPromptMenu',
                mode: 'search' 
            }).catch(err => {
                console.error('[DynamicMenus] ❌ Search failed:', err);
            });
            return;
        }

        // ========================================================================
        // INJECT PROMPT - Insert prompt content into textarea
        // ========================================================================
        if (typeof info.menuItemId === 'string' && 
            (info.menuItemId.startsWith('brainbox_inject_prompt_') || info.menuItemId.startsWith('brainbox_inject_prompt_quick_'))) {
            
            const promptId = info.menuItemId
                .replace('brainbox_inject_prompt_quick_', '')
                .replace('brainbox_inject_prompt_', '');
            
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
