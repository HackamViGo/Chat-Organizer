import { create } from 'zustand';
import type { ListWithItems, ListItem } from '@/types';

interface ListStore {
  lists: ListWithItems[];
  selectedListId: string | null;
  isLoading: boolean;
  
  // List CRUD
  setLists: (lists: ListWithItems[]) => void;
  addList: (list: ListWithItems) => void;
  updateList: (id: string, updates: Partial<ListWithItems>) => void;
  deleteList: (id: string) => void;
  selectList: (id: string | null) => void;
  
  // Item CRUD (optimistic updates)
  addItemToList: (listId: string, item: ListItem) => void;
  updateItemInList: (listId: string, itemId: string, updates: Partial<ListItem>) => void;
  deleteItemFromList: (listId: string, itemId: string) => void;
  
  setLoading: (loading: boolean) => void;
}

export const useListStore = create<ListStore>((set) => ({
  lists: [],
  selectedListId: null,
  isLoading: false,
  
  setLists: (lists) => set({ lists }),
  addList: (list) => set((state) => ({ lists: [list, ...state.lists] })),
  updateList: (id, updates) => 
    set((state) => ({
      lists: state.lists.map((list) =>
        list.id === id ? { ...list, ...updates } : list
      ),
    })),
  deleteList: (id) => 
    set((state) => ({
      lists: state.lists.filter((list) => list.id !== id),
    })),
  selectList: (id) => set({ selectedListId: id }),
  
  addItemToList: (listId, item) =>
    set((state) => ({
      lists: state.lists.map((list) =>
        list.id === listId 
          ? { ...list, items: [...list.items, item] }
          : list
      ),
    })),
  
  updateItemInList: (listId, itemId, updates) =>
    set((state) => ({
      lists: state.lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }
          : list
      ),
    })),
  
  deleteItemFromList: (listId, itemId) =>
    set((state) => ({
      lists: state.lists.map((list) =>
        list.id === listId
          ? { ...list, items: list.items.filter((item) => item.id !== itemId) }
          : list
      ),
    })),
  
  setLoading: (loading) => set({ isLoading: loading }),
}));
