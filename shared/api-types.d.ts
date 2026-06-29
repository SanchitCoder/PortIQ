/**
 * Shared API contract between PortIQ backend (server/) and frontend (src/).
 * Import from here in both projects to keep types in sync.
 */
export type Exchange = 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ';
export interface Holding {
    id: string;
    symbol: string;
    exchange: Exchange;
    quantity: number;
    avgBuyPrice: number;
    buyDate?: string;
    currentPrice?: number;
    sector?: string;
    dayChange?: number;
    dayChangePct?: number;
}
export interface AddHoldingInput {
    symbol: string;
    exchange: Exchange;
    quantity: number;
    avgBuyPrice: number;
    buyDate?: string;
}
export interface UpdateHoldingInput {
    symbol?: string;
    exchange?: Exchange;
    quantity?: number;
    avgBuyPrice?: number;
    buyDate?: string;
}
export interface SymbolRequest {
    symbol: string;
    exchange: Exchange;
}
/** POST /api/prices */
export interface PricesRequest {
    symbols: SymbolRequest[];
}
export interface NormalizedQuote {
    symbol: string;
    exchange: Exchange;
    price: number;
    dayChangePct: number;
    currency: string;
    stale?: boolean;
}
export interface PriceQuote {
    symbol: string;
    exchange: Exchange;
    currentPrice: number;
    dayChange: number;
    dayChangePct: number;
    sector?: string;
    stale?: boolean;
}
export interface PricesResponse {
    prices: PriceQuote[];
}
/** POST /api/portfolio/analyze */
export interface AnalyzeRequest {
    holdings: Holding[];
}
export interface ConcentrationMetrics {
    hhi: number;
    maxWeight: number;
    warnings: string[];
}
export type PortfolioActionPriority = 'high' | 'medium' | 'low';
export type PortfolioEstimatedImpact = 'reduces risk' | 'improves diversification' | 'unlocks return' | 'preserves gains' | 'limits downside';
export interface PortfolioActionComputed {
    id: string;
    type: string;
    priority: PortfolioActionPriority;
    title: string;
    holdingSymbol?: string;
    detail: string;
    rationaleMetric: string;
    estimatedImpact: PortfolioEstimatedImpact;
    sharesDelta?: number;
    rupeeAmount?: number;
    currentWeight?: number;
    targetWeight?: number;
    currentPrice?: number;
    resultingWeight?: number;
    realizedGainEstimate?: number;
    sectorsToAdd?: number;
    targetSector?: string;
}
export interface PortfolioHoldingSnapshot {
    symbol: string;
    exchange: Exchange;
    quantity: number;
    avgBuyPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPct: number;
    weight: number;
}
export interface PortfolioSummaryStats {
    totalInvested: number;
    currentValue: number;
    totalPnl: number;
    totalPnlPct: number;
}
export interface PortfolioActionPlanItem extends PortfolioActionComputed {
    rationale: string;
}
export interface PortfolioActionPlan {
    nextBestAction: {
        title: string;
        detail: string;
    };
    actions: PortfolioActionPlanItem[];
    summary: string;
    disclaimer: string;
}
export interface PortfolioAnalysisResponse {
    healthScore: number;
    riskScore: number;
    concentration: ConcentrationMetrics;
    /** Alias for UI — mirrors diversification score from compute layer */
    diversification: {
        score: number;
        warnings: string[];
    };
    sectorAllocation: {
        sector: string;
        weight: number;
    }[];
    insights: string[];
    suggestedActions: string[];
    actionPlan: PortfolioActionPlan;
    portfolioSummary: PortfolioSummaryStats;
    holdingsSnapshot: PortfolioHoldingSnapshot[];
    generatedAt: string;
}
/** POST /api/stress-test */
export interface StressScenarioInput {
    interestRateBps?: number;
    fxPct?: number;
    marketPct?: number;
    sectorShocks?: Record<string, number>;
    stockShocks?: Record<string, number>;
    label?: string;
}
export interface StressTestRequest {
    holdings: Holding[];
    scenario: StressScenarioInput;
}
export interface RankedContribution {
    symbol: string;
    exchange: Exchange;
    loss: number;
    lossPct: number;
}
export interface CorrelationCluster {
    id: string;
    label: string;
    tickers: string[];
    combinedWeight: number;
    dominantFactor: string;
}
export interface StressTestResponse {
    drawdownPct: number;
    valueBefore: number;
    valueAfter: number;
    rankedContributions: RankedContribution[];
    clusters: CorrelationCluster[];
    suggestedActions: string[];
}
//# sourceMappingURL=api-types.d.ts.map