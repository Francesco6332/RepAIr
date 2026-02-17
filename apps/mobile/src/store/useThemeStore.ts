import { create } from 'zustand';
import { ThemePreset } from '../theme/tokens';

type ThemeState = {
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  preset: 'midnight',
  setPreset: (preset) => set({ preset })
}));
