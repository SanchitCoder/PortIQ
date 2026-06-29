import type { PeerComparisonRow } from '../../types/stockAnalysis';

function cellHighlight(
  val: number | null,
  peers: (number | null)[],
  higherIsBetter: boolean,
): string | undefined {
  const nums = peers.filter((v): v is number => v != null);
  if (val == null || nums.length < 2) return undefined;
  const best = higherIsBetter ? Math.max(...nums) : Math.min(...nums);
  const worst = higherIsBetter ? Math.min(...nums) : Math.max(...nums);
  if (val === best) return '#4ADE80';
  if (val === worst) return '#F87171';
  return undefined;
}

interface Props {
  peers: PeerComparisonRow[];
}

/** Section 7 — bound to report.peers */
export function StockPeerComparison({ peers }: Props) {
  if (peers.length === 0) {
    return (
      <div className="glass-card p-5 sm:p-6">
        <h3 className="heading-sm text-[#F0EEE8] mb-3">Peer Comparison</h3>
        <p className="text-[#4A4E65] text-sm">Peer data unavailable</p>
      </div>
    );
  }

  const peVals = peers.map(p => p.pe);
  const growthVals = peers.map(p => p.revenueGrowthPct);
  const marginVals = peers.map(p => p.profitMarginPct);

  return (
    <div className="glass-card p-5 sm:p-6 overflow-x-auto">
      <h3 className="heading-sm text-[#F0EEE8] mb-4">Peer Comparison</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[#4A4E65] uppercase tracking-widest text-left">
            <th className="pb-3 pr-4">Symbol</th>
            <th className="pb-3 pr-4">P/E</th>
            <th className="pb-3 pr-4">Rev. Growth</th>
            <th className="pb-3">Margin</th>
          </tr>
        </thead>
        <tbody>
          {peers.map(row => (
            <tr key={row.symbol}
              className={row.isSubject ? 'font-semibold' : ''}
              style={{
                background: row.isSubject ? 'rgba(201,168,76,0.06)' : undefined,
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}>
              <td className="py-2.5 pr-4 font-mono text-[#F0EEE8]">{row.symbol}</td>
              <td className="py-2.5 pr-4 font-mono" style={{ color: cellHighlight(row.pe, peVals, false) ?? '#9298B0' }}>
                {row.pe != null ? row.pe.toFixed(1) : '—'}
              </td>
              <td className="py-2.5 pr-4 font-mono" style={{ color: cellHighlight(row.revenueGrowthPct, growthVals, true) ?? '#9298B0' }}>
                {row.revenueGrowthPct != null ? `${row.revenueGrowthPct.toFixed(1)}%` : '—'}
              </td>
              <td className="py-2.5 font-mono" style={{ color: cellHighlight(row.profitMarginPct, marginVals, true) ?? '#9298B0' }}>
                {row.profitMarginPct != null ? `${row.profitMarginPct.toFixed(1)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
