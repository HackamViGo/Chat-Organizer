import { create } from 'zustand';
import type { Chat } from '@/types';

interface ChatStore {
  chats: Chat[];
  selectedChatId: string | null;
  isLoading: boolean;
  
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (id: string, chat: Partial<Chat>) => void;
  deleteChat: (id: string) => void;
  selectChat: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  selectedChatId: null,
  isLoading: false,
  
  setChats: (chats) => set({ chats }),
  addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),
  updateChat: (id, updates) => 
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === id ? { ...chat, ...updates } : chat
      ),
    })),
  deleteChat: (id) => 
    set((state) => ({
      chats: state.chats.filter((chat) => chat.id !== id),
    })),
  selectChat: (id) => set({ selectedChatId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
