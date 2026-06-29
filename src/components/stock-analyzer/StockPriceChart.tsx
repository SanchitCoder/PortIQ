import { useMemo, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { PriceHistoryPoint, StockAnalysisHeader } from '../../types/stockAnalysis';
import { fmtCurrency } from './utils';

type Range = '1M' | '6M' | '1Y';

interface Props {
  priceHistory: Record<Range, PriceHistoryPoint[]>;
  header: StockAnalysisHeader;
}

/** Section 3 — bound to report.priceHistory */
export function StockPriceChart({ priceHistory, header }: Props) {
  const [range, setRange] = useState<Range>('6M');
  const data = priceHistory[range] ?? [];

  const chartData = useMemo(() => data.map(d => ({ ...d, label: d.date.slice(5) })), [data]);

  if (data.length === 0) {
    return (
      <div className="glass-card p-5 sm:p-6">
        <h3 className="heading-sm text-[#F0EEE8] mb-3">Price Chart</h3>
        <p className="text-[#4A4E65] text-sm text-center py-12">Price history unavailable</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-sm text-[#F0EEE8]">Price Chart</h3>
        <div className="flex gap-1">
          {(['1M', '6M', '1Y'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${range === r ? 'text-[#C9A84C]' : 'text-[#4A4E65] hover:text-[#9298B0]'}`}
              style={{
                background: range === r ? 'rgba(201,168,76,0.1)' : 'transparent',
                border: range === r ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent',
              }}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-52 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#4A4E65', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#4A4E65', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload as PriceHistoryPoint;
                return (
                  <div className="rounded-xl px-3 py-2 text-xs"
                    style={{ background: 'rgba(8,10,20,0.95)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <p className="text-[#9298B0]">{p.date}</p>
                    <p className="text-[#C9A84C] font-mono">{fmtCurrency(p.close, header.currency)}</p>
                  </div>
                );
              }}
            />
            {header.week52High != null && (
              <ReferenceLine y={header.week52High} stroke="#4ADE80" strokeDasharray="4 4" strokeOpacity={0.5} />
            )}
            {header.week52Low != null && (
              <ReferenceLine y={header.week52Low} stroke="#F87171" strokeDasharray="4 4" strokeOpacity={0.5} />
            )}
            <Area type="monotone" dataKey="close" stroke="#C9A84C" strokeWidth={2} fill="url(#priceGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-[0.65rem] text-[#4A4E65]">
        <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-[#4ADE80]" /> 52w high</span>
        <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-[#F87171]" /> 52w low</span>
      </div>
    </div>
  );
}
