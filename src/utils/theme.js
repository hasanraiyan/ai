// src/theme.js
import { useColorScheme } from 'react-native';

const light = {
  colors: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    text: '#1E293B',
    subtext: '#64748B',
    accent: '#6366F1',
    accent20: '#6366F120',
    icon: '#6366F1',
    emptyIcon: '#9CA3AF',
    emptyBg: '#F1F5F9',
    fabBg: '#6366F1',
    threadIconBg: '#EEF2FF',
    headerBg: '#FFFFFF',
    headerBorder: '#F1F5F9',
  },
};

const dark = {
  colors: {
    background: '#1E1E1E',
    card: '#2A2A2A',
    border: '#3A3A3A',
    text: '#E5E5E5',
    subtext: '#A3A3A3',
    accent: '#6366F1',
    accent20: '#6366F120',
    icon: '#6366F1',
    emptyIcon: '#6B7280',
    emptyBg: '#2A2A2A',
    fabBg: '#6366F1',
    threadIconBg: '#3B3B5A',
    headerBg: '#2A2A2A',
    headerBorder: '#3A3A3A',
  },
};

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

// spacing scale in px
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// typography scale
export const typography = {
  h1: 20,
  h2: 18,
  body: 14,
  small: 12,
};
