import type { Exchange, StockAnalysisScorecard } from '../../../shared/api-types.js';
import { SECTOR_BENCHMARKS } from '../config/stockPeers.js';
import { cacheGet, cacheKey, cacheSet } from '../lib/cache.js';
import { clamp, inferExchange } from '../lib/symbolUtils.js';
import { getFundamentals } from './fundamentals.js';
import { getQuotes } from './marketData.js';

const CACHE_TTL_MS = Number(process.env.ANALYZER_COMPUTE_CACHE_TTL_MS ?? 120_000);

function scoreTag(value: number, bands: [number, string][]): string {
  for (const [threshold, tag] of bands) {
    if (value >= threshold) return tag;
  }
  return bands[bands.length - 1]?.[1] ?? 'Neutral';
}

/** Deterministic four-score card — shared by Stock Analyzer and AlphaEdge Layer 1. */
export function buildScorecard(
  pe: number | null,
  roe: number | null,
  debtEquity: number | null,
  revenueGrowth: number | null,
  profitMargin: number | null,
  dayChangePct: number | null,
  sector: string,
): StockAnalysisScorecard {
  const bench = SECTOR_BENCHMARKS[sector] ?? SECTOR_BENCHMARKS.Other;

  const valuationScore = pe != null && pe > 0
    ? clamp(100 - Math.abs(pe - bench.pe) * 2)
    : 50;
  const healthScore = clamp(
    (roe != null ? Math.min(roe * 2.5, 40) : 20)
    + (debtEquity != null ? Math.max(30 - debtEquity * 15, 0) : 15)
    + 25,
  );
  const growthScore = revenueGrowth != null
    ? clamp(40 + revenueGrowth * 3)
    : 50;
  const sentimentScore = clamp(50 + (dayChangePct ?? 0) * 2);

  const overall = clamp(
    valuationScore * 0.25 + healthScore * 0.3 + growthScore * 0.25 + sentimentScore * 0.2,
  );

  return {
    valuation: {
      value: valuationScore,
      tag: scoreTag(valuationScore, [[70, 'Undervalued'], [45, 'Fair'], [0, 'Expensive']]),
    },
    financialHealth: {
      value: healthScore,
      tag: scoreTag(healthScore, [[75, 'Strong'], [50, 'Stable'], [0, 'Weak']]),
    },
    growth: {
      value: growthScore,
      tag: scoreTag(growthScore, [[70, 'Accelerating'], [45, 'Steady'], [0, 'Slowing']]),
    },
    sentiment: {
      value: sentimentScore,
      tag: scoreTag(sentimentScore, [[65, 'Bullish'], [40, 'Neutral'], [0, 'Bearish']]),
    },
    overallVerdict: scoreTag(overall, [[70, 'Attractive'], [50, 'Hold'], [0, 'Cautious']]),
  };
}

export interface AnalyzerScores {
  valuation: number | null;
  financialHealth: number | null;
  growth: number | null;
  sentiment: number | null;
  overall: number | null;
}

/** Cached analyzer compute output — Redis key: portiq:cache:analyzer-compute:{symbol}:{exchange} */
export interface AnalyzerComputeResult {
  symbol: string;
  exchange: Exchange;
  sector: string;
  companyName: string;
  currency: string;
  scores: AnalyzerScores;
  scorecard: StockAnalysisScorecard;
  dayChangePct: number | null;
  /** Some fundamental inputs missing — scores may use defaults */
  partial: boolean;
  /** Fundamentals fetch failed entirely */
  unavailable: boolean;
}

/**
 * Layer 1 — reuse analyzer scores (getFundamentals + getQuotes + buildScorecard).
 * Cached per symbol+exchange so AlphaEdge and Stock Analyzer share the same compute output.
 */
export async function getAnalyzerCompute(
  symbol: string,
  exchange?: Exchange,
): Promise<AnalyzerComputeResult> {
  const sym = symbol.trim().toUpperCase();
  const ex = inferExchange(sym, exchange);
  const redisKey = cacheKey('cache', `analyzer-compute:${sym}:${ex}`);

  const cached = await cacheGet<AnalyzerComputeResult>(redisKey);
  if (cached) return cached;

  const [fundamentals, quotes] = await Promise.all([
    getFundamentals(sym, ex),
    getQuotes([{ symbol: sym, exchange: ex }]),
  ]);

  const dayChangePct = quotes[0]?.dayChangePct ?? null;

  const scorecard = buildScorecard(
    fundamentals.pe,
    fundamentals.roe,
    fundamentals.debtEquity,
    fundamentals.revenueGrowth,
    fundamentals.profitMargin,
    dayChangePct,
    fundamentals.sector,
  );

  const partial = fundamentals.unavailable
    || [fundamentals.pe, fundamentals.roe, fundamentals.revenueGrowth].some(v => v == null);

  const overall = clamp(
    scorecard.valuation.value * 0.25
    + scorecard.financialHealth.value * 0.3
    + scorecard.growth.value * 0.25
    + scorecard.sentiment.value * 0.2,
  );

  const result: AnalyzerComputeResult = {
    symbol: sym,
    exchange: ex,
    sector: fundamentals.sector,
    companyName: fundamentals.companyName,
    currency: fundamentals.currency,
    scores: {
      valuation: fundamentals.pe != null ? scorecard.valuation.value : null,
      financialHealth: fundamentals.roe != null ? scorecard.financialHealth.value : null,
      growth: fundamentals.revenueGrowth != null ? scorecard.growth.value : null,
      sentiment: dayChangePct != null ? scorecard.sentiment.value : null,
      overall: partial && fundamentals.unavailable ? null : overall,
    },
    scorecard,
    dayChangePct,
    partial,
    unavailable: fundamentals.unavailable,
  };

  await cacheSet(redisKey, result, CACHE_TTL_MS);
  return result;
}
