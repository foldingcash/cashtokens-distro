import { useState } from 'react';

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Shared start/end date picker. Defaults to the last 30 days. */
export default function DateRangeForm({ onSubmit, submitLabel, isBusy, disabled, disabledReason, children }) {
  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));
  const [validationError, setValidationError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setValidationError('Choose both a start and end date.');
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
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
        <label className="field">
          <span>End date</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
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
