// src/utils/theme.js
import { useColorScheme } from 'react-native';

const light = {
  colors: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    text: '#1E293B',
    subtext: '#64748B',
    accent: '#6366F1',
    accentContrast: '#FFFFFF', // Added
    accent20: '#EEF2FF',
    icon: '#6366F1',
    emptyIcon: '#9CA3AF',
    emptyBg: '#F1F5F9',
    fabBg: '#6366F1',
    fabText: '#FFFFFF',
    imagePlaceholder: '#E2E8F0',
    headerBg: '#FFFFFF',
    headerBorder: '#F1F5F9',
    input: '#F1F5F9',
    toggleBg: '#E5E7EB',
    danger: '#DC2626',
    success: '#16A34A',
  },
};

const dark = {
  colors: {
    background: '#0F172A', // Darker background
    card: '#1E293B', // Darker card
    border: '#334151',
    text: '#F1F5F9',
    subtext: '#94A3B8',
    accent: '#818CF8', // Lighter accent for dark mode
    accentContrast: '#FFFFFF', // Added
    accent20: 'rgba(129, 140, 248, 0.15)',
    icon: '#818CF8',
    emptyIcon: '#64748B',
    emptyBg: '#1E293B',
    fabBg: '#6366F1',
    fabText: '#FFFFFF',
    imagePlaceholder: '#334151',
    headerBg: '#1E293B',
    headerBorder: '#334151',
    input: '#334151',
    toggleBg: '#334151',
    danger: '#F87171',
    success: '#4ADE80',
  },
};


/**
 * A hook to get the current theme object (light or dark).
 * Provides access to all color values for the current mode.
 */
export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

/**
 * A consistent scale for margins, gaps, and other spacing properties.
 * (in pixels)
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

/**
 * A consistent scale for padding properties.
 * Mirrors the spacing scale for uniformity in the design system.
 * (in pixels)
 */
export const padding = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};


/**
 * A consistent scale for typography and font sizes.
 */
export const typography = {
  h1: 20,
  h2: 18,
  body: 14,
  small: 12,
};