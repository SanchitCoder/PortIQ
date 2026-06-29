import YahooFinance from 'yahoo-finance2';
import type { Exchange } from '../../shared/api-types.js';
import { resolveSector } from '../config/sectorFactors.js';
import { cacheGet, cacheKey, cacheSet } from '../lib/cache.js';
import { inferExchange, toYahooSymbol } from '../lib/symbolUtils.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const CACHE_TTL_MS = Number(process.env.FUNDAMENTALS_CACHE_TTL_MS ?? 120_000);

/** Layer 1 — normalized fundamentals from Yahoo quoteSummary (Redis-cached). */
export interface StockFundamentals {
  symbol: string;
  exchange: Exchange;
  companyName: string;
  currency: string;
  sector: string;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  debtEquity: number | null;
  revenueGrowth: number | null;
  profitMargin: number | null;
  currentRatio: number | null;
  eps: number | null;
  /** True when quoteSummary failed entirely */
  unavailable: boolean;
}

export async function getFundamentals(
  symbol: string,
  exchange?: Exchange,
): Promise<StockFundamentals> {
  const sym = symbol.trim().toUpperCase();
  const ex = inferExchange(sym, exchange);
  const redisKey = cacheKey('cache', `fundamentals:${sym}:${ex}`);

  const cached = await cacheGet<StockFundamentals>(redisKey);
  if (cached) return cached;

  const yahooSym = toYahooSymbol(sym, ex);
  const sector = resolveSector(sym);

  try {
    const summary = await yahooFinance.quoteSummary(yahooSym, {
      modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'summaryProfile'],
    });

    const fin = summary.financialData;
    const stats = summary.defaultKeyStatistics;
    const detail = summary.summaryDetail;

    const result: StockFundamentals = {
      symbol: sym,
      exchange: ex,
      companyName: String(
        summary.price?.longName ?? summary.summaryProfile?.longName ?? sym,
      ),
      currency: summary.price?.currency ?? (ex === 'NSE' || ex === 'BSE' ? 'INR' : 'USD'),
      sector,
      pe: stats?.trailingPE != null ? Number(stats.trailingPE)
        : detail?.trailingPE != null ? Number(detail.trailingPE) : null,
      pb: stats?.priceToBook != null ? Number(stats.priceToBook) : null,
      roe: fin?.returnOnEquity != null ? Number(fin.returnOnEquity) * 100 : null,
      debtEquity: fin?.debtToEquity != null ? Number(fin.debtToEquity) / 100 : null,
      revenueGrowth: fin?.revenueGrowth != null ? Number(fin.revenueGrowth) * 100 : null,
      profitMargin: fin?.profitMargins != null ? Number(fin.profitMargins) * 100 : null,
      currentRatio: fin?.currentRatio != null ? Number(fin.currentRatio) : null,
      eps: stats?.trailingEps != null ? Number(stats.trailingEps) : null,
      unavailable: false,
    };

    await cacheSet(redisKey, result, CACHE_TTL_MS);
    return result;
  } catch (err) {
    console.warn(`[fundamentals] ${sym} (${ex}):`, err);
    const fallback: StockFundamentals = {
      symbol: sym,
      exchange: ex,
      companyName: sym,
      currency: ex === 'NSE' || ex === 'BSE' ? 'INR' : 'USD',
      sector,
      pe: null,
      pb: null,
      roe: null,
      debtEquity: null,
      revenueGrowth: null,
      profitMargin: null,
      currentRatio: null,
      eps: null,
      unavailable: true,
    };
    await cacheSet(redisKey, fallback, Math.min(CACHE_TTL_MS, 30_000));
    return fallback;
  }
}
