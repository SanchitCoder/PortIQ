import { Zap } from 'lucide-react';
import type { AlphaEdgeVerdict } from '../../types/alphaEdge';
import { VerdictHeader } from './VerdictHeader';
import { PositionSnapshot } from './PositionSnapshot';
import { ReasoningFactors } from './ReasoningFactors';
import { ExitStrategy } from './ExitStrategy';
import { ScenarioRow } from './ScenarioRow';
import { AiRationale } from './AiRationale';
import { AlphaEdgeCTAs } from './AlphaEdgeCTAs';

export function AlphaEdgeSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="glass-card h-28" />
      <div className="glass-card h-40" />
      <div className="flex flex-col items-center py-8 gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#C9A84C]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#C9A84C] animate-spin" />
        </div>
        <p className="text-[#9298B0] text-sm">Evaluating position…</p>
      </div>
    </div>
  );
}

export function AlphaEdgeEmpty() {
  return (
    <div className="glass-card flex flex-col items-center justify-center min-h-[420px] gap-3 opacity-40 p-8">
      <Zap className="w-12 h-12 text-[#4A4E65]" />
      <p className="text-[#4A4E65] text-sm text-center">Fill in your position details and click Evaluate</p>
    </div>
  );
}

interface Props {
  verdict: AlphaEdgeVerdict;
  inPortfolio: boolean;
}

/** Right panel — binds all sections to POST /api/alphaedge/evaluate response */
export function AlphaEdgeReport({ verdict, inPortfolio }: Props) {
  return (
    <div className="space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1 animate-fade-in-up">
      <VerdictHeader header={verdict.header} />
      {verdict.reducedConfidence && (
        <p className="text-[#FBBF24] text-xs px-1">Reduced confidence — some analyzer data was unavailable.</p>
      )}
      <PositionSnapshot position={verdict.position} currency={verdict.header.currency} />
      <ReasoningFactors factors={verdict.reasoningFactors} />
      <ExitStrategy rows={verdict.exitStrategy} />
      <ScenarioRow scenarios={verdict.scenarios} currency={verdict.header.currency} />
      <AiRationale rationale={verdict.aiRationale} />
      <p className="text-[#4A4E65] text-[0.65rem] leading-relaxed px-1">{verdict.disclaimer}</p>
      <AlphaEdgeCTAs verdict={verdict} inPortfolio={inPortfolio} />
    </div>
  );
}
