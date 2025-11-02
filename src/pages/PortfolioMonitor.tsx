import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AlertCircle, Trash2, Plus, Calculator, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UsageService } from '../lib/usageService';
import ReactMarkdown from 'react-markdown';

export function PortfolioMonitor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
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
      const remaining = await UsageService.getRemainingUses(user.id, 'portfolio_monitor');
      console.log('Loaded remaining uses:', remaining);
      setRemainingUses(remaining);
    } catch (error) {
      console.error('Error loading usage info:', error);
    }
  };

  const handleAddStock = () => {
    const stockSymbol = inputValue.trim().toUpperCase();
    if (!stockSymbol) return;
    
    // Check if stock already exists
    if (stocks.includes(stockSymbol)) {
      setError('This stock is already in your list');
      return;
    }

    setError('');
    setStocks([...stocks, stockSymbol]);
    setInputValue('');
  };

  const handleDeleteStock = (index: number) => {
    setStocks(stocks.filter((_, i) => i !== index));
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddStock();
    }
  };

  const handleAnalyze = async () => {
    if (stocks.length === 0) {
      setError('Please add at least one stock');
      return;
    }

    if (!user) {
      setError('Please log in to use this feature');
      return;
    }

    // Check usage limit
    const hasAccess = await UsageService.canUseFeature(user.id, 'portfolio_monitor');
    if (!hasAccess) {
      setError('You have reached your usage limit for Portfolio Monitor. Please upgrade to continue.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('https://n8n.srv981435.hstgr.cloud/webhook/portfolio-manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: stocks,
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
          const success = await UsageService.incrementUsage(user.id, 'portfolio_monitor');
          console.log('Usage increment result:', success);
          
          if (success) {
            // Wait a bit for database write to complete
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Force refresh by fetching current usage and calculating remaining
            const currentUsage = await UsageService.getUsageCount(user.id, 'portfolio_monitor');
            const limit = 3; // FREE_PLAN_LIMITS.portfolio_monitor
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
      console.error('Error analyzing portfolio:', err);
      setError('Failed to analyze portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Section - Portfolio Monitoring */}
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col relative overflow-hidden group animate-fade-in-up"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"></div>
            <div className="mb-4 sm:mb-6 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  Portfolio Monitoring
                </h1>
                {remainingUses !== null && remainingUses !== Infinity && (
                  <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-lg">
                    <span className="text-xs sm:text-sm text-gray-300">
                      {remainingUses} {remainingUses === 1 ? 'use' : 'uses'} left (one-time)
                    </span>
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-sm sm:text-base">Monitor your portfolio</p>
            </div>

            <div className="mb-6 relative z-10">
              <p className="text-white font-medium mb-4">Add stocks available in your portfolio</p>
              
              {/* Input field with Add button */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value.toUpperCase());
                    setError('');
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Add stock symbol..."
                  className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent uppercase"
                />
                <button
                  onClick={handleAddStock}
                  disabled={!inputValue.trim()}
                  className="bg-gray-800 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add stock"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Stock list */}
              {stocks.length > 0 && (
                <div className="bg-black border border-gray-700 rounded-lg p-3 mb-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {stocks.map((stock, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors group"
                      >
                        <span className="text-white font-medium">{stock}</span>
                        <button
                          onClick={() => handleDeleteStock(index)}
                          className="text-gray-400 hover:text-red-400 transition-colors p-1"
                          title="Remove stock"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                    <p className="text-yellow-300 text-sm mb-3">Upgrade to a paid plan to continue using Portfolio Monitor with unlimited access.</p>
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
              disabled={loading || stocks.length === 0 || (remainingUses !== null && remainingUses === 0)}
              className="group relative mt-auto bg-black text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden transform hover:scale-105 hover:shadow-2xl hover:shadow-white/20 z-10"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
                    Monitor Portfolio
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Right Section - Analysis Results */}
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col relative overflow-hidden group animate-fade-in-up animation-delay-200"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <div className="mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Analysis Results</h2>
              <p className="text-gray-400 text-sm sm:text-base">Generated analysis and insights</p>
            </div>

            <div className="flex-1 bg-black border border-gray-700 rounded-lg p-4 sm:p-6 md:p-8 min-h-[300px] sm:min-h-[400px] overflow-auto">
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
