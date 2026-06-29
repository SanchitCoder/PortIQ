import type { PortfolioSummary } from '../../types/portfolio';
import { formatINR, formatPct } from '../../lib/portfolioMetrics';

interface Props {
  summary: PortfolioSummary;
}

function MetricCard({
  label,
  value,
  sub,
  positive,
  negative,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  const color = positive ? '#4ADE80' : negative ? '#F87171' : 'var(--text-primary)';
  return (
    <div className="glass-card p-4 sm:p-5">
      <p className="text-[#4A4E65] text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className="number-display text-xl sm:text-2xl font-semibold" style={{ color }}>{value}</p>
      {sub && (
        <p className="text-xs mt-1 font-mono" style={{ color: positive ? '#4ADE80' : negative ? '#F87171' : '#9298B0' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function PortfolioSummaryCards({ summary }: Props) {
  const pnlPositive = summary.totalPnl >= 0;
  const dayPositive = summary.dayChange >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
      <MetricCard label="Total Invested" value={formatINR(summary.totalInvested)} />
      <MetricCard label="Current Value" value={formatINR(summary.currentValue)} />
      <MetricCard
        label="Total P&L"
        value={formatINR(summary.totalPnl)}
        sub={formatPct(summary.totalPnlPct)}
        positive={pnlPositive}
        negative={!pnlPositive && summary.totalInvested > 0}
      />
      <MetricCard
        label="Day's Change"
        value={formatINR(summary.dayChange)}
        sub={formatPct(summary.dayChangePct)}
        positive={dayPositive}
        negative={!dayPositive && summary.currentValue > 0}
      />
    </div>
  );
}
