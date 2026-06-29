import { ExternalLink } from 'lucide-react';
import type { StockAnalysisResponse } from '../../types/stockAnalysis';

const SENTIMENT_CHIP: Record<string, { bg: string; color: string; border: string }> = {
  bullish: { bg: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: 'rgba(74,222,128,0.25)' },
  neutral: { bg: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: 'rgba(251,191,36,0.2)' },
  bearish: { bg: 'rgba(248,113,113,0.08)', color: '#F87171', border: 'rgba(248,113,113,0.25)' },
};

interface Props {
  sentiment: StockAnalysisResponse['sentiment'];
}

/** Section 6 — bound to report.sentiment */
export function StockSentimentPanel({ sentiment }: Props) {
  const gaugePct = sentiment.score;

  return (
    <div className="glass-card p-5 sm:p-6">
      <h3 className="heading-sm text-[#F0EEE8] mb-4">Sentiment</h3>

      <div className="mb-5">
        <div className="flex justify-between text-[0.65rem] text-[#4A4E65] mb-1.5">
          <span>Bearish</span>
          <span className="text-[#C9A84C] font-medium">{sentiment.label}</span>
          <span>Bullish</span>
        </div>
        <div className="relative h-2.5 rounded-full overflow-hidden"
          style={{ background: 'linear-gradient(90deg, #F87171, #FBBF24, #4ADE80)' }}>
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#F0EEE8] border-2 border-[#C9A84C] shadow"
            style={{ left: `calc(${gaugePct}% - 6px)` }} />
        </div>
      </div>

      {sentiment.unavailable || sentiment.headlines.length === 0 ? (
        <p className="text-[#4A4E65] text-sm">News headlines unavailable</p>
      ) : (
        <ul className="space-y-3">
          {sentiment.headlines.map((h, i) => {
            const chip = SENTIMENT_CHIP[h.sentiment] ?? SENTIMENT_CHIP.neutral;
            return (
              <li key={i} className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <a href={h.url} target="_blank" rel="noopener noreferrer"
                  className="text-[#F0EEE8] text-sm hover:text-[#C9A84C] transition-colors flex items-start gap-2">
                  <span className="flex-1">{h.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#4A4E65]" />
                </a>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[#4A4E65] text-[0.65rem]">{h.source} · {h.date}</span>
                  <span className="text-[0.6rem] px-1.5 py-0.5 rounded capitalize"
                    style={{ background: chip.bg, color: chip.color, border: `1px solid ${chip.border}` }}>
                    {h.sentiment}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
