import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { AlphaEdgeFactorDirection, AlphaEdgeSignal } from '../../types/alphaEdge';

export function signalColor(signal: AlphaEdgeSignal): string {
  if (signal === 'buy') return '#4ADE80';
  if (signal === 'sell') return '#F87171';
  return '#FBBF24';
}

export function factorDirectionColor(direction: AlphaEdgeFactorDirection): string {
  if (direction === 'supports_buy') return '#4ADE80';
  if (direction === 'supports_sell') return '#F87171';
  return '#FBBF24';
}

export function signalLabel(signal: AlphaEdgeSignal): string {
  return signal.toUpperCase();
}

export function pctColor(pct: number | null): string {
  if (pct == null) return '#9298B0';
  if (pct > 0) return '#4ADE80';
  if (pct < 0) return '#F87171';
  return '#9298B0';
}

export function fmtMoney(amount: number | null, currency: string): string {
  if (amount == null) return 'data unavailable';
  const sym = currency === 'INR' ? '₹' : '$';
  const prefix = amount >= 0 ? '+' : '';
  return `${prefix}${sym}${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function FactorIcon({ direction }: { direction: AlphaEdgeFactorDirection }) {
  if (direction === 'supports_buy') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (direction === 'supports_sell') return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-[#FBBF24]" />;
}

export function ConfidenceRing({ value }: { value: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 70 ? '#4ADE80' : value >= 45 ? '#FBBF24' : '#F87171';

  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="number-display text-xl font-bold text-[#F0EEE8]">{value}</span>
        <span className="text-[0.6rem] text-[#4A4E65] uppercase">conf.</span>
      </div>
    </div>
  );
}
