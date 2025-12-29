import { create } from 'zustand';

interface StoreState {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
}

export const useStore = create<StoreState>((set) => ({
  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
