import { z } from 'zod';
import type { AlphaEdgeAiRationale } from '../../shared/api-types.js';
import { parseLlmJson, alignStringArray, coerceString, coerceStringArray } from '../lib/llmJson.js';
import { callOpenRouterChat, isRateLimitError, OpenRouterNotConfiguredError } from '../lib/openrouter.js';
import type { AlphaEdgeComputed } from './alphaEdgeCompute.js';
import { ALPHAEDGE_DISCLAIMER } from './alphaEdgeCompute.js';

const RationaleSchema = z.object({
  headline: z.string().min(1),
  rationale: z.string().min(1),
  keyRisks: z.array(z.string()).min(1),
  factorExplanations: z.array(z.string()),
});

export function alphaEdgeRationaleFallback(computed: AlphaEdgeComputed, symbol: string): AlphaEdgeAiRationale {
  const v = computed.verdict.toUpperCase();
  return {
    headline: `${v} signal — analytical view for ${symbol}`,
    rationale: `The deterministic model scores this position ${computed.signalScore}/100 conviction with ${computed.confidence}% confidence. This is a signal for your own analysis, not investment advice.`,
    keyRisks: [
      'Earnings or guidance surprise',
      'Sector-wide rotation',
      'Stop-loss breach on this lot',
    ],
    factorExplanations: computed.reasoningFactors.map(f => `${f.label}: ${f.value}`),
  };
}

function normalizeAlphaEdgeRationale(
  parsed: AlphaEdgeAiRationale,
  computed: AlphaEdgeComputed,
  symbol: string,
): AlphaEdgeAiRationale {
  const fb = alphaEdgeRationaleFallback(computed, symbol);
  return {
    headline: coerceString(parsed.headline, fb.headline),
    rationale: coerceString(parsed.rationale, fb.rationale),
    keyRisks: coerceStringArray(parsed.keyRisks, fb.keyRisks),
    factorExplanations: alignStringArray(
      parsed.factorExplanations,
      computed.reasoningFactors.length,
      i => fb.factorExplanations[i] ?? computed.reasoningFactors[i]?.value ?? '',
    ),
  };
}

/**
 * Layer 3 — AI interprets pre-computed AlphaEdge output only.
 * Verdict, confidence, scores, and P&L are ground truth — never recalculated by the LLM.
 */
export async function generateAlphaEdgeRationale(
  computed: AlphaEdgeComputed,
  symbol: string,
  context?: string,
): Promise<AlphaEdgeAiRationale> {
  const system = `You are a position analyst for PortIQ. PRE-COMPUTED facts are GROUND TRUTH.
You MUST NOT change the verdict, confidence, scores, or P&L figures.
This is an analytical SIGNAL tool — frame output as analysis, NOT personalized financial advice.
Return RAW JSON only (no markdown):
{"headline":"one line","rationale":"2-3 sentences","keyRisks":["..."],"factorExplanations":["one line per factor in order"]}`;

  const user = JSON.stringify({
    instruction: `Explain the pre-computed signal in plain English. Return exactly ${computed.reasoningFactors.length} factorExplanations in the same order as reasoningFactors.`,
    disclaimer: ALPHAEDGE_DISCLAIMER,
    symbol,
    userContext: context?.slice(0, 500) ?? null,
    groundTruth: {
      verdict: computed.verdict,
      confidence: computed.confidence,
      signalScore: computed.signalScore,
      reducedConfidence: computed.reducedConfidence,
      position: {
        buyPrice: computed.positionMetrics.buyPrice,
        currentPrice: computed.positionMetrics.currentPrice,
        quantity: computed.positionMetrics.quantity,
        unrealizedPnlPct: computed.positionMetrics.unrealizedPnlPct,
        targetPrice: computed.positionMetrics.targetPrice,
        stopLoss: computed.positionMetrics.stopLoss,
      },
      reasoningFactors: computed.reasoningFactors,
      exitStrategy: computed.exitStrategy,
      scenarios: computed.scenarios,
    },
  });

  try {
    const raw = await callOpenRouterChat(system, user);
    return normalizeAlphaEdgeRationale(
      parseLlmJson(raw, RationaleSchema),
      computed,
      symbol,
    );
  } catch (firstErr) {
    if (firstErr instanceof OpenRouterNotConfiguredError) {
      return alphaEdgeRationaleFallback(computed, symbol);
    }
    if (isRateLimitError(firstErr)) {
      console.warn('[alphaEdgeAi] Rate limited — deterministic fallback');
      return alphaEdgeRationaleFallback(computed, symbol);
    }
    try {
      const raw = await callOpenRouterChat(system, user, { retry: true });
      return normalizeAlphaEdgeRationale(
        parseLlmJson(raw, RationaleSchema),
        computed,
        symbol,
      );
    } catch (retryErr) {
      const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.warn('[alphaEdgeAi] Parse failed — deterministic fallback:', msg.slice(0, 120));
      return alphaEdgeRationaleFallback(computed, symbol);
    }
  }
}
