/** Sector peer tickers for stock analyzer comparison table */
export const SECTOR_PEERS: Record<string, string[]> = {
  Energy: ['RELIANCE', 'ONGC', 'BPCL', 'NTPC'],
  IT: ['TCS', 'INFY', 'WIPRO', 'HCLTECH'],
  Financials: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK'],
  Consumer: ['ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA'],
  Healthcare: ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB'],
  Technology: ['AAPL', 'MSFT', 'GOOGL', 'NVDA'],
  Other: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY'],
};

/** Rough sector benchmark medians for context tags (deterministic, not live) */
export const SECTOR_BENCHMARKS: Record<string, {
  pe: number;
  revenueGrowthPct: number;
  profitMarginPct: number;
  roe: number;
  debtToEquity: number;
  currentRatio: number;
}> = {
  Energy: { pe: 18, revenueGrowthPct: 8, profitMarginPct: 12, roe: 14, debtToEquity: 0.6, currentRatio: 1.1 },
  IT: { pe: 28, revenueGrowthPct: 12, profitMarginPct: 20, roe: 28, debtToEquity: 0.1, currentRatio: 2.5 },
  Financials: { pe: 16, revenueGrowthPct: 10, profitMarginPct: 22, roe: 16, debtToEquity: 1.2, currentRatio: 1.0 },
  Consumer: { pe: 45, revenueGrowthPct: 9, profitMarginPct: 18, roe: 22, debtToEquity: 0.3, currentRatio: 1.4 },
  Healthcare: { pe: 32, revenueGrowthPct: 11, profitMarginPct: 16, roe: 18, debtToEquity: 0.2, currentRatio: 1.8 },
  Technology: { pe: 30, revenueGrowthPct: 14, profitMarginPct: 25, roe: 35, debtToEquity: 0.4, currentRatio: 2.0 },
  Other: { pe: 22, revenueGrowthPct: 10, profitMarginPct: 15, roe: 18, debtToEquity: 0.5, currentRatio: 1.3 },
};
