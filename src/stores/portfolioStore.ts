import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AddHoldingInput, Holding, PriceQuote } from '../types/portfolio';
import {
  createHolding,
  deleteHolding,
  fetchPortfolio,
  fetchPrices,
} from '../lib/portfolioApi';
import { holdingKey } from '../lib/portfolioMetrics';

/** Retry transient failures (e.g. API still starting on dev:all boot). */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 800): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

interface PriceMeta {
  dayChangePct: number;
}

interface PortfolioState {
  holdings: Holding[];
  priceMeta: Record<string, PriceMeta>;
  lastPriceUpdate: string | null;
  isSyncing: boolean;
  isRefreshingPrices: boolean;
  syncError: string | null;

  loadFromBackend: () => Promise<void>;
  addHolding: (input: AddHoldingInput) => Promise<{ error?: string }>;
  removeHolding: (id: string) => Promise<void>;
  refreshPrices: (force?: boolean) => Promise<void>;
  applyPriceQuotes: (quotes: PriceQuote[]) => void;
}

function mergePriceIntoHoldings(holdings: Holding[], quotes: PriceQuote[]): Holding[] {
  const map = new Map(quotes.map(q => [holdingKey(q.symbol, q.exchange), q]));
  return holdings.map(h => {
    const q = map.get(holdingKey(h.symbol, h.exchange));
    if (!q || q.currentPrice <= 0) {
      return { ...h, currentPrice: undefined, dayChange: undefined, dayChangePct: undefined };
    }
    return { ...h, currentPrice: q.currentPrice, sector: q.sector ?? h.sector, dayChange: q.dayChange, dayChangePct: q.dayChangePct };
  });
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      holdings: [],
      priceMeta: {},
      lastPriceUpdate: null,
      isSyncing: false,
      isRefreshingPrices: false,
      syncError: null,

      loadFromBackend: async () => {
        set({ isSyncing: true, syncError: null });
        try {
          // API: GET /api/portfolio
          const remote = await withRetry(() => fetchPortfolio());
          if (remote.length > 0) {
            set({ holdings: remote });
          }
        } catch (err) {
          console.warn('Portfolio backend sync failed, using local cache:', err);
          set({ syncError: 'Using cached portfolio — backend unavailable.' });
        } finally {
          set({ isSyncing: false });
        }
      },

      addHolding: async (input) => {
        const symbol = input.symbol.trim().toUpperCase();
        if (!symbol) return { error: 'Symbol is required.' };
        if (input.quantity <= 0) return { error: 'Quantity must be greater than 0.' };
        if (input.avgBuyPrice <= 0) return { error: 'Avg buy price must be greater than 0.' };

        const duplicate = get().holdings.find(
          h => h.symbol === symbol && h.exchange === input.exchange
        );
        if (duplicate) return { error: `${symbol} (${input.exchange}) is already in your portfolio.` };

        const local: Holding = {
          id: crypto.randomUUID(),
          symbol,
          exchange: input.exchange,
          quantity: input.quantity,
          avgBuyPrice: input.avgBuyPrice,
          buyDate: input.buyDate,
        };

        set({ holdings: [...get().holdings, local] });

        try {
          // API: POST /api/portfolio
          const remote = await createHolding({ ...input, symbol });
          set({
            holdings: get().holdings.map(h => (h.id === local.id ? remote : h)),
          });
        } catch (err) {
          console.warn('Backend create failed, keeping local holding:', err);
        }

        await get().refreshPrices(true);
        return {};
      },

      removeHolding: async (id) => {
        set({ holdings: get().holdings.filter(h => h.id !== id) });
        try {
          // API: DELETE /api/portfolio/:id
          await deleteHolding(id);
        } catch (err) {
          console.warn('Backend delete failed, removed locally:', err);
        }
      },

      refreshPrices: async (force = false) => {
        const { holdings } = get();
        if (holdings.length === 0) return;

        set({ isRefreshingPrices: true });
        try {
          // API: POST /api/prices — refresh=true bypasses server cache
          const quotes = await withRetry(() => fetchPrices(
            holdings.map(h => ({ symbol: h.symbol, exchange: h.exchange })),
            { refresh: force },
          ));
          get().applyPriceQuotes(quotes);
          set({ lastPriceUpdate: new Date().toISOString() });
        } catch (err) {
          console.warn('Price refresh failed:', err);
        } finally {
          set({ isRefreshingPrices: false });
        }
      },

      applyPriceQuotes: (quotes) => {
        const meta: Record<string, PriceMeta> = { ...get().priceMeta };
        for (const q of quotes) {
          meta[holdingKey(q.symbol, q.exchange)] = { dayChangePct: q.dayChangePct };
        }
        set({
          holdings: mergePriceIntoHoldings(get().holdings, quotes),
          priceMeta: meta,
        });
      },
    }),
    {
      name: 'portiq-portfolio',
      partialize: state => ({
        holdings: state.holdings.map(({ currentPrice, dayChange, dayChangePct, ...h }) => h),
        priceMeta: {},
        lastPriceUpdate: null,
      }),
    }
  )
);
