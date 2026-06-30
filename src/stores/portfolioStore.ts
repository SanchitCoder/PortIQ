import { create } from 'zustand';
import type { AddHoldingInput, Holding, PriceQuote } from '../types/portfolio';
import {
  createHoldingInSupabase,
  deleteHoldingFromSupabase,
  fetchHoldingsFromSupabase,
} from '../lib/holdingsService';
import { fetchPrices } from '../lib/portfolioApi';
import { holdingKey } from '../lib/portfolioMetrics';

/** Retry transient failures (e.g. network blips). */
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
  userId: string | null;
  holdings: Holding[];
  priceMeta: Record<string, PriceMeta>;
  lastPriceUpdate: string | null;
  isSyncing: boolean;
  isRefreshingPrices: boolean;
  syncError: string | null;

  /** Switch active user — clears UI only; data stays in Supabase. */
  setUser: (userId: string | null) => void;
  /** Load holdings from Supabase for the signed-in user. */
  loadFromSupabase: () => Promise<void>;
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

const emptyUiState = {
  holdings: [] as Holding[],
  priceMeta: {} as Record<string, PriceMeta>,
  lastPriceUpdate: null as string | null,
  syncError: null as string | null,
};

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
  userId: null,
  holdings: [],
  priceMeta: {},
  lastPriceUpdate: null,
  isSyncing: false,
  isRefreshingPrices: false,
  syncError: null,

  setUser: (userId) => {
    if (get().userId === userId) return;
    set({ userId, ...emptyUiState });
  },

  loadFromSupabase: async () => {
    if (!get().userId) return;

    set({ isSyncing: true, syncError: null });
    try {
      const remote = await withRetry(() => fetchHoldingsFromSupabase());
      set({ holdings: remote });
    } catch (err) {
      console.warn('Supabase holdings sync failed:', err);
      set({ syncError: 'Could not load portfolio from Supabase.' });
    } finally {
      set({ isSyncing: false });
    }
  },

  addHolding: async (input) => {
    if (!get().userId) return { error: 'Please sign in to save holdings.' };

    const symbol = input.symbol.trim().toUpperCase();
    if (!symbol) return { error: 'Symbol is required.' };
    if (input.quantity <= 0) return { error: 'Quantity must be greater than 0.' };
    if (input.avgBuyPrice <= 0) return { error: 'Avg buy price must be greater than 0.' };

    const duplicate = get().holdings.find(
      h => h.symbol === symbol && h.exchange === input.exchange,
    );
    if (duplicate) return { error: `${symbol} (${input.exchange}) is already in your portfolio.` };

    try {
      const saved = await createHoldingInSupabase({ ...input, symbol });
      set({ holdings: [...get().holdings, saved] });
      await get().refreshPrices(true);
      return {};
    } catch (err) {
      console.warn('Supabase create holding failed:', err);
      return { error: 'Failed to save holding — please try again.' };
    }
  },

  removeHolding: async (id) => {
    const prev = get().holdings;
    set({ holdings: prev.filter(h => h.id !== id) });
    try {
      await deleteHoldingFromSupabase(id);
    } catch (err) {
      console.warn('Supabase delete holding failed:', err);
      set({ holdings: prev });
    }
  },

  refreshPrices: async (force = false) => {
    const { holdings } = get();
    if (holdings.length === 0) return;

    set({ isRefreshingPrices: true });
    try {
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
}));

/** After login: load saved holdings from Supabase, then refresh live prices. */
export async function hydratePortfolioForUser(userId: string): Promise<void> {
  const store = usePortfolioStore.getState();
  store.setUser(userId);
  await store.loadFromSupabase();
  await store.refreshPrices(true);
}

/** On logout: clear in-memory UI only (Supabase rows are unchanged). */
export function clearPortfolioUi(): void {
  usePortfolioStore.getState().setUser(null);
}
