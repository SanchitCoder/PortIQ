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
  refresh?: boolean;
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

export type PortfolioEstimatedImpact =
  | 'reduces risk'
  | 'improves diversification'
  | 'unlocks return'
  | 'preserves gains'
  | 'limits downside';

/** Deterministic L2 action skeleton (before AI phrasing) */
export interface PortfolioActionComputed {
  id: string;
  type: string;
  priority: PortfolioActionPriority;
  title: string;
  holdingSymbol?: string;
  detail: string;
  rationaleMetric: string;
  estimatedImpact: PortfolioEstimatedImpact;
  /** Negative = sell, positive = buy/add */
  sharesDelta?: number;
  rupeeAmount?: number;
  currentWeight?: number;
  targetWeight?: number;
  currentPrice?: number;
  resultingWeight?: number;
  /** Estimated realized gain when booking profits */
  realizedGainEstimate?: number;
  /** For diversify actions — sectors to broaden into */
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

export interface PortfolioActionPlanComputed {
  nextBestAction: {
    title: string;
    detail: string;
  };
  actions: PortfolioActionComputed[];
}

export interface PortfolioActionPlanItem extends PortfolioActionComputed {
  /** AI-phrased one-liner (merged server-side after Layer 3) */
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
  sectorAllocation: { sector: string; weight: number }[];
  insights: string[];
  suggestedActions: string[];
  /** Ranked return-optimization action plan (L2 compute + L3 phrasing) */
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

/** POST /api/analyzer/stock */
export interface StockAnalyzerRequest {
  symbol: string;
  exchange?: Exchange;
}

export interface StockScoreItem {
  value: number;
  tag: string;
}

export interface StockAnalysisHeader {
  companyName: string;
  symbol: string;
  exchange: Exchange;
  currency: string;
  price: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  marketCap: number | null;
  week52Low: number | null;
  week52High: number | null;
}

export interface StockAnalysisScorecard {
  valuation: StockScoreItem;
  financialHealth: StockScoreItem;
  growth: StockScoreItem;
  sentiment: StockScoreItem;
  overallVerdict: string;
}

export interface PriceHistoryPoint {
  date: string;
  close: number;
}

export interface StockMetricTile {
  key: string;
  label: string;
  value: number | string | null;
  contextTag: string | null;
  unavailable?: boolean;
}

export interface FundamentalRow {
  label: string;
  value: string;
  assessment: string;
  unavailable?: boolean;
}

export interface FundamentalsGroup {
  title: string;
  rows: FundamentalRow[];
}

export interface NewsHeadline {
  title: string;
  source: string;
  date: string;
  url: string;
  sentiment: 'bullish' | 'neutral' | 'bearish';
}

export interface PeerComparisonRow {
  symbol: string;
  pe: number | null;
  revenueGrowthPct: number | null;
  profitMarginPct: number | null;
  isSubject?: boolean;
}

export interface StockAnalysisSynthesis {
  bullCase: string[];
  bearCase: string[];
  summaryVerdict: string;
  keyRisks: string[];
}

export interface StockAnalysisResponse {
  header: StockAnalysisHeader;
  scorecard: StockAnalysisScorecard;
  priceHistory: {
    '1M': PriceHistoryPoint[];
    '6M': PriceHistoryPoint[];
    '1Y': PriceHistoryPoint[];
  };
  metrics: StockMetricTile[];
  fundamentals: FundamentalsGroup[];
  sentiment: {
    score: number;
    label: string;
    headlines: NewsHeadline[];
    unavailable?: boolean;
  };
  peers: PeerComparisonRow[];
  synthesis: StockAnalysisSynthesis;
  generatedAt: string;
}

/** POST /api/alphaedge/evaluate */
export type AlphaEdgeSignal = 'buy' | 'hold' | 'sell';

export interface AlphaEdgeEvaluateRequest {
  symbol: string;
  exchange?: Exchange;
  buyPrice: number;
  quantity: number;
  currentPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  context?: string;
}

export type AlphaEdgeFactorDirection = 'supports_buy' | 'supports_sell' | 'neutral';

export interface AlphaEdgeReasoningFactor {
  id: string;
  label: string;
  direction: AlphaEdgeFactorDirection;
  /** Deterministic L2 skeleton value */
  value: string;
  /** AI-phrased one-liner (merged server-side after Layer 3) */
  explanation?: string;
}

export interface AlphaEdgeExitRow {
  label: string;
  value: string;
  unavailable?: boolean;
}

export interface AlphaEdgeScenario {
  label: string;
  price: number | null;
  pnlAmount: number | null;
  pnlPct: number | null;
  unavailable?: boolean;
}

export interface AlphaEdgeAiRationale {
  headline: string;
  rationale: string;
  keyRisks: string[];
  factorExplanations: string[];
}

export interface AlphaEdgeVerdict {
  header: {
    signal: AlphaEdgeSignal;
    confidence: number;
    headline: string;
    symbol: string;
    exchange: Exchange;
    currency: string;
    companyName: string;
  };
  position: {
    buyPrice: number;
    currentPrice: number | null;
    quantity: number;
    targetPrice: number | null;
    stopLoss: number | null;
    unrealizedPnl: number | null;
    unrealizedPnlPct: number | null;
    totalCost: number;
    marketValue: number | null;
  };
  reasoningFactors: AlphaEdgeReasoningFactor[];
  exitStrategy: AlphaEdgeExitRow[];
  scenarios: AlphaEdgeScenario[];
  aiRationale: AlphaEdgeAiRationale;
  /** L2 conviction -100..+100 (negative = lean sell) */
  signalScore: number;
  /** True when analyzer scores were partial/unavailable */
  reducedConfidence: boolean;
  /** Not personalized financial advice — render in UI */
  disclaimer: string;
  inPortfolio: boolean;
  generatedAt: string;
}
