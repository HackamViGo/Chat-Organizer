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
  updateFolder: (id, updates) => 
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === id ? { ...folder, ...updates } : folder
      ),
    })),
  deleteFolder: (id) => 
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== id),
    })),
  selectFolder: (id) => set({ selectedFolderId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
