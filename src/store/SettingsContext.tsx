import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../theme/Theme';

export type ThemeMode = 'system' | 'light' | 'dark';
export type CurrencySymbol = '₹' | '$' | '€' | '£';

interface SettingsContextType {
  mode: ThemeMode;
  isDark: boolean;
  theme: ReturnType<typeof getTheme>;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
  
  currency: CurrencySymbol;
  setCurrency: (currency: CurrencySymbol) => void;
  
  incomeModeEnabled: boolean;
  setIncomeModeEnabled: (enabled: boolean) => void;
  
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;

  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = '@app_settings';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [currency, setCurrencyState] = useState<CurrencySymbol>('₹');
  const [incomeModeEnabled, setIncomeModeEnabledState] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.mode) setModeState(parsed.mode);
          if (parsed.currency) setCurrencyState(parsed.currency);
          if (parsed.incomeModeEnabled !== undefined) setIncomeModeEnabledState(parsed.incomeModeEnabled);
          if (parsed.hasCompletedOnboarding !== undefined) setHasCompletedOnboardingState(parsed.hasCompletedOnboarding);
        }
        
        // Migrate old theme storage if present
        const oldTheme = await AsyncStorage.getItem('@app_theme_mode');
        if (oldTheme && !stored) {
          setModeState(oldTheme as ThemeMode);
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (updates: Partial<{ mode: ThemeMode, currency: CurrencySymbol, incomeModeEnabled: boolean, hasCompletedOnboarding: boolean }>) => {
    try {
      const current = { mode, currency, incomeModeEnabled, hasCompletedOnboarding };
      const next = { ...current, ...updates };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await saveSettings({ mode: newMode });
  };

  const cycleMode = async () => {
    const nextMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    await setMode(nextMode);
  };

  const setCurrency = async (newCurrency: CurrencySymbol) => {
    setCurrencyState(newCurrency);
    await saveSettings({ currency: newCurrency });
  };

  const setIncomeModeEnabled = async (enabled: boolean) => {
    setIncomeModeEnabledState(enabled);
    await saveSettings({ incomeModeEnabled: enabled });
  };

  const setHasCompletedOnboarding = async (completed: boolean) => {
    setHasCompletedOnboardingState(completed);
    await saveSettings({ hasCompletedOnboarding: completed });
  };

  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const theme = getTheme(isDark);

  return (
    <SettingsContext.Provider value={{ 
      mode, isDark, theme, setMode, cycleMode,
      currency, setCurrency,
      incomeModeEnabled, setIncomeModeEnabled,
      hasCompletedOnboarding, setHasCompletedOnboarding,
      isLoading
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Aliased for backwards compatibility during refactor
export const useAppTheme = useSettings;
