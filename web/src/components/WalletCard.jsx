import { useState } from 'react';
import { useWallet } from '../state/WalletContext.jsx';
import { truncateAddress } from '../lib/format.js';
import ErrorNotice from './ErrorNotice.jsx';

export default function WalletCard() {
  const { wallet, error, isImporting, importWif, forgetWallet } = useWallet();
  const [wifInput, setWifInput] = useState('');
  const [revealed, setRevealed] = useState(false);

  async function handleImport(e) {
    e.preventDefault();
    try {
      await importWif(wifInput);
      setWifInput(''); // clear the field the moment it's no longer needed
    } catch {
      // error is already surfaced via wallet context state
    }
  }

  if (wallet) {
    return (
      <div className="card wallet-card">
        <div className="wallet-card__row">
          <div>
            <div className="wallet-card__label">Wallet address</div>
            <div className="wallet-card__address" title={wallet.address}>
              {truncateAddress(wallet.address, 20, 10)}
            </div>
          </div>
          <button type="button" className="button button--danger-outline" onClick={forgetWallet}>
            Forget wallet
          </button>
        </div>
        <p className="wallet-card__hint">
          The private key is held in memory only for this browser tab and is never saved to disk. It
          disappears the moment you forget it, close the tab, or refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="card wallet-card">
      <div className="wallet-card__label">Import wallet</div>
      <form onSubmit={handleImport} className="wallet-card__form">
        <div className="wallet-card__input-row">
          <input
            type={revealed ? 'text' : 'password'}
            autoComplete="off"
            spellCheck="false"
            placeholder="Paste your WIF private key"
            value={wifInput}
            onChange={(e) => setWifInput(e.target.value)}
            className="text-input text-input--mono"
          />
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide private key' : 'Show private key'}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        </div>
        <button type="submit" className="button" disabled={isImporting || !wifInput.trim()}>
          {isImporting ? 'Importing…' : 'Import'}
        </button>
      </form>
      <p className="wallet-card__hint">
        Nothing is written to disk, local storage, or any server — the key lives only in this tab's
        memory for as long as it stays open. Only use this on a computer you trust.
      </p>
      <ErrorNotice error={error} />
    </div>
  );
}
