import { create } from 'zustand';

interface UIStore {
  isMobileSidebarOpen: boolean;
  isGlobalBrainOpen: boolean;
  
  setMobileSidebarOpen: (isOpen: boolean) => void;
  toggleMobileSidebar: () => void;
  
  setGlobalBrainOpen: (isOpen: boolean) => void;
  toggleGlobalBrain: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isMobileSidebarOpen: false,
  isGlobalBrainOpen: false,

  setMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),

  setGlobalBrainOpen: (isOpen) => set({ isGlobalBrainOpen: isOpen }),
  toggleGlobalBrain: () => set((state) => ({ isGlobalBrainOpen: !state.isGlobalBrainOpen })),
}));
