import { Router } from 'express';
import { z } from 'zod';
import {
  createHolding,
  deleteHoldingRecord,
  getHolding,
  listHoldings,
  updateHolding,
} from '../db/portfolio.js';

const AddSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.enum(['NSE', 'BSE', 'NYSE', 'NASDAQ']),
  quantity: z.number().positive(),
  avgBuyPrice: z.number().positive(),
  buyDate: z.string().optional(),
});

const UpdateSchema = AddSchema.partial();

export const portfolioRouter = Router();

/** GET /api/portfolio */
portfolioRouter.get('/', async (_req, res) => {
  try {
    res.json(await listHoldings());
  } catch (err) {
    console.error('[portfolio] list', err);
    res.status(500).json({ error: 'Failed to load holdings' });
  }
});

/** POST /api/portfolio */
portfolioRouter.post('/', async (req, res) => {
  const parsed = AddSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const holding = await createHolding(parsed.data);
    res.status(201).json(holding);
  } catch (err) {
    console.error('[portfolio] create', err);
    res.status(500).json({ error: 'Failed to create holding' });
  }
});

/** PUT /api/portfolio/:id */
portfolioRouter.put('/:id', async (req, res) => {
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const updated = await updateHolding(req.params.id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Holding not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('[portfolio] update', err);
    res.status(500).json({ error: 'Failed to update holding' });
  }
});

/** DELETE /api/portfolio/:id */
portfolioRouter.delete('/:id', async (req, res) => {
  try {
    const ok = await deleteHoldingRecord(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Holding not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error('[portfolio] delete', err);
    res.status(500).json({ error: 'Failed to delete holding' });
  }
});

/** GET /api/portfolio/:id */
portfolioRouter.get('/:id', async (req, res) => {
  try {
    const holding = await getHolding(req.params.id);
    if (!holding) {
      res.status(404).json({ error: 'Holding not found' });
      return;
    }
    res.json(holding);
  } catch (err) {
    console.error('[portfolio] get', err);
    res.status(500).json({ error: 'Failed to load holding' });
  }
});
