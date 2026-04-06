import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

import { useColorScheme as useSystemColorScheme } from '@/components/useColorScheme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeScheme = 'light' | 'dark';

type ThemeColors = {
  background: string;
  card: string;
  text: string;
  mutedText: string;
  border: string;
  primary: string;
  primaryText: string;
  secondary: string;
  disabled: string;
  dangerBg: string;
  dangerText: string;
};

type AppTheme = {
  preference: ThemePreference;
  scheme: ThemeScheme;
  colors: ThemeColors;
  setPreference: (next: ThemePreference) => void;
  cyclePreference: () => void;
};

const STORAGE_KEY = 'doordrop:themePreference';

const ThemeContext = React.createContext<AppTheme | null>(null);

function getColors(scheme: ThemeScheme): ThemeColors {
  if (scheme === 'dark') {
    return {
      background: '#000000',
      card: 'rgba(255,255,255,0.08)',
      text: '#FFFFFF',
      mutedText: 'rgba(255,255,255,0.7)',
      border: 'rgba(255,255,255,0.18)',
      primary: '#FFFFFF',
      primaryText: '#000000',
      secondary: 'rgba(255,255,255,0.12)',
      disabled: 'rgba(255,255,255,0.15)',
      dangerBg: 'rgba(255,0,0,0.22)',
      dangerText: '#FFB4AB',
    };
  }

  return {
    background: '#FFFFFF',
    card: 'rgba(0,0,0,0.06)',
    text: '#0B0B0C',
    mutedText: 'rgba(0,0,0,0.6)',
    border: 'rgba(0,0,0,0.12)',
    primary: '#0B0B0C',
    primaryText: '#FFFFFF',
    secondary: 'rgba(0,0,0,0.08)',
    disabled: 'rgba(0,0,0,0.15)',
    dangerBg: 'rgba(255,0,0,0.12)',
    dangerText: '#B00020',
  };
}

export function AppThemeProvider(props: { children: React.ReactNode }) {
  const system = (useSystemColorScheme() ?? 'light') as ThemeScheme;
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');

  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') {
        setPreferenceState(v);
      }
    });
  }, []);

  const scheme: ThemeScheme = preference === 'system' ? system : preference;
  const colors = React.useMemo(() => getColors(scheme), [scheme]);

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch((error) => console.error('Failed to save theme preference:', error));
  }, []);

  const cyclePreference = React.useCallback(() => {
    setPreference((preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system') as ThemePreference);
  }, [preference, setPreference]);

  const value = React.useMemo<AppTheme>(
    () => ({
      preference,
      scheme,
      colors,
      setPreference,
      cyclePreference,
    }),
    [colors, preference, scheme, setPreference, cyclePreference]
  );

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const v = React.useContext(ThemeContext);
  if (!v) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return v;
}
