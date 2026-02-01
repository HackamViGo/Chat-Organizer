import { useState, useEffect } from 'react';

interface ModuleState {
  chats: boolean;
  prompts: boolean;
}

export function useModules() {
  const [modules, setModules] = useState<ModuleState>({
    chats: true,
    prompts: true,
  });

  useEffect(() => {
    // Load module state from storage
    chrome.storage.local.get(['modulesEnabled'], (result) => {
      if (result.modulesEnabled) {
        setModules(result.modulesEnabled);
      }
    });
  }, []);

  const toggleChats = () => {
    setModules((prev) => {
      const newState = { ...prev, chats: !prev.chats };
      chrome.storage.local.set({ modulesEnabled: newState });
      // Notify background to update context menus
      chrome.runtime.sendMessage({ 
        action: 'updateModuleState', 
        modules: newState 
      }).catch(() => {});
      return newState;
    });
  };

  const togglePrompts = () => {
    setModules((prev) => {
      const newState = { ...prev, prompts: !prev.prompts };
      chrome.storage.local.set({ modulesEnabled: newState });
      // Notify background to update context menus
      chrome.runtime.sendMessage({ 
        action: 'updateModuleState', 
        modules: newState 
      }).catch(() => {});
      return newState;
    });
  };

  return { modules, toggleChats, togglePrompts };
}
