import { create } from 'zustand';
import type { Folder } from '@brainbox/shared';

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

export const useFolderStore = create<FolderStore>((set, get) => ({
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
      // 2. Perform API Request
      const response = await fetch('/api/folders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to update folder');
      }

      const updatedFolder = await response.json();
      
      // 3. Sync with server
      set((state) => ({
        folders: state.folders.map((folder) =>
          folder.id === id ? { ...folder, ...updatedFolder } : folder
        ),
      }));
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
      // 2. Perform API Request
      const response = await fetch(`/api/folders?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder, rolling back:', error);
      // 3. Rollback on failure
      set({ folders: previousFolders });
      throw error;
    }
  },
  selectFolder: (id) => set({ selectedFolderId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
