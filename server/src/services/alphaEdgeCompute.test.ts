import { describe, it, expect } from 'vitest';
import {
  positionMetrics,
  signalScore,
  verdict,
  computeAlphaEdge,
} from './alphaEdgeCompute.js';
import type { AnalyzerScores } from './analyzerCompute.js';

const strongScores: AnalyzerScores = {
  valuation: 72,
  financialHealth: 78,
  growth: 65,
  sentiment: 58,
  overall: 70,
};

const weakScores: AnalyzerScores = {
  valuation: 38,
  financialHealth: 42,
  growth: 35,
  sentiment: 40,
  overall: 39,
};

describe('alphaEdgeCompute', () => {
  it('positionMetrics computes P&L and distances deterministically', () => {
    const m = positionMetrics({
      buyPrice: 2600,
      currentPrice: 2840,
      quantity: 10,
      targetPrice: 3200,
      stopLoss: 2400,
    });

    expect(m.unrealizedPnl).toBe(2400);
    expect(m.unrealizedPnlPct).toBeCloseTo(9.23, 1);
    expect(m.distanceToTargetPct).toBeCloseTo(88.75, 0);
    expect(m.distanceToStopPct).toBeCloseTo(15.49, 0);
    expect(m.riskRewardRatio).toBeCloseTo(0.82, 1);
  });

  it('signalScore is position-aware — same scores, different entry prices', () => {
    const current = 150;

    const deepProfit = signalScore(strongScores, positionMetrics({
      buyPrice: 100,
      currentPrice: current,
      quantity: 10,
    }));
    const breakeven = signalScore(strongScores, positionMetrics({
      buyPrice: current,
      currentPrice: current,
      quantity: 10,
    }));
    const deepLoss = signalScore(strongScores, positionMetrics({
      buyPrice: 200,
      currentPrice: current,
      quantity: 10,
    }));

    // +50% gain on strong stock → tempered (take-profits bias)
    expect(deepProfit.score).toBeLessThan(breakeven.score);
    // -25% loss → more sell-leaning than breakeven
    expect(deepLoss.score).toBeLessThan(breakeven.score);
    expect(breakeven.score - deepLoss.score).toBeGreaterThan(15);
  });

  it('signalScore pushes sell when weak fundamentals meet loss', () => {
    const lossPosition = positionMetrics({
      buyPrice: 200,
      currentPrice: 150,
      quantity: 10,
      stopLoss: 145,
    });
    const { score } = signalScore(weakScores, lossPosition);
    expect(score).toBeLessThan(-25);
  });

  it('verdict maps signalScore bands to buy/hold/sell', () => {
    const factors = [
      { id: 'a', label: 'A', direction: 'supports_buy' as const, value: 'x' },
      { id: 'b', label: 'B', direction: 'supports_buy' as const, value: 'y' },
    ];

    expect(verdict(40, factors, false).verdict).toBe('buy');
    expect(verdict(-40, factors, false).verdict).toBe('sell');
    expect(verdict(10, factors, false).verdict).toBe('hold');
    expect(verdict(40, factors, true).confidence).toBeLessThan(verdict(40, factors, false).confidence);
  });

  it('computeAlphaEdge returns full typed object', () => {
    const result = computeAlphaEdge(
      strongScores,
      { buyPrice: 2600, currentPrice: 2840, quantity: 10, targetPrice: 3200, stopLoss: 2400 },
      0.5,
      null,
      'INR',
    );

    expect(result.verdict).toMatch(/^(buy|hold|sell)$/);
    expect(result.confidence).toBeGreaterThanOrEqual(35);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.reasoningFactors.length).toBeGreaterThan(0);
    expect(result.exitStrategy.length).toBeGreaterThanOrEqual(4);
    expect(result.scenarios).toHaveLength(2);
  });
});
