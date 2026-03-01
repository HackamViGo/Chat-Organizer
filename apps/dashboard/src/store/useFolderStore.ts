import type { Folder } from '@brainbox/shared';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { syncBatchService } from '@/lib/services/sync-batch.service';

export const clearFolderStore = () => {
  useFolderStore.persist.clearStorage();
};

interface FolderStore {
  folders: Folder[];
  selectedFolderId: string | null;
  isLoading: boolean;
  
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, folder: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  selectFolder: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useFolderStore = create<FolderStore>()(
  persist(
    (set, get) => ({
  folders: [],
  selectedFolderId: null,
  isLoading: false,
  
  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((state) => ({ folders: [folder, ...state.folders] })),
  updateFolder: async (id, updates) => {
    const previousFolders = get().folders;

    // 1. Optimistic Update
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === id ? { ...folder, ...updates } : folder
      ),
    }));

    try {
      // 2. Perform Batched API Request
      const updatedFolder = await syncBatchService.enqueue(
        '/api/folders', 
        'PUT', 
        JSON.stringify({ id, ...updates }), 
        `update-folder-${id}`
      );

      // 3. Sync with server
      if (updatedFolder) {
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, ...updatedFolder } : folder
          ),
        }));
      }
    } catch (error) {
      console.error('Error updating folder, rolling back:', error);
      // 4. Rollback to previous state on failure
      set({ folders: previousFolders });
      throw error;
    }
  },
  deleteFolder: async (id) => {
    const previousFolders = get().folders;

    // 1. Optimistic Update
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== id),
    }));

    try {
      // 2. Perform Batched API Request
      await syncBatchService.enqueue(
        `/api/folders?id=${id}`, 
        'DELETE', 
        undefined, 
        `delete-folder-${id}`
      );
    } catch (error) {
      console.error('Error deleting folder, rolling back:', error);
      // 3. Rollback on failure
      set({ folders: previousFolders });
      throw error;
    }
  },
  selectFolder: (id) => set({ selectedFolderId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'brainbox-folder-store',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({ folders: state.folders }),
      version: 1,
      migrate: (persistedState: unknown, _version: number) => {
        return persistedState as FolderStore;
      },
    }
  )
);
