import type { AlphaEdgeVerdict } from '../../types/alphaEdge';
import { fmtMoney, pctColor } from './utils';
import { fmtCurrency } from '../stock-analyzer/utils';

interface Props {
  position: AlphaEdgeVerdict['position'];
  currency: string;
}

/** Section 2 — bound to verdict.position (computed server-side) */
export function PositionSnapshot({ position, currency }: Props) {
  const sym = currency === 'INR' ? '₹' : '$';
  const targetPct = position.targetPrice != null && position.currentPrice != null
    ? Math.min(100, (position.currentPrice / position.targetPrice) * 100)
    : null;
  const stopPct = position.stopLoss != null && position.currentPrice != null && position.currentPrice > 0
    ? Math.max(0, ((position.currentPrice - position.stopLoss) / position.currentPrice) * 100)
    : null;

  return (
    <div className="glass-card p-5 sm:p-6">
      <h3 className="heading-sm text-[#F0EEE8] mb-4">Position Snapshot</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs">
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[#4A4E65] uppercase tracking-widest mb-1">Buy → Current</p>
          <p className="text-[#F0EEE8] font-mono">
            {fmtCurrency(position.buyPrice, currency)} → {fmtCurrency(position.currentPrice, currency)}
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[#4A4E65] uppercase tracking-widest mb-1">Qty</p>
          <p className="text-[#F0EEE8] font-mono">{position.quantity}</p>
        </div>
        <div className="rounded-xl p-3 col-span-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[#4A4E65] uppercase tracking-widest mb-1">Unrealized P&L</p>
          {position.unrealizedPnlPct != null ? (
            <p className="font-mono font-semibold" style={{ color: pctColor(position.unrealizedPnlPct) }}>
              {fmtMoney(position.unrealizedPnl, currency)} ({position.unrealizedPnlPct >= 0 ? '+' : ''}{position.unrealizedPnlPct.toFixed(2)}%)
            </p>
          ) : (
            <p className="text-[#4A4E65]">data unavailable</p>
          )}
        </div>
      </div>

      {position.targetPrice != null && targetPct != null && (
        <div className="mb-3">
          <div className="flex justify-between text-[0.65rem] text-[#4A4E65] mb-1">
            <span>Progress to target ({sym}{position.targetPrice.toFixed(2)})</span>
            <span>{targetPct.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${targetPct}%`, background: 'linear-gradient(90deg, #9A7A2E, #4ADE80)' }} />
          </div>
        </div>
      )}

      {position.stopLoss != null && stopPct != null && (
        <div>
          <div className="flex justify-between text-[0.65rem] text-[#4A4E65] mb-1">
            <span>Buffer above stop ({sym}{position.stopLoss.toFixed(2)})</span>
            <span>{stopPct.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, stopPct)}%`, background: 'linear-gradient(90deg, #F87171, #FBBF24)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
