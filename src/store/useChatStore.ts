import { create } from 'zustand';
import type { Chat } from '@/types';

interface ChatStore {
  chats: Chat[];
  selectedChatId: string | null;
  selectedChatIds: Set<string>;
  isLoading: boolean;
  
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (id: string, chat: Partial<Chat>) => void;
  deleteChat: (id: string) => Promise<void>;
  deleteChats: (ids: string[]) => Promise<void>;
  toggleChatSelection: (id: string) => void;
  selectAllChats: () => void;
  deselectAllChats: () => void;
  selectChat: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  selectedChatId: null,
  selectedChatIds: new Set<string>(),
  isLoading: false,
  
  setChats: (chats) => set({ chats }),
  addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),
  updateChat: (id, updates) => 
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === id ? { ...chat, ...updates } : chat
      ),
    })),
  deleteChat: async (id: string) => {
    try {
      const response = await fetch(`/api/chats?ids=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      set((state) => {
        const newSelectedIds = new Set(state.selectedChatIds);
        newSelectedIds.delete(id);
        return {
          chats: state.chats.filter((chat) => chat.id !== id),
          selectedChatIds: newSelectedIds,
        };
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  },
  deleteChats: async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      const response = await fetch(`/api/chats?ids=${ids.join(',')}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chats');
      }

      set((state) => {
        const idsSet = new Set(ids);
        const newSelectedIds = new Set(state.selectedChatIds);
        ids.forEach(id => newSelectedIds.delete(id));
        return {
          chats: state.chats.filter((chat) => !idsSet.has(chat.id)),
          selectedChatIds: newSelectedIds,
        };
      });
    } catch (error) {
      console.error('Error deleting chats:', error);
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
}));
