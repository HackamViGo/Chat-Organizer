import { create } from 'zustand';
import type { Folder } from '@/types';

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

export const useFolderStore = create<FolderStore>((set) => ({
  folders: [],
  selectedFolderId: null,
  isLoading: false,
  
  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((state) => ({ folders: [folder, ...state.folders] })),
  updateFolder: async (id, updates) => {
    try {
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
      
      set((state) => ({
        folders: state.folders.map((folder) =>
          folder.id === id ? { ...folder, ...updatedFolder } : folder
        ),
      }));
    } catch (error) {
      console.error('Error updating folder:', error);
      // Optimistic update on error
      set((state) => ({
        folders: state.folders.map((folder) =>
          folder.id === id ? { ...folder, ...updates } : folder
        ),
      }));
      throw error;
    }
  },
  deleteFolder: async (id) => {
    try {
      const response = await fetch(`/api/folders?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete folder');
      }

      // Remove from store
      set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting folder:', error);
      // Optimistic delete on error
      set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== id),
      }));
      throw error;
    }
  },
  selectFolder: (id) => set({ selectedFolderId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
