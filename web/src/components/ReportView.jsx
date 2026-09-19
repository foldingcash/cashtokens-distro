import { useState } from 'react';
import { getDistribution } from '../lib/distroApi.js';
import { DEFAULT_REPORT_AMOUNT } from '../config.js';
import DateRangeForm from './DateRangeForm.jsx';
import SummaryStats from './SummaryStats.jsx';
import DistroTable, { truncateAddress } from './DistroTable.jsx';
import ErrorNotice from './ErrorNotice.jsx';
import { formatNumber, formatPercent } from '../lib/format.js';

/**
 * Workflow 1: a read-only report. No amount is chosen — it's always run
 * against a fixed reference amount, since this view never touches the
 * chain or moves any tokens.
 */
export default function ReportView() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [range, setRange] = useState(null);

  async function handleSubmit({ startDate, endDate }) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDistribution(startDate, endDate, DEFAULT_REPORT_AMOUNT);
      setReport(result);
      setRange({ startDate, endDate });
    } catch (err) {
      setError(err);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }

  const columns = [
    { key: 'address', label: 'Address', sortable: false, render: (r) => truncateAddress(r.cashTokensAddress) },
    {
      key: 'workUnitsGained',
      label: 'Work units',
      sortable: true,
      accessor: (r) => r.workUnitsGained,
      render: (r) => formatNumber(r.workUnitsGained),
    },
    {
      key: 'pointsGained',
      label: 'Points',
      sortable: true,
      accessor: (r) => r.pointsGained,
      render: (r) => formatNumber(r.pointsGained),
    },
    {
      key: 'percentOfPoints',
      label: '% of points',
      sortable: true,
      accessor: (r) => (report ? r.pointsGained / report.totalPoints : 0),
      render: (r) => formatPercent(r.pointsGained, report?.totalPoints),
    },
    {
      key: 'amount',
      label: `Reference amount (of ${DEFAULT_REPORT_AMOUNT})`,
      sortable: true,
      accessor: (r) => r.amount,
      render: (r) => formatNumber(r.amount),
    },
  ];

  return (
    <div className="view">
      <p className="view__intro">
        See a summary of work completed over a date range, and how it breaks out per user. This uses a
        fixed reference amount of {DEFAULT_REPORT_AMOUNT} tokens to compute proportional shares —
        nothing is sent on-chain from this view.
      </p>
      <div className="card">
        <DateRangeForm onSubmit={handleSubmit} submitLabel="Run report" isBusy={isLoading} />
      </div>

      <ErrorNotice error={error} onRetry={range ? () => handleSubmit(range) : undefined} />

      {report && (
        <>
          <SummaryStats
            stats={[
              { label: 'Recipients', value: report.distroCount },
              { label: 'Total work units', value: report.totalWorkUnits },
              { label: 'Total points', value: report.totalPoints },
              { label: `Total (of ${DEFAULT_REPORT_AMOUNT})`, value: report.totalDistro, decimals: 8 },
            ]}
          />
          <DistroTable rows={report.distro} columns={columns} defaultSortKey="pointsGained" />
        </>
      )}
    </div>
  );
}
