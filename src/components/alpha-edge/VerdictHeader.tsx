import type { AlphaEdgeVerdict } from '../../types/alphaEdge';
import { ConfidenceRing, signalColor, signalLabel } from './utils';

interface Props {
  header: AlphaEdgeVerdict['header'];
}

/** Section 1 — bound to verdict.header */
export function VerdictHeader({ header }: Props) {
  const color = signalColor(header.signal);

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-5">
        <span className="px-5 py-2 rounded-full text-lg font-bold uppercase tracking-wider"
          style={{ background: `${color}18`, color, border: `1px solid ${color}50` }}>
          {signalLabel(header.signal)}
        </span>
        <ConfidenceRing value={header.confidence} />
        <div className="flex-1 min-w-[200px]">
          <p className="text-[#F0EEE8] font-semibold text-sm leading-relaxed">{header.headline}</p>
          <p className="text-[#9298B0] text-xs mt-1 font-mono">{header.symbol} · {header.exchange} · {header.companyName}</p>
        </div>
      </div>
    </div>
  );
}
