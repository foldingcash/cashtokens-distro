import { satoshisToBch, formatNumber } from '../lib/format.js';

/**
 * The explicit approve/deny gate before anything is broadcast. Nothing is
 * sent unless the user clicks "Confirm & send" here; "Cancel" (or the
 * backdrop, or Escape) always backs out with nothing broadcast.
 */
export default function ConfirmSendDialog({ open, summary, isSending, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-send-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-send-title">Confirm distribution</h2>
        <p>This will broadcast a real transaction. Double-check the totals before continuing.</p>
        <dl className="confirm-summary">
          <dt>Recipients</dt>
          <dd>{formatNumber(summary.distroCount)}</dd>
          <dt>Total tokens distributed</dt>
          <dd>{formatNumber(summary.totalTokens)}</dd>
          <dt>Network fee</dt>
          <dd>{satoshisToBch(summary.fee)} BCH ({summary.fee.toString()} sats)</dd>
          <dt>Change back to your wallet</dt>
          <dd>{satoshisToBch(summary.changeSatoshis)} BCH</dd>
        </dl>
        <div className="modal__actions">
          <button type="button" className="button button--secondary" onClick={onCancel} disabled={isSending}>
            Cancel
          </button>
          <button type="button" className="button button--danger" onClick={onConfirm} disabled={isSending}>
            {isSending ? 'Broadcasting…' : 'Confirm & send'}
          </button>
        </div>
      </div>
    </div>
  );
}
