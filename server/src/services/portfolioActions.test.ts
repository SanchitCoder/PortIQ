import { describe, it, expect } from 'vitest';
import { generateActionPlan } from './portfolioActions.js';
import type { PortfolioMetricsResult, RiskMetricsResult } from './compute.js';

function makeMetrics(holdings: PortfolioMetricsResult['holdings']): PortfolioMetricsResult {
  const currentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0);
  return {
    holdings,
    totalInvested,
    currentValue,
    totalPnl: currentValue - totalInvested,
    totalPnlPct: totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0,
    totalDayChange: 0,
    totalDayChangePct: 0,
  };
}

function makeRisk(overrides: Partial<RiskMetricsResult> = {}): RiskMetricsResult {
  return {
    hhi: 0.15,
    maxWeight: 22,
    diversificationScore: 72,
    riskScore: 45,
    healthScore: 68,
    sectorAllocation: [
      { sector: 'IT', weight: 28 },
      { sector: 'Energy', weight: 25 },
      { sector: 'Finance', weight: 22 },
    ],
    warnings: [],
    ...overrides,
  };
}

describe('portfolioActions', () => {
  it('produces high-priority trim with quantified shares for overweight holding', () => {
    const metrics = makeMetrics([
      {
        symbol: 'RELIANCE', exchange: 'NSE', quantity: 10, avgBuyPrice: 2500, price: 2850,
        invested: 25000, currentValue: 28500, pnl: 3500, pnlPct: 14, weight: 42,
        dayChange: 0, dayChangePct: 0, sector: 'Energy',
      },
      {
        symbol: 'TCS', exchange: 'NSE', quantity: 5, avgBuyPrice: 4000, price: 4100,
        invested: 20000, currentValue: 20500, pnl: 500, pnlPct: 2.5, weight: 30,
        dayChange: 0, dayChangePct: 0, sector: 'IT',
      },
      {
        symbol: 'HDFCBANK', exchange: 'NSE', quantity: 8, avgBuyPrice: 1600, price: 1680,
        invested: 12800, currentValue: 13440, pnl: 640, pnlPct: 5, weight: 28,
        dayChange: 0, dayChangePct: 0, sector: 'Finance',
      },
    ]);
    const risk = makeRisk({ maxWeight: 42 });

    const totalValue = 62440;
    const plan = generateActionPlan(metrics, risk);
    const trim = plan.actions.find(a => a.type === 'trim' && a.holdingSymbol === 'RELIANCE');

    expect(trim).toBeDefined();
    expect(trim?.priority).toBe('high');
    expect(plan.nextBestAction.title).toContain('RELIANCE');

    const expectedShares = Math.round(((42 - 20) / 100) * totalValue / 2850);
    expect(expectedShares).toBe(5);
    expect(trim?.sharesDelta).toBe(-expectedShares);

    const rupeeFreed = expectedShares * 2850;
    const newHoldingValue = 28500 - rupeeFreed;
    const newTotal = totalValue - rupeeFreed;
    const expectedResultingWeight = Math.round((newHoldingValue / newTotal) * 1000) / 10;

    expect(trim?.rupeeAmount).toBe(rupeeFreed);
    expect(trim?.currentWeight).toBe(42);
    expect(trim?.targetWeight).toBe(20);
    expect(trim?.resultingWeight).toBe(expectedResultingWeight);
    expect(trim?.title).toContain(`${expectedShares} shares`);
  });

  it('produces few low-priority actions for well-diversified portfolio', () => {
    const metrics = makeMetrics([
      {
        symbol: 'TCS', exchange: 'NSE', quantity: 5, avgBuyPrice: 4000, price: 4100,
        invested: 20000, currentValue: 20500, pnl: 500, pnlPct: 2.5, weight: 20,
        dayChange: 0, dayChangePct: 0, sector: 'IT',
      },
      {
        symbol: 'INFY', exchange: 'NSE', quantity: 10, avgBuyPrice: 1800, price: 1820,
        invested: 18000, currentValue: 18200, pnl: 200, pnlPct: 1.1, weight: 18,
        dayChange: 0, dayChangePct: 0, sector: 'IT',
      },
      {
        symbol: 'HDFCBANK', exchange: 'NSE', quantity: 8, avgBuyPrice: 1600, price: 1680,
        invested: 12800, currentValue: 13440, pnl: 640, pnlPct: 5, weight: 19,
        dayChange: 0, dayChangePct: 0, sector: 'Finance',
      },
      {
        symbol: 'RELIANCE', exchange: 'NSE', quantity: 4, avgBuyPrice: 2500, price: 2600,
        invested: 10000, currentValue: 10400, pnl: 400, pnlPct: 4, weight: 20,
        dayChange: 0, dayChangePct: 0, sector: 'Energy',
      },
      {
        symbol: 'ITC', exchange: 'NSE', quantity: 20, avgBuyPrice: 450, price: 460,
        invested: 9000, currentValue: 9200, pnl: 200, pnlPct: 2.2, weight: 23,
        dayChange: 0, dayChangePct: 0, sector: 'FMCG',
      },
    ]);
    const risk = makeRisk({
      maxWeight: 23,
      diversificationScore: 78,
      riskScore: 38,
      sectorAllocation: [
        { sector: 'IT', weight: 38 },
        { sector: 'FMCG', weight: 23 },
        { sector: 'Finance', weight: 19 },
        { sector: 'Energy', weight: 20 },
      ],
    });

    const plan = generateActionPlan(metrics, risk);
    const highPriority = plan.actions.filter(a => a.priority === 'high');

    expect(highPriority.length).toBe(0);
    expect(plan.actions.length).toBeLessThanOrEqual(6);
  });

  it('flags underperformer for thesis review', () => {
    const metrics = makeMetrics([
      {
        symbol: 'WIPRO', exchange: 'NSE', quantity: 20, avgBuyPrice: 500, price: 400,
        invested: 10000, currentValue: 8000, pnl: -2000, pnlPct: -20, weight: 15,
        dayChange: 0, dayChangePct: 0, sector: 'IT',
      },
      {
        symbol: 'TCS', exchange: 'NSE', quantity: 10, avgBuyPrice: 4000, price: 4100,
        invested: 40000, currentValue: 41000, pnl: 1000, pnlPct: 2.5, weight: 85,
        dayChange: 0, dayChangePct: 0, sector: 'IT',
      },
    ]);
    const risk = makeRisk({ maxWeight: 85, diversificationScore: 40, riskScore: 70 });

    const plan = generateActionPlan(metrics, risk);
    const review = plan.actions.find(a => a.type === 'review' && a.holdingSymbol === 'WIPRO');

    expect(review).toBeDefined();
    expect(review?.title).toContain('Review thesis');
  });
});
