import YahooFinance from 'yahoo-finance2';
import type {
  Exchange,
  NewsHeadline,
  PeerComparisonRow,
  PriceHistoryPoint,
  StockAnalysisResponse,
  StockMetricTile,
  FundamentalsGroup,
} from '../../shared/api-types.js';
import { resolveSector } from '../config/sectorFactors.js';
import { SECTOR_BENCHMARKS, SECTOR_PEERS } from '../config/stockPeers.js';
import {
  fetchFmpHistorical,
  fetchFmpNews,
  fetchFmpQuoteForSymbol,
  fetchFmpRatiosTtm,
  isFmpProvider,
} from '../lib/fmp.js';
import { inferExchange, toYahooSymbol } from '../lib/symbolUtils.js';
import { buildScorecard } from './analyzerCompute.js';
import { getFundamentals } from './fundamentals.js';
import { generateStockSynthesis, stockSynthesisFallback } from './stockAnalyzerAi.js';

export interface AnalyzeStockOptions {
  /** When false, skip OpenRouter (deterministic fallbacks only) — used for PDF export cache miss */
  useAi?: boolean;
}

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return 'data unavailable';
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return 'data unavailable';
  return `${n.toFixed(1)}%`;
}

function contextVsBenchmark(
  value: number | null,
  benchmark: number,
  higherIsBetter: boolean,
): string | null {
  if (value == null || Number.isNaN(value)) return null;
  const diff = ((value - benchmark) / benchmark) * 100;
  if (Math.abs(diff) < 8) return 'near sector avg';
  if (higherIsBetter) return diff > 0 ? 'above sector avg' : 'below sector avg';
  return diff < 0 ? 'below sector avg' : 'above sector avg';
}

function priceFromHistory(points: PriceHistoryPoint[]): {
  price: number;
  dayChange: number;
  dayChangePct: number;
  week52Low: number;
  week52High: number;
} | null {
  if (points.length === 0) return null;
  const price = points[points.length - 1].close;
  const prev = points.length > 1 ? points[points.length - 2].close : price;
  const dayChange = price - prev;
  const dayChangePct = prev > 0 ? (dayChange / prev) * 100 : 0;
  let week52Low = price;
  let week52High = price;
  for (const p of points) {
    week52Low = Math.min(week52Low, p.close);
    week52High = Math.max(week52High, p.close);
  }
  return {
    price,
    dayChange: Math.round(dayChange * 100) / 100,
    dayChangePct: Math.round(dayChangePct * 100) / 100,
    week52Low,
    week52High,
  };
}

function buildMetricsAndFundamentals(
  sym: string,
  sector: string,
  pe: number | null,
  pb: number | null,
  eps: number | null,
  divYield: number | null,
  roe: number | null,
  debtEquity: number | null,
  revenueGrowth: number | null,
  profitMargin: number | null,
  currentRatio: number | null,
): { metrics: StockMetricTile[]; fundamentals: FundamentalsGroup[] } {
  const bench = SECTOR_BENCHMARKS[sector] ?? SECTOR_BENCHMARKS.Other;

  const metrics: StockMetricTile[] = [
    { key: 'pe', label: 'P/E', value: pe, contextTag: contextVsBenchmark(pe, bench.pe, false), unavailable: pe == null },
    { key: 'pb', label: 'P/B', value: pb, contextTag: pb != null && pb < 3 ? 'reasonable' : pb != null ? 'high' : null, unavailable: pb == null },
    { key: 'eps', label: 'EPS', value: eps, contextTag: null, unavailable: eps == null },
    { key: 'divYield', label: 'Div. Yield', value: divYield != null ? `${divYield.toFixed(2)}%` : null, contextTag: divYield != null && divYield > 2 ? 'income' : null, unavailable: divYield == null },
    { key: 'roe', label: 'ROE', value: roe != null ? `${roe.toFixed(1)}%` : null, contextTag: contextVsBenchmark(roe, bench.roe, true), unavailable: roe == null },
    { key: 'debtEquity', label: 'Debt/Equity', value: debtEquity != null ? debtEquity.toFixed(2) : null, contextTag: contextVsBenchmark(debtEquity, bench.debtToEquity, false), unavailable: debtEquity == null },
    { key: 'revenueGrowth', label: 'Revenue Growth', value: revenueGrowth != null ? `${revenueGrowth.toFixed(1)}%` : null, contextTag: contextVsBenchmark(revenueGrowth, bench.revenueGrowthPct, true), unavailable: revenueGrowth == null },
    { key: 'profitMargin', label: 'Profit Margin', value: profitMargin != null ? `${profitMargin.toFixed(1)}%` : null, contextTag: contextVsBenchmark(profitMargin, bench.profitMarginPct, true), unavailable: profitMargin == null },
    { key: 'currentRatio', label: 'Current Ratio', value: currentRatio != null ? Number(currentRatio).toFixed(2) : null, contextTag: contextVsBenchmark(currentRatio, bench.currentRatio, true), unavailable: currentRatio == null },
  ];

  const fundamentals: FundamentalsGroup[] = [
    {
      title: 'Valuation',
      rows: [
        { label: 'P/E (TTM)', value: fmtNum(pe), assessment: contextVsBenchmark(pe, bench.pe, false) ?? 'data unavailable', unavailable: pe == null },
        { label: 'P/B', value: fmtNum(pb), assessment: pb != null ? (pb < 4 ? 'reasonable' : 'premium') : 'data unavailable', unavailable: pb == null },
      ],
    },
    {
      title: 'Profitability',
      rows: [
        { label: 'ROE', value: fmtPct(roe), assessment: contextVsBenchmark(roe, bench.roe, true) ?? 'data unavailable', unavailable: roe == null },
        { label: 'Profit Margin', value: fmtPct(profitMargin), assessment: contextVsBenchmark(profitMargin, bench.profitMarginPct, true) ?? 'data unavailable', unavailable: profitMargin == null },
      ],
    },
    {
      title: 'Financial Health',
      rows: [
        { label: 'Debt/Equity', value: debtEquity != null ? debtEquity.toFixed(2) : 'data unavailable', assessment: contextVsBenchmark(debtEquity, bench.debtToEquity, false) ?? 'data unavailable', unavailable: debtEquity == null },
        { label: 'Current Ratio', value: currentRatio != null ? Number(currentRatio).toFixed(2) : 'data unavailable', assessment: contextVsBenchmark(currentRatio, bench.currentRatio, true) ?? 'data unavailable', unavailable: currentRatio == null },
      ],
    },
    {
      title: 'Growth',
      rows: [
        { label: 'Revenue Growth', value: fmtPct(revenueGrowth), assessment: contextVsBenchmark(revenueGrowth, bench.revenueGrowthPct, true) ?? 'data unavailable', unavailable: revenueGrowth == null },
        { label: 'EPS (TTM)', value: eps != null ? String(eps) : 'data unavailable', assessment: eps != null ? 'reported' : 'data unavailable', unavailable: eps == null },
      ],
    },
  ];

  return { metrics, fundamentals };
}

async function fetchPeerMetricsFmp(
  symbol: string,
  exchange: Exchange,
  sector: string,
): Promise<PeerComparisonRow[]> {
  const peers = (SECTOR_PEERS[sector] ?? SECTOR_PEERS.Other)
    .filter(p => p !== symbol.toUpperCase())
    .slice(0, 3);
  const all = [symbol.toUpperCase(), ...peers];

  const rows = await Promise.all(
    all.map(s => getFundamentals(s, s === symbol.toUpperCase() ? exchange : inferExchange(s))),
  );

  return rows.map(f => ({
    symbol: f.symbol,
    pe: f.pe,
    revenueGrowthPct: f.revenueGrowth,
    profitMarginPct: f.profitMargin,
    isSubject: f.symbol === symbol.toUpperCase(),
  }));
}

async function analyzeStockFmp(
  sym: string,
  ex: Exchange,
  options: AnalyzeStockOptions,
): Promise<StockAnalysisResponse> {
  const sector = resolveSector(sym);

  const [fundamentals, quote, ratios, hist1M, hist6M, hist1Y, newsRows] = await Promise.all([
    getFundamentals(sym, ex),
    fetchFmpQuoteForSymbol(sym, ex),
    fetchFmpRatiosTtm(sym, ex),
    fetchFmpHistorical(sym, ex, 31),
    fetchFmpHistorical(sym, ex, 183),
    fetchFmpHistorical(sym, ex, 366),
    fetchFmpNews(sym, ex, 6),
  ]);

  const priceFromChart = priceFromHistory(hist1M.length > 0 ? hist1M : hist6M);
  const rangeFromYear = priceFromHistory(hist1Y.length > 0 ? hist1Y : hist6M);

  let price = quote?.price != null ? Number(quote.price) : null;
  let dayChangePct = quote?.changesPercentage != null ? Number(quote.changesPercentage) : null;
  let dayChange = quote?.change != null ? Number(quote.change) : null;
  let week52Low = quote?.yearLow ?? null;
  let week52High = quote?.yearHigh ?? null;

  if (price == null && priceFromChart) {
    price = priceFromChart.price;
    dayChange = priceFromChart.dayChange;
    dayChangePct = priceFromChart.dayChangePct;
  }
  if ((week52Low == null || week52High == null) && rangeFromYear) {
    week52Low = week52Low ?? rangeFromYear.week52Low;
    week52High = week52High ?? rangeFromYear.week52High;
  }

  const pe = fundamentals.pe;
  const pb = fundamentals.pb;
  const eps = fundamentals.eps;
  const divYield = ratios?.dividendYieldTTM != null ? Number(ratios.dividendYieldTTM) * 100 : null;
  const roe = fundamentals.roe;
  const debtEquity = fundamentals.debtEquity;
  const revenueGrowth = fundamentals.revenueGrowth;
  const profitMargin = fundamentals.profitMargin;
  const currentRatio = fundamentals.currentRatio;
  const marketCap = quote?.marketCap ?? null;

  const scorecard = buildScorecard(pe, roe, debtEquity, revenueGrowth, profitMargin, dayChangePct, sector);
  const { metrics, fundamentals: fundamentalsGroups } = buildMetricsAndFundamentals(
    sym, sector, pe, pb, eps, divYield, roe, debtEquity, revenueGrowth, profitMargin, currentRatio,
  );

  const news: NewsHeadline[] = newsRows.map(n => ({
    title: n.title,
    source: n.site ?? 'FMP',
    date: n.publishedDate?.slice(0, 10) ?? '—',
    url: n.url ?? '#',
    sentiment: 'neutral' as const,
  }));

  const peers = await fetchPeerMetricsFmp(sym, ex, sector);

  const useAi = options.useAi !== false;
  const synthesis = useAi
    ? await generateStockSynthesis(sym, {
        sector,
        scorecard,
        pe,
        roe,
        revenueGrowth,
        profitMargin,
        dayChangePct,
        week52Low,
        week52High,
        price,
      })
    : stockSynthesisFallback(sym);

  return {
    header: {
      companyName: fundamentals.companyName,
      symbol: sym,
      exchange: ex,
      currency: fundamentals.currency,
      price,
      dayChange,
      dayChangePct: dayChangePct != null ? Math.round(dayChangePct * 100) / 100 : null,
      marketCap: marketCap != null ? Number(marketCap) : null,
      week52Low: week52Low != null ? Number(week52Low) : null,
      week52High: week52High != null ? Number(week52High) : null,
    },
    scorecard,
    priceHistory: { '1M': hist1M, '6M': hist6M, '1Y': hist1Y },
    metrics,
    fundamentals: fundamentalsGroups,
    sentiment: {
      score: scorecard.sentiment.value,
      label: scorecard.sentiment.tag,
      headlines: news,
      unavailable: news.length === 0,
    },
    peers,
    synthesis,
    generatedAt: new Date().toISOString(),
  };
}

async function fetchHistoryYahoo(yahooSym: string, days: number): Promise<PriceHistoryPoint[]> {
  const period2 = new Date();
  const period1 = new Date();
  period1.setDate(period1.getDate() - days);
  try {
    const chart = await yahooFinance.chart(yahooSym, {
      period1: period1.toISOString().slice(0, 10),
      period2: period2.toISOString().slice(0, 10),
      interval: '1d',
    });
    const quotes = chart.quotes ?? [];
    return quotes
      .filter(q => q.close != null)
      .map(q => ({
        date: q.date.toISOString().slice(0, 10),
        close: q.close as number,
      }));
  } catch {
    return [];
  }
}

async function fetchNewsYahoo(yahooSym: string): Promise<NewsHeadline[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSym)}&newsCount=6`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data = await res.json() as { news?: Array<{
      title: string;
      publisher: string;
      providerPublishTime?: number;
      link: string;
    }> };
    return (data.news ?? []).slice(0, 6).map(n => ({
      title: n.title,
      source: n.publisher ?? 'Yahoo Finance',
      date: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString().slice(0, 10)
        : '—',
      url: n.link,
      sentiment: 'neutral' as const,
    }));
  } catch {
    return [];
  }
}

async function fetchPeerMetricsYahoo(
  symbol: string,
  exchange: Exchange,
  sector: string,
): Promise<PeerComparisonRow[]> {
  const peers = (SECTOR_PEERS[sector] ?? SECTOR_PEERS.Other)
    .filter(p => p !== symbol.toUpperCase())
    .slice(0, 3);
  const all = [symbol.toUpperCase(), ...peers];

  const rows: PeerComparisonRow[] = [];
  for (const sym of all) {
    const ySym = toYahooSymbol(sym, sym === symbol.toUpperCase() ? exchange : inferExchange(sym));
    try {
      const summary = await yahooFinance.quoteSummary(ySym, {
        modules: ['defaultKeyStatistics', 'financialData'],
      });
      const pe = summary.defaultKeyStatistics?.trailingPE
        ?? summary.summaryDetail?.trailingPE
        ?? null;
      const fin = summary.financialData;
      rows.push({
        symbol: sym,
        pe: pe != null ? Number(pe) : null,
        revenueGrowthPct: fin?.revenueGrowth != null ? Number(fin.revenueGrowth) * 100 : null,
        profitMarginPct: fin?.profitMargins != null ? Number(fin.profitMargins) * 100 : null,
        isSubject: sym === symbol.toUpperCase(),
      });
    } catch {
      rows.push({
        symbol: sym,
        pe: null,
        revenueGrowthPct: null,
        profitMarginPct: null,
        isSubject: sym === symbol.toUpperCase(),
      });
    }
  }
  return rows;
}

async function analyzeStockYahoo(
  sym: string,
  ex: Exchange,
  options: AnalyzeStockOptions,
): Promise<StockAnalysisResponse> {
  const yahooSym = toYahooSymbol(sym, ex);
  const sector = resolveSector(sym);

  const [quote, summary, hist1M, hist6M, hist1Y, news] = await Promise.all([
    yahooFinance.quote(yahooSym).catch(() => null),
    yahooFinance.quoteSummary(yahooSym, {
      modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'summaryProfile'],
    }).catch(() => null),
    fetchHistoryYahoo(yahooSym, 31),
    fetchHistoryYahoo(yahooSym, 183),
    fetchHistoryYahoo(yahooSym, 366),
    fetchNewsYahoo(yahooSym),
  ]);

  const priceFromChart = priceFromHistory(hist1M.length > 0 ? hist1M : hist6M);
  const rangeFromYear = priceFromHistory(hist1Y.length > 0 ? hist1Y : hist6M);

  const fin = summary?.financialData;
  const stats = summary?.defaultKeyStatistics;
  const detail = summary?.summaryDetail;

  let price = quote?.regularMarketPrice ?? summary?.price?.regularMarketPrice ?? null;
  let dayChangePct = quote?.regularMarketChangePercent
    ?? (summary?.price?.regularMarketChangePercent != null
      ? Number(summary.price.regularMarketChangePercent) * 100
      : null);
  let dayChange = price != null && dayChangePct != null
    ? price * (dayChangePct / 100) / (1 + dayChangePct / 100)
    : quote?.regularMarketChange ?? null;
  let week52Low = quote?.fiftyTwoWeekLow ?? detail?.fiftyTwoWeekLow ?? null;
  let week52High = quote?.fiftyTwoWeekHigh ?? detail?.fiftyTwoWeekHigh ?? null;

  if (price == null && priceFromChart) {
    price = priceFromChart.price;
    dayChange = priceFromChart.dayChange;
    dayChangePct = priceFromChart.dayChangePct;
  }
  if ((week52Low == null || week52High == null) && rangeFromYear) {
    week52Low = week52Low ?? rangeFromYear.week52Low;
    week52High = week52High ?? rangeFromYear.week52High;
  }

  const currency = quote?.currency ?? summary?.price?.currency ?? (ex === 'NSE' || ex === 'BSE' ? 'INR' : 'USD');
  const companyName = quote?.longName ?? quote?.shortName
    ?? summary?.price?.longName ?? summary?.summaryProfile?.longName ?? sym;

  const pe = stats?.trailingPE ?? detail?.trailingPE ?? null;
  const pb = stats?.priceToBook ?? null;
  const eps = stats?.trailingEps ?? null;
  const divYield = detail?.dividendYield != null ? Number(detail.dividendYield) * 100 : null;
  const roe = fin?.returnOnEquity != null ? Number(fin.returnOnEquity) * 100 : null;
  const debtEquity = fin?.debtToEquity != null ? Number(fin.debtToEquity) / 100 : null;
  const revenueGrowth = fin?.revenueGrowth != null ? Number(fin.revenueGrowth) * 100 : null;
  const profitMargin = fin?.profitMargins != null ? Number(fin.profitMargins) * 100 : null;
  const currentRatio = fin?.currentRatio ?? null;
  const marketCap = quote?.marketCap ?? detail?.marketCap ?? null;

  const scorecard = buildScorecard(
    pe != null ? Number(pe) : null,
    roe,
    debtEquity,
    revenueGrowth,
    profitMargin,
    dayChangePct != null ? Number(dayChangePct) : null,
    sector,
  );

  const { metrics, fundamentals } = buildMetricsAndFundamentals(
    sym,
    sector,
    pe != null ? Number(pe) : null,
    pb != null ? Number(pb) : null,
    eps != null ? Number(eps) : null,
    divYield,
    roe,
    debtEquity,
    revenueGrowth,
    profitMargin,
    currentRatio != null ? Number(currentRatio) : null,
  );

  const peers = await fetchPeerMetricsYahoo(sym, ex, sector);

  const useAi = options.useAi !== false;
  const synthesis = useAi
    ? await generateStockSynthesis(sym, {
        sector,
        scorecard,
        pe,
        roe,
        revenueGrowth,
        profitMargin,
        dayChangePct,
        week52Low,
        week52High,
        price,
      })
    : stockSynthesisFallback(sym);

  return {
    header: {
      companyName: String(companyName),
      symbol: sym,
      exchange: ex,
      currency,
      price: price != null ? Number(price) : null,
      dayChange: dayChange != null ? Number(dayChange) : null,
      dayChangePct: dayChangePct != null ? Math.round(Number(dayChangePct) * 100) / 100 : null,
      marketCap: marketCap != null ? Number(marketCap) : null,
      week52Low: week52Low != null ? Number(week52Low) : null,
      week52High: week52High != null ? Number(week52High) : null,
    },
    scorecard,
    priceHistory: { '1M': hist1M, '6M': hist6M, '1Y': hist1Y },
    metrics,
    fundamentals,
    sentiment: {
      score: scorecard.sentiment.value,
      label: scorecard.sentiment.tag,
      headlines: news,
      unavailable: news.length === 0,
    },
    peers,
    synthesis,
    generatedAt: new Date().toISOString(),
  };
}

export async function analyzeStock(
  symbol: string,
  exchange?: Exchange,
  options: AnalyzeStockOptions = {},
): Promise<StockAnalysisResponse> {
  const sym = symbol.trim().toUpperCase();
  const ex = inferExchange(sym, exchange);

  if (isFmpProvider()) {
    return analyzeStockFmp(sym, ex, options);
  }
  return analyzeStockYahoo(sym, ex, options);
}
