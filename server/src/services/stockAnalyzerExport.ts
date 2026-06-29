import type { StockAnalysisResponse, StockAnalyzerRequest } from '../../../shared/api-types.js';
import { cacheGet, cacheKey, cacheSet, stableHash } from '../lib/cache.js';
import { analyzeStock } from './stockAnalyzer.js';

const CACHE_TTL = Number(process.env.STOCK_ANALYZER_CACHE_TTL_MS ?? 120_000);

export function stockAnalyzerCacheKey(input: StockAnalyzerRequest): string {
  return cacheKey('cache', `stock:${stableHash(input)}`);
}

/** Load cached report or build deterministically (no AI) for PDF export */
export async function getStockAnalysisForExport(
  input: StockAnalyzerRequest,
): Promise<StockAnalysisResponse> {
  const redisKey = stockAnalyzerCacheKey(input);
  const cached = await cacheGet<StockAnalysisResponse>(redisKey);
  if (cached) return cached;
  const report = await analyzeStock(input.symbol, input.exchange, { useAi: false });
  await cacheSet(redisKey, report, CACHE_TTL);
  return report;
}
