import type { Exchange } from '../../shared/api-types.js';

const US_SYMBOLS = new Set(['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META']);

export function inferExchange(symbol: string, exchange?: Exchange): Exchange {
  if (exchange) return exchange;
  return US_SYMBOLS.has(symbol.toUpperCase()) ? 'NASDAQ' : 'NSE';
}

export function toYahooSymbol(symbol: string, exchange: Exchange): string {
  const sym = symbol.toUpperCase();
  if (exchange === 'NSE') return `${sym}.NS`;
  if (exchange === 'BSE') return `${sym}.BO`;
  return sym;
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function clampRange(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}
