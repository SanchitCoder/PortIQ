import { Router } from 'express';
import { z } from 'zod';
import type { StockAnalysisResponse } from '../../../shared/api-types.js';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { analyzeStock } from '../services/stockAnalyzer.js';
import { generateStockAnalysisPdf } from '../services/stockAnalysisPdf.js';
import { getStockAnalysisForExport, stockAnalyzerCacheKey } from '../services/stockAnalyzerExport.js';

const StockSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.enum(['NSE', 'BSE', 'NYSE', 'NASDAQ']).optional(),
});

const ExportPdfSchema = StockSchema.extend({
  userEmail: z.string().email().optional(),
});

const CACHE_TTL = Number(process.env.STOCK_ANALYZER_CACHE_TTL_MS ?? 120_000);

export const analyzerRouter = Router();

/** POST /api/analyzer/stock — structured equity report (L1 data + deterministic scores + L3 AI synthesis) */
analyzerRouter.post('/stock', async (req, res) => {
  const parsed = StockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const redisKey = stockAnalyzerCacheKey(parsed.data);
  const cached = await cacheGet<StockAnalysisResponse>(redisKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const report = await analyzeStock(parsed.data.symbol, parsed.data.exchange);
    await cacheSet(redisKey, report, CACHE_TTL);
    res.json(report);
  } catch (err) {
    console.error('[analyzer/stock]', err);
    res.status(500).json({ error: 'Stock analysis failed' });
  }
});

/**
 * POST /api/analyzer/stock/export-pdf
 * Reuses cached analysis when available — does not re-run AI for export alone.
 */
analyzerRouter.post('/stock/export-pdf', async (req, res) => {
  const parsed = ExportPdfSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const { userEmail, ...analyzeInput } = parsed.data;
    const report = await getStockAnalysisForExport(analyzeInput);
    const pdfBuffer = await generateStockAnalysisPdf(report, userEmail);

    const date = new Date().toISOString().slice(0, 10);
    const symbol = report.header.symbol.replace(/[^A-Za-z0-9.-]/g, '');
    const filename = `PortIQ-Stock-Report-${symbol}-${date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[analyzer/stock/export-pdf]', err);
    res.status(500).json({ error: 'Stock analysis PDF export failed' });
  }
});
