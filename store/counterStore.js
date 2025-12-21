import { create } from 'zustand';

// Дефинирайте вашето Zustand хранилище
const useCounterStore = create((set) => ({
  count: 0, // Начално състояние
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }), // Нулиране на брояча
}));

export default useCounterStore;
