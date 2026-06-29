import type { Holding, PortfolioSummary } from '../types/portfolio';

export function holdingKey(symbol: string, exchange: string) {
  return `${symbol}:${exchange}`;
}

export function getEffectivePrice(h: Holding): number {
  return h.currentPrice ?? h.avgBuyPrice;
}

export function computePortfolioSummary(holdings: Holding[]): PortfolioSummary {
  if (holdings.length === 0) {
    return {
      totalInvested: 0,
      currentValue: 0,
      totalPnl: 0,
      totalPnlPct: 0,
      dayChange: 0,
      dayChangePct: 0,
    };
  }

  let totalInvested = 0;
  let currentValue = 0;
  let dayChange = 0;

  for (const h of holdings) {
    const invested = h.quantity * h.avgBuyPrice;
    const price = getEffectivePrice(h);
    const value = h.quantity * price;
    totalInvested += invested;
    currentValue += value;

    if (h.currentPrice != null && h.dayChange != null) {
      dayChange += h.quantity * h.dayChange;
    }
  }

  const totalPnl = currentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const prevValue = currentValue - dayChange;
  const dayChangePct = prevValue > 0 ? (dayChange / prevValue) * 100 : 0;

  return { totalInvested, currentValue, totalPnl, totalPnlPct, dayChange, dayChangePct };
}

export function computeWeight(h: Holding, totalValue: number): number {
  if (totalValue <= 0) return 0;
  return (h.quantity * getEffectivePrice(h) / totalValue) * 100;
}

export function computeHoldingPnl(h: Holding) {
  const invested = h.quantity * h.avgBuyPrice;
  const value = h.quantity * getEffectivePrice(h);
  const pnl = value - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  return { invested, value, pnl, pnlPct };
}

export function formatINR(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 100000) {
    return `₹${(n / 100000).toFixed(2)}L`;
  }
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatPct(n: number, signed = true): string {
  const prefix = signed && n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(2)}%`;
}
