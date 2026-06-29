import express from 'express';
import cors from 'cors';
import { portfolioRouter } from './routes/portfolio.js';
import { pricesRouter } from './routes/prices.js';
import { analyzeRouter } from './routes/analyze.js';
import { stressTestRouter } from './routes/stressTest.js';
import { analyzerRouter } from './routes/analyzer.js';
import { alphaEdgeRouter } from './routes/alphaEdge.js';

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (raw) {
    return raw.split(',').map(origin => origin.trim()).filter(Boolean);
  }
  return ['http://localhost:5173', 'http://localhost:5174'];
}

export function getCorsOrigins(): string[] {
  return parseCorsOrigins();
}

export function createApp() {
  const app = express();
  const corsOrigins = parseCorsOrigins();

  app.use(cors({
    origin: corsOrigins,
    credentials: true,
  }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'portiq-api' });
  });

  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'portiq-api', health: '/health' });
  });

  // Mount analyze before /api/portfolio/:id to avoid route shadowing
  app.use('/api/portfolio/analyze', analyzeRouter);
  app.use('/api/portfolio', portfolioRouter);
  app.use('/api/prices', pricesRouter);
  app.use('/api/stress-test', stressTestRouter);
  app.use('/api/analyzer', analyzerRouter);
  app.use('/api/alphaedge', alphaEdgeRouter);

  return app;
}
