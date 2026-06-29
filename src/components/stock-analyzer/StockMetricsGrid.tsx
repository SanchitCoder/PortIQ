import type { StockMetricTile } from '../../types/stockAnalysis';

interface Props {
  metrics: StockMetricTile[];
}

/** Section 4 — bound to report.metrics */
export function StockMetricsGrid({ metrics }: Props) {
  return (
    <div className="glass-card p-5 sm:p-6">
      <h3 className="heading-sm text-[#F0EEE8] mb-4">Key Metrics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map(m => (
          <div key={m.key} className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[#4A4E65] text-[0.65rem] uppercase tracking-widest mb-1">{m.label}</p>
            <p className="text-[#F0EEE8] font-mono text-sm font-semibold">
              {m.unavailable || m.value == null ? (
                <span className="text-[#4A4E65] text-xs font-normal">data unavailable</span>
              ) : (
                m.value
              )}
            </p>
            {m.contextTag && !m.unavailable && (
              <span className="inline-block mt-1.5 text-[0.6rem] px-1.5 py-0.5 rounded-md text-[#9298B0]"
                style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
                {m.contextTag}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
