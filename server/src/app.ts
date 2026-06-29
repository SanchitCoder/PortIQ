import express from 'express';
import cors from 'cors';
import { portfolioRouter } from './routes/portfolio.js';
import { pricesRouter } from './routes/prices.js';
import { analyzeRouter } from './routes/analyze.js';
import { stressTestRouter } from './routes/stressTest.js';
import { analyzerRouter } from './routes/analyzer.js';
import { alphaEdgeRouter } from './routes/alphaEdge.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'portiq-api' });
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
