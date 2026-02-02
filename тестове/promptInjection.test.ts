/**
 * Prompt Injection & Creation Tests
 * 
 * Tests:
 * - Prompt injection into all platforms (ChatGPT, Claude, Gemini)
 * - Prompt creation from selection
 * - Context menu integration
 * - DynamicMenus prompt management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamicMenus } from '../dynamicMenus';
import { resetAllMocks } from '../../__tests__/setup';

// Mock PromptSyncManager
const mockPromptSync = {
  getAllPrompts: vi.fn(),
  getQuickPrompt: vi.fn(),
  sync: vi.fn()
};

vi.mock('@brainbox/shared/logic/promptSync', () => ({
  PromptSyncManager: vi.fn(() => mockPromptSync)
}));

describe('Prompt Injection Tests', () => {
  let dynamicMenus: DynamicMenus;

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    
    mockPromptSync.getAllPrompts.mockResolvedValue([
      { id: '1', title: 'Code Review', content: 'Please review this code', folder_id: null, created_at: new Date().toISOString() },
      { id: '2', title: 'Bug Fix', content: 'Fix this bug', folder_id: 'folder-1', created_at: new Date().toISOString() },
      { id: '3', title: 'Documentation', content: 'Write docs', folder_id: 'folder-1', created_at: new Date().toISOString() }
    ]);

    mockPromptSync.getQuickPrompt.mockImplementation((id) => {
      const prompts: any = {
        '1': { id: '1', title: 'Code Review', content: 'Please review this code' },
        '2': { id: '2', title: 'Bug Fix', content: 'Fix this bug' },
        '3': { id: '3', title: 'Documentation', content: 'Write docs' }
      };
      return Promise.resolve(prompts[id]);
    });

    dynamicMenus = new DynamicMenus(mockPromptSync as any);
  });

  // ========================================================================
  // MENU CREATION
  // ========================================================================

  describe('Context Menu Creation', () => {
    it('should create all required menus', async () => {
      await dynamicMenus.initialize();

      // Wait for async menu creation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify Save Chat menu
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'brainbox_save_chat',
          title: '💾 Save Chat to BrainBox',
          contexts: ['page']
        })
      );

      // Verify Create Prompt menu
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'brainbox_create_prompt',
          title: '📝 Create Prompt from Selection',
          contexts: ['selection']
        })
      );

      // Verify Inject Prompt root menu
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'brainbox_inject_root',
          title: '🧠 Inject Prompt',
          contexts: ['editable']
        })
      );
    });

    it('should create dynamic prompt submenus', async () => {
      await chrome.storage.local.set({
        brainbox_folders_cache: [
          { id: 'folder-1', name: 'Work' }
        ],
        brainbox_user_settings_cache: {
          quickAccessFolders: ['folder-1']
        }
      });

      await dynamicMenus.initialize();
      await dynamicMenus.rebuildMenus();

      // Wait for rebuild
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify folder menu created
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'brainbox_folder_folder-1',
          title: '📂 Work'
        })
      );

      // Verify prompts in folder
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'brainbox_inject_prompt_2',
          parentId: 'brainbox_folder_folder-1',
          title: 'Bug Fix'
        })
      );
    });
  });

  // ========================================================================
  // CHATGPT INJECTION
  // ========================================================================

  describe('ChatGPT Prompt Injection', () => {
    it('should inject prompt into ChatGPT textarea', async () => {
      await chrome.storage.local.set({ accessToken: 'valid-token' });

      const mockTab = { id: 123, url: 'https://chatgpt.com/', windowId: 1 };
      const clickInfo: chrome.contextMenus.OnClickData = {
        menuItemId: 'brainbox_inject_prompt_1',
        editable: true
      };

      await dynamicMenus.handleMenuClick(clickInfo, mockTab as chrome.tabs.Tab);

      // Verify message sent to content script
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          action: 'injectPrompt',
          prompt: expect.objectContaining({
            id: '1',
            content: 'Please review this code'
          })
        })
      );
    });

    it('should require authentication for injection', async () => {
      // No access token
      await chrome.storage.local.clear();

      const mockTab = { id: 123, url: 'https://chatgpt.com/', windowId: 1 };
      const clickInfo: chrome.contextMenus.OnClickData = {
        menuItemId: 'brainbox_inject_prompt_1',
        editable: true
      };

      await dynamicMenus.handleMenuClick(clickInfo, mockTab as chrome.tabs.Tab);

      // Verify login page opened instead
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('/auth/signin')
      });

      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // CLAUDE INJECTION
  // ========================================================================

  describe('Claude Prompt Injection', () => {
    it('should inject prompt into Claude textarea', async () => {
      await chrome.storage.local.set({ accessToken: 'valid-token' });

      const mockTab = { id: 456, url: 'https://claude.ai/chat/new', windowId: 1 };
      const clickInfo: chrome.contextMenus.OnClickData = {
        menuItemId: 'brainbox_inject_prompt_2',
        editable: true
      };

      await dynamicMenus.handleMenuClick(clickInfo, mockTab as chrome.tabs.Tab);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        456,
        expect.objectContaining({
          action: 'injectPrompt',
          prompt: expect.objectContaining({
            id: '2',
            content: 'Fix this bug'
          })
        })
      );
    });
  });

  // ========================================================================
  // GEMINI INJECTION
  // ========================================================================

  describe('Gemini Prompt Injection', () => {
    it('should inject prompt into Gemini textarea', async () => {
      await chrome.storage.local.set({ accessToken: 'valid-token' });

      const mockTab = { id: 789, url: 'https://gemini.google.com/app', windowId: 1 };
      const clickInfo: chrome.contextMenus.OnClickData = {
        menuItemId: 'brainbox_inject_prompt_3',
        editable: true
      };

      await dynamicMenus.handleMenuClick(clickInfo, mockTab as chrome.tabs.Tab);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        789,
        expect.objectContaining({
          action: 'injectPrompt',
          prompt: expect.objectContaining({
            id: '3',
            content: 'Write docs'
          })
        })
      );
    });
  });

  // ========================================================================
  // CREATE PROMPT FROM SELECTION
  // ========================================================================

  describe('Create Prompt from Selection', () => {
    it('should open create dialog with selected text', async () => {
      await chrome.storage.local.set({ accessToken: 'valid-token' });

      const mockTab = { id: 123, url: 'https://chatgpt.com/', windowId: 1 };
      const clickInfo: chrome.contextMenus.OnClickData = {
        menuItemId: 'brainbox_create_prompt',
        selectionText: 'Selected code to save as prompt',
        editable: false
      };

      await dynamicMenus.handleMenuClick(clickInfo, mockTab as chrome.tabs.Tab);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          action: 'openCreatePromptDialog',
          selectedText: 'Selected code to save as prompt'
        })
      );
    });

    it('should require auth for creating prompts', async () => {
      await chrome.storage.local.clear();

      const mockTab = { id: 123, url: 'https://chatgpt.com/', windowId: 1 };
      const clickInfo: chrome.contextMenus.OnClickData = {
        menuItemId: 'brainbox_create_prompt',
        selectionText: 'Text'
      };

      await dynamicMenus.handleMenuClick(clickInfo, mockTab as chrome.tabs.Tab);

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('/auth/signin')
      });
    });
  });

  // ========================================================================
  // SEARCH PROMPTS
  // ========================================================================

  describe('Search Prompts', () => {
    it('should open search overlay', async () => {
      await chrome.storage.local.set({ accessToken: 'valid-token' });

      const mockTab = { id: 123, url: 'https://chatgpt.com/', windowId: 1 };
      const clickInfo: chrome.contextMenus.OnClickData = {
        menuItemId: 'brainbox_inject_search',
        editable: true
      };

      await dynamicMenus.handleMenuClick(clickInfo, mockTab as chrome.tabs.Tab);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          action: 'showPromptMenu',
          mode: 'search'
        })
      );
    });
  });

  // ========================================================================
  // MENU REBUILD ON STORAGE CHANGE
  // ========================================================================

  describe('Dynamic Menu Updates', () => {
    it('should rebuild menus when prompts change', async () => {
      await dynamicMenus.initialize();

      // Clear previous calls
      vi.clearAllMocks();

      // Simulate storage change
      const mockChanges = {
        brainbox_prompts_cache: {
          newValue: [{ id: '4', title: 'New Prompt', content: 'New' }],
          oldValue: []
        }
      };

      // Trigger storage change listener
      const storageListener = (chrome.storage.onChanged.addListener as any).mock.calls[0][0];
      storageListener(mockChanges, 'local');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify removeAll was called
      expect(chrome.contextMenus.removeAll).toHaveBeenCalled();

      // Verify menus recreated
      expect(chrome.contextMenus.create).toHaveBeenCalled();
    });

    it('should not rebuild on unrelated storage changes', async () => {
      await dynamicMenus.initialize();

      vi.clearAllMocks();

      const mockChanges = {
        unrelated_key: { newValue: 'value' }
      };

      const storageListener = (chrome.storage.onChanged.addListener as any).mock.calls[0][0];
      storageListener(mockChanges, 'local');

      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not rebuild
      expect(chrome.contextMenus.removeAll).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  describe('Error Handling', () => {
    it('should handle missing tab gracefully', async () => {
      const clickInfo: chrome.contextMenus.OnClickData = {
        menuItemId: 'brainbox_inject_prompt_1',
        editable: true
      };

      await dynamicMenus.handleMenuClick(clickInfo, undefined);

      // Should not throw, should not send message
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle sendMessage errors', async () => {
      await chrome.storage.local.set({ accessToken: 'valid-token' });

      chrome.tabs.sendMessage = vi.fn().mockRejectedValue(new Error('Tab closed'));

      const mockTab = { id: 123, url: 'https://chatgpt.com/', windowId: 1 };
      const clickInfo: chrome.contextMenus.OnClickData = {
        menuItemId: 'brainbox_inject_prompt_1',
        editable: true
      };

      // Should not throw
      await expect(
        dynamicMenus.handleMenuClick(clickInfo, mockTab as chrome.tabs.Tab)
      ).resolves.not.toThrow();
    });
  });
});
