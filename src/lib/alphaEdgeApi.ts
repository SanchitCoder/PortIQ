import type { AlphaEdgeEvaluateRequest, AlphaEdgeVerdict } from '../../shared/api-types';

const API_BASE = import.meta.env.VITE_API_URL || '';

/** API: POST /api/alphaedge/evaluate/export-pdf — cached verdict PDF (no extra AI call) */
export async function exportAlphaEdgePdf(
  body: AlphaEdgeEvaluateRequest & { userEmail?: string },
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/alphaedge/evaluate/export-pdf`, {
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

/** API: POST /api/alphaedge/evaluate */
export async function evaluateAlphaEdge(body: AlphaEdgeEvaluateRequest): Promise<AlphaEdgeVerdict> {
  const res = await fetch(`${API_BASE}/api/alphaedge/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `API error ${res.status}`);
  }
  return res.json() as Promise<AlphaEdgeVerdict>;
}
