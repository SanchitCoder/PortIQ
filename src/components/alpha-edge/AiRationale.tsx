import { Sparkles } from 'lucide-react';
import type { AlphaEdgeAiRationale } from '../../types/alphaEdge';

interface Props {
  rationale: AlphaEdgeAiRationale;
}

/** Section 6 — bound to verdict.aiRationale (AI interpretation only) */
export function AiRationale({ rationale }: Props) {
  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[#C9A84C]" />
        <h3 className="heading-sm text-[#F0EEE8]">AI Rationale</h3>
        <span className="text-[0.6rem] text-[#4A4E65] uppercase tracking-widest ml-auto">Interpretation</span>
      </div>
      <p className="text-[#9298B0] text-sm leading-relaxed mb-4 p-4 rounded-xl"
        style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.12)' }}>
        {rationale.rationale}
      </p>
      {rationale.keyRisks.length > 0 && (
        <div>
          <p className="text-[#F0EEE8] text-sm font-semibold mb-2">Key Risks</p>
          <ul className="space-y-1.5">
            {rationale.keyRisks.map((r, i) => (
              <li key={i} className="text-[#9298B0] text-xs flex gap-2">
                <span className="text-[#FBBF24]">•</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
