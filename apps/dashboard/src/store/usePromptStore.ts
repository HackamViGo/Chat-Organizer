import type { Prompt } from '@brainbox/shared';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { syncBatchService } from '@/lib/services/sync-batch.service';

export const clearPromptStore = () => {
  usePromptStore.persist.clearStorage();
};

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

export const usePromptStore = create<PromptStore>()(
  persist(
    (set, get) => ({
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
      // 2. Perform Batched API Request
      const updatedPrompt = await syncBatchService.enqueue(
        '/api/prompts', 
        'PUT', 
        JSON.stringify({ id, ...updates }), 
        `update-prompt-${id}`
      );

      // 3. Sync with server
      if (updatedPrompt) {
        set((state) => ({
          prompts: state.prompts.map((prompt) =>
            prompt.id === id ? { ...prompt, ...updatedPrompt } : prompt
          ),
        }));
      }
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
      // 2. Perform Batched API Request
      await syncBatchService.enqueue(
        `/api/prompts?id=${id}`, 
        'DELETE', 
        undefined, 
        `delete-prompt-${id}`
      );
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
    }),
    {
      name: 'brainbox-prompt-store',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({ prompts: state.prompts }),
      version: 1,
      migrate: (persistedState: unknown, _version: number) => {
        return persistedState as PromptStore;
      }
    }
  )
);
