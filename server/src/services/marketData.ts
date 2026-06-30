import YahooFinance from 'yahoo-finance2';
import type { Exchange, NormalizedQuote, SymbolRequest } from '../../shared/api-types.js';
import {
  fetchFmpQuotes,
  matchFmpQuote,
  toFmpSymbol,
} from '../lib/fmp.js';
import {
  cacheDelete,
  cacheKey,
  cacheMget,
  cacheMset,
} from '../lib/redisCache.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface MarketDataProvider {
  name: string;
  getQuotes(symbols: SymbolRequest[]): Promise<NormalizedQuote[]>;
}

const CACHE_TTL_MS = Number(process.env.MARKET_DATA_CACHE_TTL_MS ?? 30_000);
/** Longer TTL for stale fallback when provider fails — state in Redis, not process memory */
const STALE_TTL_MS = Number(process.env.MARKET_DATA_STALE_TTL_MS ?? 86_400_000);

function symbolKey(symbol: string, exchange: string): string {
  return `${symbol.toUpperCase()}:${exchange}`;
}

function quoteRedisKey(provider: string, symbol: string, exchange: string): string {
  return cacheKey('quote', provider, symbol.toUpperCase(), exchange);
}

function quoteStaleRedisKey(provider: string, symbol: string, exchange: string): string {
  return cacheKey('quote', 'stale', provider, symbol.toUpperCase(), exchange);
}

function toYahooSymbol(symbol: string, exchange: Exchange): string {
  const sym = symbol.toUpperCase();
  if (exchange === 'NSE') return `${sym}.NS`;
  if (exchange === 'BSE') return `${sym}.BO`;
  return sym;
}

function providerSymbol(symbol: string, exchange: Exchange, provider: string): string {
  const sym = symbol.toUpperCase();
  if (provider === 'twelvedata') {
    if (exchange === 'NSE') return `${sym}:NSE`;
    if (exchange === 'BSE') return `${sym}:BSE`;
    return sym;
  }
  if (provider === 'fmp') {
    return toFmpSymbol(sym, exchange);
  }
  return sym;
}

function currencyForExchange(exchange: Exchange): string {
  return exchange === 'NSE' || exchange === 'BSE' ? 'INR' : 'USD';
}

function fromYahooSymbol(yahooSym: string, requests: SymbolRequest[]): SymbolRequest | undefined {
  const upper = yahooSym.toUpperCase();
  return requests.find(s => toYahooSymbol(s.symbol, s.exchange).toUpperCase() === upper)
    ?? requests.find(s => s.symbol.toUpperCase() === upper.replace(/\.(NS|BO)$/, ''));
}

function normalizeDayChangePct(raw: number | undefined): number {
  if (raw == null || Number.isNaN(raw)) return 0;
  // Yahoo returns percent (e.g. -1.3); values in (-1, 1) excluding 0 are treated as decimals
  const pct = Math.abs(raw) > 0 && Math.abs(raw) < 1 ? raw * 100 : raw;
  return Math.round(pct * 100) / 100;
}

function yahooRowToQuote(row: NonNullable<Awaited<ReturnType<typeof yahooFinance.quote>>>, orig: SymbolRequest): NormalizedQuote | null {
  if (!row?.symbol || row.regularMarketPrice == null) return null;
  return {
    symbol: orig.symbol.toUpperCase(),
    exchange: orig.exchange,
    price: row.regularMarketPrice,
    dayChangePct: normalizeDayChangePct(row.regularMarketChangePercent),
    currency: row.currency ?? currencyForExchange(orig.exchange),
  };
}

async function fetchYahooOne(s: SymbolRequest): Promise<NormalizedQuote | null> {
  try {
    const row = await yahooFinance.quote(toYahooSymbol(s.symbol, s.exchange));
    const single = Array.isArray(row) ? row[0] : row;
    return single ? yahooRowToQuote(single, s) : null;
  } catch {
    return null;
  }
}

const yahooFetchDelayMs = Number(process.env.YAHOO_FETCH_DELAY_MS ?? 120);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Yahoo Finance via yahoo-finance2 — batch first, per-symbol fallback on partial/empty. */
async function fetchYahoo(symbols: SymbolRequest[]): Promise<NormalizedQuote[]> {
  const results: NormalizedQuote[] = [];
  const seen = new Set<string>();

  try {
    const yahooSymbols = symbols.map(s => toYahooSymbol(s.symbol, s.exchange));
    const raw = await yahooFinance.quote(yahooSymbols);
    const rows = Array.isArray(raw) ? raw : [raw];

    for (const row of rows) {
      if (!row?.symbol) continue;
      const orig = fromYahooSymbol(row.symbol, symbols);
      if (!orig) continue;
      const q = yahooRowToQuote(row, orig);
      if (!q) continue;
      const key = symbolKey(q.symbol, q.exchange);
      if (!seen.has(key)) {
        seen.add(key);
        results.push(q);
      }
    }
  } catch (err) {
    console.warn('[marketData/yahoo] batch quote failed, trying per-symbol:', err instanceof Error ? err.message : err);
  }

  const missing = symbols.filter(s => !seen.has(symbolKey(s.symbol, s.exchange)));
  for (const s of missing) {
    const q = await fetchYahooOne(s);
    if (q) {
      seen.add(symbolKey(q.symbol, q.exchange));
      results.push(q);
    }
    if (missing.length > 1) await sleep(yahooFetchDelayMs);
  }

  if (results.length === 0) throw new Error('Yahoo Finance returned no quotes');
  return results;
}

async function fetchTwelveDataBatch(symbols: SymbolRequest[]): Promise<NormalizedQuote[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) throw new Error('TWELVE_DATA_API_KEY not set');

  const tdSymbols = symbols
    .map(s => providerSymbol(s.symbol, s.exchange, 'twelvedata'))
    .join(',');

  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(tdSymbols)}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);

  const data = await res.json() as Record<string, unknown>;
  if (data.code && data.message) throw new Error(String(data.message));

  const results: NormalizedQuote[] = [];

  if (Array.isArray(data)) {
    for (let i = 0; i < symbols.length; i++) {
      const row = data[i] as Record<string, string>;
      const s = symbols[i];
      results.push(parseTwelveDataRow(s, row));
    }
  } else if (typeof data === 'object' && data.symbol) {
    results.push(parseTwelveDataRow(symbols[0], data as Record<string, string>));
  } else {
    for (const s of symbols) {
      const key = providerSymbol(s.symbol, s.exchange, 'twelvedata');
      const row = (data as Record<string, Record<string, string>>)[key];
      if (row) results.push(parseTwelveDataRow(s, row));
    }
  }

  return results;
}

function parseTwelveDataRow(s: SymbolRequest, row: Record<string, string>): NormalizedQuote {
  const price = parseFloat(row.price ?? row.close ?? '0');
  const prev = parseFloat(row.previous_close ?? row.close ?? String(price));
  const dayChangePct = prev > 0 ? ((price - prev) / prev) * 100 : 0;

  return {
    symbol: s.symbol.toUpperCase(),
    exchange: s.exchange,
    price,
    dayChangePct: Math.round(dayChangePct * 100) / 100,
    currency: currencyForExchange(s.exchange),
  };
}

async function fetchTwelveData(symbols: SymbolRequest[]): Promise<NormalizedQuote[]> {
  if (symbols.length === 1) return fetchTwelveDataBatch(symbols);
  try {
    return await fetchTwelveDataBatch(symbols);
  } catch {
    const results: NormalizedQuote[] = [];
    for (const s of symbols) {
      results.push(...await fetchTwelveDataBatch([s]));
    }
    return results;
  }
}

async function fetchFmp(symbols: SymbolRequest[]): Promise<NormalizedQuote[]> {
  const rows = await fetchFmpQuotes(symbols);
  const results: NormalizedQuote[] = [];

  for (const s of symbols) {
    const row = matchFmpQuote(rows, s.symbol, s.exchange);
    if (!row?.price) {
      console.warn(`[marketData/fmp] no quote for ${toFmpSymbol(s.symbol, s.exchange)}`);
      continue;
    }
    results.push({
      symbol: s.symbol.toUpperCase(),
      exchange: s.exchange,
      price: Number(row.price),
      dayChangePct: Math.round(Number(row.changesPercentage ?? 0) * 100) / 100,
      currency: currencyForExchange(s.exchange),
    });
  }

  if (results.length === 0) throw new Error('FMP returned no quotes');
  return results;
}

async function fetchAlphaVantage(symbols: SymbolRequest[]): Promise<NormalizedQuote[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY not set');

  const results: NormalizedQuote[] = [];
  for (const s of symbols) {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(s.symbol)}&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
    const data = await res.json() as { 'Global Quote'?: Record<string, string> };
    const q = data['Global Quote'];
    if (!q) throw new Error(`No quote for ${s.symbol}`);

    const price = parseFloat(q['05. price'] ?? '0');
    const changePct = parseFloat((q['10. change percent'] ?? '0').replace('%', ''));

    results.push({
      symbol: s.symbol.toUpperCase(),
      exchange: s.exchange,
      price,
      dayChangePct: changePct,
      currency: currencyForExchange(s.exchange),
    });
  }
  return results;
}

async function mockQuotes(symbols: SymbolRequest[]): Promise<NormalizedQuote[]> {
  console.warn('[marketData] Using mock prices — set MARKET_DATA_PROVIDER=yahoo for live quotes');
  const basePrices: Record<string, number> = {
    RELIANCE: 2850, TCS: 4100, HDFCBANK: 1680, INFY: 1820, WIPRO: 520,
    AAPL: 228, NVDA: 138, TSLA: 248, MSFT: 420, GOOGL: 175,
  };

  return symbols.map(s => {
    const sym = s.symbol.toUpperCase();
    const base = basePrices[sym] ?? 1000;
    return {
      symbol: sym,
      exchange: s.exchange,
      price: base,
      dayChangePct: 0,
      currency: currencyForExchange(s.exchange),
      stale: true,
    };
  });
}

function createProvider(): MarketDataProvider {
  const name = (process.env.MARKET_DATA_PROVIDER ?? 'yahoo').toLowerCase();

  const fetchers: Record<string, (s: SymbolRequest[]) => Promise<NormalizedQuote[]>> = {
    yahoo: fetchYahoo,
    twelvedata: fetchTwelveData,
    fmp: fetchFmp,
    alphavantage: fetchAlphaVantage,
    mock: mockQuotes,
  };

  const fetcher = fetchers[name];
  if (!fetcher) {
    throw new Error(`Unknown MARKET_DATA_PROVIDER: ${name}`);
  }

  return { name, getQuotes: fetcher };
}

let providerInstance: MarketDataProvider | null = null;

function getProvider(): MarketDataProvider {
  if (!providerInstance) {
    const configured = (process.env.MARKET_DATA_PROVIDER ?? 'yahoo').toLowerCase();
    const hasKey =
      (configured === 'twelvedata' && process.env.TWELVE_DATA_API_KEY) ||
      (configured === 'fmp' && process.env.FMP_API_KEY) ||
      (configured === 'alphavantage' && process.env.ALPHA_VANTAGE_API_KEY) ||
      configured === 'yahoo' ||
      configured === 'mock';

    if (!hasKey && configured !== 'yahoo' && configured !== 'mock') {
      console.warn(`[marketData] No API key for ${configured}, falling back to yahoo`);
      providerInstance = { name: 'yahoo', getQuotes: fetchYahoo };
    } else {
      providerInstance = createProvider();
    }
  }
  return providerInstance;
}

async function writeQuoteCache(
  provider: string,
  quotes: NormalizedQuote[],
): Promise<void> {
  const entries: { key: string; value: unknown; ttlMs: number }[] = [];
  for (const q of quotes) {
    const primaryKey = quoteRedisKey(provider, q.symbol, q.exchange);
    const staleKey = quoteStaleRedisKey(provider, q.symbol, q.exchange);
    const value = { ...q, stale: false };
    entries.push({ key: primaryKey, value, ttlMs: CACHE_TTL_MS });
    entries.push({ key: staleKey, value: { ...q, stale: false }, ttlMs: STALE_TTL_MS });
  }
  await cacheMset(entries);
}

export interface GetQuotesOptions {
  /** Bypass cache — use on manual Refresh */
  forceRefresh?: boolean;
}

/**
 * Layer 1 — batch quote fetch with Redis cache (~30s default).
 * MGET on cache hits; provider fetch on misses; stale fallback from Redis.
 */
export async function getQuotes(
  symbols: SymbolRequest[],
  options?: GetQuotesOptions,
): Promise<NormalizedQuote[]> {
  if (symbols.length === 0) return [];

  const provider = getProvider();
  const unique = Array.from(
    new Map(symbols.map(s => [symbolKey(s.symbol, s.exchange), {
      symbol: s.symbol.toUpperCase(),
      exchange: s.exchange,
    }])).values(),
  );

  const primaryKeys = unique.map(s => quoteRedisKey(provider.name, s.symbol, s.exchange));

  if (options?.forceRefresh) {
    await cacheDelete(primaryKeys);
  }

  const results: NormalizedQuote[] = [];
  const toFetch: SymbolRequest[] = [];

  if (options?.forceRefresh) {
    toFetch.push(...unique);
  } else {
    const cached = await cacheMget<NormalizedQuote>(primaryKeys);
    for (let i = 0; i < unique.length; i++) {
      const hit = cached[i];
      if (hit) {
        results.push({ ...hit, stale: false });
      } else {
        toFetch.push(unique[i]);
      }
    }
  }

  if (toFetch.length > 0) {
    let fetched: NormalizedQuote[] = [];

    try {
      fetched = await provider.getQuotes(toFetch);
    } catch (err) {
      console.warn(`[marketData] ${provider.name} failure:`, err instanceof Error ? err.message : err);
    }

    let fetchedKeys = new Set(fetched.map(q => symbolKey(q.symbol, q.exchange)));
    const missingAfterPrimary = toFetch.filter(s => !fetchedKeys.has(symbolKey(s.symbol, s.exchange)));

    // FMP/Twelve Data often miss NSE symbols — fill gaps with Yahoo when possible
    if (missingAfterPrimary.length > 0 && provider.name !== 'yahoo') {
      try {
        const yahooFilled = await fetchYahoo(missingAfterPrimary);
        if (yahooFilled.length > 0) {
          console.log(`[marketData] Yahoo filled ${yahooFilled.length}/${missingAfterPrimary.length} missing quotes`);
          fetched = [...fetched, ...yahooFilled];
          fetchedKeys = new Set(fetched.map(q => symbolKey(q.symbol, q.exchange)));
        }
      } catch (yahooErr) {
        console.warn('[marketData] Yahoo fallback failed:', yahooErr instanceof Error ? yahooErr.message : yahooErr);
      }
    }

    if (fetched.length > 0) {
      await writeQuoteCache(provider.name, fetched);
    }

    for (const q of fetched) {
      results.push({ ...q, stale: false });
    }

    const stillMissing = toFetch.filter(s => !fetchedKeys.has(symbolKey(s.symbol, s.exchange)));
    if (stillMissing.length > 0) {
      const staleKeys = stillMissing.map(s =>
        quoteStaleRedisKey(provider.name, s.symbol, s.exchange),
      );
      const staleHits = await cacheMget<NormalizedQuote>(staleKeys);
      for (let i = 0; i < stillMissing.length; i++) {
        const stale = staleHits[i];
        if (stale) {
          results.push({ ...stale, stale: true });
        }
      }
    }
  }

  return results;
}
