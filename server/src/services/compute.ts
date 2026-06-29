import type { Exchange, Holding, NormalizedQuote, StressScenarioInput } from '../../shared/api-types.js';
import { getSectorFactors, resolveSector } from '../config/sectorFactors.js';

export interface HoldingWithQuote extends Holding {
  price: number;
  sector: string;
}

export interface PerHoldingMetrics {
  symbol: string;
  exchange: Exchange;
  quantity: number;
  avgBuyPrice: number;
  price: number;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  weight: number;
  dayChange: number;
  dayChangePct: number;
  sector: string;
}

export interface PortfolioMetricsResult {
  holdings: PerHoldingMetrics[];
  totalInvested: number;
  currentValue: number;
  totalPnl: number;
  totalPnlPct: number;
  totalDayChange: number;
  totalDayChangePct: number;
}

export interface RiskMetricsResult {
  hhi: number;
  maxWeight: number;
  diversificationScore: number;
  riskScore: number;
  healthScore: number;
  sectorAllocation: { sector: string; weight: number }[];
  warnings: string[];
}

export interface StressTestResult {
  drawdownPct: number;
  valueBefore: number;
  valueAfter: number;
  rankedContributions: {
    symbol: string;
    exchange: Exchange;
    loss: number;
    lossPct: number;
  }[];
}

export interface CorrelationClusterResult {
  id: string;
  label: string;
  tickers: string[];
  combinedWeight: number;
  dominantFactor: string;
}

function quoteKey(symbol: string, exchange: string) {
  return `${symbol.toUpperCase()}:${exchange}`;
}

export function enrichHoldings(holdings: Holding[], quotes: NormalizedQuote[]): HoldingWithQuote[] {
  const map = new Map(quotes.map(q => [quoteKey(q.symbol, q.exchange), q]));
  return holdings.map(h => {
    const q = map.get(quoteKey(h.symbol, h.exchange));
    const price = q?.price ?? h.currentPrice ?? h.avgBuyPrice;
    return {
      ...h,
      price,
      sector: h.sector ?? resolveSector(h.symbol),
    };
  });
}

/** Layer 2 — deterministic portfolio metrics */
export function portfolioMetrics(
  holdings: HoldingWithQuote[],
): PortfolioMetricsResult {
  if (holdings.length === 0) {
    return {
      holdings: [],
      totalInvested: 0,
      currentValue: 0,
      totalPnl: 0,
      totalPnlPct: 0,
      totalDayChange: 0,
      totalDayChangePct: 0,
    };
  }

  let totalInvested = 0;
  let currentValue = 0;
  let totalDayChange = 0;

  const perHolding: PerHoldingMetrics[] = holdings.map(h => {
    const invested = h.quantity * h.avgBuyPrice;
    const value = h.quantity * h.price;
    const pnl = value - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    const dayChangePct = h.dayChangePct ?? 0;
    const dayChange = h.quantity * h.price * (dayChangePct / 100) / (1 + dayChangePct / 100);

    totalInvested += invested;
    currentValue += value;
    totalDayChange += dayChange;

    return {
      symbol: h.symbol,
      exchange: h.exchange,
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      price: h.price,
      invested,
      currentValue: value,
      pnl,
      pnlPct,
      weight: 0,
      dayChange,
      dayChangePct,
      sector: h.sector,
    };
  });

  for (const row of perHolding) {
    row.weight = currentValue > 0 ? (row.currentValue / currentValue) * 100 : 0;
  }

  const totalPnl = currentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const prevValue = currentValue - totalDayChange;
  const totalDayChangePct = prevValue > 0 ? (totalDayChange / prevValue) * 100 : 0;

  return {
    holdings: perHolding,
    totalInvested,
    currentValue,
    totalPnl,
    totalPnlPct,
    totalDayChange,
    totalDayChangePct,
  };
}

/** Layer 2 — concentration, sector allocation, scores */
export function riskMetrics(holdings: PerHoldingMetrics[]): RiskMetricsResult {
  if (holdings.length === 0) {
    return {
      hhi: 0,
      maxWeight: 0,
      diversificationScore: 0,
      riskScore: 0,
      healthScore: 0,
      sectorAllocation: [],
      warnings: [],
    };
  }

  const weights = holdings.map(h => h.weight / 100);
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  const maxWeight = Math.max(...holdings.map(h => h.weight));

  const sectorMap = new Map<string, number>();
  for (const h of holdings) {
    sectorMap.set(h.sector, (sectorMap.get(h.sector) ?? 0) + h.weight);
  }
  const sectorAllocation = Array.from(sectorMap.entries())
    .map(([sector, weight]) => ({ sector, weight }))
    .sort((a, b) => b.weight - a.weight);

  const maxSectorWeight = sectorAllocation[0]?.weight ?? 0;

  const warnings: string[] = [];
  if (maxWeight > 25) {
    warnings.push(`Single-name concentration: largest holding is ${maxWeight.toFixed(1)}% (limit ~25%).`);
  }
  if (hhi > 0.25) {
    warnings.push(`Portfolio HHI is ${(hhi * 100).toFixed(0)} — elevated concentration risk.`);
  }
  if (maxSectorWeight > 40) {
    warnings.push(`Sector concentration: ${sectorAllocation[0].sector} at ${maxSectorWeight.toFixed(1)}%.`);
  }
  if (holdings.length < 3) {
    warnings.push('Fewer than 3 holdings — limited diversification.');
  }

  const diversificationScore = Math.round(Math.max(0, Math.min(100, 100 - hhi * 200 - Math.max(0, maxWeight - 15))));
  const riskScore = Math.round(Math.max(0, Math.min(100, hhi * 180 + maxWeight * 1.2 + maxSectorWeight * 0.5)));
  const avgPnlPct = holdings.reduce((s, h) => s + h.pnlPct * (h.weight / 100), 0);
  const healthScore = Math.round(Math.max(0, Math.min(100,
    diversificationScore * 0.6 + (50 + Math.min(avgPnlPct, 25)) * 0.4
  )));

  return {
    hhi: Math.round(hhi * 10000) / 10000,
    maxWeight: Math.round(maxWeight * 100) / 100,
    diversificationScore,
    riskScore,
    healthScore,
    sectorAllocation,
    warnings,
  };
}

function holdingImpactPct(h: PerHoldingMetrics, scenario: StressScenarioInput): number {
  const factors = getSectorFactors(h.sector);
  const rates = (scenario.interestRateBps ?? 0) / 100 * factors.interestRatePer100Bps;
  const fx = (scenario.fxPct ?? 0) * factors.fxPer1PctInrDepreciation;
  const market = (scenario.marketPct ?? 0) * factors.marketBeta;
  const sectorShock = scenario.sectorShocks?.[h.sector] ?? 0;
  const sectorImpact = sectorShock * factors.sectorSelfBeta;
  const stockShock = scenario.stockShocks?.[h.symbol] ?? 0;

  return rates + fx + market + sectorImpact + stockShock;
}

/** Layer 2 — What-If stress test math */
export function stressTest(
  holdings: PerHoldingMetrics[],
  scenario: StressScenarioInput,
): StressTestResult {
  const valueBefore = holdings.reduce((s, h) => s + h.currentValue, 0);
  if (valueBefore <= 0) {
    return { drawdownPct: 0, valueBefore: 0, valueAfter: 0, rankedContributions: [] };
  }

  const contributions = holdings.map(h => {
    const impactPct = holdingImpactPct(h, scenario);
    const loss = h.currentValue * (Math.abs(impactPct) / 100);
    const signedLoss = impactPct < 0 ? loss : -loss;
    return {
      symbol: h.symbol,
      exchange: h.exchange,
      loss: Math.max(0, signedLoss),
      lossPct: impactPct,
    };
  });

  const totalLoss = contributions.reduce((s, c) => s + c.loss, 0);
  const valueAfter = Math.max(0, valueBefore - totalLoss);
  const drawdownPct = valueBefore > 0 ? (totalLoss / valueBefore) * 100 : 0;

  const rankedContributions = [...contributions]
    .sort((a, b) => b.loss - a.loss);

  return {
    drawdownPct: Math.round(drawdownPct * 100) / 100,
    valueBefore: Math.round(valueBefore),
    valueAfter: Math.round(valueAfter),
    rankedContributions,
  };
}

const CLUSTER_WEIGHT_THRESHOLD = 30;

/** Layer 2 — hidden single-factor / sector bets */
export function correlationClusters(holdings: PerHoldingMetrics[]): CorrelationClusterResult[] {
  if (holdings.length === 0) return [];

  const sectorGroups = new Map<string, PerHoldingMetrics[]>();
  for (const h of holdings) {
    const list = sectorGroups.get(h.sector) ?? [];
    list.push(h);
    sectorGroups.set(h.sector, list);
  }

  const clusters: CorrelationClusterResult[] = [];

  for (const [sector, group] of sectorGroups) {
    const combinedWeight = group.reduce((s, h) => s + h.weight, 0);
    if (combinedWeight >= CLUSTER_WEIGHT_THRESHOLD) {
      const factors = getSectorFactors(sector);
      let dominantFactor = 'marketBeta';
      const sensitivities = {
        interestRate: Math.abs(factors.interestRatePer100Bps),
        fx: Math.abs(factors.fxPer1PctInrDepreciation),
        marketBeta: Math.abs(factors.marketBeta),
      };
      dominantFactor = Object.entries(sensitivities).sort((a, b) => b[1] - a[1])[0][0];

      clusters.push({
        id: `sector-${sector}`,
        label: `${sector} cluster`,
        tickers: group.map(h => h.symbol),
        combinedWeight: Math.round(combinedWeight * 100) / 100,
        dominantFactor,
      });
    }
  }

  const rateSensitive = holdings.filter(h => Math.abs(getSectorFactors(h.sector).interestRatePer100Bps) >= 1.0);
  const rateWeight = rateSensitive.reduce((s, h) => s + h.weight, 0);
  if (rateWeight >= CLUSTER_WEIGHT_THRESHOLD && !clusters.some(c => c.dominantFactor === 'interestRate')) {
    clusters.push({
      id: 'factor-rates',
      label: 'Rate-sensitive cluster',
      tickers: rateSensitive.map(h => h.symbol),
      combinedWeight: Math.round(rateWeight * 100) / 100,
      dominantFactor: 'interestRate',
    });
  }

  return clusters.sort((a, b) => b.combinedWeight - a.combinedWeight);
}
