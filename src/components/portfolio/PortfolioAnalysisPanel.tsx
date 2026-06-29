import type { PortfolioAnalysisResponse, PortfolioActionPriority } from '../../types/portfolio';
import { AlertTriangle, Check, Sparkles, Target, Zap } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const SECTOR_COLORS = [
  '#C9A84C', '#E8C96B', '#9A7A2E', '#4ADE80', '#60A5FA',
  '#F87171', '#A78BFA', '#FBBF24', '#34D399', '#F472B6',
];

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="number-display text-2xl font-bold text-[#F0EEE8]">{score}</span>
        </div>
      </div>
      <p className="text-[#9298B0] text-xs mt-2 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function SectorDonut({ data }: { data: PortfolioAnalysisResponse['sectorAllocation'] }) {
  if (data.length === 0) return null;
  const chartData = data.map((d, i) => ({
    name: d.sector,
    value: d.weight,
    fill: SECTOR_COLORS[i % SECTOR_COLORS.length],
  }));

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={36}
            outerRadius={58}
            paddingAngle={2}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl px-3 py-2 text-xs"
                  style={{ background: 'rgba(8,10,20,0.95)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <p className="text-[#F0EEE8] font-medium">{payload[0]?.name}</p>
                  <p className="text-[#C9A84C] font-mono">{Number(payload[0]?.value).toFixed(1)}%</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function priorityStyle(priority: PortfolioActionPriority) {
  if (priority === 'high') return { bg: 'rgba(248,113,113,0.12)', color: '#F87171', border: 'rgba(248,113,113,0.3)' };
  if (priority === 'medium') return { bg: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: 'rgba(251,191,36,0.3)' };
  return { bg: 'rgba(255,255,255,0.06)', color: '#9298B0', border: 'rgba(255,255,255,0.1)' };
}

function impactStyle(impact: string) {
  if (impact.includes('risk')) return '#F87171';
  if (impact.includes('diversif')) return '#60A5FA';
  if (impact.includes('gain')) return '#4ADE80';
  return '#C9A84C';
}

interface Props {
  analysis: PortfolioAnalysisResponse | null;
  loading: boolean;
}

export function PortfolioAnalysisPanel({ analysis, loading }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 min-h-[320px]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#C9A84C]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#C9A84C] animate-spin" />
        </div>
        <p className="text-[#F0EEE8] text-sm font-medium">Analysing portfolio…</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8 opacity-40 min-h-[320px]">
        <Sparkles className="w-12 h-12 text-[#4A4E65]" />
        <p className="text-[#4A4E65] text-sm text-center">Add holdings and click Analyse to see insights</p>
      </div>
    );
  }

  const healthColor = analysis.healthScore >= 70 ? '#4ADE80' : analysis.healthScore >= 40 ? '#FBBF24' : '#F87171';
  const riskColor = analysis.riskScore <= 40 ? '#4ADE80' : analysis.riskScore <= 70 ? '#FBBF24' : '#F87171';

  return (
    <div className="space-y-5 p-1 overflow-auto max-h-[600px]">
      {/* Scores */}
      <div className="flex justify-around gap-4 py-2">
        <ScoreRing score={analysis.healthScore} label="Health" color={healthColor} />
        <ScoreRing score={analysis.riskScore} label="Risk" color={riskColor} />
      </div>

      {/* Diversification */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[#F0EEE8] text-sm font-semibold">Diversification</p>
          <span className="label-tag">{analysis.diversification.score}/100</span>
        </div>
        {analysis.diversification.warnings.map((w, i) => (
          <div key={i} className="rounded-xl p-3 mb-2 flex items-start gap-2.5"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <AlertTriangle className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5" />
            <p className="text-[#9298B0] text-xs leading-relaxed">{w}</p>
          </div>
        ))}
      </div>

      {/* Sector allocation */}
      {analysis.sectorAllocation.length > 0 && (
        <div>
          <p className="text-[#F0EEE8] text-sm font-semibold mb-3">Sector Allocation</p>
          <SectorDonut data={analysis.sectorAllocation} />
          <div className="flex flex-wrap gap-2 mt-3">
            {analysis.sectorAllocation.map((s, i) => (
              <span key={s.sector} className="text-[0.65rem] font-mono px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(255,255,255,0.04)', color: SECTOR_COLORS[i % SECTOR_COLORS.length], border: '1px solid rgba(255,255,255,0.06)' }}>
                {s.sector} {s.weight.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {analysis.insights.length > 0 && (
        <div>
          <p className="text-[#F0EEE8] text-sm font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C9A84C]" /> AI Insights
          </p>
          <ul className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <li key={i} className="text-[#9298B0] text-xs leading-relaxed pl-3 border-l-2"
                style={{ borderColor: 'rgba(201,168,76,0.3)' }}>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Plan — bound to POST /api/portfolio/analyze → actionPlan */}
      {analysis.actionPlan && (
        <div>
          <p className="text-[#F0EEE8] text-sm font-semibold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#C9A84C]" /> Action Plan
          </p>

          {/* Next Best Action */}
          <div className="rounded-xl p-4 mb-4"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.28)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-[#C9A84C] text-xs uppercase tracking-widest font-semibold">Next Best Action</span>
            </div>
            <p className="text-[#F0EEE8] text-sm font-medium mb-1">{analysis.actionPlan.nextBestAction.title}</p>
            <p className="text-[#9298B0] text-xs leading-relaxed">{analysis.actionPlan.nextBestAction.detail}</p>
          </div>

          {analysis.actionPlan.summary && (
            <p className="text-[#9298B0] text-xs leading-relaxed mb-4 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {analysis.actionPlan.summary}
            </p>
          )}

          {/* Ranked actions */}
          <div className="space-y-2.5">
            {analysis.actionPlan.actions.map(action => {
              const ps = priorityStyle(action.priority);
              return (
                <div key={action.id} className="rounded-xl p-3.5"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[0.6rem] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>
                      {action.priority}
                    </span>
                    {action.holdingSymbol && (
                      <span className="text-[0.65rem] font-mono text-[#C9A84C]">{action.holdingSymbol}</span>
                    )}
                    <span className="text-[0.6rem] px-2 py-0.5 rounded-md ml-auto"
                      style={{ color: impactStyle(action.estimatedImpact), background: 'rgba(255,255,255,0.04)' }}>
                      {action.estimatedImpact}
                    </span>
                  </div>
                  <p className="text-[#F0EEE8] text-xs font-medium mb-1">{action.title}</p>
                  {(action.sharesDelta != null || action.rupeeAmount != null || action.currentWeight != null) && (
                    <div className="flex flex-wrap gap-2 mb-1.5">
                      {action.sharesDelta != null && (
                        <span className="text-[0.65rem] font-mono px-2 py-0.5 rounded-md"
                          style={{ background: 'rgba(201,168,76,0.08)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                          {action.sharesDelta > 0 ? '+' : ''}{action.sharesDelta} shares
                        </span>
                      )}
                      {action.rupeeAmount != null && (
                        <span className="text-[0.65rem] font-mono px-2 py-0.5 rounded-md"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#F0EEE8', border: '1px solid rgba(255,255,255,0.08)' }}>
                          ₹{Math.round(Math.abs(action.rupeeAmount)).toLocaleString('en-IN')}
                        </span>
                      )}
                      {action.currentWeight != null && action.targetWeight != null && (
                        <span className="text-[0.65rem] font-mono px-2 py-0.5 rounded-md"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#9298B0', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {action.currentWeight}% → {action.targetWeight}%
                        </span>
                      )}
                      {action.currentWeight != null && action.targetWeight == null && action.resultingWeight != null && (
                        <span className="text-[0.65rem] font-mono px-2 py-0.5 rounded-md"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#9298B0', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {action.currentWeight}% → {action.resultingWeight}%
                        </span>
                      )}
                      {action.realizedGainEstimate != null && (
                        <span className="text-[0.65rem] font-mono px-2 py-0.5 rounded-md"
                          style={{ background: 'rgba(74,222,128,0.08)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)' }}>
                          Gain ~₹{Math.round(action.realizedGainEstimate).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[#9298B0] text-xs leading-relaxed">{action.rationale}</p>
                </div>
              );
            })}
          </div>

          <p className="text-[#4A4E65] text-[0.65rem] leading-relaxed mt-3">
            {analysis.actionPlan.disclaimer}
          </p>
        </div>
      )}

      {/* Suggested Actions */}
      {analysis.suggestedActions.length > 0 && (
        <div>
          <p className="text-[#F0EEE8] text-sm font-semibold mb-3">Suggested Actions</p>
          <div className="space-y-2.5">
            {analysis.suggestedActions.map((action, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <Check className="w-3 h-3 text-[#C9A84C]" />
                </div>
                <p className="text-[#9298B0] text-xs leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
