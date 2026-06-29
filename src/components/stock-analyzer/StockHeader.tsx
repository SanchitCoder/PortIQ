import type { StockAnalysisHeader } from '../../types/stockAnalysis';
import { fmtCurrency, fmtMarketCap, pctColor } from './utils';

interface Props {
  header: StockAnalysisHeader;
}

/** Section 1 — bound to report.header from POST /api/analyzer/stock */
export function StockHeader({ header }: Props) {
  const pos = header.price != null && header.week52Low != null && header.week52High != null
    && header.week52High > header.week52Low
    ? ((header.price - header.week52Low) / (header.week52High - header.week52Low)) * 100
    : null;

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-[#F0EEE8] text-lg font-semibold">{header.companyName}</h3>
          <p className="text-[#9298B0] text-sm font-mono mt-1">
            {header.symbol} · {header.exchange}
          </p>
        </div>
        <div className="text-right">
          <p className="number-display text-2xl font-bold text-[#F0EEE8]">
            {fmtCurrency(header.price, header.currency)}
          </p>
          {header.dayChangePct != null ? (
            <p className="text-sm font-mono mt-1" style={{ color: pctColor(header.dayChangePct) }}>
              {header.dayChange != null && `${header.dayChange >= 0 ? '+' : ''}${fmtCurrency(header.dayChange, header.currency)} `}
              ({header.dayChangePct >= 0 ? '+' : ''}{header.dayChangePct.toFixed(2)}%)
            </p>
          ) : (
            <p className="text-[#4A4E65] text-xs mt-1">day change unavailable</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[#4A4E65] uppercase tracking-widest mb-1">Market Cap</p>
          <p className="text-[#F0EEE8] font-mono">{fmtMarketCap(header.marketCap, header.currency)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[#4A4E65] uppercase tracking-widest mb-1">52W Low</p>
          <p className="text-[#F0EEE8] font-mono">{fmtCurrency(header.week52Low, header.currency)}</p>
        </div>
        <div className="rounded-xl p-3 col-span-2 sm:col-span-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[#4A4E65] uppercase tracking-widest mb-1">52W High</p>
          <p className="text-[#F0EEE8] font-mono">{fmtCurrency(header.week52High, header.currency)}</p>
        </div>
      </div>

      {pos != null ? (
        <div className="mt-4">
          <div className="flex justify-between text-[0.65rem] text-[#4A4E65] mb-1.5">
            <span>52-week range</span>
            <span className="font-mono text-[#9298B0]">{pos.toFixed(0)}% of range</span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pos}%`, background: 'linear-gradient(90deg, #9A7A2E, #C9A84C)' }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#F0EEE8] border border-[#C9A84C]"
              style={{ left: `calc(${pos}% - 5px)` }} />
          </div>
        </div>
      ) : (
        <p className="text-[#4A4E65] text-xs mt-3">52-week range data unavailable</p>
      )}
    </div>
  );
}
