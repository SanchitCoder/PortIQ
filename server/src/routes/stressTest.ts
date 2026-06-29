import { Router } from 'express';
import { z } from 'zod';
import type { StressTestResponse } from '../../shared/api-types.js';
import { cacheGet, cacheKey, cacheSet, stableHash } from '../lib/cache.js';
import { getQuotes } from '../services/marketData.js';
import {
  correlationClusters,
  enrichHoldings,
  portfolioMetrics,
  stressTest,
} from '../services/compute.js';
import { interpretStressTest } from '../services/ai.js';

const HoldingSchema = z.object({
  id: z.string().optional(),
  symbol: z.string(),
  exchange: z.enum(['NSE', 'BSE', 'NYSE', 'NASDAQ']),
  quantity: z.number(),
  avgBuyPrice: z.number(),
  buyDate: z.string().optional(),
});

const ScenarioSchema = z.object({
  interestRateBps: z.number().optional(),
  fxPct: z.number().optional(),
  marketPct: z.number().optional(),
  sectorShocks: z.record(z.string(), z.number()).optional(),
  stockShocks: z.record(z.string(), z.number()).optional(),
  label: z.string().optional(),
});

const StressSchema = z.object({
  holdings: z.array(HoldingSchema).min(1),
  scenario: ScenarioSchema,
});

const STRESS_CACHE_TTL = Number(process.env.STRESS_CACHE_TTL_MS ?? 60_000);

export const stressTestRouter = Router();

/**
 * POST /api/stress-test
 * Flow: quotes (L1) → stressTest + correlationClusters (L2) → AI narrative (L3)
 */
stressTestRouter.post('/', async (req, res) => {
  const parsed = StressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const redisKey = cacheKey('cache', `stress:${stableHash(parsed.data)}`);
  const cached = await cacheGet<StressTestResponse>(redisKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const holdings = parsed.data.holdings.map(h => ({
      ...h,
      id: h.id ?? h.symbol,
    }));

    const quotes = await getQuotes(
      holdings.map(h => ({ symbol: h.symbol, exchange: h.exchange })),
      { forceRefresh: true },
    );
    const enriched = enrichHoldings(holdings, quotes);
    const metrics = portfolioMetrics(enriched);

    const stress = stressTest(metrics.holdings, parsed.data.scenario);
    const clusters = correlationClusters(metrics.holdings);

    const qualitative = await interpretStressTest(
      stress,
      clusters,
      parsed.data.scenario.label ?? 'Custom scenario',
    );

    const response: StressTestResponse = {
      drawdownPct: stress.drawdownPct,
      valueBefore: stress.valueBefore,
      valueAfter: stress.valueAfter,
      rankedContributions: stress.rankedContributions,
      clusters,
      suggestedActions: qualitative.suggestedActions,
    };

    await cacheSet(redisKey, response, STRESS_CACHE_TTL);
    res.json(response);
  } catch (err) {
    console.error('[stress-test]', err);
    res.status(500).json({ error: 'Stress test failed' });
  }
});
