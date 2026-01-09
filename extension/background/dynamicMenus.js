// BrainBox - Dynamic Context Menus
// 2x3 Menu Structure: Chat submenu (3 items) + Prompts submenu (6 items)

export class SimpleDynamicMenus {
  static async init() {
    await this.createChatSubmenu();
    await this.createPromptSubmenu();
  }

  static async createChatSubmenu() {
    // Chat submenu (3 items)
    chrome.contextMenus.create({
      id: 'chat_menu_root',
      title: '📱 Chats',
      contexts: ['all']
    });
    
    ['Add Tag...', 'Sync Now', 'Search Chats'].forEach((title, i) => {
      chrome.contextMenus.create({
        id: `chat_${i}`,
        parentId: 'chat_menu_root',
        title,
        contexts: ['page']
      });
    });
  }

  static async createPromptSubmenu() {
    // Prompts submenu (3 recent + 3 static = 6 items)
    chrome.contextMenus.create({
      id: 'prompt_menu_root',
      title: '💡 Prompts',
      contexts: ['all', 'editable']
    });
    
    // 3 Static actions
    ['✨ Insert Prompt', '📝 Quick Prompt', '🎯 Suggest'].forEach((title, i) => {
      chrome.contextMenus.create({
        id: `prompt_static_${i}`,
        parentId: 'prompt_menu_root',
        title,
        contexts: ['editable']
      });
    });
    
    // Add separator
    chrome.contextMenus.create({
      id: 'prompt_separator',
      parentId: 'prompt_menu_root',
      type: 'separator',
      contexts: ['editable']
    });
    
    // 3 Dynamic Recent prompts - will be updated from storage
    await this.updateRecentPrompts();
    
    // Add sync button
    chrome.contextMenus.create({
      id: 'sync_prompts',
      parentId: 'prompt_menu_root',
      title: '🔄 Sync Prompts Now',
      contexts: ['editable']
    });
  }

  static async updateRecentPrompts() {
    // Remove old recent prompts
    for (let i = 0; i < 3; i++) {
      try {
        await chrome.contextMenus.remove(`prompt_recent_${i}`);
      } catch (e) {
        // Item doesn't exist yet
      }
    }
    
    // Get recent prompts from storage
    const { local_prompts } = await chrome.storage.local.get('local_prompts');
    const recentPrompts = local_prompts || [];
    
    // Add up to 3 recent prompts
    const promptsToShow = recentPrompts.slice(0, 3);
    if (promptsToShow.length === 0) {
      // Show placeholder prompts
      ['📄 "Fix code"', '📄 "React comp"', '📄 "Debug CSS"'].forEach((title, i) => {
        chrome.contextMenus.create({
          id: `prompt_recent_${i}`,
          parentId: 'prompt_menu_root',
          title,
          contexts: ['editable']
        });
      });
    } else {
      promptsToShow.forEach((prompt, i) => {
        const title = `📄 "${prompt.name || prompt.content?.substring(0, 20)}"`;
        chrome.contextMenus.create({
          id: `prompt_recent_${i}`,
          parentId: 'prompt_menu_root',
          title,
          contexts: ['editable']
        });
      });
    }
  }
}
