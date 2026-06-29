import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  AlertCircle, Zap, Crown, Search, Briefcase, TrendingUp, TrendingDown, Minus, Lock, Unlock, Download,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UsageService } from '../lib/usageService';
import { evaluateAlphaEdge, exportAlphaEdgePdf } from '../lib/alphaEdgeApi';
import { fetchPrices } from '../lib/portfolioApi';
import { usePortfolioStore } from '../stores/portfolioStore';
import type { AlphaEdgeVerdict } from '../types/alphaEdge';
import type { Exchange } from '../types/portfolio';
import {
  AlphaEdgeReport,
  AlphaEdgeEmpty,
  AlphaEdgeSkeleton,
} from '../components/alpha-edge/AlphaEdgeReport';
import { pctColor } from '../components/alpha-edge/utils';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'AAPL', 'TSLA', 'NVDA'];
const US_SYMBOLS = new Set(['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META']);

function inferExchange(symbol: string): Exchange {
  return US_SYMBOLS.has(symbol.toUpperCase()) ? 'NASDAQ' : 'NSE';
}

export function AlphaEdgeEvaluator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const holdings = usePortfolioStore(s => s.holdings);

  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState<Exchange>('NSE');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [priceOverride, setPriceOverride] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [context, setContext] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [verdict, setVerdict] = useState<AlphaEdgeVerdict | null>(null);
  const [error, setError] = useState('');
  const [remainingUses, setRemainingUses] = useState<number | null>(null);

  useEffect(() => { if (user) loadUsageInfo(); }, [user]);

  const loadUsageInfo = async () => {
    if (!user) return;
    try { setRemainingUses(await UsageService.getRemainingUses(user.id, 'alphaedge_evaluator')); }
    catch (e) { console.error(e); }
  };

  const sym = symbol.trim().toUpperCase();

  // Auto-fetch live price when symbol changes (unless user overrides)
  const fetchLivePrice = useCallback(async (symVal: string, ex: Exchange) => {
    if (!symVal || priceOverride) return;
    setPriceLoading(true);
    try {
      // API: POST /api/prices
      const quotes = await fetchPrices([{ symbol: symVal, exchange: ex }], { refresh: true });
      const q = quotes[0];
      if (q?.currentPrice > 0) {
        setCurrentPrice(String(q.currentPrice));
        if (q.exchange) setExchange(q.exchange);
      }
    } catch (e) {
      console.warn('Price fetch failed:', e);
    } finally {
      setPriceLoading(false);
    }
  }, [priceOverride]);

  useEffect(() => {
    if (!sym) return;
    const ex = inferExchange(sym);
    setExchange(ex);
    const t = setTimeout(() => fetchLivePrice(sym, ex), 400);
    return () => clearTimeout(t);
  }, [sym, fetchLivePrice]);

  const portfolioMatch = useMemo(
    () => holdings.find(h => h.symbol === sym),
    [holdings, sym],
  );

  const handleImportFromPortfolio = () => {
    if (!portfolioMatch) {
      setError(`${sym || 'Symbol'} not found in your portfolio.`);
      return;
    }
    setError('');
    setBuyPrice(String(portfolioMatch.avgBuyPrice));
    setQuantity(String(portfolioMatch.quantity));
    setExchange(portfolioMatch.exchange);
    if (portfolioMatch.currentPrice && portfolioMatch.currentPrice > 0 && !priceOverride) {
      setCurrentPrice(String(portfolioMatch.currentPrice));
    }
  };

  const pnlPct = currentPrice && buyPrice
    ? (((parseFloat(currentPrice) - parseFloat(buyPrice)) / parseFloat(buyPrice)) * 100)
    : null;

  const canEvaluate = sym && buyPrice && quantity && currentPrice
    && parseFloat(buyPrice) > 0 && parseFloat(quantity) > 0 && parseFloat(currentPrice) > 0;

  const inPortfolio = verdict
    ? verdict.inPortfolio || holdings.some(h => h.symbol === verdict.header.symbol)
    : portfolioMatch != null;

  const handleEvaluate = async () => {
    if (!canEvaluate) {
      setError('Please fill in symbol, buy price, quantity, and current price.');
      return;
    }
    if (!user) { setError('Please log in to use this feature.'); return; }
    const hasAccess = await UsageService.canUseFeature(user.id, 'alphaedge_evaluator');
    if (!hasAccess) { setError('Free uses exhausted. Upgrade to continue.'); return; }

    setError('');
    setLoading(true);
    setVerdict(null);

    try {
      // API: POST /api/alphaedge/evaluate
      const result = await evaluateAlphaEdge({
        symbol: sym,
        exchange,
        buyPrice: parseFloat(buyPrice),
        quantity: parseFloat(quantity),
        currentPrice: parseFloat(currentPrice),
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        context: context.trim() || undefined,
      });
      setVerdict(result);

      const hasPaid = await UsageService.hasPaidSubscription(user.id);
      if (!hasPaid) {
        await UsageService.incrementUsage(user.id, 'alphaedge_evaluator');
        await loadUsageInfo();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to evaluate position. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!canEvaluate) {
      setError('Please fill in symbol, buy price, quantity, and current price.');
      return;
    }
    if (!user) { setError('Please log in to export.'); return; }

    setError('');
    setExportingPdf(true);

    try {
      // API: POST /api/alphaedge/evaluate/export-pdf — uses cached verdict when available
      const blob = await exportAlphaEdgePdf({
        symbol: sym,
        exchange,
        buyPrice: parseFloat(buyPrice),
        quantity: parseFloat(quantity),
        currentPrice: parseFloat(currentPrice),
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        context: context.trim() || undefined,
        userEmail: user.email,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PortIQ-AlphaEdge-${sym}-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Failed to export PDF. Run Evaluate first, then try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const limitExhausted = remainingUses !== null && remainingUses === 0;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in-up">

        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <Zap className="w-[18px] h-[18px] text-[#C9A84C]" />
            </div>
            <h1 className="display-md text-[#F0EEE8]">AlphaEdge Evaluator</h1>
            {remainingUses !== null && remainingUses !== Infinity && (
              <span className="label-tag ml-2">{remainingUses} left</span>
            )}
          </div>
          <p className="text-[#9298B0] text-sm ml-12">
            Position-aware Buy / Hold / Sell verdict with structured exit strategy.
          </p>
        </div>

        <div className="grid lg:grid-cols-[minmax(300px,380px)_1fr] gap-5 items-start">

          {/* Left — Position Details */}
          <div className="glass-card p-6 sm:p-7 flex flex-col lg:sticky lg:top-6">
            <h2 className="heading-sm text-[#F0EEE8] mb-1">Position Details</h2>
            <p className="text-[#9298B0] text-xs mb-5">Enter your position for evaluation</p>

            <div className="space-y-4 flex-1">
              {/* Symbol */}
              <div>
                <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Symbol</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4E65]" />
                  <input
                    type="text"
                    value={symbol}
                    onChange={e => { setSymbol(e.target.value.toUpperCase()); setError(''); }}
                    placeholder="e.g. RELIANCE, AAPL, TCS…"
                    className="premium-input pl-10 w-full"
                  />
                </div>
                <div className="mt-2">
                  <p className="text-[#4A4E65] text-xs mb-2 uppercase tracking-widest">Popular</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR.map(s => (
                      <button key={s} onClick={() => { setSymbol(s); setError(''); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${sym === s ? 'text-[#C9A84C]' : 'text-[#4A4E65] hover:text-[#9298B0]'}`}
                        style={{
                          background: sym === s ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                          border: sym === s ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(255,255,255,0.06)',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Import from portfolio */}
              <button
                type="button"
                onClick={handleImportFromPortfolio}
                disabled={!sym}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-[#9298B0] hover:text-[#F0EEE8] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-40"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <Briefcase className="w-3.5 h-3.5" />
                Import from Portfolio
                {portfolioMatch && <span className="text-[#4A4E65]">· {portfolioMatch.quantity} @ ₹{portfolioMatch.avgBuyPrice}</span>}
              </button>

              {/* Current price (read-only + override) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#9298B0] uppercase tracking-widest">Current Price (₹)</label>
                  <button type="button" onClick={() => setPriceOverride(v => !v)}
                    className="flex items-center gap-1 text-[0.65rem] text-[#4A4E65] hover:text-[#C9A84C] transition-colors">
                    {priceOverride ? <><Unlock className="w-3 h-3" /> Manual</> : <><Lock className="w-3 h-3" /> Live</>}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number" step="0.01" value={currentPrice}
                    onChange={e => { setCurrentPrice(e.target.value); setError(''); }}
                    readOnly={!priceOverride}
                    placeholder={priceLoading ? 'Fetching…' : 'e.g. 2840.00'}
                    className={`premium-input ${!priceOverride ? 'opacity-80 cursor-default' : ''}`}
                  />
                  {priceLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 loader-gold scale-50" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Buy Price (₹)</label>
                  <input
                    type="number" step="0.01" value={buyPrice}
                    onChange={e => { setBuyPrice(e.target.value); setError(''); }}
                    placeholder="e.g. 2600.00"
                    className="premium-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Quantity</label>
                  <input
                    type="number" step="1" min="1" value={quantity}
                    onChange={e => { setQuantity(e.target.value); setError(''); }}
                    placeholder="e.g. 10"
                    className="premium-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Target Price <span className="text-[#4A4E65]">(opt)</span></label>
                  <input
                    type="number" step="0.01" value={targetPrice}
                    onChange={e => setTargetPrice(e.target.value)}
                    placeholder="e.g. 3200"
                    className="premium-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Stop Loss <span className="text-[#4A4E65]">(opt)</span></label>
                  <input
                    type="number" step="0.01" value={stopLoss}
                    onChange={e => setStopLoss(e.target.value)}
                    placeholder="e.g. 2400"
                    className="premium-input"
                  />
                </div>
              </div>

              {pnlPct !== null && !isNaN(pnlPct) && (
                <div className="rounded-xl p-4 flex items-center justify-between animate-fade-in-up"
                  style={{
                    background: pnlPct >= 0 ? 'rgba(52,211,153,0.06)' : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${pnlPct >= 0 ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}>
                  <span className="text-[#9298B0] text-xs uppercase tracking-widest">Unrealised P&L</span>
                  <div className="flex items-center gap-2">
                    {pnlPct > 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                      : pnlPct < 0 ? <TrendingDown className="w-4 h-4 text-red-400" />
                      : <Minus className="w-4 h-4 text-[#9298B0]" />}
                    <span className="number-display font-medium text-sm" style={{ color: pctColor(pnlPct) }}>
                      {pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">
                  Optional: paste extra context / news
                </label>
                <p className="text-[#4A4E65] text-xs mb-2">
                  PortIQ already pulls fundamentals automatically — add news or thesis notes here if you want.
                </p>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="Recent earnings, news, or your investment thesis…"
                  rows={4}
                  className="premium-input resize-none"
                />
              </div>

              {error && (
                <div className="rounded-xl p-4 flex items-start gap-3"
                  style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 text-sm">{error}</p>
                    {error.toLowerCase().includes('upgrade') && (
                      <button onClick={() => navigate('/dashboard/settings?tab=subscription')}
                        className="btn-gold mt-3 text-xs px-4 py-2 flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5" /> Upgrade Plan
                      </button>
                    )}
                  </div>
                </div>
              )}

              {limitExhausted && (
                <div className="rounded-xl p-5 flex items-start gap-3"
                  style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.25)' }}>
                  <Crown className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[#F0EEE8] font-semibold text-sm mb-1">Free evaluation used</p>
                    <p className="text-[#9298B0] text-xs mb-3">Upgrade for unlimited AlphaEdge evaluations.</p>
                    <button onClick={() => navigate('/dashboard/settings?tab=subscription')} className="btn-gold text-xs px-4 py-2 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" /> Upgrade Now
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleEvaluate}
              disabled={loading || !canEvaluate || limitExhausted}
              className="btn-gold mt-5 w-full flex items-center justify-center gap-2 py-3.5">
              {loading ? (
                <><span className="loader-gold scale-75" />Evaluating position…</>
              ) : (
                <><Zap className="w-4 h-4" />Get Buy / Hold / Sell Signal</>
              )}
            </button>
          </div>

          {/* Right — AlphaEdge Verdict */}
          <div className="min-w-0">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="heading-sm text-[#F0EEE8]">AlphaEdge Verdict</h2>
                <p className="text-[#9298B0] text-xs">Structured position report with AI rationale</p>
              </div>
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf || !canEvaluate}
                className="btn-gold text-sm px-4 py-2.5 flex items-center gap-2 shrink-0"
                title="Export verdict as PDF"
              >
                {exportingPdf ? (
                  <><span className="loader-gold scale-75" />Exporting…</>
                ) : (
                  <><Download className="w-4 h-4" />Export PDF</>
                )}
              </button>
            </div>
            {loading && <AlphaEdgeSkeleton />}
            {!loading && !verdict && <AlphaEdgeEmpty />}
            {!loading && verdict && (
              <AlphaEdgeReport verdict={verdict} inPortfolio={inPortfolio} />
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
