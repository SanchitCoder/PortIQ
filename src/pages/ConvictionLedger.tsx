import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  BookOpen, Plus, X, Target, Clock, Activity,
  AlertTriangle, TrendingUp, ChevronRight,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────── */
type Status = 'intact' | 'weakening' | 'broken';
interface ThesisEntry {
  id: number;
  ticker: string;
  company: string;
  entryDate: string;
  buyPrice: number;
  targetPrice: number;
  thesis: string;
  invalidation: string;
  conviction: number;
  status: Status;
  thesisDecay: number; // 0–100
}

/* ── Mock data (replace with API) ─────────────────────────────────────── */
const INITIAL_ENTRIES: ThesisEntry[] = [
  {
    id: 1, ticker: 'RELIANCE', company: 'Reliance Industries',
    entryDate: '2024-03-12', buyPrice: 2640, targetPrice: 3200,
    thesis: 'Jio Platform subscriber growth + retail vertical expansion creates a diversified conglomerate with multiple re-rating catalysts. Oil-to-Chemicals margin recovery expected in H2 FY25.',
    invalidation: 'Jio subscriber additions fall below 4M/month for two consecutive quarters, or ARPU stagnates below ₹180.',
    conviction: 9, status: 'intact', thesisDecay: 15,
  },
  {
    id: 2, ticker: 'TCS', company: 'Tata Consultancy Services',
    entryDate: '2024-01-05', buyPrice: 3890, targetPrice: 4500,
    thesis: 'BFSI vertical recovery in the US + AI transformation deals create a multi-year growth runway. Margin expansion from offshore mix improvement.',
    invalidation: 'Two consecutive quarters of negative constant-currency growth, or deal TCV falls below $8B per quarter.',
    conviction: 7, status: 'weakening', thesisDecay: 48,
  },
  {
    id: 3, ticker: 'HDFCBANK', company: 'HDFC Bank Ltd.',
    entryDate: '2024-06-20', buyPrice: 1520, targetPrice: 1900,
    thesis: 'Post-merger integration overhang fully priced in. Credit-deposit ratio normalisation + rate cycle peak creates ideal re-entry. Asset quality remains pristine.',
    invalidation: 'GNPA crosses 1.5% or RBI imposes any business restrictions on the merged entity.',
    conviction: 8, status: 'intact', thesisDecay: 12,
  },
  {
    id: 4, ticker: 'TSLA', company: 'Tesla Inc.',
    entryDate: '2023-11-14', buyPrice: 21500, targetPrice: 32000,
    thesis: 'EV first-mover advantage + FSD monetisation creates recurring software revenue. Cybertruck ramp expected to expand the addressable market significantly.',
    invalidation: 'Global EV share falls below 15%, or FSD revenue recognition delayed past Q3 2024.',
    conviction: 6, status: 'broken', thesisDecay: 82,
  },
  {
    id: 5, ticker: 'INFY', company: 'Infosys Ltd.',
    entryDate: '2024-02-28', buyPrice: 1680, targetPrice: 2000,
    thesis: 'Cost optimisation deals with US enterprises provide near-term revenue stability. Topaz AI platform expected to generate premium-priced contracts from FY26.',
    invalidation: 'FY25 revenue guidance cut below 3%, or Topaz pipeline falls short of $2B.',
    conviction: 6, status: 'weakening', thesisDecay: 55,
  },
];

const BIASES = [
  {
    name: 'Disposition Effect', severity: 'high' as const,
    insight: 'You\'ve sold 3 winners within 10 days while holding TSLA at −32% for 8 months. Classic loss-aversion pattern.',
  },
  {
    name: 'Anchoring to Entry', severity: 'high' as const,
    insight: 'Your TSLA invalidation was updated twice with no sell action. Price anchoring is distorting exit discipline.',
  },
  {
    name: 'Recency Bias', severity: 'medium' as const,
    insight: 'Your last 4 entries followed market headlines within 72 hours. FOMO-driven entries underperform conviction ones by avg 11%.',
  },
  {
    name: 'Overconcentration', severity: 'low' as const,
    insight: 'Top 2 positions (RELIANCE + TCS) are 63% of portfolio. Review if either thesis weakens further.',
  },
];

/* ── Helpers ──────────────────────────────────────────────────────────── */
function statusCfg(s: Status) {
  return {
    intact:    { label: 'Thesis Intact',  color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)' },
    weakening: { label: 'Weakening',      color: '#FBBF24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)' },
    broken:    { label: 'Thesis Broken',  color: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
  }[s];
}

function severityCfg(s: 'low' | 'medium' | 'high') {
  return {
    low:    { label: 'Low',    color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.2)' },
    medium: { label: 'Medium', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)' },
    high:   { label: 'High',   color: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  }[s];
}

/* ── ThesisCard ───────────────────────────────────────────────────────── */
function ThesisCard({ entry }: { entry: ThesisEntry }) {
  const [expanded, setExpanded] = useState(false);
  const sc = statusCfg(entry.status);
  const decayColor = entry.thesisDecay < 30 ? '#34d399' : entry.thesisDecay < 60 ? '#FBBF24' : '#F87171';
  const upside = ((entry.targetPrice - entry.buyPrice) / entry.buyPrice * 100);

  return (
    <div className="glass-card overflow-hidden hover-lift">
      <button className="w-full px-5 py-4 flex items-center gap-4 text-left" onClick={() => setExpanded(p => !p)}>
        {/* Ticker avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <span className="font-mono text-[0.5rem] text-[#C9A84C] font-bold">{entry.ticker.slice(0, 2)}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm font-semibold text-[#F0EEE8]">{entry.ticker}</span>
            <span className="text-[#4A4E65] text-xs hidden sm:inline">{entry.company}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[#4A4E65] text-xs">₹{entry.buyPrice.toLocaleString()}</span>
            <span className="text-[#4A4E65] text-xs">→ Target ₹{entry.targetPrice.toLocaleString()}</span>
            <span className={`font-mono text-xs font-semibold ${upside >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ({upside >= 0 ? '+' : ''}{upside.toFixed(1)}% upside)
            </span>
          </div>
        </div>

        {/* Badge + conviction */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            <span className="text-[#4A4E65] text-[0.6rem] uppercase tracking-widest">Conviction</span>
            <span className="number-display text-sm text-[#F0EEE8] font-semibold">{entry.conviction}<span className="text-[#4A4E65] text-xs">/10</span></span>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
            style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
            {sc.label}
          </span>
          <ChevronRight className={`w-4 h-4 text-[#4A4E65] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Thesis decay bar */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#4A4E65] text-[0.6rem] uppercase tracking-widest">Thesis Integrity</span>
          <span className="text-[0.6rem] font-mono font-medium" style={{ color: decayColor }}>{100 - entry.thesisDecay}% intact</span>
        </div>
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${100 - entry.thesisDecay}%`, background: decayColor }} />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 pt-3 border-t border-white/[0.05] space-y-4 animate-fade-in-up">
          <div>
            <p className="text-[#4A4E65] text-xs uppercase tracking-widest mb-2">Why I Bought</p>
            <p className="text-[#9298B0] text-sm leading-relaxed">{entry.thesis}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)' }}>
            <p className="text-[#4A4E65] text-xs uppercase tracking-widest mb-2">Invalidation Condition</p>
            <p className="text-[#FBBF24] text-sm leading-relaxed">{entry.invalidation}</p>
          </div>
          <div className="flex items-center gap-2 text-[#4A4E65] text-xs">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Entered {new Date(entry.entryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )}
    </div>
  );
}

interface ThesisPrefill {
  ticker?: string;
  company?: string;
  buyPrice?: number;
  exchange?: string;
}

/* ── NewEntryModal ────────────────────────────────────────────────────── */
function NewEntryModal({ onClose, prefill }: { onClose: () => void; prefill?: ThesisPrefill }) {
  const [conviction, setConviction] = useState(7);
  const [ticker, setTicker] = useState(prefill?.ticker ?? '');
  const [targetPrice, setTargetPrice] = useState(
    prefill?.buyPrice ? String(Math.round(prefill.buyPrice * 1.15)) : '',
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in-up"
        style={{ background: 'rgba(8,10,20,0.97)', backdropFilter: 'blur(40px)', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>

        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h3 className="heading-sm text-[#F0EEE8]">New Thesis Entry</h3>
            <p className="text-[#4A4E65] text-xs mt-0.5">Define your conviction before the trade</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#4A4E65] hover:text-[#F0EEE8] transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Ticker Symbol</label>
              <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
                placeholder="e.g. RELIANCE" className="premium-input font-mono uppercase" />
            </div>
            <div>
              <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Target Price (₹)</label>
              <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
                placeholder="e.g. 3200" className="premium-input" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Why I'm Buying</label>
            <textarea placeholder="Describe the investment thesis — fundamentals, catalysts, moat, macro tailwinds…" rows={4} className="premium-input resize-none" />
          </div>

          <div>
            <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Invalidation Condition</label>
            <textarea placeholder="What specific event or metric would prove this thesis wrong and force a sell?" rows={3} className="premium-input resize-none" />
          </div>

          {/* Conviction slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-[#9298B0] uppercase tracking-widest">Conviction Level</label>
              <span className="number-display text-xl text-[#F0EEE8] font-semibold">
                {conviction}<span className="text-[#4A4E65] text-xs font-mono">/10</span>
              </span>
            </div>
            <input type="range" min="1" max="10" value={conviction}
              onChange={e => setConviction(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #C9A84C ${conviction * 10}%, rgba(255,255,255,0.1) ${conviction * 10}%)` }} />
            <div className="flex justify-between text-[#4A4E65] text-[0.6rem] mt-2">
              <span>Speculative</span><span>Moderate</span><span>High Conviction</span>
            </div>
          </div>

          <button className="btn-gold w-full py-3 flex items-center justify-center gap-2 text-sm mt-1">
            <Plus className="w-4 h-4" /> Add to Ledger
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export function ConvictionLedger() {
  const location = useLocation();
  const prefill = (location.state as { prefill?: ThesisPrefill } | null)?.prefill;
  const [entries] = useState<ThesisEntry[]>(INITIAL_ENTRIES);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (prefill?.ticker) setShowModal(true);
  }, [prefill?.ticker]);

  const intact    = entries.filter(e => e.status === 'intact').length;
  const weakening = entries.filter(e => e.status === 'weakening').length;
  const broken    = entries.filter(e => e.status === 'broken').length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in-up">

        {/* Header */}
        <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <BookOpen className="w-[18px] h-[18px] text-[#C9A84C]" />
              </div>
              <h1 className="display-md text-[#F0EEE8]">Conviction Ledger</h1>
            </div>
            <p className="text-[#9298B0] text-sm ml-12">Track your thesis, not just your price.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm shrink-0">
            <Plus className="w-4 h-4" /> New Entry
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {([
            { icon: Activity, label: 'Disposition Score',    value: '68%',          trend: '↑ +4% this month', bad: true },
            { icon: Target,   label: 'Conviction Win Rate',  value: '71%',          trend: '↑ +3% vs last Q',  bad: false },
            { icon: Clock,    label: 'Avg Hold: Win / Loss', value: '247d / 38d',   trend: 'winners held longer', bad: false },
            { icon: TrendingUp, label: 'Overtrading Index',  value: '3.2×',         trend: '↓ –0.4× this month', bad: false },
          ] as const).map((s, i) => (
            <div key={i} className="glass-card p-5 hover-lift">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  <s.icon className="w-4 h-4 text-[#C9A84C]" />
                </div>
                <span className={`text-[0.6rem] font-medium ${s.bad ? 'text-red-400' : 'text-emerald-400'}`}>{s.trend}</span>
              </div>
              <p className="number-display text-xl text-[#F0EEE8] font-semibold mb-0.5">{s.value}</p>
              <p className="text-[#4A4E65] text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Status summary pills */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="text-[#4A4E65] text-xs">Portfolio Status:</span>
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>{intact} Intact</span>
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.25)' }}>{weakening} Weakening</span>
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)' }}>{broken} Broken</span>
        </div>

        {/* Main two-column grid */}
        <div className="grid lg:grid-cols-12 gap-5">

          {/* Thesis cards (~65%) */}
          <div className="lg:col-span-8 space-y-3">
            {entries.map(e => <ThesisCard key={e.id} entry={e} />)}
          </div>

          {/* Bias audit sidebar (~35%) */}
          <div className="lg:col-span-4">
            <div className="glass-card p-5 lg:sticky lg:top-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                </div>
                <h3 className="text-[#F0EEE8] font-semibold text-sm">AI Bias Audit</h3>
              </div>
              <p className="text-[#4A4E65] text-xs mb-4 leading-relaxed">
                Behavioral patterns detected in your 90-day trading history.
              </p>

              <div className="space-y-3">
                {BIASES.map((b, i) => {
                  const sc = severityCfg(b.severity);
                  return (
                    <div key={i} className="rounded-xl p-4"
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#F0EEE8] text-xs font-semibold">{b.name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[0.55rem] font-bold uppercase tracking-wide"
                          style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-[#9298B0] text-xs leading-relaxed">{b.insight}</p>
                    </div>
                  );
                })}
              </div>

              {/* TODO: Wire to real AI bias detection */}
              <p className="text-[#3A3E55] text-[0.6rem] mt-4 pt-4 border-t border-white/[0.05] leading-relaxed">
                Patterns updated daily based on your trade history. Not financial advice.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showModal && <NewEntryModal onClose={() => setShowModal(false)} prefill={prefill} />}
    </DashboardLayout>
  );
}
