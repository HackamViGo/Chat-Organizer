import type { Chat } from '@brainbox/shared';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { syncBatchService } from '@/lib/services/sync-batch.service';

export const clearChatStore = () => {
  useChatStore.persist.clearStorage();
};

interface ChatStore {
  chats: Chat[];
  selectedChatId: string | null;
  selectedChatIds: Set<string>;
  isLoading: boolean;
  
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (id: string, chat: Partial<Chat>) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  deleteChats: (ids: string[]) => Promise<void>;
  toggleChatSelection: (id: string) => void;
  selectAllChats: () => void;
  deselectAllChats: () => void;
  selectChat: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
  chats: [],
  selectedChatId: null,
  selectedChatIds: new Set<string>(),
  isLoading: false,
  
  setChats: (chats) => set({ chats }),
  addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),
  updateChat: async (id, updates) => {
    const previousChats = get().chats; // 1. Save current state
    
    // 2. Optimistic Update (Apply immediately to UI)
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === id ? { ...chat, ...updates } : chat
      ),
    }));

    try {
      // 3. Perform Batched API Request
      const updatedChat = await syncBatchService.enqueue(
        '/api/chats', 
        'PUT', 
        JSON.stringify({ id, ...updates }), 
        `update-chat-${id}`
      );
      
      // 4. Sync with server response (optional, for exact DB timestamps)
      if (updatedChat) {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id ? { ...chat, ...updatedChat } : chat
          ),
        }));
      }
    } catch (error) {
      console.error('Error updating chat, rolling back:', error);
      // 5. Rollback to previous state on failure!
      set({ chats: previousChats });
      throw error;
    }
  },
  deleteChat: async (id: string) => {
    const previousChats = get().chats;
    const previousSelectedIds = new Set(get().selectedChatIds);

    // 1. Optimistic Update
    set((state) => {
      const newSelectedIds = new Set(state.selectedChatIds);
      newSelectedIds.delete(id);
      return {
        chats: state.chats.filter((chat) => chat.id !== id),
        selectedChatIds: newSelectedIds,
      };
    });

    try {
      // 2. Perform Batched API Request
      await syncBatchService.enqueue(
        `/api/chats?ids=${id}`, 
        'DELETE', 
        undefined, 
        `delete-chat-${id}`
      );
    } catch (error) {
      console.error('Error deleting chat, rolling back:', error);
      // 3. Rollback on failure
      set({ 
        chats: previousChats,
        selectedChatIds: previousSelectedIds 
      });
      throw error;
    }
  },
  deleteChats: async (ids: string[]) => {
    if (ids.length === 0) return;

    const previousChats = get().chats;
    const previousSelectedIds = new Set(get().selectedChatIds);

    // 1. Optimistic Update
    set((state) => {
      const idsSet = new Set(ids);
      const newSelectedIds = new Set(state.selectedChatIds);
      ids.forEach(id => newSelectedIds.delete(id));
      return {
        chats: state.chats.filter((chat) => !idsSet.has(chat.id)),
        selectedChatIds: newSelectedIds,
      };
    });

    try {
      // 2. Perform Batched API Request
      await syncBatchService.enqueue(
        `/api/chats?ids=${ids.join(',')}`, 
        'DELETE', 
        undefined, 
        `delete-chats-${ids.join(',')}`
      );
    } catch (error) {
      console.error('Error deleting chats, rolling back:', error);
      // 3. Rollback on failure
      set({ 
        chats: previousChats,
        selectedChatIds: previousSelectedIds 
      });
      throw error;
    }
  },
  toggleChatSelection: (id: string) => 
    set((state) => {
      const newSelectedIds = new Set(state.selectedChatIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      return { selectedChatIds: newSelectedIds };
    }),
  selectAllChats: () => 
    set((state) => ({
      selectedChatIds: new Set(state.chats.map(chat => chat.id)),
    })),
  deselectAllChats: () => 
    set({ selectedChatIds: new Set<string>() }),
  selectChat: (id) => set({ selectedChatId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'brainbox-chat-store',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({ chats: state.chats }),
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // Add any migration logic from version 0 to version 1 if needed
        }
        return persistedState as ChatStore;
      },
    }
  )
);
