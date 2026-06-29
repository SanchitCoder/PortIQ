import { Router } from 'express';
import { z } from 'zod';
import type { PriceQuote, PricesResponse } from '../../../shared/api-types.js';
import { getQuotes } from '../services/marketData.js';
import { resolveSector } from '../config/sectorFactors.js';

const PricesSchema = z.object({
  symbols: z.array(z.object({
    symbol: z.string().min(1),
    exchange: z.enum(['NSE', 'BSE', 'NYSE', 'NASDAQ']),
  })).min(1),
  refresh: z.boolean().optional(),
});

export const pricesRouter = Router();

/** POST /api/prices — Layer 1 batched quotes */
pricesRouter.post('/', async (req, res) => {
  const parsed = PricesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const quotes = await getQuotes(parsed.data.symbols, {
      forceRefresh: parsed.data.refresh ?? false,
    });
    const prices: PriceQuote[] = quotes.map(q => ({
      symbol: q.symbol,
      exchange: q.exchange,
      currentPrice: q.price,
      dayChange: q.price * (q.dayChangePct / 100) / (1 + q.dayChangePct / 100),
      dayChangePct: q.dayChangePct,
      sector: resolveSector(q.symbol),
      stale: q.stale,
    }));

    const body: PricesResponse = { prices };
    res.json(body);
  } catch (err) {
    console.error('[prices]', err);
    res.status(502).json({ error: 'Failed to fetch prices' });
  }
});
