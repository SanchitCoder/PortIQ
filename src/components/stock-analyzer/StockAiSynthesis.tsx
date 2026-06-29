import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import type { StockAnalysisSynthesis } from '../../types/stockAnalysis';

interface Props {
  synthesis: StockAnalysisSynthesis;
}

/** Section 8 — bound to report.synthesis (AI interpretation only) */
export function StockAiSynthesis({ synthesis }: Props) {
  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[#C9A84C]" />
        <h3 className="heading-sm text-[#F0EEE8]">AI Synthesis</h3>
        <span className="text-[0.6rem] text-[#4A4E65] uppercase tracking-widest ml-auto">Interpretation</span>
      </div>

      <p className="text-[#9298B0] text-sm leading-relaxed mb-5 p-4 rounded-xl"
        style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)' }}>
        {synthesis.summaryVerdict}
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl p-4" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}>
          <p className="text-[#4ADE80] text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Bull Case
          </p>
          <ul className="space-y-2">
            {synthesis.bullCase.map((b, i) => (
              <li key={i} className="text-[#9298B0] text-xs leading-relaxed pl-3 border-l-2 border-[#4ADE80]/40">{b}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
          <p className="text-[#F87171] text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" /> Bear Case
          </p>
          <ul className="space-y-2">
            {synthesis.bearCase.map((b, i) => (
              <li key={i} className="text-[#9298B0] text-xs leading-relaxed pl-3 border-l-2 border-[#F87171]/40">{b}</li>
            ))}
          </ul>
        </div>
      </div>

      {synthesis.keyRisks.length > 0 && (
        <div>
          <p className="text-[#F0EEE8] text-sm font-semibold mb-2">Key Risks</p>
          <ul className="space-y-1.5">
            {synthesis.keyRisks.map((r, i) => (
              <li key={i} className="text-[#9298B0] text-xs flex items-start gap-2">
                <span className="text-[#FBBF24]">•</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
