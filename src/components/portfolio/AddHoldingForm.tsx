import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Exchange } from '../../types/portfolio';
import { usePortfolioStore } from '../../stores/portfolioStore';

const EXCHANGES: Exchange[] = ['NSE', 'BSE', 'NYSE', 'NASDAQ'];

export function AddHoldingForm() {
  const addHolding = usePortfolioStore(s => s.addHolding);
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState<Exchange>('NSE');
  const [quantity, setQuantity] = useState('');
  const [avgBuyPrice, setAvgBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await addHolding({
      symbol: symbol.trim().toUpperCase(),
      exchange,
      quantity: parseFloat(quantity),
      avgBuyPrice: parseFloat(avgBuyPrice),
      buyDate: buyDate || undefined,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSymbol('');
    setQuantity('');
    setAvgBuyPrice('');
    setBuyDate('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mb-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[#4A4E65] text-[0.65rem] uppercase tracking-widest mb-1.5">Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={e => { setSymbol(e.target.value.toUpperCase()); setError(''); }}
            placeholder="RELIANCE"
            required
            className="premium-input font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-[#4A4E65] text-[0.65rem] uppercase tracking-widest mb-1.5">Exchange</label>
          <select
            value={exchange}
            onChange={e => setExchange(e.target.value as Exchange)}
            className="premium-input text-sm"
          >
            {EXCHANGES.map(ex => (
              <option key={ex} value={ex} style={{ background: '#060810' }}>{ex}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[#4A4E65] text-[0.65rem] uppercase tracking-widest mb-1.5">Quantity</label>
          <input
            type="number"
            min="0.01"
            step="any"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="10"
            required
            className="premium-input font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-[#4A4E65] text-[0.65rem] uppercase tracking-widest mb-1.5">Avg Buy Price</label>
          <input
            type="number"
            min="0.01"
            step="any"
            value={avgBuyPrice}
            onChange={e => setAvgBuyPrice(e.target.value)}
            placeholder="2450"
            required
            className="premium-input font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-[#4A4E65] text-[0.65rem] uppercase tracking-widest mb-1.5">Buy Date</label>
          <input
            type="date"
            value={buyDate}
            onChange={e => setBuyDate(e.target.value)}
            className="premium-input text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      <button type="submit" disabled={loading} className="btn-gold text-sm px-4 py-2.5 flex items-center gap-1.5">
        <Plus className="w-4 h-4" />
        {loading ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}
