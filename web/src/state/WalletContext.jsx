import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { deriveWalletFromWif } from '../lib/wif.js';

const WalletContext = createContext(null);

/**
 * Holds the wallet's derived info (address + signature template) in memory
 * only, for the lifetime of this tab. Nothing here is ever written to
 * localStorage, sessionStorage, cookies, or any request — closing or
 * refreshing the tab discards it completely, and "Forget wallet" discards
 * it on demand.
 */
export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null); // { address, signatureTemplate, pubKeyHex }
  const [error, setError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const importWif = useCallback(async (wif) => {
    setIsImporting(true);
    setError(null);
    try {
      const derived = await deriveWalletFromWif(wif);
      setWallet(derived);
      return derived;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const forgetWallet = useCallback(() => {
    setWallet(null);
    setError(null);
  }, []);

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
