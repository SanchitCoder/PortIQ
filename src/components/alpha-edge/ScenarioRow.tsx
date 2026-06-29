import type { AlphaEdgeScenario } from '../../types/alphaEdge';
import { fmtMoney, pctColor } from './utils';

interface Props {
  scenarios: AlphaEdgeScenario[];
  currency: string;
}

/** Section 5 — bound to verdict.scenarios */
export function ScenarioRow({ scenarios, currency }: Props) {
  return (
    <div className="glass-card p-5 sm:p-6">
      <h3 className="heading-sm text-[#F0EEE8] mb-4">Scenario Outcomes</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {scenarios.map((s, i) => (
          <div key={i} className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[#9298B0] text-xs mb-2">{s.label}</p>
            {s.unavailable || s.pnlAmount == null ? (
              <p className="text-[#4A4E65] text-sm">data unavailable</p>
            ) : (
              <p className="font-mono font-semibold text-sm" style={{ color: pctColor(s.pnlPct) }}>
                {fmtMoney(s.pnlAmount, currency)}
                {s.pnlPct != null && ` (${s.pnlPct >= 0 ? '+' : ''}${s.pnlPct.toFixed(1)}%)`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
