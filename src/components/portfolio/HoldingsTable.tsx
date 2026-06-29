import { Trash2, RefreshCw } from 'lucide-react';
import type { Holding } from '../../types/portfolio';
import {
  computeHoldingPnl,
  computePortfolioSummary,
  computeWeight,
  formatINR,
  formatPct,
} from '../../lib/portfolioMetrics';
import { usePortfolioStore } from '../../stores/portfolioStore';

interface Props {
  holdings: Holding[];
}

export function HoldingsTable({ holdings }: Props) {
  const removeHolding = usePortfolioStore(s => s.removeHolding);
  const refreshPrices = usePortfolioStore(s => s.refreshPrices);
  const isRefreshingPrices = usePortfolioStore(s => s.isRefreshingPrices);
  const lastPriceUpdate = usePortfolioStore(s => s.lastPriceUpdate);

  const summary = computePortfolioSummary(holdings);
  const totalValue = summary.currentValue;

  const lastUpdated = lastPriceUpdate
    ? new Date(lastPriceUpdate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  if (holdings.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-40">
        <p className="text-[#4A4E65] text-sm">Add holdings above to start tracking</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        {lastUpdated && (
          <p className="text-[#4A4E65] text-[0.65rem] font-mono">Last updated {lastUpdated}</p>
        )}
        <button
          onClick={() => refreshPrices(true)}
          disabled={isRefreshingPrices}
          className="btn-glass text-xs px-3 py-1.5 flex items-center gap-1.5 ml-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPrices ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="overflow-auto flex-1 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Symbol', 'Qty', 'Avg', 'LTP', 'P&L', 'Today', 'Wt%', ''].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-[#4A4E65] font-medium uppercase tracking-wider text-[0.6rem] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map(h => {
              const { pnl, pnlPct } = computeHoldingPnl(h);
              const weight = computeWeight(h, totalValue);
              const pnlUp = pnl >= 0;
              const dayUp = (h.dayChangePct ?? 0) >= 0;

              return (
                <tr key={h.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="font-mono font-semibold text-[#F0EEE8]">{h.symbol}</span>
                    <span className="text-[#4A4E65] text-[0.6rem] ml-1">{h.exchange}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[#9298B0]">{h.quantity}</td>
                  <td className="px-3 py-2.5 font-mono text-[#9298B0]">{formatINR(h.avgBuyPrice)}</td>
                  <td className="px-3 py-2.5 font-mono text-[#F0EEE8]">
                    {h.currentPrice != null ? formatINR(h.currentPrice) : '—'}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="font-mono block" style={{ color: pnlUp ? '#4ADE80' : '#F87171' }}>
                      {formatINR(pnl)}
                    </span>
                    <span className="font-mono text-[0.65rem]" style={{ color: pnlUp ? '#4ADE80' : '#F87171' }}>
                      {formatPct(pnlPct)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: h.dayChangePct != null ? (dayUp ? '#4ADE80' : '#F87171') : '#4A4E65' }}>
                    {h.dayChangePct != null ? formatPct(h.dayChangePct) : '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[#9298B0]">{weight.toFixed(1)}%</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => removeHolding(h.id)}
                      className="text-[#4A4E65] hover:text-red-400 transition-colors p-1"
                      aria-label={`Remove ${h.symbol}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
