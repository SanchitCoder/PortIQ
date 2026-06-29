import type {
  AlphaEdgeEvaluateRequest,
  AlphaEdgeVerdict,
} from '../../shared/api-types.js';
import { cacheGet, cacheKey, cacheSet, stableHash } from '../lib/cache.js';
import { evaluateAlphaEdge } from './alphaEdge.js';

const CACHE_TTL = Number(process.env.ALPHAEDGE_CACHE_TTL_MS ?? 60_000);

export function alphaEdgeCacheKey(input: AlphaEdgeEvaluateRequest): string {
  return cacheKey('cache', `alphaedge:${stableHash(input)}`);
}

/** Load cached verdict or build deterministically (no AI) for PDF export */
export async function getVerdictForExport(input: AlphaEdgeEvaluateRequest): Promise<AlphaEdgeVerdict> {
  const redisKey = alphaEdgeCacheKey(input);
  const cached = await cacheGet<AlphaEdgeVerdict>(redisKey);
  if (cached) return cached;
  const verdict = await evaluateAlphaEdge(input, { useAi: false });
  await cacheSet(redisKey, verdict, CACHE_TTL);
  return verdict;
}
