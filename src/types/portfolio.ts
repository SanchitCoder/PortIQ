/**
 * Re-exports shared API contract types.
 * Source of truth: shared/api-types.ts
 */
export type {
  Exchange,
  Holding,
  AddHoldingInput,
  UpdateHoldingInput,
  SymbolRequest,
  PricesRequest,
  NormalizedQuote,
  PriceQuote,
  PricesResponse,
  AnalyzeRequest,
  ConcentrationMetrics,
  PortfolioAnalysisResponse,
  PortfolioActionPriority,
  PortfolioActionPlan,
  StressScenarioInput,
  StressTestRequest,
  RankedContribution,
  CorrelationCluster,
  StressTestResponse,
} from '../../shared/api-types';

/** @deprecated Use PortfolioAnalysisResponse — kept for component compat */
export type { PortfolioAnalysisResponse as PortfolioAnalysis } from '../../shared/api-types';

export type { PortfolioSummary } from './portfolio-local';
