import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { User, Crown, AlertCircle, Check, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PaymentService } from '../lib/paymentService';
import { UsageService } from '../lib/usageService';

type SettingsSection = 'profile' | 'subscription';

export function Settings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displaySection, setDisplaySection] = useState<SettingsSection>('profile');
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'subscription') {
      handleSectionChange('subscription');
    }
  }, [searchParams]);

  const handleSectionChange = (section: SettingsSection) => {
    if (section === activeSection || isTransitioning) return;
    
    setIsTransitioning(true);
    setActiveSection(section);
    
    // Update displaySection to trigger fade transition
    // Small delay to ensure state updates are processed
    setTimeout(() => {
      setDisplaySection(section);
      
      // Allow next transition after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 550); // Match duration-500 + buffer
    }, 10);
  };
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [timezone, setTimezone] = useState('UTC-5 (Eastern Time)');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentPlan, setCurrentPlan] = useState<'free' | 'monthly' | 'quarterly' | 'yearly'>('free');
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      loadProfile();
      loadSubscription();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (data && data.full_name) {
      // Split full name into first and last name
      const nameParts = data.full_name.split(' ');
      if (nameParts.length > 0) {
        setFirstName(nameParts[0]);
        setLastName(nameParts.slice(1).join(' ') || '');
      }
    }
  };

  const loadSubscription = async () => {
    if (!user) return;

    try {
      const subscription = await PaymentService.getUserSubscription(user.id);
      if (subscription) {
        setCurrentPlan(subscription.plan_id as 'monthly' | 'quarterly' | 'yearly');
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!user) return;

    const fullName = `${firstName} ${lastName}`.trim();

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setLoading(false);
  };

  const handleSelectPlan = async (planId: 'monthly' | 'quarterly' | 'yearly') => {
    if (!user) {
      setError('Please log in to subscribe');
      return;
    }

    // If same plan is selected, do nothing
    if (currentPlan === planId) {
      return;
    }

    setProcessingPayment(planId);
    setError('');
    setSuccess(false);

    try {
      const userName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';
      const result = await PaymentService.processPayment(
        planId,
        user.id,
        user.email || '',
        userName
      );

      if (result.success) {
        setSuccess(true);
        setCurrentPlan(planId);
        setError('');
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        setError(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const timezones = [
    'UTC-5 (Eastern Time)',
    'UTC-6 (Central Time)',
    'UTC-7 (Mountain Time)',
    'UTC-8 (Pacific Time)',
    'UTC-0 (GMT)',
    'UTC+1 (CET)',
    'UTC+5:30 (IST)',
  ];

  // Usage Stats Component
  function UsageStatsDisplay({ userId }: { userId: string }) {
    const [usageStats, setUsageStats] = useState<{
      portfolio_monitor: { used: number; limit: number; remaining: number };
      stock_analyzer: { used: number; limit: number; remaining: number };
      alphaedge_evaluator: { used: number; limit: number; remaining: number };
    } | null>(null);

    useEffect(() => {
      loadUsageStats();
    }, [userId]);

    const loadUsageStats = async () => {
      const stats = await UsageService.getAllUsageStats(userId);
      setUsageStats(stats);
    };

    if (!usageStats) return null;

    return (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8 mb-6">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Usage Limits</h2>
          <p className="text-gray-400 text-sm sm:text-base">One-time usage for free plan (upgrade for unlimited access)</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-black border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Portfolio Monitor</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-white">{usageStats.portfolio_monitor.used}</span>
              <span className="text-gray-500">/ {usageStats.portfolio_monitor.limit}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (usageStats.portfolio_monitor.used / usageStats.portfolio_monitor.limit) * 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {usageStats.portfolio_monitor.remaining} remaining
            </p>
          </div>

          <div className="bg-black border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Stock Analyzer</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-white">{usageStats.stock_analyzer.used}</span>
              <span className="text-gray-500">/ {usageStats.stock_analyzer.limit}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (usageStats.stock_analyzer.used / usageStats.stock_analyzer.limit) * 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {usageStats.stock_analyzer.remaining} remaining
            </p>
          </div>

          <div className="bg-black border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">AlphaEdge Evaluator</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-white">{usageStats.alphaedge_evaluator.used}</span>
              <span className="text-gray-500">/ {usageStats.alphaedge_evaluator.limit}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (usageStats.alphaedge_evaluator.used / usageStats.alphaedge_evaluator.limit) * 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {usageStats.alphaedge_evaluator.remaining} remaining
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400 text-sm sm:text-base">Customize your application settings</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Sidebar - Settings Navigation */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 relative overflow-hidden group animate-fade-in-up"
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <h2 className="text-lg font-semibold text-white mb-4 px-2 relative z-10 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Settings
              </h2>
              <nav className="space-y-1">
                <button
                  onClick={() => handleSectionChange('profile')}
                  className={`group/nav w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 relative overflow-hidden transform hover:scale-105 ${
                    activeSection === 'profile'
                      ? 'bg-gray-800 text-white shadow-lg'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300"></div>
                  <User className={`w-5 h-5 relative z-10 transition-transform duration-300 ${activeSection === 'profile' ? 'transform rotate-6' : ''} group-hover/nav:rotate-12`} />
                  <span className="font-medium relative z-10">Profile</span>
                  {activeSection === 'profile' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full"></div>
                  )}
                </button>
                <button
                  onClick={() => handleSectionChange('subscription')}
                  className={`group/nav w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 relative overflow-hidden transform hover:scale-105 ${
                    activeSection === 'subscription'
                      ? 'bg-gray-800 text-white shadow-lg'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300"></div>
                  <Crown className={`w-5 h-5 relative z-10 transition-transform duration-300 ${activeSection === 'subscription' ? 'transform rotate-6' : ''} group-hover/nav:rotate-12`} />
                  <span className="font-medium relative z-10">Subscription</span>
                  {activeSection === 'subscription' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full"></div>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-9 relative">
            {/* Profile Section */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                displaySection === 'profile'
                  ? 'opacity-100 translate-x-0 scale-100 rotate-y-0 pointer-events-auto relative z-10'
                  : 'opacity-0 -translate-x-8 scale-95 -rotate-y-6 pointer-events-none absolute inset-0 z-0 blur-sm'
              }`}
              style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px',
              }}
            >
              <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden group animate-fade-in-up"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                <div className="mb-4 sm:mb-6 relative z-10">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                    Profile Information
                  </h2>
                  <p className="text-gray-400 text-sm sm:text-base">Update your personal information</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4 sm:space-y-6">
                  {/* First Name and Last Name in two columns */}
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-300 hover:border-gray-600 focus:scale-[1.02]"
                        placeholder="John"
                      />
                    </div>
                    <div className="animate-fade-in-up animation-delay-200">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-300 hover:border-gray-600 focus:scale-[1.02]"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white cursor-not-allowed"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Email cannot be changed here. Contact support if needed.
                    </p>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Timezone
                    </label>
                    <div className="relative">
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent appearance-none cursor-pointer"
                      >
                        {timezones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-green-400 text-sm">Profile updated successfully!</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-black text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </div>

            {/* Subscription Section */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                displaySection === 'subscription'
                  ? 'opacity-100 translate-x-0 scale-100 rotate-y-0 pointer-events-auto relative z-10'
                  : 'opacity-0 translate-x-8 scale-95 rotate-y-6 pointer-events-none absolute inset-0 z-0 blur-sm'
              }`}
              style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px',
              }}
            >
              <div className="space-y-6 animate-fade-in-up">
                  {/* Current Plan Section */}
                  <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8 mb-6 relative overflow-hidden group"
                    style={{
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                  <div className="mb-4 sm:mb-6 relative z-10">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                      Current Plan
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-base">Your active subscription details</p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-black border border-gray-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Crown className="w-6 h-6 text-gray-300" />
                          <h3 className="text-xl font-bold text-white">
                            {currentPlan === 'free' && 'Free Trial'}
                            {currentPlan === 'monthly' && 'Monthly Plan'}
                            {currentPlan === 'quarterly' && 'Quarterly Plan'}
                            {currentPlan === 'yearly' && 'Yearly Plan'}
                          </h3>
                        </div>
                        {currentPlan === 'free' && (
                          <p className="text-gray-400 text-sm">Limited access to features</p>
                        )}
                        {(currentPlan === 'monthly' || currentPlan === 'quarterly' || currentPlan === 'yearly') && (
                          <p className="text-gray-400 text-sm">Full access to all features</p>
                        )}
                      </div>
                      <div className="text-right">
                        {currentPlan === 'free' && (
                          <div>
                            <span className="text-3xl font-bold text-white">$0</span>
                            <span className="text-gray-400">/month</span>
                          </div>
                        )}
                        {currentPlan === 'monthly' && (
                          <div>
                            <span className="text-3xl font-bold text-white">₹499</span>
                            <span className="text-gray-400">/month</span>
                          </div>
                        )}
                        {currentPlan === 'quarterly' && (
                          <div>
                            <span className="text-3xl font-bold text-white">₹1,299</span>
                            <span className="text-gray-400">/3 months</span>
                          </div>
                        )}
                        {currentPlan === 'yearly' && (
                          <div>
                            <span className="text-3xl font-bold text-white">₹4,999</span>
                            <span className="text-gray-400">/year</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {currentPlan !== 'free' && (
                      <div className="pt-4 border-t border-gray-700">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Next Billing Date</span>
                            <p className="text-white font-medium mt-1">
                              {currentPlan === 'monthly' && 'Next month'}
                              {currentPlan === 'quarterly' && 'In 3 months'}
                              {currentPlan === 'yearly' && 'Next year'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Status</span>
                            <p className="text-green-400 font-medium mt-1">Active</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Usage Stats Section (for free users) */}
                {currentPlan === 'free' && user && (
                  <UsageStatsDisplay userId={user.id} />
                )}

                {/* Available Plans Section */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8">
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Available Plans</h2>
                    <p className="text-gray-400 text-sm sm:text-base">Choose a plan that fits your investment strategy</p>
                  </div>

                  {error && (
                    <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="mb-6 bg-green-900/20 border border-green-800 rounded-lg p-4 flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-green-400 text-sm">Subscription activated successfully!</p>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Monthly Plan */}
                    <div className={`bg-gradient-to-br from-gray-900 to-black p-4 sm:p-6 rounded-xl border ${
                      currentPlan === 'monthly' ? 'border-gray-600' : 'border-gray-800'
                    } ${currentPlan === 'monthly' ? 'ring-2 ring-gray-600' : ''}`}>
                      {currentPlan === 'monthly' && (
                        <div className="mb-4">
                          <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            CURRENT PLAN
                          </span>
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-white mb-2">Monthly</h3>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-white">₹499</span>
                        <span className="text-gray-400">/month</span>
                      </div>
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">Unlimited portfolio tracking</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">AI stock analysis</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">AlphaEdge evaluations</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">Real-time insights</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => handleSelectPlan('monthly')}
                        disabled={currentPlan === 'monthly' || processingPayment !== null}
                        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                          currentPlan === 'monthly'
                            ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-800 text-white hover:bg-gray-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {processingPayment === 'monthly' ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            Processing...
                          </span>
                        ) : currentPlan === 'monthly' ? (
                          'Current Plan'
                        ) : (
                          'Select Plan'
                        )}
                      </button>
                    </div>

                    {/* Quarterly Plan */}
                    <div className={`bg-gradient-to-br from-gray-800 to-black p-6 rounded-xl border-2 relative ${
                      currentPlan === 'quarterly' ? 'border-gray-600' : 'border-gray-600'
                    } ${currentPlan === 'quarterly' ? 'ring-2 ring-gray-600' : ''}`}>
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-semibold">
                          POPULAR
                        </span>
                      </div>
                      {currentPlan === 'quarterly' && (
                        <div className="mb-4 mt-2">
                          <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            CURRENT PLAN
                          </span>
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-white mb-2">Quarterly</h3>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-white">₹1,299</span>
                        <span className="text-gray-400">/3 months</span>
                      </div>
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">Unlimited portfolio tracking</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">AI stock analysis</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">AlphaEdge evaluations</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">Real-time insights</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
                          <span className="text-white font-semibold text-sm">Save 13%</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => handleSelectPlan('quarterly')}
                        disabled={currentPlan === 'quarterly' || processingPayment !== null}
                        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                          currentPlan === 'quarterly'
                            ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-black hover:bg-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {processingPayment === 'quarterly' ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                            Processing...
                          </span>
                        ) : currentPlan === 'quarterly' ? (
                          'Current Plan'
                        ) : (
                          'Select Plan'
                        )}
                      </button>
                    </div>

                    {/* Yearly Plan */}
                    <div className={`bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border ${
                      currentPlan === 'yearly' ? 'border-gray-600' : 'border-gray-800'
                    } ${currentPlan === 'yearly' ? 'ring-2 ring-gray-600' : ''}`}>
                      {currentPlan === 'yearly' && (
                        <div className="mb-4">
                          <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            CURRENT PLAN
                          </span>
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-white mb-2">Yearly</h3>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-white">₹4,999</span>
                        <span className="text-gray-400">/year</span>
                      </div>
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">Unlimited portfolio tracking</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">AI stock analysis</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">AlphaEdge evaluations</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">Real-time insights</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
                          <span className="text-white font-semibold text-sm">Save 17%</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => handleSelectPlan('yearly')}
                        disabled={currentPlan === 'yearly' || processingPayment !== null}
                        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                          currentPlan === 'yearly'
                            ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-800 text-white hover:bg-gray-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {processingPayment === 'yearly' ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            Processing...
                          </span>
                        ) : currentPlan === 'yearly' ? (
                          'Current Plan'
                        ) : (
                          'Select Plan'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
