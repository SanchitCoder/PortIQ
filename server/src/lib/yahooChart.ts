import type { Exchange } from '../../shared/api-types.js';
import { toYahooSymbol } from './symbolUtils.js';

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        currency?: string;
        longName?: string;
        shortName?: string;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
}

const UA = 'Mozilla/5.0 (compatible; PortIQ/1.0)';

export async function fetchYahooChart(
  symbol: string,
  exchange: Exchange,
  range: '1mo' | '6mo' | '1y' = '1mo',
): Promise<YahooChartResponse['chart']> {
  const ySym = toYahooSymbol(symbol, exchange);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=${range}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return undefined;
  const data = await res.json() as YahooChartResponse;
  return data.chart;
}

export function chartToHistory(
  chart: NonNullable<YahooChartResponse['chart']>,
): { date: string; close: number }[] {
  const result = chart.result?.[0];
  if (!result?.timestamp?.length) return [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const points: { date: string; close: number }[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const close = closes[i];
    if (close == null || Number.isNaN(close)) continue;
    points.push({
      date: new Date(result.timestamp[i] * 1000).toISOString().slice(0, 10),
      close,
    });
  }
  return points;
}

export function chartMetaPrice(chart: NonNullable<YahooChartResponse['chart']>): {
  price: number | null;
  dayChangePct: number | null;
  dayChange: number | null;
  currency: string;
  companyName: string | null;
  week52High: number | null;
  week52Low: number | null;
} {
  const meta = chart.result?.[0]?.meta;
  const price = meta?.regularMarketPrice ?? null;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose ?? null;
  let dayChangePct: number | null = null;
  let dayChange: number | null = null;
  if (price != null && prev != null && prev > 0) {
    dayChange = price - prev;
    dayChangePct = (dayChange / prev) * 100;
  }
  return {
    price,
    dayChangePct: dayChangePct != null ? Math.round(dayChangePct * 100) / 100 : null,
    dayChange: dayChange != null ? Math.round(dayChange * 100) / 100 : null,
    currency: meta?.currency ?? 'INR',
    companyName: meta?.longName ?? meta?.shortName ?? null,
    week52High: meta?.fiftyTwoWeekHigh ?? null,
    week52Low: meta?.fiftyTwoWeekLow ?? null,
  };
}
