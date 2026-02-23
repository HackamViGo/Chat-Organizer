import { create } from 'zustand';
import type { Prompt } from '@brainbox/shared';

interface PromptStore {
  prompts: Prompt[];
  selectedPromptIds: string[];
  isLoading: boolean;
  
  setPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (id: string, prompt: Partial<Prompt>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  togglePromptSelection: (id: string) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
}

export const usePromptStore = create<PromptStore>((set, get) => ({
  prompts: [],
  selectedPromptIds: [],
  isLoading: false,
  
  setPrompts: (prompts) => set({ prompts }),
  addPrompt: (prompt) => set((state) => ({ prompts: [prompt, ...state.prompts] })),
  updatePrompt: async (id, updates) => {
    const previousPrompts = get().prompts;

    // 1. Optimistic Update
    set((state) => ({
      prompts: state.prompts.map((prompt) =>
        prompt.id === id ? { ...prompt, ...updates } : prompt
      ),
    }));

    try {
      // 2. Perform API Request
      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to update prompt');
      }

      const updatedPrompt = await response.json();
      
      // 3. Sync with server
      set((state) => ({
        prompts: state.prompts.map((prompt) =>
          prompt.id === id ? { ...prompt, ...updatedPrompt } : prompt
        ),
      }));
    } catch (error) {
      console.error('Error updating prompt, rolling back:', error);
      // 4. Rollback on failure
      set({ prompts: previousPrompts });
      throw error;
    }
  },
  deletePrompt: async (id) => {
    const previousPrompts = get().prompts;

    // 1. Optimistic Update
    set((state) => ({
      prompts: state.prompts.filter((prompt) => prompt.id !== id),
    }));

    try {
      // 2. Perform API Request
      const response = await fetch(`/api/prompts?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete prompt');
      }
    } catch (error) {
      console.error('Error deleting prompt, rolling back:', error);
      // 3. Rollback on failure
      set({ prompts: previousPrompts });
      throw error;
    }
  },
  togglePromptSelection: (id) => 
    set((state) => ({
      selectedPromptIds: state.selectedPromptIds.includes(id)
        ? state.selectedPromptIds.filter((pId) => pId !== id)
        : [...state.selectedPromptIds, id],
    })),
  clearSelection: () => set({ selectedPromptIds: [] }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
