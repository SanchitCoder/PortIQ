import type {
  AddHoldingInput,
  Holding,
  PortfolioAnalysisResponse,
  PriceQuote,
  StressTestRequest,
  StressTestResponse,
} from '../../shared/api-types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** API: GET /api/portfolio — fetch all holdings from backend */
export async function fetchPortfolio(): Promise<Holding[]> {
  return apiFetch<Holding[]>('/api/portfolio');
}

/** API: POST /api/portfolio — create a holding on backend */
export async function createHolding(input: AddHoldingInput): Promise<Holding> {
  return apiFetch<Holding>('/api/portfolio', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** API: DELETE /api/portfolio/:id — remove a holding from backend */
export async function deleteHolding(id: string): Promise<void> {
  await apiFetch<void>(`/api/portfolio/${id}`, { method: 'DELETE' });
}

/** API: POST /api/prices — batch fetch live prices (Layer 1) */
export async function fetchPrices(
  symbols: { symbol: string; exchange: string }[],
  options?: { refresh?: boolean }
): Promise<PriceQuote[]> {
  const data = await apiFetch<{ prices: PriceQuote[] }>('/api/prices', {
    method: 'POST',
    body: JSON.stringify({ symbols, refresh: options?.refresh ?? false }),
  });
  return data.prices ?? [];
}

/** API: POST /api/portfolio/analyze — Layer 2 compute + Layer 3 AI */
export async function analyzePortfolio(holdings: Holding[]): Promise<PortfolioAnalysisResponse> {
  return apiFetch<PortfolioAnalysisResponse>('/api/portfolio/analyze', {
    method: 'POST',
    body: JSON.stringify({ holdings }),
  });
}

/** API: POST /api/portfolio/analyze/export-pdf — cached analysis PDF (no extra AI call) */
export async function exportPortfolioPdf(
  holdings: Holding[],
  userEmail?: string,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/portfolio/analyze/export-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings, userEmail }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `PDF export failed (${res.status})`);
  }
  return res.blob();
}

/** API: POST /api/stress-test — Layer 2 stress + Layer 3 AI narrative */
export async function runStressTest(body: StressTestRequest): Promise<StressTestResponse> {
  return apiFetch<StressTestResponse>('/api/stress-test', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
