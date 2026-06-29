import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AlertCircle, BarChart3, Crown, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UsageService } from '../lib/usageService';
import { usePortfolioStore } from '../stores/portfolioStore';
import { computePortfolioSummary } from '../lib/portfolioMetrics';
import { analyzePortfolio, exportPortfolioPdf } from '../lib/portfolioApi';
import type { PortfolioAnalysisResponse } from '../types/portfolio';
import { PortfolioSummaryCards } from '../components/portfolio/PortfolioSummaryCards';
import { AddHoldingForm } from '../components/portfolio/AddHoldingForm';
import { HoldingsTable } from '../components/portfolio/HoldingsTable';
import { PortfolioAnalysisPanel } from '../components/portfolio/PortfolioAnalysisPanel';

export function PortfolioMonitor() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const holdings = usePortfolioStore(s => s.holdings);
  const loadFromBackend = usePortfolioStore(s => s.loadFromBackend);
  const refreshPrices = usePortfolioStore(s => s.refreshPrices);
  const syncError = usePortfolioStore(s => s.syncError);

  const [analyzing, setAnalyzing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [analysis, setAnalysis] = useState<PortfolioAnalysisResponse | null>(null);
  const [error, setError] = useState('');
  const [remainingUses, setRemainingUses] = useState<number | null>(null);

  const summary = computePortfolioSummary(holdings);

  const loadUsageInfo = useCallback(async () => {
    if (!user) return;
    try {
      setRemainingUses(await UsageService.getRemainingUses(user.id, 'portfolio_monitor'));
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => { if (user) loadUsageInfo(); }, [user, loadUsageInfo]);

  useEffect(() => {
    loadFromBackend().then(() => refreshPrices(true));
  }, [loadFromBackend, refreshPrices]);

  useEffect(() => {
    if (holdings.length === 0) return;
    const interval = setInterval(() => refreshPrices(false), 30_000);
    return () => clearInterval(interval);
  }, [holdings.length, refreshPrices]);

  const handleAnalyze = async () => {
    if (holdings.length === 0) { setError('Please add at least one holding.'); return; }
    if (!user) { setError('Please log in to use this feature.'); return; }

    const hasAccess = await UsageService.canUseFeature(user.id, 'portfolio_monitor');
    if (!hasAccess) { setError('Free uses exhausted. Upgrade to continue.'); return; }

    setError('');
    setAnalyzing(true);
    setAnalysis(null);

    try {
      // API: POST /api/portfolio/analyze
      const result = await analyzePortfolio(holdings);
      setAnalysis(result);

      const hasPaid = await UsageService.hasPaidSubscription(user.id);
      if (!hasPaid) {
        await UsageService.incrementUsage(user.id, 'portfolio_monitor');
        await loadUsageInfo();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to analyse portfolio. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportPdf = async () => {
    if (holdings.length === 0) { setError('Please add at least one holding.'); return; }
    if (!user) { setError('Please log in to export.'); return; }

    setError('');
    setExportingPdf(true);

    try {
      // API: POST /api/portfolio/analyze/export-pdf — uses cached analysis when available
      const blob = await exportPortfolioPdf(holdings, user.email);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PortIQ-Portfolio-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
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

        {/* Page header */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <BarChart3 className="w-[18px] h-[18px] text-[#C9A84C]" />
            </div>
            <h1 className="display-md text-[#F0EEE8]">Portfolio Monitor</h1>
            {remainingUses !== null && remainingUses !== Infinity && (
              <span className="label-tag ml-2">{remainingUses} left</span>
            )}
          </div>
          <p className="text-[#9298B0] text-sm ml-12">Track holdings with live prices and AI-powered portfolio analysis.</p>
        </div>

        {/* Summary metrics */}
        <PortfolioSummaryCards summary={summary} />

        {syncError && (
          <div className="mb-4 rounded-xl px-4 py-2 text-xs text-[#9298B0]"
            style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
            {syncError}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">

          {/* ── Holdings Panel ─────────────────────────────────────── */}
          <div className="glass-card p-6 sm:p-7 flex flex-col min-h-[520px]">
            <h2 className="heading-sm text-[#F0EEE8] mb-1">Your Portfolio</h2>
            <p className="text-[#9298B0] text-xs mb-4">Add holdings with quantity and cost basis</p>

            <AddHoldingForm />
            <HoldingsTable holdings={holdings} />

            {error && (
              <div className="mt-4 rounded-xl p-4 flex items-start gap-3"
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
              <div className="mt-4 rounded-xl p-5 flex items-start gap-3"
                style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.25)' }}>
                <Crown className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#F0EEE8] font-semibold text-sm mb-1">Free analyses exhausted</p>
                  <p className="text-[#9298B0] text-xs mb-3">Upgrade for unlimited portfolio analysis.</p>
                  <button onClick={() => navigate('/dashboard/settings?tab=subscription')} className="btn-gold text-xs px-4 py-2 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" /> Upgrade Now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Analysis Panel ───────────────────────────────────── */}
          <div className="glass-card p-6 sm:p-7 flex flex-col min-h-[520px]">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="heading-sm text-[#F0EEE8] mb-1">Analysis Results</h2>
                <p className="text-[#9298B0] text-xs">AI-generated portfolio insights</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportPdf}
                  disabled={exportingPdf || holdings.length === 0}
                  className="btn-gold text-sm px-4 py-2.5 flex items-center gap-2"
                  title="Export analysis as PDF"
                >
                  {exportingPdf ? (
                    <><span className="loader-gold scale-75" />Exporting…</>
                  ) : (
                    <><Download className="w-4 h-4" />Export PDF</>
                  )}
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || holdings.length === 0 || limitExhausted}
                  className="btn-gold text-sm px-4 py-2.5 flex items-center gap-2"
                >
                  {analyzing ? (
                    <><span className="loader-gold scale-75" />Analysing…</>
                  ) : (
                    <><BarChart3 className="w-4 h-4" />Analyse</>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 rounded-xl overflow-auto" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <PortfolioAnalysisPanel analysis={analysis} loading={analyzing} />
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
