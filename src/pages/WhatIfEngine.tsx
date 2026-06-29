import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  Sliders, TrendingDown, AlertTriangle, Check, ChevronRight,
  Activity, Shield, RefreshCw, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { usePortfolioStore } from '../stores/portfolioStore';
import { computePortfolioSummary, computeWeight, getEffectivePrice } from '../lib/portfolioMetrics';

/* ── Scenario presets ──────────────────────────────────────────────────── */
type ScenarioId = 'rates' | 'inr' | 'it-crash' | 'bank-crash' | 'top-drop' | 'mkt-crash' | 'custom';

interface Scenario {
  id: ScenarioId;
  label: string;
  drawdownPct: number;
  sensitivity: Record<string, number>;
  correlation: { text: string; tickers: string[] };
  actions: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'mkt-crash',
    label: 'Market Crash −30%',
    drawdownPct: 12.4,
    sensitivity: { RELIANCE: 1.3, TCS: 1.2, HDFCBANK: 1.1, NVDA: 1.4, INFY: 1.2, TSLA: 1.5, AAPL: 1.1, WIPRO: 1.2 },
    correlation: { text: 'Correlated positions amplify drawdown — broad market shocks hit multiple holdings simultaneously.', tickers: [] },
    actions: ['Add short-duration sovereign debt to buffer equity beta.', 'Review positions with highest portfolio weight for trim candidates.', 'Ensure sector concentration stays within safe limits.'],
  },
  {
    id: 'rates',
    label: 'Rates +100bps',
    drawdownPct: 5.8,
    sensitivity: { HDFCBANK: 1.6, RELIANCE: 1.3, TCS: 1.0, NVDA: 0.9, INFY: 0.8, TSLA: 1.1, AAPL: 0.9, WIPRO: 0.8 },
    correlation: { text: 'Rate-sensitive positions could trigger simultaneous drawdowns in a rising-rate environment.', tickers: ['HDFCBANK', 'RELIANCE'] },
    actions: ['Consider short-duration FDs or G-Secs as partial hedge against rate rise.', 'Monitor RBI stance before adding to rate-sensitive sectors.'],
  },
  {
    id: 'inr',
    label: 'INR −5%',
    drawdownPct: 3.2,
    sensitivity: { RELIANCE: 1.4, HDFCBANK: 1.2, WIPRO: 0.7, TCS: 0.6, INFY: 0.6, AAPL: 1.1, NVDA: 1.0, TSLA: 1.0 },
    correlation: { text: 'IT exporters may partially offset rupee weakness — natural hedge within your portfolio.', tickers: ['TCS', 'INFY'] },
    actions: ['Rupee depreciation may be partially offset by IT export positions.', 'Import-heavy sectors are most exposed to INR weakness.'],
  },
  {
    id: 'it-crash',
    label: 'IT / Tech −20%',
    drawdownPct: 9.6,
    sensitivity: { TCS: 1.8, INFY: 1.7, NVDA: 1.9, AAPL: 1.6, WIPRO: 1.7, RELIANCE: 0.7, HDFCBANK: 0.6, TSLA: 1.5 },
    correlation: { text: 'Tech concentration above safe limits amplifies sector-shock drawdowns.', tickers: ['TCS', 'INFY', 'WIPRO', 'NVDA', 'AAPL'] },
    actions: ['Reduce IT/Tech combined exposure below 30%.', 'Trim the weakest near-term catalyst position first.', 'Add non-correlated positions: energy, consumer staples, or commodities.'],
  },
  {
    id: 'bank-crash',
    label: 'Banking −20%',
    drawdownPct: 3.1,
    sensitivity: { HDFCBANK: 2.0, RELIANCE: 0.8, TCS: 0.5, INFY: 0.5, NVDA: 0.4, TSLA: 0.4, AAPL: 0.4, WIPRO: 0.4 },
    correlation: { text: 'Banking exposure concentration determines severity of financial-sector shocks.', tickers: ['HDFCBANK'] },
    actions: ['Diversify single-bank concentration across multiple financial institutions.'],
  },
  {
    id: 'top-drop',
    label: 'Largest Holding −15%',
    drawdownPct: 4.2,
    sensitivity: {},
    correlation: { text: 'Your largest holding drives disproportionate portfolio drawdown on a single-stock correction.', tickers: [] },
    actions: ['Trim largest position below 20% to reduce single-stock concentration risk.', 'Re-deploy proceeds into a non-correlated sector.'],
  },
];

const DEFAULT_SLIDERS = { rates: 0, currency: 0, sector: 0, specific: 0 };

const COMPARE_STRIP: Array<{ label: string; pct: number }> = [
  { label: 'Market Crash −30%', pct: 12.4 },
  { label: 'IT / Tech −20%',    pct:  9.6 },
  { label: 'Rates +100bps',     pct:  5.8 },
  { label: 'INR −5%',           pct:  3.2 },
];

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { ticker: string } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
      style={{ background: 'rgba(8,10,20,0.95)', border: '1px solid rgba(201,168,76,0.2)', backdropFilter: 'blur(16px)' }}>
      <p className="font-mono font-semibold text-[#F0EEE8] mb-0.5">{payload[0]?.payload?.ticker}</p>
      <p className="text-red-400">−₹{Number(payload[0]?.value).toLocaleString()}</p>
    </div>
  );
}

function buildChartData(
  holdings: ReturnType<typeof usePortfolioStore.getState>['holdings'],
  totalValue: number,
  drawdownPct: number,
  scenario: Scenario,
) {
  if (holdings.length === 0 || totalValue <= 0) return [];

  const totalLoss = totalValue * (drawdownPct / 100);

  const weightedSens = holdings.map(h => {
    const value = h.quantity * getEffectivePrice(h);
    const weight = value / totalValue;
    const sens = scenario.id === 'top-drop'
      ? (h.symbol === [...holdings].sort((a, b) =>
          b.quantity * getEffectivePrice(b) - a.quantity * getEffectivePrice(a)
        )[0]?.symbol ? 2.5 : 0.5)
      : (scenario.sensitivity[h.symbol] ?? 1.0);
    return { symbol: h.symbol, weight, sens, value };
  });

  const sensSum = weightedSens.reduce((s, x) => s + x.weight * x.sens, 0) || 1;

  return weightedSens
    .map(x => ({ ticker: x.symbol, loss: Math.max(0, totalLoss * (x.weight * x.sens) / sensSum) }))
    .sort((a, b) => b.loss - a.loss);
}

function buildCorrelationTickers(
  holdings: ReturnType<typeof usePortfolioStore.getState>['holdings'],
  scenario: Scenario,
) {
  if (scenario.correlation.tickers.length > 0) return scenario.correlation.tickers;
  return holdings
    .filter(h => scenario.sensitivity[h.symbol] != null && scenario.sensitivity[h.symbol]! > 1.2)
    .map(h => h.symbol);
}

export function WhatIfEngine() {
  const holdings = usePortfolioStore(s => s.holdings);
  const loadFromBackend = usePortfolioStore(s => s.loadFromBackend);
  const refreshPrices = usePortfolioStore(s => s.refreshPrices);

  const [activeId, setActiveId] = useState<ScenarioId>('mkt-crash');
  const [sliders, setSliders] = useState(DEFAULT_SLIDERS);
  const [customRan, setCustomRan] = useState(false);

  useEffect(() => {
    loadFromBackend().then(() => refreshPrices(true));
  }, [loadFromBackend, refreshPrices]);

  const summary = computePortfolioSummary(holdings);
  const totalValue = summary.currentValue;

  const isCustom = activeId === 'custom';
  const scenario = SCENARIOS.find(s => s.id === activeId) ?? SCENARIOS[0];

  const customDrawdown = parseFloat(
    ((Math.abs(sliders.rates) * 0.3 + Math.abs(sliders.currency) * 0.2 + Math.abs(sliders.sector) * 0.5 + Math.abs(sliders.specific) * 0.4) * 0.15).toFixed(1)
  );

  const drawdownPct = isCustom && customRan ? customDrawdown : scenario.drawdownPct;
  const afterValue = Math.round(totalValue * (1 - drawdownPct / 100));
  const loss = totalValue - afterValue;

  const chartData = isCustom && !customRan
    ? []
    : buildChartData(holdings, totalValue, drawdownPct, scenario);

  const maxLoss = Math.max(...chartData.map(d => d.loss), 1);
  const correlationTickers = buildCorrelationTickers(holdings, scenario);

  const portfolioRows = holdings.map(h => ({
    ticker: h.symbol,
    exchange: h.exchange,
    alloc: computeWeight(h, totalValue),
    value: h.quantity * getEffectivePrice(h),
  }));

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in-up">

        {/* Page header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <Sliders className="w-[18px] h-[18px] text-[#C9A84C]" />
            </div>
            <h1 className="display-md text-[#F0EEE8]">What-If Engine</h1>
          </div>
          <p className="text-[#9298B0] text-sm ml-12">Stress-test your portfolio before the market does it for you.</p>
        </div>

        {/* Empty state */}
        {holdings.length === 0 && (
          <div className="glass-card p-12 text-center animate-fade-in-up">
            <BarChart3 className="w-10 h-10 text-[#4A4E65] mx-auto mb-3" />
            <p className="text-[#9298B0] text-sm mb-4">No holdings found. Add stocks in Portfolio Monitor first.</p>
            <Link to="/dashboard/portfolio" className="btn-gold inline-flex items-center gap-2 text-sm px-6 py-2.5">
              Go to Portfolio Monitor
            </Link>
          </div>
        )}

        {holdings.length > 0 && (
          <>
            {/* Portfolio snapshot from shared store */}
            <div className="glass-card p-4 mb-5">
              <p className="text-[#4A4E65] text-xs uppercase tracking-widest mb-3">Your Holdings (shared store)</p>
              <div className="flex flex-wrap gap-2">
                {portfolioRows.map(row => (
                  <span key={row.ticker} className="font-mono text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)', color: '#F0EEE8' }}>
                    {row.ticker}
                    <span className="text-[#4A4E65] ml-1">{row.exchange}</span>
                    <span className="text-[#C9A84C] ml-2">{row.alloc.toFixed(1)}%</span>
                  </span>
                ))}
              </div>
              <p className="text-[#4A4E65] text-[0.65rem] font-mono mt-3">
                Portfolio value: ₹{totalValue.toLocaleString('en-IN')} · {holdings.length} holding{holdings.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Scenario selector */}
            <div className="glass-card p-4 mb-5">
              <p className="text-[#4A4E65] text-xs uppercase tracking-widest mb-3">Select Shock Scenario</p>
              <div className="flex flex-wrap gap-2">
                {SCENARIOS.map(s => (
                  <button key={s.id} onClick={() => { setActiveId(s.id); setCustomRan(false); }}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: activeId === s.id ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${activeId === s.id ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      color: activeId === s.id ? '#C9A84C' : '#9298B0',
                    }}>
                    {s.label}
                  </button>
                ))}
                <button onClick={() => setActiveId('custom')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: activeId === 'custom' ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${activeId === 'custom' ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)'}`,
                    color: activeId === 'custom' ? '#C9A84C' : '#9298B0',
                  }}>
                  Custom
                </button>
              </div>
            </div>

            {isCustom && (
              <div className="glass-card p-5 mb-5 animate-fade-in-up">
                <p className="text-[#F0EEE8] text-sm font-semibold mb-5">Custom Scenario Builder</p>
                <div className="grid sm:grid-cols-2 gap-5 mb-5">
                  {([
                    { key: 'rates' as const,    label: 'Interest Rate Change (bps)', min: -200, max: 300, unit: 'bps' },
                    { key: 'currency' as const, label: 'INR Depreciation (%)',        min: -10,  max: 20,  unit: '%' },
                    { key: 'sector' as const,   label: 'Sector Shock (%)',            min: -40,  max: 10,  unit: '%' },
                    { key: 'specific' as const, label: 'Stock-Specific Drop (%)',     min: -50,  max: 0,   unit: '%' },
                  ] as const).map(s => (
                    <div key={s.key}>
                      <div className="flex justify-between mb-2">
                        <label className="text-[#9298B0] text-xs uppercase tracking-widest">{s.label}</label>
                        <span className="font-mono text-xs text-[#F0EEE8]">{sliders[s.key] > 0 ? '+' : ''}{sliders[s.key]}{s.unit}</span>
                      </div>
                      <input type="range" min={s.min} max={s.max} step={s.key === 'rates' ? 25 : 1}
                        value={sliders[s.key]}
                        onChange={e => setSliders(p => ({ ...p, [s.key]: Number(e.target.value) }))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, #C9A84C ${((sliders[s.key] - s.min) / (s.max - s.min)) * 100}%, rgba(255,255,255,0.1) ${((sliders[s.key] - s.min) / (s.max - s.min)) * 100}%)` }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => setCustomRan(true)}
                  className="btn-gold flex items-center gap-2 px-6 py-2.5 text-sm">
                  <RefreshCw className="w-4 h-4" /> Run Simulation
                </button>
              </div>
            )}

            {(!isCustom || customRan) && (
              <div className="space-y-5 animate-fade-in-up">

                <div className="glass-card p-6 sm:p-8">
                  <div className="grid sm:grid-cols-3 gap-6 items-center">
                    <div className="sm:col-span-1">
                      <p className="text-[#4A4E65] text-xs uppercase tracking-widest mb-2">Projected Drawdown</p>
                      <p className="number-display text-5xl font-bold" style={{ color: '#F87171' }}>
                        −{drawdownPct}%
                      </p>
                      <p className="text-[#9298B0] text-xs mt-2">Under this scenario</p>
                    </div>
                    <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[#4A4E65] text-xs uppercase tracking-widest mb-2">Portfolio Before</p>
                        <p className="number-display text-xl text-[#F0EEE8] font-semibold">₹{totalValue.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="rounded-xl p-4" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.2)' }}>
                        <p className="text-[#4A4E65] text-xs uppercase tracking-widest mb-2">Portfolio After</p>
                        <p className="number-display text-xl text-red-400 font-semibold">₹{afterValue.toLocaleString('en-IN')}</p>
                        <p className="text-red-400 text-[0.6rem] mt-1 font-mono">−₹{loss.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 glass-card p-6">
                    <h3 className="text-[#F0EEE8] font-semibold text-sm mb-1">Contribution to Loss</h3>
                    <p className="text-[#4A4E65] text-xs mb-5">Which positions hurt most — worst at top</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 48, left: 12, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis
                            type="category" dataKey="ticker" width={72}
                            tick={{ fill: '#9298B0', fontSize: 11, fontFamily: 'DM Mono, monospace' }}
                            axisLine={false} tickLine={false}
                          />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                          <Bar dataKey="loss" radius={[0, 4, 4, 0]} maxBarSize={20}>
                            {chartData.map((entry, i) => (
                              <Cell key={entry.ticker}
                                fill={`rgba(248,113,113,${1 - (i / chartData.length) * 0.55})`}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {chartData[0] && (
                      <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center gap-2 text-xs text-[#9298B0]">
                        <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span><span className="font-mono font-semibold text-[#F0EEE8]">{chartData[0].ticker}</span> is your largest drag at {((chartData[0].loss / maxLoss) * 100).toFixed(0)}% of total loss.</span>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 space-y-4">
                    <div className="glass-card p-5" style={{ border: '1px solid rgba(251,191,36,0.15)' }}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                          <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24]" />
                        </div>
                        <div>
                          <p className="text-[#F0EEE8] text-xs font-semibold mb-1">Hidden Correlation Cluster</p>
                          <p className="text-[#9298B0] text-xs leading-relaxed">{scenario.correlation.text}</p>
                        </div>
                      </div>
                      {correlationTickers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {correlationTickers.map(t => (
                            <span key={t} className="font-mono text-[0.65rem] px-2 py-0.5 rounded-md font-medium"
                              style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="glass-card p-5">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                          <Shield className="w-3.5 h-3.5 text-[#C9A84C]" />
                        </div>
                        <p className="text-[#F0EEE8] text-xs font-semibold">Suggested Actions</p>
                      </div>
                      <div className="space-y-3">
                        {scenario.actions.map((a, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                              <Check className="w-3 h-3 text-[#C9A84C]" />
                            </div>
                            <p className="text-[#9298B0] text-xs leading-relaxed">{a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Activity className="w-4 h-4 text-[#C9A84C]" />
                    <h3 className="text-[#F0EEE8] text-sm font-semibold">Scenario Comparison</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {COMPARE_STRIP.map((c, i) => {
                      const isActive = scenario.label === c.label;
                      return (
                        <div key={i} className="rounded-xl p-4 relative overflow-hidden transition-all duration-200"
                          style={{
                            background: isActive ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isActive ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.06)'}`,
                          }}>
                          <p className="text-[#4A4E65] text-[0.6rem] leading-tight mb-2">{c.label}</p>
                          <p className="number-display text-2xl font-bold" style={{ color: '#F87171' }}>−{c.pct}%</p>
                          <div className="mt-2 w-full h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <div className="h-full rounded-full" style={{ width: `${(c.pct / 15) * 100}%`, background: '#F87171', opacity: 0.6 }} />
                          </div>
                          {isActive && (
                            <div className="absolute top-2 right-2">
                              <ChevronRight className="w-3 h-3 text-red-400" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {isCustom && !customRan && (
              <div className="glass-card p-12 text-center animate-fade-in-up">
                <Sliders className="w-10 h-10 text-[#4A4E65] mx-auto mb-3" />
                <p className="text-[#9298B0] text-sm">Adjust the sliders above and click <span className="text-[#C9A84C]">Run Simulation</span> to see results.</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
