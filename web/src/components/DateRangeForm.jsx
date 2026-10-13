import { useState } from 'react';

/** Format a Date as a local YYYY-MM-DD string for <input type="date">. */
function toDateInputValue(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Default range is the most recently completed month: the 1st of the previous
 * month through the 1st of the current month. The range only rolls forward on
 * the 2nd, so on the 1st it still covers the month before last.
 */
function defaultDateRange(now = new Date()) {
  const monthOffset = now.getDate() >= 2 ? 0 : 1;
  const end = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
}

/** Yesterday as YYYY-MM-DD; today and future dates can't be selected. */
function latestSelectableDate(now = new Date()) {
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}

/** Shared start/end date picker. Defaults to the most recently completed month. */
export default function DateRangeForm({ onSubmit, submitLabel, isBusy, disabled, disabledReason, children }) {
  const [startDate, setStartDate] = useState(() => defaultDateRange().start);
  const [endDate, setEndDate] = useState(() => defaultDateRange().end);
  const [validationError, setValidationError] = useState(null);
  const maxDate = latestSelectableDate();

  function handleSubmit(e) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setValidationError('Choose both a start and end date.');
      return;
    }
    // The max attribute doesn't stop typed-in values, so check here too.
    // YYYY-MM-DD strings compare correctly as plain strings.
    if (startDate > maxDate || endDate > maxDate) {
      setValidationError('Dates must be before today.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setValidationError('The start date must be before the end date.');
      return;
    }
    setValidationError(null);
    onSubmit({ startDate: new Date(`${startDate}T00:00:00`), endDate: new Date(`${endDate}T00:00:00`) });
  }

  return (
    <form onSubmit={handleSubmit} className="date-range-form">
      <div className="date-range-form__fields">
        <label className="field">
          <span>Start date</span>
          <input type="date" value={startDate} max={maxDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
        <label className="field">
          <span>End date</span>
          <input type="date" value={endDate} max={maxDate} onChange={(e) => setEndDate(e.target.value)} required />
        </label>
      </div>
      {children}
      {validationError && <p className="field-error">{validationError}</p>}
      <button type="submit" className="button" disabled={isBusy || disabled}>
        {isBusy ? 'Loading…' : submitLabel}
      </button>
      {disabled && disabledReason && <p className="field-error">{disabledReason}</p>}
    </form>
  );
}
