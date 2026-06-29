import type { StockAnalysisResponse } from '../../shared/api-types';

export type {
  StockAnalysisResponse,
  StockAnalyzerRequest,
  StockAnalysisHeader,
  StockAnalysisScorecard,
  StockMetricTile,
  FundamentalsGroup,
  NewsHeadline,
  PeerComparisonRow,
  StockAnalysisSynthesis,
  PriceHistoryPoint,
} from '../../shared/api-types';

/** Alias used by UI — same shape as API response */
export type StockAnalysis = StockAnalysisResponse;
