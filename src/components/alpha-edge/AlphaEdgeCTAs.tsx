import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Briefcase, Check, LineChart } from 'lucide-react';
import type { AlphaEdgeVerdict } from '../../types/alphaEdge';
import type { Exchange } from '../../types/portfolio';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { holdingKey } from '../../lib/portfolioMetrics';

interface Props {
  verdict: AlphaEdgeVerdict;
  inPortfolio: boolean;
}

/** Section 7 — cross-feature CTAs */
export function AlphaEdgeCTAs({ verdict, inPortfolio }: Props) {
  const navigate = useNavigate();
  const addHolding = usePortfolioStore(s => s.addHolding);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (inPortfolio) return;
    setError('');
    const result = await addHolding({
      symbol: verdict.header.symbol,
      exchange: verdict.header.exchange as Exchange,
      quantity: verdict.position.quantity,
      avgBuyPrice: verdict.position.buyPrice,
    });
    if (result.error) { setError(result.error); return; }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleThesis = () => {
    navigate('/dashboard/journal', {
      state: {
        prefill: {
          ticker: verdict.header.symbol,
          company: verdict.header.companyName,
          buyPrice: verdict.position.buyPrice,
          exchange: verdict.header.exchange,
        },
      },
    });
  };

  const handleStockAnalysis = () => {
    navigate('/dashboard/analyzer', { state: { symbol: verdict.header.symbol } });
  };

  return (
    <div className="glass-card p-5 sm:p-6">
      <h3 className="heading-sm text-[#F0EEE8] mb-4">Next Steps</h3>
      <div className="flex flex-col gap-2">
        <button onClick={handleStockAnalysis}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-[#C9A84C] hover:bg-[rgba(201,168,76,0.08)] transition-colors"
          style={{ border: '1px solid rgba(201,168,76,0.25)' }}>
          <LineChart className="w-4 h-4" /> View full Stock Analysis
        </button>
        <button onClick={handleThesis}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-[#9298B0] hover:text-[#F0EEE8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <BookOpen className="w-4 h-4" /> Track as Thesis
        </button>
        {!inPortfolio && (
          <button onClick={handleAdd}
            className="btn-gold flex items-center justify-center gap-2 py-3">
            {added ? <><Check className="w-4 h-4" /> Added</> : <><Briefcase className="w-4 h-4" /> Add to Portfolio</>}
          </button>
        )}
        {inPortfolio && (
          <p className="text-[#4A4E65] text-xs text-center py-2">Already in your portfolio ({holdingKey(verdict.header.symbol, verdict.header.exchange)})</p>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
