import { z } from 'zod';
import type { StockAnalysisSynthesis } from '../../shared/api-types.js';
import { parseLlmJson, coerceString, coerceStringArray } from '../lib/llmJson.js';
import { callOpenRouterChat, isRateLimitError, OpenRouterNotConfiguredError } from '../lib/openrouter.js';

const SynthesisSchema = z.object({
  bullCase: z.array(z.string()).min(1),
  bearCase: z.array(z.string()).min(1),
  summaryVerdict: z.string().min(1),
  keyRisks: z.array(z.string()).min(1),
});

export function stockSynthesisFallback(symbol: string): StockAnalysisSynthesis {
  return {
    bullCase: [
      `${symbol} may benefit if current operational trends continue.`,
      'Valuation and growth scores suggest selective upside vs sector.',
    ],
    bearCase: [
      'Macro or sector headwinds could compress multiples.',
      'Monitor debt levels and margin sustainability.',
    ],
    summaryVerdict: `Neutral stance on ${symbol} — review scorecard and fundamentals before sizing a position.`,
    keyRisks: ['Earnings volatility', 'Sector rotation', 'Liquidity / market breadth'],
  };
}

function normalizeSynthesis(parsed: StockAnalysisSynthesis, symbol: string): StockAnalysisSynthesis {
  const fb = stockSynthesisFallback(symbol);
  return {
    summaryVerdict: coerceString(parsed.summaryVerdict, fb.summaryVerdict),
    bullCase: coerceStringArray(parsed.bullCase, fb.bullCase),
    bearCase: coerceStringArray(parsed.bearCase, fb.bearCase),
    keyRisks: coerceStringArray(parsed.keyRisks, fb.keyRisks),
  };
}

/** Layer 3 — AI synthesis only; all numeric facts are passed in as ground truth. */
export async function generateStockSynthesis(
  symbol: string,
  facts: Record<string, unknown>,
): Promise<StockAnalysisSynthesis> {
  const system = `You are an equity analyst for PortIQ. PRE-COMPUTED numbers in the user message are GROUND TRUTH.
Do NOT invent figures. Return RAW JSON only:
{"bullCase":["..."],"bearCase":["..."],"summaryVerdict":"...","keyRisks":["..."]}`;

  const user = JSON.stringify({
    instruction: 'Write bull/bear cases, a 2-3 line verdict, and key risks.',
    symbol,
    facts,
  });

  try {
    const raw = await callOpenRouterChat(system, user);
    return normalizeSynthesis(parseLlmJson(raw, SynthesisSchema), symbol);
  } catch (err) {
    if (err instanceof OpenRouterNotConfiguredError) {
      return stockSynthesisFallback(symbol);
    }
    if (isRateLimitError(err)) {
      console.warn('[stockAnalyzerAi] Rate limited — deterministic fallback');
      return stockSynthesisFallback(symbol);
    }
    try {
      const raw = await callOpenRouterChat(system, user, { retry: true });
      return normalizeSynthesis(parseLlmJson(raw, SynthesisSchema), symbol);
    } catch (retryErr) {
      const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.warn('[stockAnalyzerAi] Parse failed — deterministic fallback:', msg.slice(0, 120));
      return stockSynthesisFallback(symbol);
    }
  }
}
