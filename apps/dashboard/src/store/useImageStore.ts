import type { Image, UploadItem } from '@brainbox/shared';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { createClient } from '@/lib/supabase/client';

export const clearImageStore = () => {
  useImageStore.persist.clearStorage();
};

interface ImageStore {
  images: Image[];
  selectedImageIds: Set<string>;
  isLoading: boolean;
  uploadQueue: UploadItem[];
  
  setImages: (images: Image[]) => void;
  addImage: (image: Image) => void;
  updateImage: (id: string, updates: Partial<Image>) => void;
  deleteImage: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  
  // Bulk operations
  toggleImageSelection: (id: string) => void;
  selectAllImages: (imageIds: string[]) => void;
  clearSelection: () => void;
  
  // Upload queue
  addToUploadQueue: (item: UploadItem) => void;
  updateUploadProgress: (id: string, progress: number, status?: UploadItem['status'], error?: string) => void;
  removeFromUploadQueue: (id: string) => void;
  
  // Supabase integration
  fetchImages: (userId: string, folderId?: string) => Promise<void>;
  deleteImages: (imageIds: string[]) => Promise<void>;
  moveImages: (imageIds: string[], folderId: string | null) => Promise<void>;
}

export const useImageStore = create<ImageStore>()(
  persist(
    (set, _get) => ({
  images: [],
  selectedImageIds: new Set(),
  isLoading: false,
  uploadQueue: [],
  
  setImages: (images) => set({ images }),
  
  addImage: (image) => set((state) => ({ 
    images: [image, ...state.images] 
  })),

  updateImage: (id, updates) => set((state) => ({
    images: state.images.map((img) => img.id === id ? { ...img, ...updates } : img)
  })),
  
  deleteImage: (id) => set((state) => ({ 
    images: state.images.filter((img) => img.id !== id),
    selectedImageIds: new Set(Array.from(state.selectedImageIds).filter(sid => sid !== id))
  })),
  
  setLoading: (isLoading) => set({ isLoading }),

  // Bulk operations
  toggleImageSelection: (id) => set((state) => {
    const newSelection = new Set(state.selectedImageIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    return { selectedImageIds: newSelection };
  }),

  selectAllImages: (imageIds) => set({ selectedImageIds: new Set(imageIds) }),
  
  clearSelection: () => set({ selectedImageIds: new Set() }),

  // Upload queue
  addToUploadQueue: (item) => set((state) => ({
    uploadQueue: [item, ...state.uploadQueue]
  })),

  updateUploadProgress: (id, progress, status, error) => set((state) => ({
    uploadQueue: state.uploadQueue.map((item) => 
      item.id === id ? { ...item, progress, ...(status && { status }), ...(error && { error }) } : item
    )
  })),

  removeFromUploadQueue: (id) => set((state) => ({
    uploadQueue: state.uploadQueue.filter((item) => item.id !== id)
  })),

  // Supabase integration
  fetchImages: async (userId, folderId) => {
    set({ isLoading: true });
    const supabase = createClient() as any;
    let query = supabase
      .from('images')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    const { data, error } = await query;
    if (!error && data) {
      set({ images: data as Image[] });
    }
    set({ isLoading: false });
  },

  deleteImages: async (imageIds) => {
    const supabase = createClient() as any;
    
    // 1. Get paths for storage deletion
    const { data: imagesToDelete } = await supabase
      .from('images')
      .select('path')
      .in('id', imageIds);
    
    if (imagesToDelete && imagesToDelete.length > 0) {
      const paths = imagesToDelete.map((img: any) => img.path);
      await supabase.storage.from('images').remove(paths);
    }

    // 2. Delete from DB
    const { error } = await supabase
      .from('images')
      .delete()
      .in('id', imageIds);
    
    if (!error) {
      set((state) => ({
        images: state.images.filter((img) => !imageIds.includes(img.id)),
        selectedImageIds: new Set(Array.from(state.selectedImageIds).filter(id => !imageIds.includes(id)))
      }));
    }
  },

  moveImages: async (imageIds, folderId) => {
    const supabase = createClient() as any;
    const { error } = await supabase
      .from('images')
      .update({ folder_id: folderId })
      .in('id', imageIds);
    
    if (error) {
      console.error('moveImages error:', error);
      throw error;
    }
    
    set((state) => ({
      images: state.images.map((img) => 
        imageIds.includes(img.id) ? { ...img, folder_id: folderId } : img
      )
    }));
  }
    }),
    {
      name: 'brainbox-image-store',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({ images: state.images }),
      version: 1,
      migrate: (persistedState: unknown, _version: number) => {
        return persistedState as ImageStore;
      },
    }
  )
);
