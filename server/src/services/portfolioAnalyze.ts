import type { Holding, PortfolioAnalysisResponse } from '../../shared/api-types.js';
import { cacheGet, cacheKey, cacheSet, stableHash } from '../lib/cache.js';
import { getQuotes } from './marketData.js';
import {
  enrichHoldings,
  portfolioMetrics,
  riskMetrics,
} from './compute.js';
import { generateActionPlan, PORTFOLIO_ACTION_DISCLAIMER } from './portfolioActions.js';
import { analyzeFallback, interpretPortfolioAnalysis, phrasePortfolioActionPlan } from './ai.js';

const ANALYZE_CACHE_TTL = Number(process.env.ANALYZE_CACHE_TTL_MS ?? 60_000);

export function portfolioAnalyzeCacheKey(holdings: Holding[]): string {
  const normalized = holdings.map(h => ({
    symbol: h.symbol,
    exchange: h.exchange,
    quantity: h.quantity,
    avgBuyPrice: h.avgBuyPrice,
    buyDate: h.buyDate,
  }));
  return cacheKey('cache', `analyze:${stableHash({ holdings: normalized })}`);
}

export interface RunAnalysisOptions {
  /** When false, skip OpenRouter (deterministic AI fallbacks only) — used for PDF export cache miss */
  useAi?: boolean;
  forceRefresh?: boolean;
}

/** Shared L1 → L2 → L3 pipeline for POST /api/portfolio/analyze and PDF export */
export async function runPortfolioAnalysis(
  holdingsInput: Holding[],
  options: RunAnalysisOptions = {},
): Promise<PortfolioAnalysisResponse> {
  const useAi = options.useAi !== false;
  const holdings = holdingsInput.map(h => ({
    ...h,
    id: h.id ?? h.symbol,
  }));

  const redisKey = portfolioAnalyzeCacheKey(holdings);
  if (!options.forceRefresh) {
    const cached = await cacheGet<PortfolioAnalysisResponse>(redisKey);
    if (cached) return cached;
  }

  const quotes = await getQuotes(
    holdings.map(h => ({ symbol: h.symbol, exchange: h.exchange })),
    { forceRefresh: options.forceRefresh ?? false },
  );

  const enriched = enrichHoldings(holdings, quotes).map((h, i) => ({
    ...h,
    dayChangePct: quotes[i]?.dayChangePct ?? 0,
  }));

  const metrics = portfolioMetrics(enriched);
  const risk = riskMetrics(metrics.holdings);
  const computedPlan = generateActionPlan(metrics, risk);

  let qualitative;
  let phrasedPlan;
  if (useAi) {
    [qualitative, phrasedPlan] = await Promise.all([
      interpretPortfolioAnalysis(metrics, risk),
      phrasePortfolioActionPlan(computedPlan, metrics, risk),
    ]);
  } else {
    qualitative = analyzeFallback(metrics, risk);
    phrasedPlan = {
      summary: computedPlan.actions.length > 0
        ? `Portfolio review suggests ${computedPlan.actions.length} specific action(s) — starting with: ${computedPlan.nextBestAction.title}.`
        : 'No high-priority rebalances flagged.',
      actionRationales: computedPlan.actions.map(a => a.detail),
    };
  }

  const response: PortfolioAnalysisResponse = {
    healthScore: risk.healthScore,
    riskScore: risk.riskScore,
    concentration: {
      hhi: risk.hhi,
      maxWeight: risk.maxWeight,
      warnings: risk.warnings,
    },
    diversification: {
      score: risk.diversificationScore,
      warnings: risk.warnings,
    },
    sectorAllocation: risk.sectorAllocation,
    insights: qualitative.insights,
    suggestedActions: qualitative.suggestedActions,
    actionPlan: {
      nextBestAction: computedPlan.nextBestAction,
      actions: computedPlan.actions.map((a, i) => ({
        ...a,
        rationale: phrasedPlan.actionRationales[i] ?? a.detail,
      })),
      summary: phrasedPlan.summary,
      disclaimer: PORTFOLIO_ACTION_DISCLAIMER,
    },
    portfolioSummary: {
      totalInvested: metrics.totalInvested,
      currentValue: metrics.currentValue,
      totalPnl: metrics.totalPnl,
      totalPnlPct: Math.round(metrics.totalPnlPct * 100) / 100,
    },
    holdingsSnapshot: metrics.holdings.map(h => ({
      symbol: h.symbol,
      exchange: h.exchange,
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      currentPrice: h.price,
      pnl: Math.round(h.pnl),
      pnlPct: Math.round(h.pnlPct * 100) / 100,
      weight: Math.round(h.weight * 100) / 100,
    })),
    generatedAt: new Date().toISOString(),
  };

  await cacheSet(redisKey, response, ANALYZE_CACHE_TTL);
  return response;
}

/** Load cached analysis or build deterministically (no AI) for PDF export */
export async function getAnalysisForExport(holdings: Holding[]): Promise<PortfolioAnalysisResponse> {
  const redisKey = portfolioAnalyzeCacheKey(holdings);
  const cached = await cacheGet<PortfolioAnalysisResponse>(redisKey);
  if (cached) return cached;
  return runPortfolioAnalysis(holdings, { useAi: false });
}
