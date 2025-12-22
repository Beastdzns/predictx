import { create } from 'zustand';

interface NavigationStore {
  selectedBottomNav: string;
  setSelectedBottomNav: (id: string) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  selectedBottomNav: 'explore',
  setSelectedBottomNav: (id) => set({ selectedBottomNav: id }),
}));
