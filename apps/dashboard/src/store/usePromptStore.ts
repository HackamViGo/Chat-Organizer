import { create } from 'zustand';
import type { Prompt } from '@/types';

interface PromptStore {
  prompts: Prompt[];
  selectedPromptIds: string[];
  isLoading: boolean;
  
  setPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (id: string, prompt: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;
  togglePromptSelection: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const usePromptStore = create<PromptStore>((set) => ({
  prompts: [],
  selectedPromptIds: [],
  isLoading: false,
  
  setPrompts: (prompts) => set({ prompts }),
  addPrompt: (prompt) => set((state) => ({ prompts: [prompt, ...state.prompts] })),
  updatePrompt: async (id, updates) => {
    try {
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
      
      set((state) => ({
        prompts: state.prompts.map((prompt) =>
          prompt.id === id ? { ...prompt, ...updatedPrompt } : prompt
        ),
      }));
    } catch (error) {
      console.error('Error updating prompt:', error);
      // Optimistic update on error
      set((state) => ({
        prompts: state.prompts.map((prompt) =>
          prompt.id === id ? { ...prompt, ...updates } : prompt
        ),
      }));
      throw error;
    }
  },
  deletePrompt: (id) => 
    set((state) => ({
      prompts: state.prompts.filter((prompt) => prompt.id !== id),
    })),
  togglePromptSelection: (id) => 
    set((state) => ({
      selectedPromptIds: state.selectedPromptIds.includes(id)
        ? state.selectedPromptIds.filter((pId) => pId !== id)
        : [...state.selectedPromptIds, id],
    })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
