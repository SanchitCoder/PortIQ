import { describe, it, expect } from 'vitest';
import {
  portfolioMetrics,
  riskMetrics,
  stressTest,
  correlationClusters,
  enrichHoldings,
} from './compute.js';
import type { Holding } from '../../../shared/api-types.js';

const sampleHoldings: Holding[] = [
  { id: '1', symbol: 'RELIANCE', exchange: 'NSE', quantity: 10, avgBuyPrice: 2500 },
  { id: '2', symbol: 'TCS', exchange: 'NSE', quantity: 5, avgBuyPrice: 4000 },
  { id: '3', symbol: 'HDFCBANK', exchange: 'NSE', quantity: 8, avgBuyPrice: 1600 },
];

const quotes = [
  { symbol: 'RELIANCE', exchange: 'NSE' as const, price: 2850, dayChangePct: 0.5, currency: 'INR' },
  { symbol: 'TCS', exchange: 'NSE' as const, price: 4100, dayChangePct: -0.3, currency: 'INR' },
  { symbol: 'HDFCBANK', exchange: 'NSE' as const, price: 1680, dayChangePct: 0.1, currency: 'INR' },
];

describe('compute service', () => {
  it('portfolioMetrics computes invested, value, pnl deterministically', () => {
    const enriched = enrichHoldings(sampleHoldings, quotes);
    const metrics = portfolioMetrics(enriched);

    expect(metrics.totalInvested).toBe(10 * 2500 + 5 * 4000 + 8 * 1600);
    expect(metrics.currentValue).toBe(10 * 2850 + 5 * 4100 + 8 * 1680);
    expect(metrics.totalPnl).toBe(metrics.currentValue - metrics.totalInvested);
    expect(metrics.holdings).toHaveLength(3);
    expect(metrics.holdings.reduce((s, h) => s + h.weight, 0)).toBeCloseTo(100, 1);
  });

  it('riskMetrics returns HHI and diversification score', () => {
    const enriched = enrichHoldings(sampleHoldings, quotes);
    const metrics = portfolioMetrics(enriched);
    const risk = riskMetrics(metrics.holdings);

    expect(risk.hhi).toBeGreaterThan(0);
    expect(risk.hhi).toBeLessThanOrEqual(1);
    expect(risk.maxWeight).toBeGreaterThan(0);
    expect(risk.diversificationScore).toBeGreaterThanOrEqual(0);
    expect(risk.diversificationScore).toBeLessThanOrEqual(100);
    expect(risk.sectorAllocation.length).toBeGreaterThan(0);
  });

  it('stressTest returns ranked contributions worst-first', () => {
    const enriched = enrichHoldings(sampleHoldings, quotes);
    const metrics = portfolioMetrics(enriched);
    const result = stressTest(metrics.holdings, { marketPct: -30 });

    expect(result.drawdownPct).toBeGreaterThan(0);
    expect(result.valueAfter).toBeLessThan(result.valueBefore);
    expect(result.rankedContributions[0].loss).toBeGreaterThanOrEqual(
      result.rankedContributions[result.rankedContributions.length - 1]?.loss ?? 0,
    );
  });

  it('correlationClusters groups high sector weight', () => {
    const singleSector: Holding[] = [
      { id: '1', symbol: 'TCS', exchange: 'NSE', quantity: 10, avgBuyPrice: 4000 },
      { id: '2', symbol: 'INFY', exchange: 'NSE', quantity: 10, avgBuyPrice: 1800 },
      { id: '3', symbol: 'WIPRO', exchange: 'NSE', quantity: 5, avgBuyPrice: 500 },
    ];
    const q = [
      { symbol: 'TCS', exchange: 'NSE' as const, price: 4100, dayChangePct: 0, currency: 'INR' },
      { symbol: 'INFY', exchange: 'NSE' as const, price: 1820, dayChangePct: 0, currency: 'INR' },
      { symbol: 'WIPRO', exchange: 'NSE' as const, price: 520, dayChangePct: 0, currency: 'INR' },
    ];
    const metrics = portfolioMetrics(enrichHoldings(singleSector, q));
    const clusters = correlationClusters(metrics.holdings);

    expect(clusters.some(c => c.label.includes('IT'))).toBe(true);
  });
});
