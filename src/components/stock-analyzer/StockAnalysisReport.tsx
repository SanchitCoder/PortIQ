import { LineChart } from 'lucide-react';
import type { StockAnalysis } from '../../types/stockAnalysis';
import { StockHeader } from './StockHeader';
import { StockScorecard } from './StockScorecard';
import { StockPriceChart } from './StockPriceChart';
import { StockMetricsGrid } from './StockMetricsGrid';
import { StockFundamentalsPanel } from './StockFundamentalsPanel';
import { StockSentimentPanel } from './StockSentimentPanel';
import { StockPeerComparison } from './StockPeerComparison';
import { StockAiSynthesis } from './StockAiSynthesis';
import { StockCrossFeatureCTAs } from './StockCrossFeatureCTAs';

export function StockReportSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-card h-32 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)' }} />
      ))}
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#C9A84C]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#C9A84C] animate-spin" />
        </div>
        <p className="text-[#9298B0] text-sm">Building equity report…</p>
      </div>
    </div>
  );
}

export function StockReportEmpty() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-3 opacity-40 p-8">
      <LineChart className="w-12 h-12 text-[#4A4E65]" />
      <p className="text-[#4A4E65] text-sm text-center">Enter a stock symbol and click Analyse</p>
    </div>
  );
}

interface Props {
  report: StockAnalysis;
}

/** Right panel — binds all sections to POST /api/analyzer/stock response */
export function StockAnalysisReport({ report }: Props) {
  return (
    <div className="space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1 animate-fade-in-up">
      <StockHeader header={report.header} />
      <StockScorecard scorecard={report.scorecard} />
      <StockPriceChart priceHistory={report.priceHistory} header={report.header} />
      <StockMetricsGrid metrics={report.metrics} />
      <StockFundamentalsPanel fundamentals={report.fundamentals} />
      <StockSentimentPanel sentiment={report.sentiment} />
      <StockPeerComparison peers={report.peers} />
      <StockAiSynthesis synthesis={report.synthesis} />
      <StockCrossFeatureCTAs header={report.header} />
    </div>
  );
}
