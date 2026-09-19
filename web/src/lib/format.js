// Formatting helpers shared by the report and distribute views.

/** Truncate a CashAddress for compact display: bitcoincash:qq...xyz9 */
export function truncateAddress(address, headLen = 14, tailLen = 6) {
  if (!address) return '';
  const withoutPrefix = address.includes(':') ? address.split(':')[1] : address;
  if (withoutPrefix.length <= headLen + tailLen + 1) return address;
  const prefix = address.includes(':') ? `${address.split(':')[0]}:` : '';
  return `${prefix}${withoutPrefix.slice(0, headLen)}…${withoutPrefix.slice(-tailLen)}`;
}

/** Format an integer or float with thousands separators. */
export function formatNumber(value, maximumFractionDigits = 8) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

/** Format a BigInt count of satoshis as BCH (8 decimals). */
export function satoshisToBch(satoshis) {
  const sats = typeof satoshis === 'bigint' ? satoshis : BigInt(satoshis);
  const whole = sats / 100000000n;
  const frac = sats % 100000000n;
  const fracStr = frac.toString().padStart(8, '0').replace(/0+$/, '') || '0';
  return `${whole}.${fracStr}`;
}

/** Format a Date (or date-ish string) the way the GetDistro API expects: M/D/YYYY. */
export function formatDateForApi(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`"${dateInput}" is not a valid date`);
  }
  return date.toLocaleDateString('en-US');
}

/** Convert a <input type="date"> value (YYYY-MM-DD) into a Date at local midnight. */
export function parseDateInputValue(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Percentage helper for the breakout table, returns e.g. "12.3%". */
export function formatPercent(part, whole) {
  if (!whole) return '—';
  return `${((part / whole) * 100).toFixed(1)}%`;
}
