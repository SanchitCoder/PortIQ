import type { StockAnalysisScorecard } from '../../types/stockAnalysis';
import { scoreColor } from './utils';

function ScoreRing({ value, label, tag }: { value: number; label: string; tag: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = scoreColor(value);

  return (
    <div className="flex flex-col items-center flex-1 min-w-[72px]">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="number-display text-lg font-bold text-[#F0EEE8]">{value}</span>
        </div>
      </div>
      <p className="text-[#9298B0] text-[0.65rem] mt-2 uppercase tracking-widest text-center">{label}</p>
      <span className="text-[0.65rem] font-medium mt-0.5" style={{ color }}>{tag}</span>
    </div>
  );
}

interface Props {
  scorecard: StockAnalysisScorecard;
}

/** Section 2 — bound to report.scorecard */
export function StockScorecard({ scorecard }: Props) {
  const verdictColor = scoreColor(
    (scorecard.valuation.value + scorecard.financialHealth.value + scorecard.growth.value + scorecard.sentiment.value) / 4,
  );

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="heading-sm text-[#F0EEE8]">Scorecard</h3>
        <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
          style={{ background: `${verdictColor}18`, color: verdictColor, border: `1px solid ${verdictColor}40` }}>
          {scorecard.overallVerdict}
        </span>
      </div>
      <div className="flex flex-wrap justify-between gap-4">
        <ScoreRing value={scorecard.valuation.value} label="Valuation" tag={scorecard.valuation.tag} />
        <ScoreRing value={scorecard.financialHealth.value} label="Health" tag={scorecard.financialHealth.tag} />
        <ScoreRing value={scorecard.growth.value} label="Growth" tag={scorecard.growth.tag} />
        <ScoreRing value={scorecard.sentiment.value} label="Sentiment" tag={scorecard.sentiment.tag} />
      </div>
    </div>
  );
}
