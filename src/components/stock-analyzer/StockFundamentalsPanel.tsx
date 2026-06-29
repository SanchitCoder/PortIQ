import type { FundamentalsGroup } from '../../types/stockAnalysis';

interface Props {
  fundamentals: FundamentalsGroup[];
}

/** Section 5 — bound to report.fundamentals */
export function StockFundamentalsPanel({ fundamentals }: Props) {
  return (
    <div className="glass-card p-5 sm:p-6">
      <h3 className="heading-sm text-[#F0EEE8] mb-4">Fundamentals</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {fundamentals.map(group => (
          <div key={group.title}>
            <p className="text-[#C9A84C] text-xs uppercase tracking-widest mb-2">{group.title}</p>
            <div className="space-y-2">
              {group.rows.map(row => (
                <div key={row.label} className="flex items-center justify-between gap-2 text-xs py-2 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-[#9298B0]">{row.label}</span>
                  <div className="text-right">
                    <span className="text-[#F0EEE8] font-mono block">
                      {row.unavailable ? 'data unavailable' : row.value}
                    </span>
                    {!row.unavailable && (
                      <span className="text-[#4A4E65] text-[0.65rem]">{row.assessment}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
