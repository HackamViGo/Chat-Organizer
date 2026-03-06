import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIStore {
  isMobileSidebarOpen: boolean
  isGlobalBrainOpen: boolean
  activeModel: string

  setMobileSidebarOpen: (isOpen: boolean) => void
  toggleMobileSidebar: () => void

  setGlobalBrainOpen: (isOpen: boolean) => void
  toggleGlobalBrain: () => void

  setActiveModel: (model: string) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      isMobileSidebarOpen: false,
      isGlobalBrainOpen: false,
      activeModel: 'chatgpt',

      setMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
      toggleMobileSidebar: () =>
        set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),

      setGlobalBrainOpen: (isOpen) => set({ isGlobalBrainOpen: isOpen }),
      toggleGlobalBrain: () => set((state) => ({ isGlobalBrainOpen: !state.isGlobalBrainOpen })),

      setActiveModel: (model) => set({ activeModel: model }),
    }),
    {
      name: 'brainbox-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeModel: state.activeModel }),
    }
  )
)
