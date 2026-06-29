/**
 * Sector factor sensitivities — MOCK TABLE (replace with real betas later).
 *
 * Units:
 *   interestRatePer100Bps  → % price impact per +100bps rate move
 *   fxPer1PctInrDepreciation → % price impact per 1% INR depreciation (negative INR = positive value)
 *   marketBeta → % price move per 1% broad market move
 *   sectorSelfBeta → multiplier on a direct sector shock (%)
 *
 * n8n could optionally consume stress-test outputs on a SCHEDULE (e.g. daily portfolio
 * health email) — but on-demand analysis must stay on these API endpoints for speed.
 */

export interface SectorFactorRow {
  sector: string;
  interestRatePer100Bps: number;
  fxPer1PctInrDepreciation: number;
  marketBeta: number;
  sectorSelfBeta: number;
}

export const SECTOR_FACTOR_TABLE: Record<string, SectorFactorRow> = {
  Energy: {
    sector: 'Energy',
    interestRatePer100Bps: -1.2,
    fxPer1PctInrDepreciation: 0.8,
    marketBeta: 1.1,
    sectorSelfBeta: 1.0,
  },
  IT: {
    sector: 'IT',
    interestRatePer100Bps: -0.6,
    fxPer1PctInrDepreciation: -1.8,
    marketBeta: 1.05,
    sectorSelfBeta: 1.0,
  },
  Financials: {
    sector: 'Financials',
    interestRatePer100Bps: -2.0,
    fxPer1PctInrDepreciation: 0.3,
    marketBeta: 1.15,
    sectorSelfBeta: 1.0,
  },
  Consumer: {
    sector: 'Consumer',
    interestRatePer100Bps: -0.8,
    fxPer1PctInrDepreciation: 0.4,
    marketBeta: 0.85,
    sectorSelfBeta: 1.0,
  },
  Healthcare: {
    sector: 'Healthcare',
    interestRatePer100Bps: -0.4,
    fxPer1PctInrDepreciation: 0.2,
    marketBeta: 0.75,
    sectorSelfBeta: 1.0,
  },
  Industrials: {
    sector: 'Industrials',
    interestRatePer100Bps: -1.0,
    fxPer1PctInrDepreciation: 0.5,
    marketBeta: 1.0,
    sectorSelfBeta: 1.0,
  },
  Technology: {
    sector: 'Technology',
    interestRatePer100Bps: -0.9,
    fxPer1PctInrDepreciation: -0.5,
    marketBeta: 1.25,
    sectorSelfBeta: 1.0,
  },
  Other: {
    sector: 'Other',
    interestRatePer100Bps: -0.7,
    fxPer1PctInrDepreciation: 0.0,
    marketBeta: 1.0,
    sectorSelfBeta: 1.0,
  },
};

/** Symbol → sector map (seed data — extend or replace with provider metadata) */
export const SYMBOL_SECTOR_MAP: Record<string, string> = {
  RELIANCE: 'Energy',
  ONGC: 'Energy',
  TCS: 'IT',
  INFY: 'IT',
  WIPRO: 'IT',
  HCLTECH: 'IT',
  HDFCBANK: 'Financials',
  ICICIBANK: 'Financials',
  SBIN: 'Financials',
  AXISBANK: 'Financials',
  ITC: 'Consumer',
  HINDUNILVR: 'Consumer',
  SUNPHARMA: 'Healthcare',
  AAPL: 'Technology',
  MSFT: 'Technology',
  NVDA: 'Technology',
  TSLA: 'Technology',
  GOOGL: 'Technology',
  AMZN: 'Technology',
  META: 'Technology',
};

export function resolveSector(symbol: string): string {
  return SYMBOL_SECTOR_MAP[symbol.toUpperCase()] ?? 'Other';
}

export function getSectorFactors(sector: string): SectorFactorRow {
  return SECTOR_FACTOR_TABLE[sector] ?? SECTOR_FACTOR_TABLE.Other;
}
