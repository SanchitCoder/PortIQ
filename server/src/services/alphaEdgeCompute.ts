import type {
  AlphaEdgeExitRow,
  AlphaEdgeFactorDirection,
  AlphaEdgeScenario,
  AlphaEdgeSignal,
} from '../../../shared/api-types.js';
import { clamp, clampRange } from '../lib/symbolUtils.js';
import type { AnalyzerScores } from './analyzerCompute.js';
import type { StockFundamentals } from './fundamentals.js';

export const ALPHAEDGE_DISCLAIMER =
  'This is an analytical signal tool, not personalized financial advice. Model outputs and past performance do not guarantee future results. Consult a qualified adviser before acting.';

export interface PositionMetricsInput {
  buyPrice: number;
  currentPrice: number | null;
  quantity: number;
  targetPrice?: number | null;
  stopLoss?: number | null;
}

export interface PositionMetricsResult {
  buyPrice: number;
  currentPrice: number | null;
  quantity: number;
  targetPrice: number | null;
  stopLoss: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  totalCost: number;
  marketValue: number | null;
  /** % of target already reached (100 = at target) */
  distanceToTargetPct: number | null;
  /** % buffer above stop (low = near stop) */
  distanceToStopPct: number | null;
  /** Reward / risk ratio when target + stop are set */
  riskRewardRatio: number | null;
}

export interface AlphaEdgeComputedFactor {
  id: string;
  label: string;
  direction: AlphaEdgeFactorDirection;
  value: string;
}

export interface AlphaEdgeComputed {
  signalScore: number;
  verdict: AlphaEdgeSignal;
  confidence: number;
  reducedConfidence: boolean;
  positionMetrics: PositionMetricsResult;
  reasoningFactors: AlphaEdgeComputedFactor[];
  exitStrategy: AlphaEdgeExitRow[];
  scenarios: AlphaEdgeScenario[];
}

/**
 * Layer 2 — deterministic position math. No LLM, no IO.
 */
export function positionMetrics(input: PositionMetricsInput): PositionMetricsResult {
  const { buyPrice, currentPrice, quantity } = input;
  const targetPrice = input.targetPrice ?? null;
  const stopLoss = input.stopLoss ?? null;
  const totalCost = buyPrice * quantity;
  const marketValue = currentPrice != null ? currentPrice * quantity : null;
  const unrealizedPnl = marketValue != null ? marketValue - totalCost : null;
  const unrealizedPnlPct = currentPrice != null && buyPrice > 0
    ? ((currentPrice - buyPrice) / buyPrice) * 100
    : null;

  let distanceToTargetPct: number | null = null;
  if (currentPrice != null && targetPrice != null && targetPrice > 0) {
    distanceToTargetPct = clamp((currentPrice / targetPrice) * 100, 0, 200);
  }

  let distanceToStopPct: number | null = null;
  if (currentPrice != null && stopLoss != null && currentPrice > 0) {
    distanceToStopPct = ((currentPrice - stopLoss) / currentPrice) * 100;
  }

  let riskRewardRatio: number | null = null;
  if (currentPrice != null && targetPrice != null && stopLoss != null) {
    const reward = targetPrice - currentPrice;
    const risk = currentPrice - stopLoss;
    if (risk > 0) riskRewardRatio = Math.round((reward / risk) * 100) / 100;
  }

  return {
    buyPrice,
    currentPrice,
    quantity,
    targetPrice,
    stopLoss,
    unrealizedPnl,
    unrealizedPnlPct,
    totalCost,
    marketValue,
    distanceToTargetPct,
    distanceToStopPct,
    riskRewardRatio,
  };
}

/**
 * Map a 0–100 analyzer score to -100..+100 conviction contribution.
 */
function scoreToConviction(score: number): number {
  return Math.round((score - 50) * 2);
}

/**
 * signalScore — combines analyzer four-scores WITH position context.
 *
 * WEIGHTING (tunable):
 * ─ Base conviction from analyzer scores (renormalized if some are null):
 *     valuation 25%, financialHealth 25%, growth 20%, sentiment 15%, overall 15%
 * ─ Position adjustments (added to base, clamped -100..+100):
 *     P&L > 25%:  -25  (take-profits bias)
 *     P&L > 15%:  -15
 *     P&L 0–10%:  +8   (modest gain, room to add)
 *     P&L < -12%: -30  (cut-loss bias)
 *     P&L < -5%:  -12
 *     Within 5% of target: -18
 *     Within 3% of stop:   -22
 *     R:R < 1:    -12
 *     R:R > 2.5:  +10
 * ─ Cross-factor tempering:
 *     Strong valuation (≥65) + profit > 20%:  -12  (don't chase)
 *     Weak health (<45) + loss > 10%:         -15  (thesis broken)
 */
export function signalScore(
  scores: AnalyzerScores,
  metrics: PositionMetricsResult,
): { score: number; reducedConfidence: boolean } {
  const weights: { key: keyof AnalyzerScores; w: number }[] = [
    { key: 'valuation', w: 0.25 },
    { key: 'financialHealth', w: 0.25 },
    { key: 'growth', w: 0.20 },
    { key: 'sentiment', w: 0.15 },
    { key: 'overall', w: 0.15 },
  ];

  let weightSum = 0;
  let convictionSum = 0;
  let availableCount = 0;

  for (const { key, w } of weights) {
    const v = scores[key];
    if (v != null) {
      convictionSum += scoreToConviction(v) * w;
      weightSum += w;
      availableCount++;
    }
  }

  const reducedConfidence = availableCount === 0;
  let base = weightSum > 0 ? convictionSum / weightSum : 0;

  let posAdj = 0;
  const pnl = metrics.unrealizedPnlPct;
  if (pnl != null) {
    if (pnl > 25) posAdj -= 25;
    else if (pnl > 15) posAdj -= 15;
    else if (pnl < -12) posAdj -= 30;
    else if (pnl < -5) posAdj -= 12;
    else if (pnl > 0 && pnl < 10) posAdj += 8;
  }

  if (metrics.distanceToTargetPct != null && metrics.distanceToTargetPct >= 95) {
    posAdj -= 18;
  }
  if (metrics.distanceToStopPct != null && metrics.distanceToStopPct < 3) {
    posAdj -= 22;
  }
  if (metrics.riskRewardRatio != null) {
    if (metrics.riskRewardRatio < 1) posAdj -= 12;
    else if (metrics.riskRewardRatio > 2.5) posAdj += 10;
  }

  let cross = 0;
  if (scores.valuation != null && scores.valuation >= 65 && pnl != null && pnl > 20) {
    cross -= 12;
  }
  if (scores.financialHealth != null && scores.financialHealth < 45 && pnl != null && pnl < -10) {
    cross -= 15;
  }

  const score = clampRange(base + posAdj + cross, -100, 100);
  return { score, reducedConfidence: reducedConfidence || availableCount < 3 };
}

/** Map signalScore to verdict bands + confidence from factor agreement. */
export function verdict(
  signalScoreValue: number,
  factors: AlphaEdgeComputedFactor[],
  reducedConfidence: boolean,
): { verdict: AlphaEdgeSignal; confidence: number } {
  let v: AlphaEdgeSignal;
  if (signalScoreValue >= 25) v = 'buy';
  else if (signalScoreValue <= -25) v = 'sell';
  else v = 'hold';

  const buyCount = factors.filter(f => f.direction === 'supports_buy').length;
  const sellCount = factors.filter(f => f.direction === 'supports_sell').length;
  const total = Math.max(factors.length, 1);
  const agreement = Math.abs(buyCount - sellCount) / total;

  let confidence = clamp(45 + Math.abs(signalScoreValue) * 0.35 + agreement * 25);
  if (reducedConfidence) confidence = Math.max(35, confidence - 15);

  return { verdict: v, confidence };
}

/** Deterministic factor skeleton — AI phrases these later. */
export function reasoningFactors(
  scores: AnalyzerScores,
  metrics: PositionMetricsResult,
  dayChangePct: number | null,
): AlphaEdgeComputedFactor[] {
  const factors: AlphaEdgeComputedFactor[] = [];

  if (scores.valuation != null) {
    factors.push({
      id: 'valuation',
      label: 'Valuation',
      direction: scores.valuation >= 65 ? 'supports_buy'
        : scores.valuation <= 40 ? 'supports_sell' : 'neutral',
      value: `Analyzer valuation score ${scores.valuation}/100`,
    });
  } else {
    factors.push({
      id: 'valuation',
      label: 'Valuation',
      direction: 'neutral',
      value: 'data unavailable',
    });
  }

  if (scores.financialHealth != null) {
    factors.push({
      id: 'health',
      label: 'Financial Health',
      direction: scores.financialHealth >= 70 ? 'supports_buy'
        : scores.financialHealth <= 45 ? 'supports_sell' : 'neutral',
      value: `Health score ${scores.financialHealth}/100`,
    });
  }

  if (scores.growth != null) {
    factors.push({
      id: 'growth',
      label: 'Growth',
      direction: scores.growth >= 65 ? 'supports_buy'
        : scores.growth <= 40 ? 'supports_sell' : 'neutral',
      value: `Growth score ${scores.growth}/100`,
    });
  }

  if (scores.sentiment != null && dayChangePct != null) {
    factors.push({
      id: 'momentum',
      label: 'Momentum',
      direction: dayChangePct > 0.5 ? 'supports_buy'
        : dayChangePct < -0.5 ? 'supports_sell' : 'neutral',
      value: `Day change ${dayChangePct >= 0 ? '+' : ''}${dayChangePct.toFixed(2)}%`,
    });
  }

  if (metrics.unrealizedPnlPct != null) {
    const pnl = metrics.unrealizedPnlPct;
    factors.push({
      id: 'position',
      label: 'Position P&L',
      direction: pnl > 20 ? 'supports_sell'
        : pnl < -10 ? 'supports_sell'
        : pnl > 0 ? 'supports_buy' : 'neutral',
      value: `Unrealized ${pnl >= 0 ? 'gain' : 'loss'} ${pnl.toFixed(1)}%`,
    });
  }

  if (metrics.currentPrice != null && metrics.stopLoss != null) {
    const buffer = metrics.distanceToStopPct ?? 0;
    factors.push({
      id: 'risk',
      label: 'Risk vs Stop',
      direction: buffer < 5 ? 'supports_sell' : buffer > 15 ? 'supports_buy' : 'neutral',
      value: buffer < 5
        ? `Price ${buffer.toFixed(1)}% above stop — elevated risk`
        : `Stop ${buffer.toFixed(1)}% below current`,
    });
  }

  return factors;
}

function scenarioPnl(buy: number, price: number | null, qty: number) {
  if (price == null) return { pnlAmount: null, pnlPct: null };
  const pnlAmount = (price - buy) * qty;
  const pnlPct = buy > 0 ? ((price - buy) / buy) * 100 : null;
  return { pnlAmount, pnlPct };
}

export function exitStrategy(
  metrics: PositionMetricsResult,
  signal: AlphaEdgeSignal,
  fundamentals: StockFundamentals | null,
  currency: string,
): AlphaEdgeExitRow[] {
  const sym = currency === 'INR' ? '₹' : '$';
  const fmt = (n: number | null) => (n != null ? `${sym}${n.toFixed(2)}` : 'data unavailable');

  const suggested: Record<AlphaEdgeSignal, string> = {
    buy: 'Signal supports adding — consider scaling in up to 25% of current lot on dips.',
    hold: 'Signal is neutral — maintain size; reassess on next earnings or stop breach.',
    sell: 'Signal supports reducing — trim 30–50% now; exit remainder on stop or target.',
  };

  const current = metrics.currentPrice;
  const trimLevel = current != null
    ? current * (signal === 'buy' ? 0.97 : 1.03)
    : null;
  const recommendedStop = metrics.stopLoss
    ?? (current != null ? current * 0.92 : null);
  const recommendedTarget = metrics.targetPrice
    ?? (current != null ? current * 1.12 : null);

  const rows: AlphaEdgeExitRow[] = [
    { label: 'Suggested action now', value: suggested[signal] },
    { label: 'Trim / add level', value: fmt(trimLevel), unavailable: trimLevel == null },
    { label: 'Stop-loss recommendation', value: fmt(recommendedStop), unavailable: recommendedStop == null },
    { label: 'Target', value: fmt(recommendedTarget), unavailable: recommendedTarget == null },
  ];

  if (fundamentals?.pe != null) {
    rows.push({
      label: 'Valuation context',
      value: `P/E ${fundamentals.pe.toFixed(1)} (${fundamentals.sector} sector)`,
    });
  }

  return rows;
}

export function buildScenarios(metrics: PositionMetricsResult): AlphaEdgeScenario[] {
  const { buyPrice, quantity, currentPrice } = metrics;
  const dropPrice = metrics.stopLoss ?? (currentPrice != null ? currentPrice * 0.9 : null);
  const targetPrice = metrics.targetPrice ?? (currentPrice != null ? currentPrice * 1.1 : null);

  return [
    {
      label: `If it drops to ${dropPrice != null ? dropPrice.toFixed(2) : 'stop'}`,
      price: dropPrice,
      ...scenarioPnl(buyPrice, dropPrice, quantity),
      unavailable: dropPrice == null,
    },
    {
      label: `If it hits target ${targetPrice != null ? targetPrice.toFixed(2) : ''}`,
      price: targetPrice,
      ...scenarioPnl(buyPrice, targetPrice, quantity),
      unavailable: targetPrice == null,
    },
  ];
}

/** Full Layer 2 pipeline — pure, deterministic. */
export function computeAlphaEdge(
  scores: AnalyzerScores,
  positionInput: PositionMetricsInput,
  dayChangePct: number | null,
  fundamentals: StockFundamentals | null,
  currency: string,
): AlphaEdgeComputed {
  const positionMetricsResult = positionMetrics(positionInput);
  const { score, reducedConfidence } = signalScore(scores, positionMetricsResult);
  const factors = reasoningFactors(scores, positionMetricsResult, dayChangePct);
  const { verdict: v, confidence } = verdict(score, factors, reducedConfidence);

  return {
    signalScore: score,
    verdict: v,
    confidence,
    reducedConfidence,
    positionMetrics: positionMetricsResult,
    reasoningFactors: factors,
    exitStrategy: exitStrategy(positionMetricsResult, v, fundamentals, currency),
    scenarios: buildScenarios(positionMetricsResult),
  };
}
