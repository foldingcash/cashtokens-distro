/**
 * Friendly error display used for API errors, chain/provider errors, and
 * wallet errors alike. `error` is expected to be an AppError (has `.kind`
 * and `.message`) but falls back gracefully for anything else.
 */
export default function ErrorNotice({ error, onRetry, onDismiss }) {
  if (!error) return null;

  const kind = error.kind || 'error';
  const title = TITLES[kind] || 'Something went wrong';

  return (
    <div className="error-notice" role="alert">
      <div className="error-notice__header">
        <span className="error-notice__title">{title}</span>
        {onDismiss && (
          <button type="button" className="link-button" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
      <p className="error-notice__message">{error.message || String(error)}</p>
      {onRetry && (
        <button type="button" className="button button--secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

const TITLES = {
  network: 'Network problem',
  http: 'API error',
  parse: 'API error',
  api: 'Distribution API error',
  empty: 'No results',
  'invalid-wif': 'Invalid private key',
  'network-mismatch': 'Wrong network',
  'network-provider': 'Blockchain connection problem',
  'no-utxos': 'Wallet is empty',
  'no-token-input': 'No tokens found',
  'multiple-token-inputs': 'Unsupported wallet state',
  'multiple-fund-inputs': 'Unsupported wallet state',
  precision: 'Amount precision problem',
  'insufficient-funds': 'Insufficient funds',
  'distribution-mismatch': 'Distribution mismatch',
  broadcast: 'Transaction rejected',
  cancelled: 'Cancelled',
};
