import { formatNumber } from '../lib/format.js';

/** A row of stat tiles, e.g. recipients / points / work units / total amount. */
export default function SummaryStats({ stats }) {
  return (
    <div className="summary-stats">
      {stats.map((stat) => (
        <div className="summary-stats__tile" key={stat.label}>
          <div className="summary-stats__value">
            {typeof stat.value === 'number' ? formatNumber(stat.value, stat.decimals ?? 0) : stat.value}
          </div>
          <div className="summary-stats__label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
