import type { StockAnalysisResponse, StockAnalyzerRequest } from '../../shared/api-types';

const API_BASE = import.meta.env.VITE_API_URL || '';

/** API: POST /api/analyzer/stock/export-pdf — cached report PDF (no extra AI call) */
export async function exportStockAnalysisPdf(
  body: StockAnalyzerRequest & { userEmail?: string },
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/analyzer/stock/export-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `PDF export failed (${res.status})`);
  }
  return res.blob();
}

/** API: POST /api/analyzer/stock — structured equity report */
export async function analyzeStock(
  body: StockAnalyzerRequest,
): Promise<StockAnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/analyzer/stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `API error ${res.status}`);
  }
  return res.json() as Promise<StockAnalysisResponse>;
}
