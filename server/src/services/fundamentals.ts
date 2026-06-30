import YahooFinance from 'yahoo-finance2';
import type { Exchange } from '../../shared/api-types.js';
import { resolveSector } from '../config/sectorFactors.js';
import { cacheGet, cacheKey, cacheSet } from '../lib/cache.js';
import {
  fetchFmpIncomeGrowth,
  fetchFmpProfile,
  fetchFmpQuoteForSymbol,
  fetchFmpRatiosTtm,
  isFmpProvider,
} from '../lib/fmp.js';
import { inferExchange, toYahooSymbol } from '../lib/symbolUtils.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const CACHE_TTL_MS = Number(process.env.FUNDAMENTALS_CACHE_TTL_MS ?? 120_000);

/** Layer 1 — normalized fundamentals (FMP in production, Yahoo for local dev). */
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
  unavailable: boolean;
}

function unavailableFundamentals(sym: string, ex: Exchange): StockFundamentals {
  return {
    symbol: sym,
    exchange: ex,
    companyName: sym,
    currency: ex === 'NSE' || ex === 'BSE' ? 'INR' : 'USD',
    sector: resolveSector(sym),
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
}

async function getFundamentalsFromFmp(sym: string, ex: Exchange): Promise<StockFundamentals> {
  const sector = resolveSector(sym);
  const [quote, profile, ratios, growth] = await Promise.all([
    fetchFmpQuoteForSymbol(sym, ex),
    fetchFmpProfile(sym, ex),
    fetchFmpRatiosTtm(sym, ex),
    fetchFmpIncomeGrowth(sym, ex),
  ]);

  if (!quote && !profile && !ratios) {
    return unavailableFundamentals(sym, ex);
  }

  const revenueGrowthRaw = growth?.revenueGrowth;
  const revenueGrowth = revenueGrowthRaw != null ? Number(revenueGrowthRaw) * 100 : null;

  return {
    symbol: sym,
    exchange: ex,
    companyName: profile?.companyName ?? quote?.name ?? sym,
    currency: profile?.currency ?? (ex === 'NSE' || ex === 'BSE' ? 'INR' : 'USD'),
    sector: profile?.sector ?? sector,
    pe: quote?.pe != null ? Number(quote.pe) : ratios?.peRatioTTM ?? null,
    pb: ratios?.priceToBookRatioTTM ?? null,
    roe: ratios?.returnOnEquityTTM != null ? Number(ratios.returnOnEquityTTM) * 100 : null,
    debtEquity: ratios?.debtEquityRatioTTM ?? null,
    revenueGrowth,
    profitMargin: ratios?.netProfitMarginTTM != null ? Number(ratios.netProfitMarginTTM) * 100 : null,
    currentRatio: ratios?.currentRatioTTM ?? null,
    eps: quote?.eps != null ? Number(quote.eps) : null,
    unavailable: false,
  };
}

async function getFundamentalsFromYahoo(sym: string, ex: Exchange): Promise<StockFundamentals> {
  const yahooSym = toYahooSymbol(sym, ex);
  const sector = resolveSector(sym);

  const summary = await yahooFinance.quoteSummary(yahooSym, {
    modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'summaryProfile'],
  });

  const fin = summary.financialData;
  const stats = summary.defaultKeyStatistics;
  const detail = summary.summaryDetail;

  return {
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
}

export async function getFundamentals(
  symbol: string,
  exchange?: Exchange,
): Promise<StockFundamentals> {
  const sym = symbol.trim().toUpperCase();
  const ex = inferExchange(sym, exchange);
  const provider = isFmpProvider() ? 'fmp' : 'yahoo';
  const redisKey = cacheKey('cache', `fundamentals:${provider}:${sym}:${ex}`);

  const cached = await cacheGet<StockFundamentals>(redisKey);
  if (cached) return cached;

  try {
    const result = isFmpProvider()
      ? await getFundamentalsFromFmp(sym, ex)
      : await getFundamentalsFromYahoo(sym, ex);

    await cacheSet(redisKey, result, CACHE_TTL_MS);
    return result;
  } catch (err) {
    console.warn(`[fundamentals/${provider}] ${sym} (${ex}):`, err);
    const fallback = unavailableFundamentals(sym, ex);
    await cacheSet(redisKey, fallback, Math.min(CACHE_TTL_MS, 30_000));
    return fallback;
  }
}
