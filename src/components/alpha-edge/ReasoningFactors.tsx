import type { AlphaEdgeReasoningFactor } from '../../types/alphaEdge';
import { FactorIcon } from './utils';

interface Props {
  factors: AlphaEdgeReasoningFactor[];
}

/** Section 3 — bound to verdict.reasoningFactors */
export function ReasoningFactors({ factors }: Props) {
  return (
    <div className="glass-card p-5 sm:p-6">
      <h3 className="heading-sm text-[#F0EEE8] mb-4">Reasoning Factors</h3>
      <ul className="space-y-3">
        {factors.map(f => (
          <li key={f.id} className="flex items-start gap-3 rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <FactorIcon direction={f.direction} />
            </div>
            <div>
              <p className="text-[#F0EEE8] text-sm font-medium">{f.label}</p>
              <p className="text-[#9298B0] text-xs mt-0.5 leading-relaxed">{f.explanation ?? f.value}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
