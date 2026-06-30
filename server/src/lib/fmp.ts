import type { Exchange } from '../../shared/api-types.js';

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

export function getMarketProviderName(): string {
  return (process.env.MARKET_DATA_PROVIDER ?? 'yahoo').toLowerCase();
}

export function isFmpProvider(): boolean {
  return getMarketProviderName() === 'fmp' && Boolean(process.env.FMP_API_KEY?.trim());
}

export function toFmpSymbol(symbol: string, exchange: Exchange): string {
  const sym = symbol.trim().toUpperCase();
  if (exchange === 'NSE') return `${sym}.NS`;
  if (exchange === 'BSE') return `${sym}.BO`;
  return sym;
}

export function fmpApiKey(): string {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) throw new Error('FMP_API_KEY not set');
  return key;
}

export async function fmpFetch<T>(path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${FMP_BASE}${path}${sep}apikey=${fmpApiKey()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FMP HTTP ${res.status} for ${path.split('?')[0]}`);
  }
  const data = await res.json() as T | { 'Error Message'?: string };
  if (data && typeof data === 'object' && 'Error Message' in data) {
    throw new Error(String((data as { 'Error Message': string })['Error Message']));
  }
  return data as T;
}

export interface FmpQuoteRow {
  symbol: string;
  name?: string;
  price?: number;
  changesPercentage?: number;
  change?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  exchange?: string;
}

export interface FmpProfileRow {
  symbol: string;
  companyName?: string;
  currency?: string;
  sector?: string;
  industry?: string;
}

export interface FmpRatiosTtmRow {
  peRatioTTM?: number;
  priceToBookRatioTTM?: number;
  returnOnEquityTTM?: number;
  debtEquityRatioTTM?: number;
  currentRatioTTM?: number;
  netProfitMarginTTM?: number;
  dividendYieldTTM?: number;
}

export interface FmpGrowthRow {
  revenueGrowth?: number;
}

export interface FmpHistoricalDay {
  date: string;
  close: number;
}

/** Batch quote — one API call for many symbols (comma-separated). */
export async function fetchFmpQuotes(
  symbols: { symbol: string; exchange: Exchange }[],
): Promise<FmpQuoteRow[]> {
  if (symbols.length === 0) return [];

  const CHUNK = 20;
  const rows: FmpQuoteRow[] = [];

  for (let i = 0; i < symbols.length; i += CHUNK) {
    const chunk = symbols.slice(i, i + CHUNK);
    const fmpSymbols = chunk.map(s => toFmpSymbol(s.symbol, s.exchange)).join(',');
    const data = await fmpFetch<FmpQuoteRow[]>(`/quote/${encodeURIComponent(fmpSymbols)}`);
    if (Array.isArray(data)) rows.push(...data);
  }

  return rows;
}

export function matchFmpQuote(
  rows: FmpQuoteRow[],
  symbol: string,
  exchange: Exchange,
): FmpQuoteRow | undefined {
  const fmpSym = toFmpSymbol(symbol, exchange);
  return rows.find(r => r.symbol === fmpSym)
    ?? rows.find(r => r.symbol?.toUpperCase() === fmpSym)
    ?? rows.find(r => r.symbol?.toUpperCase().startsWith(`${symbol.toUpperCase()}.`));
}

export async function fetchFmpQuoteForSymbol(
  symbol: string,
  exchange: Exchange,
): Promise<FmpQuoteRow | null> {
  const rows = await fetchFmpQuotes([{ symbol, exchange }]);
  return matchFmpQuote(rows, symbol, exchange) ?? null;
}

export async function fetchFmpProfile(symbol: string, exchange: Exchange): Promise<FmpProfileRow | null> {
  const fmpSym = toFmpSymbol(symbol, exchange);
  const data = await fmpFetch<FmpProfileRow[]>(`/profile/${encodeURIComponent(fmpSym)}`);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function fetchFmpRatiosTtm(symbol: string, exchange: Exchange): Promise<FmpRatiosTtmRow | null> {
  const fmpSym = toFmpSymbol(symbol, exchange);
  const data = await fmpFetch<FmpRatiosTtmRow[]>(`/ratios-ttm/${encodeURIComponent(fmpSym)}`);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function fetchFmpIncomeGrowth(symbol: string, exchange: Exchange): Promise<FmpGrowthRow | null> {
  const fmpSym = toFmpSymbol(symbol, exchange);
  try {
    const data = await fmpFetch<Array<{ revenueGrowth?: number }>>(
      `/income-statement-growth/${encodeURIComponent(fmpSym)}?limit=1`,
    );
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

export async function fetchFmpHistorical(
  symbol: string,
  exchange: Exchange,
  days: number,
): Promise<FmpHistoricalDay[]> {
  const fmpSym = toFmpSymbol(symbol, exchange);
  const period2 = new Date();
  const period1 = new Date();
  period1.setDate(period1.getDate() - days);

  const from = period1.toISOString().slice(0, 10);
  const to = period2.toISOString().slice(0, 10);

  const data = await fmpFetch<{ historical?: FmpHistoricalDay[] }>(
    `/historical-price-full/${encodeURIComponent(fmpSym)}?from=${from}&to=${to}`,
  );

  const historical = data.historical ?? [];
  return historical
    .filter(h => h.close != null)
    .map(h => ({ date: h.date, close: Number(h.close) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface FmpNewsRow {
  title: string;
  publishedDate?: string;
  site?: string;
  url?: string;
}

export async function fetchFmpNews(symbol: string, exchange: Exchange, limit = 6): Promise<FmpNewsRow[]> {
  const fmpSym = toFmpSymbol(symbol, exchange);
  try {
    const data = await fmpFetch<FmpNewsRow[]>(
      `/stock_news?tickers=${encodeURIComponent(fmpSym)}&limit=${limit}`,
    );
    return Array.isArray(data) ? data.slice(0, limit) : [];
  } catch {
    return [];
  }
}
