import type {
  PortfolioActionComputed,
  PortfolioActionPlanComputed,
  PortfolioActionPriority,
  PortfolioEstimatedImpact,
} from '../../../shared/api-types.js';
import type { PerHoldingMetrics, PortfolioMetricsResult, RiskMetricsResult } from './compute.js';

export const PORTFOLIO_ACTION_DISCLAIMER =
  'These are analytical suggestions for your review, not personalized financial advice. Past performance does not guarantee future results.';

const CONCENTRATION_THRESHOLD = 25;
const CONCENTRATION_TARGET = 20;
const SECTOR_THRESHOLD = 35;
const SECTOR_TARGET = 30;
const DIVERSIFICATION_LOW = 50;
const LOSS_REVIEW_PCT = -12;
const WINNER_PNL_PCT = 20;
const WINNER_MIN_WEIGHT = 18;
const PROFIT_BOOK_FRACTION = 0.3;
const HIGH_RISK_SCORE = 65;
const MAX_ACTIONS = 6;

const PRIORITY_RANK: Record<PortfolioActionPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

interface ScoredAction extends PortfolioActionComputed {
  sortScore: number;
}

function impactScore(impact: PortfolioEstimatedImpact): number {
  const map: Record<PortfolioEstimatedImpact, number> = {
    'reduces risk': 5,
    'improves diversification': 4,
    'unlocks return': 3,
    'preserves gains': 3,
    'limits downside': 2,
  };
  return map[impact];
}

function fmtRupee(n: number): string {
  return `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function computeTrimQuantities(
  h: PerHoldingMetrics,
  totalValue: number,
  targetWeight: number,
): Pick<
  PortfolioActionComputed,
  'sharesDelta' | 'rupeeAmount' | 'currentWeight' | 'targetWeight' | 'currentPrice' | 'resultingWeight'
> | null {
  if (h.weight <= targetWeight || h.price <= 0 || totalValue <= 0 || h.quantity <= 0) return null;

  const sharesToSell = Math.min(
    h.quantity,
    Math.max(1, Math.round(((h.weight - targetWeight) / 100) * totalValue / h.price)),
  );
  const rupeeAmount = Math.round(sharesToSell * h.price);
  const newHoldingValue = h.currentValue - rupeeAmount;
  const newTotal = totalValue - rupeeAmount;
  const resultingWeight = newTotal > 0 ? (newHoldingValue / newTotal) * 100 : 0;

  return {
    sharesDelta: -sharesToSell,
    rupeeAmount,
    currentWeight: round1(h.weight),
    targetWeight,
    currentPrice: h.price,
    resultingWeight: round1(resultingWeight),
  };
}

/**
 * Layer 2 — deterministic return-optimization action plan with executable specifics.
 * All share counts and rupee amounts are computed here — never by the LLM.
 */
export function generateActionPlan(
  metrics: PortfolioMetricsResult,
  risk: RiskMetricsResult,
): PortfolioActionPlanComputed {
  const candidates: ScoredAction[] = [];
  const totalValue = metrics.currentValue;
  let trimProceedsBudget = 0;

  const underweightSectors = risk.sectorAllocation.filter(s => s.weight < 10);
  const underweightSectorNames = underweightSectors.map(s => s.sector);

  // Concentration: single holding above threshold → quantified trim
  for (const h of metrics.holdings) {
    if (h.weight > CONCENTRATION_THRESHOLD) {
      const quant = computeTrimQuantities(h, totalValue, CONCENTRATION_TARGET);
      if (!quant) continue;

      trimProceedsBudget += quant.rupeeAmount ?? 0;
      const priority: PortfolioActionPriority = h.weight > 35 ? 'high' : 'medium';
      const shares = Math.abs(quant.sharesDelta ?? 0);

      candidates.push({
        id: `trim-${h.symbol}`,
        type: 'trim',
        priority,
        title: `Sell ${shares} shares of ${h.symbol} (~${fmtRupee(quant.rupeeAmount ?? 0)}) to reduce from ${quant.currentWeight}% → ${quant.targetWeight}%`,
        holdingSymbol: h.symbol,
        detail: `${h.symbol} is ${h.weight.toFixed(1)}% of portfolio — above the ${CONCENTRATION_THRESHOLD}% guideline. Selling ${shares} shares (~${fmtRupee(quant.rupeeAmount ?? 0)}) would bring weight to ~${quant.resultingWeight}%.`,
        rationaleMetric: `holding weight ${h.weight.toFixed(1)}% (threshold ${CONCENTRATION_THRESHOLD}%)`,
        estimatedImpact: 'reduces risk',
        sortScore: h.weight * 2 + impactScore('reduces risk'),
        ...quant,
      });
    }
  }

  // Sector overexposure — rupee budget to redeploy
  for (const sector of risk.sectorAllocation) {
    if (sector.weight > SECTOR_THRESHOLD) {
      const rupeeAmount = Math.round(((sector.weight - SECTOR_TARGET) / 100) * totalValue);
      const diversifyHint = underweightSectorNames.length > 0
        ? `Consider redeploying into underrepresented sectors (${underweightSectorNames.slice(0, 3).join(', ')}).`
        : 'Consider diversifying into sectors not yet represented in the portfolio.';

      candidates.push({
        id: `sector-${sector.sector}`,
        type: 'diversify',
        priority: sector.weight > 45 ? 'high' : 'medium',
        title: `Reduce ${sector.sector} exposure from ${sector.weight.toFixed(1)}% toward ~${SECTOR_TARGET}% (~${fmtRupee(rupeeAmount)} to redeploy)`,
        detail: `${sector.sector} represents ${sector.weight.toFixed(1)}% of the portfolio (limit ~${SECTOR_THRESHOLD}%). ~${fmtRupee(rupeeAmount)} could be redeployed. ${diversifyHint}`,
        rationaleMetric: `sector weight ${sector.sector} ${sector.weight.toFixed(1)}%`,
        estimatedImpact: 'improves diversification',
        sortScore: sector.weight * 1.5 + impactScore('improves diversification'),
        rupeeAmount,
        currentWeight: round1(sector.weight),
        targetWeight: SECTOR_TARGET,
        targetSector: sector.sector,
        sectorsToAdd: Math.max(1, underweightSectorNames.length),
      });
    }
  }

  // Low diversification score
  if (risk.diversificationScore < DIVERSIFICATION_LOW) {
    const sectorCount = risk.sectorAllocation.length;
    const sectorsToAdd = Math.max(1, 4 - sectorCount);
    const deployBudget = trimProceedsBudget > 0
      ? trimProceedsBudget
      : Math.round(totalValue * 0.05);

    candidates.push({
      id: 'diversify-sectors',
      type: 'diversify',
      priority: risk.diversificationScore < 35 ? 'high' : 'medium',
      title: `Broaden into ${sectorsToAdd} more sector(s) — diversification score ${risk.diversificationScore}/100`,
      detail: `Portfolio spans ${sectorCount} sector(s). A redeployment budget of ~${fmtRupee(deployBudget)} across ${sectorsToAdd} new sector(s) could improve resilience.`,
      rationaleMetric: `diversificationScore ${risk.diversificationScore}/100`,
      estimatedImpact: 'improves diversification',
      sortScore: (100 - risk.diversificationScore) * 0.5 + impactScore('improves diversification'),
      sectorsToAdd,
      rupeeAmount: deployBudget,
    });
  }

  // Underperformers — thesis review with quantified loss (not a sell directive)
  for (const h of metrics.holdings) {
    if (h.pnlPct < LOSS_REVIEW_PCT && h.weight >= 5) {
      const loss = Math.round(h.pnl);
      candidates.push({
        id: `review-${h.symbol}`,
        type: 'review',
        priority: h.pnlPct < -20 ? 'high' : 'medium',
        title: `Review thesis on ${h.symbol} — down ${fmtRupee(loss)} (${h.pnlPct.toFixed(1)}%)`,
        holdingSymbol: h.symbol,
        detail: `${h.symbol} is down ${fmtRupee(loss)} (${Math.abs(h.pnlPct).toFixed(1)}%) on this lot and represents ${h.weight.toFixed(1)}% of the portfolio — revisit conviction before adding.`,
        rationaleMetric: `pnlPct ${h.pnlPct.toFixed(1)}% at weight ${h.weight.toFixed(1)}%`,
        estimatedImpact: 'limits downside',
        sortScore: Math.abs(h.pnlPct) * (h.weight / 100) + impactScore('limits downside'),
        rupeeAmount: loss,
        currentWeight: round1(h.weight),
        currentPrice: h.price,
      });
    }
  }

  // Winners — partial profit-booking with exact shares
  for (const h of metrics.holdings) {
    if (h.pnlPct > WINNER_PNL_PCT && h.weight > WINNER_MIN_WEIGHT && h.price > 0) {
      const sharesToBook = Math.min(
        h.quantity - 1,
        Math.max(1, Math.round(h.quantity * PROFIT_BOOK_FRACTION)),
      );
      if (sharesToBook < 1) continue;

      const rupeeAmount = Math.round(sharesToBook * h.price);
      const realizedGainEstimate = Math.round(sharesToBook * (h.price - h.avgBuyPrice));
      const remainingShares = h.quantity - sharesToBook;
      const remainingValue = remainingShares * h.price;
      const newTotal = totalValue - rupeeAmount;
      const resultingWeight = newTotal > 0 ? (remainingValue / newTotal) * 100 : 0;

      candidates.push({
        id: `profit-${h.symbol}`,
        type: 'profit_book',
        priority: h.weight > 30 ? 'high' : 'medium',
        title: `Book profits on ${sharesToBook} shares of ${h.symbol} (~${fmtRupee(rupeeAmount)}, gain ~${fmtRupee(realizedGainEstimate)})`,
        holdingSymbol: h.symbol,
        detail: `${h.symbol} is up ${h.pnlPct.toFixed(1)}% at ${h.weight.toFixed(1)}% weight. Selling ${sharesToBook} shares locks ~${fmtRupee(realizedGainEstimate)} gain; ${remainingShares} shares remain (~${round1(resultingWeight)}% of portfolio).`,
        rationaleMetric: `pnlPct +${h.pnlPct.toFixed(1)}% at weight ${h.weight.toFixed(1)}%`,
        estimatedImpact: 'preserves gains',
        sortScore: h.pnlPct * (h.weight / 100) + impactScore('preserves gains'),
        sharesDelta: -sharesToBook,
        rupeeAmount,
        currentWeight: round1(h.weight),
        currentPrice: h.price,
        resultingWeight: round1(resultingWeight),
        realizedGainEstimate,
      });
    }
  }

  // High risk + low diversification — quantified trim on largest holding
  if (risk.riskScore > HIGH_RISK_SCORE && risk.diversificationScore < 55) {
    const largest = [...metrics.holdings].sort((a, b) => b.weight - a.weight)[0];
    if (largest && largest.weight > CONCENTRATION_TARGET) {
      const quant = computeTrimQuantities(largest, totalValue, CONCENTRATION_TARGET);
      if (quant && !candidates.some(c => c.id === `trim-${largest.symbol}`)) {
        trimProceedsBudget += quant.rupeeAmount ?? 0;
        const shares = Math.abs(quant.sharesDelta ?? 0);
        candidates.push({
          id: 'rebalance-risk',
          type: 'rebalance',
          priority: 'high',
          title: `Sell ${shares} shares of ${largest.symbol} (~${fmtRupee(quant.rupeeAmount ?? 0)}) to lower portfolio risk`,
          holdingSymbol: largest.symbol,
          detail: `Risk score is ${risk.riskScore}/100 with diversification at ${risk.diversificationScore}/100. Trimming ${shares} shares of ${largest.symbol} (~${fmtRupee(quant.rupeeAmount ?? 0)}) may have the highest impact.`,
          rationaleMetric: `riskScore ${risk.riskScore} vs diversificationScore ${risk.diversificationScore}`,
          estimatedImpact: 'reduces risk',
          sortScore: risk.riskScore + largest.weight,
          ...quant,
        });
      }
    }
  }

  // Deploy trim proceeds into underweight sector (add/deploy)
  if (trimProceedsBudget > 0 && underweightSectors.length > 0) {
    const targetSector = underweightSectors[0]!.sector;
    const deployHolding = metrics.holdings.find(h => h.sector === targetSector && h.price > 0)
      ?? metrics.holdings.find(h => h.price > 0);

    const approxShares = deployHolding
      ? Math.max(1, Math.round(trimProceedsBudget / deployHolding.price))
      : undefined;

    const symbolHint = deployHolding ? ` (~${approxShares} shares of ${deployHolding.symbol} at ${fmtRupee(deployHolding.price)})` : '';

    candidates.push({
      id: 'deploy-trim-proceeds',
      type: 'deploy',
      priority: 'medium',
      title: `Deploy ~${fmtRupee(trimProceedsBudget)} into ${targetSector}${symbolHint}`,
      detail: `Proceeds from suggested trims (~${fmtRupee(trimProceedsBudget)}) could be redeployed to broaden ${targetSector} exposure (currently ${underweightSectors[0]!.weight.toFixed(1)}%).`,
      rationaleMetric: `trim proceeds ${fmtRupee(trimProceedsBudget)}`,
      estimatedImpact: 'improves diversification',
      sortScore: trimProceedsBudget / totalValue * 100 + impactScore('improves diversification'),
      rupeeAmount: trimProceedsBudget,
      sharesDelta: approxShares,
      currentPrice: deployHolding?.price,
      targetSector,
    });
  }

  const seen = new Set<string>();
  const ranked = candidates
    .filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    })
    .sort((a, b) => {
      const pDiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (pDiff !== 0) return pDiff;
      return b.sortScore - a.sortScore;
    })
    .slice(0, MAX_ACTIONS)
    .map(({ sortScore: _s, ...action }) => action);

  if (ranked.length === 0) {
    ranked.push({
      id: 'maintain',
      type: 'maintain',
      priority: 'low',
      title: 'Maintain current allocation — no high-priority rebalances flagged',
      detail: 'Concentration, sector weights, and diversification are within guidelines. Continue monitoring.',
      rationaleMetric: `diversificationScore ${risk.diversificationScore}/100, maxWeight ${risk.maxWeight.toFixed(1)}%`,
      estimatedImpact: 'unlocks return',
    });
  }

  const top = ranked[0]!;
  return {
    nextBestAction: {
      title: top.title,
      detail: top.detail,
    },
    actions: ranked,
  };
}
