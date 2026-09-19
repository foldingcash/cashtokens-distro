import { useMemo, useState } from 'react';
import { truncateAddress } from '../lib/format.js';

/**
 * A filterable, sortable breakout table shared by the report and distribute
 * views. `columns` is an array of { key, label, sortable, accessor, render }.
 * `accessor(row)` returns the raw numeric value used for sorting; `render(row)`
 * returns what's actually displayed (falls back to accessor's value).
 */
export default function DistroTable({ rows, columns, defaultSortKey, getAddress = (r) => r.cashTokensAddress }) {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey || columns[0]?.key);
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const needle = filter.trim().toLowerCase();
    return rows.filter((r) => getAddress(r)?.toLowerCase().includes(needle));
  }, [rows, filter, getAddress]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const accessor = col.accessor || (() => 0);
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = accessor(a) ?? 0;
      const bv = accessor(b) ?? 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, columns, sortKey, sortDir]);

  function handleSortClick(col) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(col.key);
      setSortDir('desc');
    }
  }

  return (
    <div className="distro-table">
      <div className="distro-table__toolbar">
        <input
          type="text"
          placeholder="Filter by address…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-input"
        />
        <span className="distro-table__count">
          {sorted.length} of {rows.length} recipient{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="distro-table__scroll">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSortClick(col)}
                  className={col.sortable ? 'sortable' : undefined}
                  title={col.sortable ? 'Click to sort' : undefined}
                >
                  {col.label}
                  {sortKey === col.key ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={getAddress(row) + i}>
                {columns.map((col) => (
                  <td key={col.key} title={col.key === 'address' ? getAddress(row) : undefined}>
                    {col.render ? col.render(row) : col.accessor?.(row)}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="distro-table__empty">
                  No rows match "{filter}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { truncateAddress };
