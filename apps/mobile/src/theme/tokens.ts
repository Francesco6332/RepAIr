export type ThemePreset = 'midnight' | 'carbon' | 'sunset';

export const themes = {
  midnight: {
    name: 'Midnight Circuit',
    bg: '#090B12',
    bgAlt: '#111827',
    primary: '#34D399',
    accent: '#22D3EE',
    glass: 'rgba(20, 28, 45, 0.45)',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    warning: '#FBBF24',
    danger: '#F87171'
  },
  carbon: {
    name: 'Carbon Steel',
    bg: '#08090B',
    bgAlt: '#16181D',
    primary: '#60A5FA',
    accent: '#A78BFA',
    glass: 'rgba(34, 40, 52, 0.48)',
    text: '#E5E7EB',
    textMuted: '#9CA3AF',
    warning: '#F59E0B',
    danger: '#FB7185'
  },
  sunset: {
    name: 'Sunset Turbo',
    bg: '#0F0A0A',
    bgAlt: '#1E1414',
    primary: '#FB923C',
    accent: '#F43F5E',
    glass: 'rgba(57, 31, 27, 0.45)',
    text: '#FFF7ED',
    textMuted: '#FDBA74',
    warning: '#FCD34D',
    danger: '#F87171'
  }
} as const;

export type ThemeTokens = (typeof themes)[ThemePreset];
