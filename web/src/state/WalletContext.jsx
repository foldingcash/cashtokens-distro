import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { deriveWalletFromWif } from '../lib/wif.js';
import { useSettings } from './SettingsContext.jsx';

const WalletContext = createContext(null);

/**
 * Holds the wallet's derived info (address + signature template) in memory
 * only, for the lifetime of this tab. Nothing here is ever written to
 * localStorage, sessionStorage, cookies, or any request — closing or
 * refreshing the tab discards it completely, and "Forget wallet" discards
 * it on demand. Switching networks in Settings discards it too, since the
 * key was imported (and its address derived) for the previous network.
 */
export function WalletProvider({ children }) {
  const { settings } = useSettings();
  const [wallet, setWallet] = useState(null); // { address, signatureTemplate, pubKeyHex, network }
  const [error, setError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const importWif = useCallback(
    async (wif) => {
      setIsImporting(true);
      setError(null);
      try {
        const derived = await deriveWalletFromWif(wif, settings.network);
        setWallet(derived);
        return derived;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsImporting(false);
      }
    },
    [settings.network],
  );

  const forgetWallet = useCallback(() => {
    setWallet(null);
    setError(null);
  }, []);

  useEffect(() => {
    forgetWallet();
  }, [settings.network, forgetWallet]);

  const value = useMemo(
    () => ({ wallet, error, isImporting, importWif, forgetWallet }),
    [wallet, error, isImporting, importWif, forgetWallet],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
