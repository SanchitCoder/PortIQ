import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AlertCircle, Calculator, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UsageService } from '../lib/usageService';
import ReactMarkdown from 'react-markdown';

export function StockAnalyzer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stock, setStock] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [remainingUses, setRemainingUses] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      loadUsageInfo();
    }
  }, [user]);

  const loadUsageInfo = async () => {
    if (!user) return;
    try {
      const remaining = await UsageService.getRemainingUses(user.id, 'stock_analyzer');
      console.log('Loaded remaining uses:', remaining);
      setRemainingUses(remaining);
    } catch (error) {
      console.error('Error loading usage info:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!stock.trim()) {
      setError('Please enter a stock symbol');
      return;
    }

    if (!user) {
      setError('Please log in to use this feature');
      return;
    }

    // Check usage limit
    const hasAccess = await UsageService.canUseFeature(user.id, 'stock_analyzer');
    if (!hasAccess) {
      setError('You have reached your usage limit for Stock Analyzer. Please upgrade to continue.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('https://n8n.srv981435.hstgr.cloud/webhook/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock: stock.trim().toUpperCase(),
        }),
      });

      // Check if response is successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract text content from the response
      let textContent = '';
      if (typeof data === 'string') {
        textContent = data;
      } else if (typeof data === 'object' && data !== null) {
        // Extract all string values from the object
        const extractText = (obj: any): string => {
          if (typeof obj === 'string') {
            return obj;
          } else if (Array.isArray(obj)) {
            return obj.map(item => extractText(item)).join('\n\n');
          } else if (obj !== null && typeof obj === 'object') {
            return Object.values(obj).map(value => extractText(value)).join('\n\n');
          }
          return '';
        };
        textContent = extractText(data);
      }
      
      const finalContent = textContent.trim() || JSON.stringify(data, null, 2);
      
      // Only update result and increment usage if we have valid content from n8n
      if (finalContent) {
        setResult(finalContent);
        
        // Increment usage ONLY after n8n successfully delivers output (for free users only)
        const hasPaid = await UsageService.hasPaidSubscription(user.id);
        if (!hasPaid) {
          console.log('Incrementing usage for free user...');
          const success = await UsageService.incrementUsage(user.id, 'stock_analyzer');
          console.log('Usage increment result:', success);
          
          if (success) {
            // Wait a bit for database write to complete
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Force refresh by fetching current usage and calculating remaining
            const currentUsage = await UsageService.getUsageCount(user.id, 'stock_analyzer');
            const limit = 2; // FREE_PLAN_LIMITS.stock_analyzer
            const newRemaining = Math.max(0, limit - currentUsage);
            
            console.log(`Usage updated - Used: ${currentUsage}, Limit: ${limit}, Remaining: ${newRemaining}`);
            setRemainingUses(newRemaining);
            
            // Also reload via loadUsageInfo to ensure consistency
            setTimeout(() => {
              loadUsageInfo();
            }, 500);
          } else {
            console.error('Failed to increment usage');
          }
        } else {
          console.log('User has paid subscription, skipping usage increment');
        }
      } else {
        throw new Error('No content received from n8n');
      }
    } catch (err) {
      console.error('Error analyzing stock:', err);
      setError('Failed to analyze stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Section - Stock Analyzer */}
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 flex flex-col relative overflow-hidden group animate-fade-in-up"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"></div>
            <div className="mb-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  Stock Analyzer
                </h1>
                {remainingUses !== null && remainingUses !== Infinity && (
                  <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-lg">
                    <span className="text-sm text-gray-300">
                      {remainingUses} {remainingUses === 1 ? 'use' : 'uses'} left (one-time)
                    </span>
                  </div>
                )}
              </div>
              <p className="text-gray-400">Deep dive into individual stock analysis</p>
            </div>

            <div className="mb-6 relative z-10">
              <p className="text-white font-medium mb-4">Enter stock symbol to analyze</p>
              
              <input
                type="text"
                value={stock}
                onChange={(e) => {
                  setStock(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="Add stock symbol..."
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent uppercase mb-4"
              />

              {error && (
                <div className="mb-4 bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 text-sm">{error}</p>
                    {error.includes('usage limit') && (
                      <button
                        onClick={() => navigate('/dashboard/settings?tab=subscription')}
                        className="mt-2 flex items-center gap-2 text-sm text-white bg-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Crown className="w-4 h-4" />
                        Upgrade Plan
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Upgrade prompt when no uses remaining */}
              {remainingUses !== null && remainingUses === 0 && (
                <div className="mb-4 bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                  <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-400 font-semibold mb-1">You've used all your free analyses!</p>
                    <p className="text-yellow-300 text-sm mb-3">Upgrade to a paid plan to continue using Stock Analyzer with unlimited access.</p>
                    <button
                      onClick={() => navigate('/dashboard/settings?tab=subscription')}
                      className="flex items-center gap-2 text-sm text-white bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      <Crown className="w-4 h-4" />
                      Upgrade Now
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !stock.trim() || (remainingUses !== null && remainingUses === 0)}
              className="mt-auto bg-black text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative z-10"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Analyzing...
                </>
              ) : (
                'Analyze Stock'
              )}
            </button>
          </div>

          {/* Right Section - Analysis Results */}
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 flex flex-col relative overflow-hidden group animate-fade-in-up animation-delay-200"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Analysis Results</h2>
              <p className="text-gray-400">Generated analysis and insights</p>
            </div>

            <div className="flex-1 bg-black border border-gray-700 rounded-lg p-8 min-h-[400px] overflow-auto">
              {!result ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Calculator className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-center">
                    Enter your criteria and click generate to see results
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
                      <ReactMarkdown>
                        {result}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
