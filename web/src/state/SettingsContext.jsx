import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DISTRO_API, DEFAULT_REPORT_AMOUNT, DEFAULT_TOKEN_DECIMALS, NETWORK } from '../config.js';
import { isSupportedNetwork } from '../lib/network.js';

const STORAGE_KEY = 'cashtokens-distro:settings';

/** Defaults come from config.js (and so from .env.local), except the time zone, which defaults to UTC. */
export const DEFAULT_SETTINGS = {
  apiUrl: DISTRO_API,
  timeZone: 'UTC', // 'UTC' | 'local'
  reportAmount: DEFAULT_REPORT_AMOUNT,
  network: NETWORK,
  tokenDecimals: DEFAULT_TOKEN_DECIMALS,
};

const SettingsContext = createContext(null);

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const settings = { ...DEFAULT_SETTINGS, ...(stored && typeof stored === 'object' ? stored : {}) };
    if (!isSupportedNetwork(settings.network)) settings.network = DEFAULT_SETTINGS.network;
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); settings still apply for this tab.
  }
}

/**
 * User-adjustable app settings, persisted to localStorage so they survive a
 * refresh. Unlike the wallet, nothing here is sensitive.
 */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  const updateSettings = useCallback((next) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
