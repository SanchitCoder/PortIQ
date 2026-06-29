import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Briefcase, Check } from 'lucide-react';
import type { StockAnalysisHeader } from '../../types/stockAnalysis';
import type { Exchange } from '../../types/portfolio';
import { usePortfolioStore } from '../../stores/portfolioStore';

interface Props {
  header: StockAnalysisHeader;
}

/** Section 9 — cross-feature CTAs */
export function StockCrossFeatureCTAs({ header }: Props) {
  const navigate = useNavigate();
  const addHolding = usePortfolioStore(s => s.addHolding);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  const handleAddToPortfolio = async () => {
    setError('');
    const result = await addHolding({
      symbol: header.symbol,
      exchange: header.exchange as Exchange,
      quantity: 1,
      avgBuyPrice: header.price ?? 0,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleTrackThesis = () => {
    navigate('/dashboard/journal', {
      state: {
        prefill: {
          ticker: header.symbol,
          company: header.companyName,
          buyPrice: header.price ?? undefined,
          exchange: header.exchange,
        },
      },
    });
  };

  return (
    <div className="glass-card p-5 sm:p-6">
      <h3 className="heading-sm text-[#F0EEE8] mb-4">Next Steps</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={handleAddToPortfolio} disabled={!header.price}
          className="btn-gold flex-1 flex items-center justify-center gap-2 py-3 disabled:opacity-50">
          {added ? <><Check className="w-4 h-4" /> Added</> : <><Briefcase className="w-4 h-4" /> Add to Portfolio</>}
        </button>
        <button onClick={handleTrackThesis}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-[#C9A84C] transition-colors hover:bg-[rgba(201,168,76,0.08)]"
          style={{ border: '1px solid rgba(201,168,76,0.25)' }}>
          <BookOpen className="w-4 h-4" /> Track as Thesis
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {!header.price && (
        <p className="text-[#4A4E65] text-xs mt-2">Add to portfolio requires a live price</p>
      )}
    </div>
  );
}
