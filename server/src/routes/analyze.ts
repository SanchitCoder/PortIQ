import { Router } from 'express';
import { z } from 'zod';
import { runPortfolioAnalysis, getAnalysisForExport } from '../services/portfolioAnalyze.js';
import { generatePortfolioPdf } from '../services/portfolioAnalysisPdf.js';

const HoldingSchema = z.object({
  id: z.string().optional(),
  symbol: z.string(),
  exchange: z.enum(['NSE', 'BSE', 'NYSE', 'NASDAQ']),
  quantity: z.number(),
  avgBuyPrice: z.number(),
  buyDate: z.string().optional(),
});

const AnalyzeSchema = z.object({
  holdings: z.array(HoldingSchema).min(1),
});

const ExportPdfSchema = z.object({
  holdings: z.array(HoldingSchema).min(1).optional(),
  userEmail: z.string().email().optional(),
  analysisId: z.string().optional(),
});

export const analyzeRouter = Router();

/**
 * POST /api/portfolio/analyze
 * Flow: quotes (L1) → metrics + risk + quantified actions (L2) → AI qualitative (L3)
 */
analyzeRouter.post('/', async (req, res) => {
  const parsed = AnalyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const holdings = parsed.data.holdings.map(h => ({
      ...h,
      id: h.id ?? h.symbol,
    }));
    const response = await runPortfolioAnalysis(holdings, { forceRefresh: true });
    res.json(response);
  } catch (err) {
    console.error('[analyze]', err);
    res.status(500).json({ error: 'Portfolio analysis failed' });
  }
});

/**
 * POST /api/portfolio/analyze/export-pdf
 * Reuses cached analysis when available — does not re-run AI for export alone.
 */
analyzeRouter.post('/export-pdf', async (req, res) => {
  const parsed = ExportPdfSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (!parsed.data.holdings?.length) {
    res.status(400).json({ error: 'holdings array is required for PDF export' });
    return;
  }

  try {
    const holdings = parsed.data.holdings.map(h => ({
      ...h,
      id: h.id ?? h.symbol,
    }));

    const analysis = await getAnalysisForExport(holdings);
    const pdfBuffer = await generatePortfolioPdf(analysis, parsed.data.userEmail);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `PortIQ-Portfolio-Report-${date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[analyze/export-pdf]', err);
    res.status(500).json({ error: 'PDF export failed' });
  }
});
