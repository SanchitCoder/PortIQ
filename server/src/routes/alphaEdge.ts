import { Router } from 'express';
import { z } from 'zod';
import type { AlphaEdgeVerdict } from '../../../shared/api-types.js';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { evaluateAlphaEdge } from '../services/alphaEdge.js';
import { alphaEdgeCacheKey, getVerdictForExport } from '../services/alphaEdgeExport.js';
import { generateAlphaEdgePdf } from '../services/alphaEdgePdf.js';

const EvaluateSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.enum(['NSE', 'BSE', 'NYSE', 'NASDAQ']).optional(),
  buyPrice: z.number().positive(),
  quantity: z.number().positive(),
  currentPrice: z.number().positive().optional(),
  targetPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  context: z.string().optional(),
});

const ExportPdfSchema = EvaluateSchema.extend({
  userEmail: z.string().email().optional(),
});

const CACHE_TTL = Number(process.env.ALPHAEDGE_CACHE_TTL_MS ?? 60_000);

export const alphaEdgeRouter = Router();

/** POST /api/alphaedge/evaluate — position-aware Buy/Hold/Sell verdict */
alphaEdgeRouter.post('/evaluate', async (req, res) => {
  const parsed = EvaluateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const redisKey = alphaEdgeCacheKey(parsed.data);
  const cached = await cacheGet<AlphaEdgeVerdict>(redisKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const verdict = await evaluateAlphaEdge(parsed.data);
    await cacheSet(redisKey, verdict, CACHE_TTL);
    res.json(verdict);
  } catch (err) {
    console.error('[alphaedge/evaluate]', err);
    res.status(500).json({ error: 'AlphaEdge evaluation failed' });
  }
});

/**
 * POST /api/alphaedge/evaluate/export-pdf
 * Reuses cached verdict when available — does not re-run AI for export alone.
 */
alphaEdgeRouter.post('/evaluate/export-pdf', async (req, res) => {
  const parsed = ExportPdfSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const { userEmail, ...evaluateInput } = parsed.data;
    const verdict = await getVerdictForExport(evaluateInput);
    const pdfBuffer = await generateAlphaEdgePdf(verdict, userEmail);

    const date = new Date().toISOString().slice(0, 10);
    const symbol = verdict.header.symbol.replace(/[^A-Za-z0-9.-]/g, '');
    const filename = `PortIQ-AlphaEdge-${symbol}-${date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[alphaedge/evaluate/export-pdf]', err);
    res.status(500).json({ error: 'AlphaEdge PDF export failed' });
  }
});
