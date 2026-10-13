import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, useSettings } from '../state/SettingsContext.jsx';
import { SUPPORTED_NETWORKS } from '../lib/network.js';

/** Returns the URL normalized with a trailing slash, or null if it isn't a valid http(s) URL. */
function normalizeApiUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // GetDistro is resolved relative to this URL, so it must end in a slash to keep its path.
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url.toString();
  } catch {
    return null;
  }
}

/** Edits app settings. Changes only apply when saved; Cancel, the backdrop, or Escape discard them. */
export default function SettingsDialog({ open, onClose }) {
  const { settings, updateSettings } = useSettings();
  const [draft, setDraft] = useState(settings);
  const [validationError, setValidationError] = useState(null);

  // Start from the saved settings each time the dialog opens.
  useEffect(() => {
    if (open) {
      setDraft({
        ...settings,
        reportAmount: String(settings.reportAmount),
        tokenDecimals: String(settings.tokenDecimals),
      });
      setValidationError(null);
    }
  }, [open, settings]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const setField = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    const apiUrl = normalizeApiUrl(draft.apiUrl);
    if (!apiUrl) {
      setValidationError('Enter a valid http(s) URL for the distribution API.');
      return;
    }
    const reportAmount = Number(draft.reportAmount);
    if (!Number.isInteger(reportAmount) || reportAmount <= 0) {
      setValidationError('The report reference amount must be a whole number greater than 0.');
      return;
    }
    const tokenDecimals = Number(draft.tokenDecimals);
    if (!Number.isInteger(tokenDecimals) || tokenDecimals < 0 || tokenDecimals > 18) {
      setValidationError('Token decimals must be a whole number from 0 to 18.');
      return;
    }
    updateSettings({ ...draft, apiUrl, reportAmount, tokenDecimals });
    onClose();
  }

  function handleReset() {
    setDraft({
      ...DEFAULT_SETTINGS,
      reportAmount: String(DEFAULT_SETTINGS.reportAmount),
      tokenDecimals: String(DEFAULT_SETTINGS.tokenDecimals),
    });
    setValidationError(null);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <form
        className="modal settings-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="settings-title">Settings</h2>

        <label className="field">
          <span>Distribution API URL</span>
          <input type="url" value={draft.apiUrl} onChange={setField('apiUrl')} required />
          <span className="field-hint">
            The Distribute tab sends tokens to the recipients this API returns. Only point it at a server you
            trust.
          </span>
        </label>

        <label className="field">
          <span>Show times in</span>
          <select value={draft.timeZone} onChange={setField('timeZone')}>
            <option value="UTC">UTC</option>
            <option value="local">Local time ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
          </select>
        </label>

        <label className="field">
          <span>Report reference amount</span>
          <input
            type="number"
            min="1"
            step="1"
            value={draft.reportAmount}
            onChange={setField('reportAmount')}
            required
          />
          <span className="field-hint">Used by the Report tab to compute each recipient's share.</span>
        </label>

        <label className="field">
          <span>Network</span>
          <select value={draft.network} onChange={setField('network')}>
            {SUPPORTED_NETWORKS.map((network) => (
              <option key={network} value={network}>
                {network}
              </option>
            ))}
          </select>
          <span className="field-hint">
            Use chipnet to test a distribution without real funds. Changing the network forgets the imported
            wallet, since keys and addresses differ between networks.
          </span>
        </label>

        <label className="field">
          <span>Token decimals</span>
          <input
            type="number"
            min="0"
            max="18"
            step="1"
            value={draft.tokenDecimals}
            onChange={setField('tokenDecimals')}
            required
          />
          <span className="field-hint">
            Decimal places of the token being distributed. The FoldingCash token uses 8; a chipnet test token
            minted without decimals uses 0.
          </span>
        </label>

        {validationError && <p className="field-error">{validationError}</p>}

        <div className="modal__actions settings-form__actions">
          <button type="button" className="link-button" onClick={handleReset}>
            Reset to defaults
          </button>
          <button type="button" className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
