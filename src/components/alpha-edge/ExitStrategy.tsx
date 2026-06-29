import type { AlphaEdgeExitRow } from '../../types/alphaEdge';

interface Props {
  rows: AlphaEdgeExitRow[];
}

/** Section 4 — bound to verdict.exitStrategy */
export function ExitStrategy({ rows }: Props) {
  return (
    <div className="glass-card p-5 sm:p-6">
      <h3 className="heading-sm text-[#F0EEE8] mb-4">Exit Strategy</h3>
      <div className="space-y-3">
        {rows.map(row => (
          <div key={row.label} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-[#9298B0] text-xs uppercase tracking-widest sm:w-40 shrink-0">{row.label}</span>
            <span className="text-[#F0EEE8] text-sm flex-1">
              {row.unavailable ? <span className="text-[#4A4E65]">data unavailable</span> : row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
