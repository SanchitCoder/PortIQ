import type {
  AlphaEdgeEvaluateRequest,
  AlphaEdgeReasoningFactor,
  AlphaEdgeVerdict,
} from '../../../shared/api-types.js';
import { getAnalyzerCompute } from './analyzerCompute.js';
import { getFundamentals } from './fundamentals.js';
import { getQuotes } from './marketData.js';
import {
  ALPHAEDGE_DISCLAIMER,
  computeAlphaEdge,
} from './alphaEdgeCompute.js';
import { generateAlphaEdgeRationale, alphaEdgeRationaleFallback } from './alphaEdgeAi.js';

export interface EvaluateAlphaEdgeOptions {
  /** When false, skip OpenRouter (deterministic fallbacks only) — used for PDF export cache miss */
  useAi?: boolean;
}

/**
 * AlphaEdge orchestrator — L1 data → L2 compute → L3 AI rationale.
 * No n8n; no LLM in verdict math.
 */
export async function evaluateAlphaEdge(
  input: AlphaEdgeEvaluateRequest,
  options: EvaluateAlphaEdgeOptions = {},
): Promise<AlphaEdgeVerdict> {
  const sym = input.symbol.trim().toUpperCase();

  // L1 — live quote (if currentPrice not supplied) + cached analyzer scores + fundamentals
  const analyzer = await getAnalyzerCompute(sym, input.exchange);

  let currentPrice = input.currentPrice ?? null;
  if (currentPrice == null) {
    const quotes = await getQuotes(
      [{ symbol: sym, exchange: analyzer.exchange }],
      { forceRefresh: false },
    );
    currentPrice = quotes[0]?.price ?? null;
  }

  const fundamentals = await getFundamentals(sym, analyzer.exchange);

  // L2 — deterministic compute (pure math, no LLM)
  const computed = computeAlphaEdge(
    analyzer.scores,
    {
      buyPrice: input.buyPrice,
      currentPrice,
      quantity: input.quantity,
      targetPrice: input.targetPrice,
      stopLoss: input.stopLoss,
    },
    analyzer.dayChangePct,
    fundamentals.unavailable ? null : fundamentals,
    analyzer.currency,
  );

  // L3 — AI rationale only (verdict/confidence/P&L are ground truth)
  const useAi = options.useAi !== false;
  const aiRationale = useAi
    ? await generateAlphaEdgeRationale(computed, sym, input.context)
    : alphaEdgeRationaleFallback(computed, sym);

  const reasoningFactors: AlphaEdgeReasoningFactor[] = computed.reasoningFactors.map((f, i) => ({
    id: f.id,
    label: f.label,
    direction: f.direction,
    value: f.value,
    explanation: aiRationale.factorExplanations[i] ?? f.value,
  }));

  const { positionMetrics: pos } = computed;

  return {
    header: {
      signal: computed.verdict,
      confidence: computed.confidence,
      headline: aiRationale.headline,
      symbol: sym,
      exchange: analyzer.exchange,
      currency: analyzer.currency,
      companyName: analyzer.companyName,
    },
    position: {
      buyPrice: pos.buyPrice,
      currentPrice: pos.currentPrice,
      quantity: pos.quantity,
      targetPrice: pos.targetPrice,
      stopLoss: pos.stopLoss,
      unrealizedPnl: pos.unrealizedPnl,
      unrealizedPnlPct: pos.unrealizedPnlPct != null
        ? Math.round(pos.unrealizedPnlPct * 100) / 100
        : null,
      totalCost: pos.totalCost,
      marketValue: pos.marketValue,
    },
    reasoningFactors,
    exitStrategy: computed.exitStrategy,
    scenarios: computed.scenarios,
    aiRationale,
    signalScore: computed.signalScore,
    reducedConfidence: computed.reducedConfidence,
    disclaimer: ALPHAEDGE_DISCLAIMER,
    inPortfolio: false,
    generatedAt: new Date().toISOString(),
  };
}
