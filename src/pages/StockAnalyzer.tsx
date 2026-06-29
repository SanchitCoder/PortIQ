import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AlertCircle, LineChart, Crown, Search, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UsageService } from '../lib/usageService';
import { analyzeStock, exportStockAnalysisPdf } from '../lib/stockAnalyzerApi';
import type { StockAnalysis } from '../types/stockAnalysis';
import {
  StockAnalysisReport,
  StockReportEmpty,
  StockReportSkeleton,
} from '../components/stock-analyzer/StockAnalysisReport';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'AAPL', 'TSLA', 'NVDA'];

export function StockAnalyzer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const deepSymbol = (location.state as { symbol?: string } | null)?.symbol;
  const [stock, setStock] = useState(deepSymbol ?? '');
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [report, setReport] = useState<StockAnalysis | null>(null);
  const [error, setError] = useState('');
  const [remainingUses, setRemainingUses] = useState<number | null>(null);

  useEffect(() => { if (user) loadUsageInfo(); }, [user]);

  useEffect(() => {
    if (deepSymbol) setStock(deepSymbol.toUpperCase());
  }, [deepSymbol]);

  const loadUsageInfo = async () => {
    if (!user) return;
    try { setRemainingUses(await UsageService.getRemainingUses(user.id, 'stock_analyzer')); }
    catch (e) { console.error(e); }
  };

  const handleAnalyze = async () => {
    if (!stock.trim()) { setError('Please enter a stock symbol.'); return; }
    if (!user) { setError('Please log in to use this feature.'); return; }
    const hasAccess = await UsageService.canUseFeature(user.id, 'stock_analyzer');
    if (!hasAccess) { setError('Free uses exhausted. Upgrade to continue.'); return; }

    setError('');
    setLoading(true);
    setReport(null);

    try {
      // API: POST /api/analyzer/stock
      const result = await analyzeStock({ symbol: stock.trim().toUpperCase() });
      setReport(result);

      const hasPaid = await UsageService.hasPaidSubscription(user.id);
      if (!hasPaid) {
        await UsageService.incrementUsage(user.id, 'stock_analyzer');
        await loadUsageInfo();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to analyse stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!stock.trim()) { setError('Please enter a stock symbol.'); return; }
    if (!user) { setError('Please log in to export.'); return; }

    setError('');
    setExportingPdf(true);

    try {
      // API: POST /api/analyzer/stock/export-pdf — uses cached report when available
      const blob = await exportStockAnalysisPdf({
        symbol: stock.trim().toUpperCase(),
        userEmail: user.email,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PortIQ-Stock-Report-${stock.trim().toUpperCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Failed to export PDF. Run Analyse first, then try again.');
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
              <LineChart className="w-[18px] h-[18px] text-[#C9A84C]" />
            </div>
            <h1 className="display-md text-[#F0EEE8]">Stock Analyzer</h1>
            {remainingUses !== null && remainingUses !== Infinity && (
              <span className="label-tag ml-2">{remainingUses} left</span>
            )}
          </div>
          <p className="text-[#9298B0] text-sm ml-12">Deep-dive into any stock — fundamentals, sentiment, and key metrics.</p>
        </div>

        <div className="grid lg:grid-cols-[minmax(280px,360px)_1fr] gap-5 items-start">

          {/* Left — input card (largely unchanged) */}
          <div className="glass-card p-6 sm:p-7 flex flex-col lg:sticky lg:top-6">
            <h2 className="heading-sm text-[#F0EEE8] mb-1">Stock Symbol</h2>
            <p className="text-[#9298B0] text-xs mb-5">Enter any NSE, BSE, or international ticker</p>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4E65]" />
              <input
                type="text"
                value={stock}
                onChange={e => { setStock(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleAnalyze(); }}
                placeholder="e.g. RELIANCE, AAPL, TCS…"
                className="premium-input pl-10 w-full"
              />
            </div>

            <div className="mb-5">
              <p className="text-[#4A4E65] text-xs mb-2 uppercase tracking-widest">Popular</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map(sym => (
                  <button key={sym} onClick={() => { setStock(sym); setError(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${stock === sym ? 'text-[#C9A84C]' : 'text-[#4A4E65] hover:text-[#9298B0]'}`}
                    style={{
                      background: stock === sym ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                      border: stock === sym ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl p-4 flex items-start gap-3"
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
              <div className="mb-4 rounded-xl p-5 flex items-start gap-3"
                style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.25)' }}>
                <Crown className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#F0EEE8] font-semibold text-sm mb-1">Free analyses exhausted</p>
                  <p className="text-[#9298B0] text-xs mb-3">Upgrade for unlimited stock analysis.</p>
                  <button onClick={() => navigate('/dashboard/settings?tab=subscription')} className="btn-gold text-xs px-4 py-2 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" /> Upgrade Now
                  </button>
                </div>
              </div>
            )}

            <button onClick={handleAnalyze}
              disabled={loading || !stock.trim() || limitExhausted}
              className="btn-gold w-full flex items-center justify-center gap-2 py-3.5">
              {loading ? (
                <><span className="loader-gold scale-75" />Analysing {stock}…</>
              ) : (
                <><LineChart className="w-4 h-4" />Analyse Stock</>
              )}
            </button>
          </div>

          {/* Right — structured report */}
          <div className="min-w-0">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="heading-sm text-[#F0EEE8]">Analysis Report</h2>
                <p className="text-[#9298B0] text-xs">Structured equity report with AI synthesis</p>
              </div>
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf || !stock.trim()}
                className="btn-gold text-sm px-4 py-2.5 flex items-center gap-2 shrink-0"
                title="Export report as PDF"
              >
                {exportingPdf ? (
                  <><span className="loader-gold scale-75" />Exporting…</>
                ) : (
                  <><Download className="w-4 h-4" />Export PDF</>
                )}
              </button>
            </div>
            {loading && <StockReportSkeleton />}
            {!loading && !report && <div className="glass-card"><StockReportEmpty /></div>}
            {!loading && report && <StockAnalysisReport report={report} />}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
