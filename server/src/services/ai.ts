import { z } from 'zod';
import { callOpenRouterChat, isRateLimitError, OpenRouterNotConfiguredError } from '../lib/openrouter.js';
import { parseLlmJson, alignStringArray, coerceString, coerceStringArray } from '../lib/llmJson.js';
import type { PortfolioActionPlanComputed } from '../../shared/api-types.js';
import type { RiskMetricsResult, StressTestResult, CorrelationClusterResult, PortfolioMetricsResult } from './compute.js';
import { PORTFOLIO_ACTION_DISCLAIMER } from './portfolioActions.js';

const QualitativeSchema = z.object({
  insights: z.array(z.string()).min(1),
  suggestedActions: z.array(z.string()).min(1),
});

const ActionPlanPhraseSchema = z.object({
  summary: z.string().min(1),
  actionRationales: z.array(z.string()),
});

export type QualitativeOutput = z.infer<typeof QualitativeSchema>;
export type ActionPlanPhraseOutput = z.infer<typeof ActionPlanPhraseSchema>;

function normalizeActionPlanPhrase(
  parsed: ActionPlanPhraseOutput,
  plan: PortfolioActionPlanComputed,
): ActionPlanPhraseOutput {
  const fb = actionPlanPhraseFallback(plan);
  return {
    summary: coerceString(parsed.summary, fb.summary),
    actionRationales: alignStringArray(
      parsed.actionRationales,
      plan.actions.length,
      i => plan.actions[i]?.detail ?? fb.actionRationales[i] ?? '',
    ),
  };
}

function normalizeQualitative(parsed: QualitativeOutput, fallback: QualitativeOutput): QualitativeOutput {
  return {
    insights: coerceStringArray(parsed.insights, fallback.insights),
    suggestedActions: coerceStringArray(parsed.suggestedActions, fallback.suggestedActions),
  };
}

export function analyzeFallback(
  metrics: PortfolioMetricsResult,
  risk: RiskMetricsResult,
): QualitativeOutput {
  const insights = [
    `Portfolio value is ₹${metrics.currentValue.toLocaleString('en-IN')} with ${metrics.totalPnlPct >= 0 ? 'a gain' : 'a loss'} of ${metrics.totalPnlPct.toFixed(1)}%.`,
    `Diversification score is ${risk.diversificationScore}/100 with HHI ${risk.hhi.toFixed(4)}.`,
    `Largest position weight is ${risk.maxWeight.toFixed(1)}%.`,
  ];
  if (risk.sectorAllocation[0]) {
    insights.push(`Top sector exposure: ${risk.sectorAllocation[0].sector} at ${risk.sectorAllocation[0].weight.toFixed(1)}%.`);
  }

  const suggestedActions = [
    ...(risk.maxWeight > 20 ? [`Consider trimming the largest holding below 20% (currently ${risk.maxWeight.toFixed(1)}%).`] : []),
    ...(risk.sectorAllocation[0]?.weight > 35
      ? [`Reduce ${risk.sectorAllocation[0].sector} sector exposure below 35%.`]
      : ['Maintain current sector balance if conviction remains high.']),
    'Review stop-loss levels on positions with negative P&L.',
  ];

  return { insights, suggestedActions };
}

function actionPlanPhraseFallback(plan: PortfolioActionPlanComputed): ActionPlanPhraseOutput {
  return {
    summary: plan.actions.length > 0
      ? `Portfolio review suggests ${plan.actions.length} area(s) to consider — starting with: ${plan.nextBestAction.title}. These are suggestions for your own analysis, not investment advice.`
      : 'No high-priority rebalances flagged. Continue monitoring concentration and sector weights.',
    actionRationales: plan.actions.map(a => a.detail),
  };
}

/**
 * Layer 3 — phrases the deterministic action plan only.
 * Actions, priorities, and metrics are ground truth — LLM must not add new actions or figures.
 */
export async function phrasePortfolioActionPlan(
  plan: PortfolioActionPlanComputed,
  metrics: PortfolioMetricsResult,
  risk: RiskMetricsResult,
): Promise<ActionPlanPhraseOutput> {
  const system = `You are a portfolio strategist for PortIQ. PRE-COMPUTED actions and metrics are GROUND TRUTH.
You MUST NOT add new actions, tickers, share counts, rupee amounts, prices, or percentages.
Use the EXACT numbers from sharesDelta, rupeeAmount, currentWeight, targetWeight, and resultingWeight — never alter them.
Only rephrase the provided actions in plain English.
Frame as suggestions for review — NOT personalized financial advice or trade directives.
Return RAW JSON only (no markdown):
{"summary":"2-3 sentences overall strategy","actionRationales":["one line per action in same order"]}`;

  const user = JSON.stringify({
    instruction: `Phrase each action as a one-line rationale. Write an overall action plan summary. Return exactly ${plan.actions.length} actionRationales in the same order as actions.`,
    disclaimer: PORTFOLIO_ACTION_DISCLAIMER,
    nextBestAction: plan.nextBestAction,
    actions: plan.actions,
    metrics: {
      currentValue: metrics.currentValue,
      totalPnlPct: metrics.totalPnlPct,
      holdings: metrics.holdings.map(h => ({
        symbol: h.symbol,
        weight: h.weight,
        pnlPct: h.pnlPct,
        sector: h.sector,
      })),
    },
    risk: {
      healthScore: risk.healthScore,
      riskScore: risk.riskScore,
      diversificationScore: risk.diversificationScore,
      maxWeight: risk.maxWeight,
      sectorAllocation: risk.sectorAllocation,
    },
  });

  try {
    const raw = await callOpenRouterChat(system, user);
    return normalizeActionPlanPhrase(
      ActionPlanPhraseSchema.parse(parseLlmJson(raw)),
      plan,
    );
  } catch (firstErr) {
    if (firstErr instanceof OpenRouterNotConfiguredError) {
      return actionPlanPhraseFallback(plan);
    }
    if (isRateLimitError(firstErr)) {
      console.warn('[ai] Action plan rate limited — deterministic fallback');
      return actionPlanPhraseFallback(plan);
    }
    try {
      const raw = await callOpenRouterChat(system, user, { retry: true });
      return normalizeActionPlanPhrase(
        ActionPlanPhraseSchema.parse(parseLlmJson(raw)),
        plan,
      );
    } catch {
      console.warn('[ai] Action plan parse failed — deterministic fallback');
      return actionPlanPhraseFallback(plan);
    }
  }
}

function stressFallback(
  stress: StressTestResult,
  clusters: CorrelationClusterResult[],
): QualitativeOutput {
  const insights = [
    `Under this scenario, projected drawdown is ${stress.drawdownPct.toFixed(1)}% (₹${(stress.valueBefore - stress.valueAfter).toLocaleString('en-IN')} loss).`,
    ...(clusters[0]
      ? [`Largest hidden cluster: ${clusters[0].label} at ${clusters[0].combinedWeight.toFixed(1)}% combined weight.`]
      : []),
  ];

  const top = stress.rankedContributions[0];
  const suggestedActions = [
    ...(top ? [`Largest loss contributor: ${top.symbol} (₹${Math.round(top.loss).toLocaleString('en-IN')}). Review hedge or trim.`] : []),
    ...(clusters.length > 0 ? ['Diversify away from the dominant factor cluster to reduce correlated drawdown.'] : []),
    'Consider adding defensive assets (short-duration debt, gold) as portfolio ballast.',
  ];

  return { insights, suggestedActions };
}

/**
 * Layer 3 — AI interprets pre-computed numbers only.
 * LLM never fetches data or does math.
 */
export async function interpretPortfolioAnalysis(
  metrics: PortfolioMetricsResult,
  risk: RiskMetricsResult,
): Promise<QualitativeOutput> {
  const system = `You are a portfolio analyst for PortIQ. You receive PRE-COMPUTED numbers that are GROUND TRUTH.
Do NOT recalculate, invent, or modify any figures. Only produce qualitative interpretation.
Return RAW JSON only (no markdown, no prose outside JSON) matching:
{"insights":["..."],"suggestedActions":["..."]}`;

  const user = JSON.stringify({
    instruction: 'Interpret these portfolio metrics. Reference numbers exactly as given.',
    metrics: {
      totalInvested: metrics.totalInvested,
      currentValue: metrics.currentValue,
      totalPnl: metrics.totalPnl,
      totalPnlPct: metrics.totalPnlPct,
      totalDayChange: metrics.totalDayChange,
      totalDayChangePct: metrics.totalDayChangePct,
      holdings: metrics.holdings.map(h => ({
        symbol: h.symbol,
        weight: h.weight,
        pnlPct: h.pnlPct,
        sector: h.sector,
      })),
    },
    risk: {
      healthScore: risk.healthScore,
      riskScore: risk.riskScore,
      hhi: risk.hhi,
      maxWeight: risk.maxWeight,
      diversificationScore: risk.diversificationScore,
      sectorAllocation: risk.sectorAllocation,
      warnings: risk.warnings,
    },
  });

  try {
    const raw = await callOpenRouterChat(system, user);
    return normalizeQualitative(
      parseLlmJson(raw, QualitativeSchema),
      analyzeFallback(metrics, risk),
    );
  } catch (firstErr) {
    if (firstErr instanceof OpenRouterNotConfiguredError) {
      return analyzeFallback(metrics, risk);
    }
    if (isRateLimitError(firstErr)) {
      console.warn('[ai] Rate limited — using deterministic fallback');
      return analyzeFallback(metrics, risk);
    }
    try {
      const raw = await callOpenRouterChat(system, user, { retry: true });
      return normalizeQualitative(
        parseLlmJson(raw, QualitativeSchema),
        analyzeFallback(metrics, risk),
      );
    } catch {
      console.warn('[ai] Parse failed — using deterministic fallback');
      return analyzeFallback(metrics, risk);
    }
  }
}

export async function interpretStressTest(
  stress: StressTestResult,
  clusters: CorrelationClusterResult[],
  scenarioLabel: string,
): Promise<QualitativeOutput> {
  const system = `You are a portfolio risk analyst for PortIQ. PRE-COMPUTED stress test numbers are GROUND TRUTH.
Do NOT recalculate or invent figures. Return RAW JSON only:
{"insights":["..."],"suggestedActions":["..."]}`;

  const user = JSON.stringify({
    instruction: 'Provide hedge/rebalance narrative based on these stress results.',
    scenario: scenarioLabel,
    stress: {
      drawdownPct: stress.drawdownPct,
      valueBefore: stress.valueBefore,
      valueAfter: stress.valueAfter,
      rankedContributions: stress.rankedContributions.slice(0, 8),
    },
    clusters,
  });

  try {
    const raw = await callOpenRouterChat(system, user);
    return normalizeQualitative(
      parseLlmJson(raw, QualitativeSchema),
      stressFallback(stress, clusters),
    );
  } catch (firstErr) {
    if (firstErr instanceof OpenRouterNotConfiguredError) {
      return stressFallback(stress, clusters);
    }
    if (isRateLimitError(firstErr)) {
      return stressFallback(stress, clusters);
    }
    try {
      const raw = await callOpenRouterChat(system, user, { retry: true });
      return normalizeQualitative(
        parseLlmJson(raw, QualitativeSchema),
        stressFallback(stress, clusters),
      );
    } catch {
      return stressFallback(stress, clusters);
    }
  }
}
