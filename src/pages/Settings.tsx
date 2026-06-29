import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { User, Crown, AlertCircle, Check, ChevronDown, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PaymentService } from '../lib/paymentService';
import { UsageService } from '../lib/usageService';

type Section = 'profile' | 'subscription';

/* ── Usage Stats Sub-component ──────────────────────────────────────── */
function UsageStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState<{
    portfolio_monitor: { used: number; limit: number; remaining: number };
    stock_analyzer: { used: number; limit: number; remaining: number };
    alphaedge_evaluator: { used: number; limit: number; remaining: number };
  } | null>(null);

  useEffect(() => {
    UsageService.getAllUsageStats(userId).then(setStats);
  }, [userId]);

  if (!stats) return null;

  const items = [
    { key: 'portfolio_monitor', label: 'Portfolio Monitor', data: stats.portfolio_monitor },
    { key: 'stock_analyzer',    label: 'Stock Analyzer',    data: stats.stock_analyzer },
    { key: 'alphaedge_evaluator', label: 'AlphaEdge Evaluator', data: stats.alphaedge_evaluator },
  ];

  return (
    <div className="glass-card p-6 sm:p-7 mb-5">
      <h3 className="heading-sm text-[#F0EEE8] mb-1">Free Tier Usage</h3>
      <p className="text-[#9298B0] text-xs mb-5">One-time allocation — upgrade for unlimited access</p>
      <div className="grid sm:grid-cols-3 gap-4">
        {items.map(({ key, label, data }) => {
          const pct = data.limit === Infinity ? 0 : Math.min(100, (data.used / data.limit) * 100);
          return (
            <div key={key} className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[#4A4E65] text-xs mb-3 uppercase tracking-widest leading-tight">{label}</p>
              <div className="flex items-baseline justify-between mb-2.5">
                <span className="number-display text-xl text-[#F0EEE8]">{data.used}</span>
                <span className="text-[#4A4E65] text-xs">/ {data.limit === Infinity ? '∞' : data.limit}</span>
              </div>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct >= 100 ? '#ef4444' : 'linear-gradient(90deg, #C9A84C, #E8C96B)' }} />
              </div>
              <p className="text-[#4A4E65] text-xs mt-2">
                {data.remaining === Infinity ? 'Unlimited' : `${data.remaining} remaining`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export function Settings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [section, setSection]     = useState<Section>('profile');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [timezone, setTimezone]   = useState('UTC+5:30 (IST)');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');
  const [currentPlan, setCurrentPlan] = useState<'free' | 'monthly' | 'quarterly' | 'yearly'>('free');

  useEffect(() => {
    if (searchParams.get('tab') === 'subscription') setSection('subscription');
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    // Load profile from localStorage
    try {
      const stored = localStorage.getItem(`portiq_profile_${user.id}`);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.full_name) {
          const parts = data.full_name.split(' ');
          setFirstName(parts[0]);
          setLastName(parts.slice(1).join(' ') || '');
        }
      }
    } catch { /* ignore */ }
    // Load subscription
    PaymentService.getUserSubscription(user.id).then(sub => {
      if (sub) setCurrentPlan(sub.plan_id as any);
    });
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(''); setSuccess(false); setLoading(true);
    const fullName = `${firstName} ${lastName}`.trim();
    localStorage.setItem(`portiq_profile_${user.id}`, JSON.stringify({ full_name: fullName }));
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setLoading(false);
  };

  const handleSelectPlan = async (_planId: 'monthly' | 'quarterly' | 'yearly') => {
    setError('Payments integration coming soon. Supabase will be connected shortly.');
  };

  const TIMEZONES = ['UTC+5:30 (IST)', 'UTC+0 (GMT)', 'UTC-5 (ET)', 'UTC-6 (CT)', 'UTC-8 (PT)', 'UTC+1 (CET)', 'UTC+9 (JST)'];

  const planLabel: Record<string, string> = {
    free: 'Free Trial', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
  };
  const planPrice: Record<string, string> = {
    free: '₹0', monthly: '₹499', quarterly: '₹1,299', yearly: '₹4,999',
  };
  const planPer: Record<string, string> = {
    free: '', monthly: '/month', quarterly: '/3 months', yearly: '/year',
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto animate-fade-in-up">

        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <SettingsIcon className="w-[18px] h-[18px] text-[#C9A84C]" />
            </div>
            <h1 className="display-md text-[#F0EEE8]">Settings</h1>
          </div>
          <p className="text-[#9298B0] text-sm ml-12">Manage your profile and subscription.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-5">

          {/* Sidebar nav */}
          <div className="lg:col-span-3">
            <div className="glass-card p-3">
              {(['profile', 'subscription'] as Section[]).map(s => (
                <button key={s} onClick={() => setSection(s)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 capitalize ${section === s ? 'text-[#C9A84C]' : 'text-[#4A4E65] hover:text-[#9298B0]'}`}
                  style={{
                    background: section === s ? 'rgba(201,168,76,0.08)' : undefined,
                    border: section === s ? '1px solid rgba(201,168,76,0.15)' : '1px solid transparent',
                  }}>
                  {s === 'profile' ? <User className="w-4 h-4 shrink-0" /> : <Crown className="w-4 h-4 shrink-0" />}
                  {s === 'profile' ? 'Profile' : 'Subscription'}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-9">

            {/* ── Profile ─────────────────────────────────────────── */}
            {section === 'profile' && (
              <div className="glass-card p-6 sm:p-8 animate-fade-in-up">
                <h2 className="heading-sm text-[#F0EEE8] mb-1">Profile Information</h2>
                <p className="text-[#9298B0] text-xs mb-6">Update your personal details</p>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">First Name</label>
                      <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                        placeholder="John" className="premium-input" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Last Name</label>
                      <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                        placeholder="Doe" className="premium-input" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Email Address</label>
                    <input type="email" value={email} disabled
                      className="premium-input opacity-50 cursor-not-allowed" />
                    <p className="text-[#4A4E65] text-xs mt-1.5">Email cannot be changed here.</p>
                  </div>

                  <div>
                    <label className="block text-xs text-[#9298B0] mb-2 uppercase tracking-widest">Timezone</label>
                    <div className="relative">
                      <select value={timezone} onChange={e => setTimezone(e.target.value)} className="premium-input appearance-none pr-9">
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4E65] pointer-events-none" />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl p-4 flex items-start gap-3"
                      style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="rounded-xl p-4 flex items-center gap-3"
                      style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)' }}>
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-emerald-400 text-sm">Profile updated successfully.</p>
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="btn-gold flex items-center gap-2 px-6 py-2.5 text-sm">
                    {loading ? <><span className="loader-gold scale-75" />Saving…</> : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* ── Subscription ─────────────────────────────────────── */}
            {section === 'subscription' && (
              <div className="space-y-5 animate-fade-in-up">

                {/* Current plan */}
                <div className="glass-card p-6 sm:p-7">
                  <h2 className="heading-sm text-[#F0EEE8] mb-1">Current Plan</h2>
                  <p className="text-[#9298B0] text-xs mb-5">Your active subscription</p>
                  <div className="rounded-xl p-5 flex items-center justify-between"
                    style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <div className="flex items-center gap-3">
                      <Crown className="w-5 h-5 text-[#C9A84C]" />
                      <div>
                        <p className="text-[#F0EEE8] font-semibold">{planLabel[currentPlan]}</p>
                        <p className="text-[#9298B0] text-xs">{currentPlan === 'free' ? 'Limited feature access' : 'Full access to all features'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="number-display text-2xl text-[#F0EEE8]">{planPrice[currentPlan]}</span>
                      <span className="text-[#9298B0] text-xs">{planPer[currentPlan]}</span>
                    </div>
                  </div>
                </div>

                {/* Usage stats for free users */}
                {currentPlan === 'free' && user && <UsageStats userId={user.id} />}

                {/* Plans */}
                <div className="glass-card p-6 sm:p-7">
                  <h2 className="heading-sm text-[#F0EEE8] mb-1">Available Plans</h2>
                  <p className="text-[#9298B0] text-xs mb-5">Upgrade for unlimited access to all features</p>

                  {error && (
                    <div className="mb-5 rounded-xl p-4 flex items-start gap-3"
                      style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-3 gap-4">
                    {([
                      { id: 'monthly',   label: 'Monthly',   price: '₹499',   per: '/month',     popular: false, savings: null },
                      { id: 'quarterly', label: 'Quarterly', price: '₹1,299', per: '/3 months',  popular: true,  savings: 'Save 13%' },
                      { id: 'yearly',    label: 'Yearly',    price: '₹4,999', per: '/year',      popular: false, savings: 'Save 17%' },
                    ] as const).map(plan => {
                      const isCurrent = currentPlan === plan.id;
                      return (
                        <div key={plan.id} className="rounded-xl p-5 flex flex-col relative"
                          style={{
                            background: plan.popular ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.02)',
                            border: plan.popular ? '1px solid rgba(201,168,76,0.25)' : isCurrent ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.07)',
                          }}>
                          {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <span className="label-tag flex items-center gap-1 text-[0.65rem] py-1"><Sparkles className="w-2.5 h-2.5" />Popular</span>
                            </div>
                          )}
                          {isCurrent && <span className="label-tag text-[0.65rem] mb-3 inline-block">Current</span>}
                          <h3 className="text-[#F0EEE8] font-semibold text-sm mb-2">{plan.label}</h3>
                          <div className="mb-4">
                            <span className="number-display text-2xl text-[#F0EEE8]">{plan.price}</span>
                            <span className="text-[#9298B0] text-xs">{plan.per}</span>
                          </div>
                          {plan.savings && (
                            <p className="gold-text text-xs font-semibold mb-4">{plan.savings}</p>
                          )}
                          <button onClick={() => handleSelectPlan(plan.id as any)} disabled={isCurrent}
                            className={`mt-auto w-full text-sm py-2.5 rounded-lg font-medium transition-all duration-200 ${isCurrent ? 'btn-glass opacity-50 cursor-not-allowed' : plan.popular ? 'btn-gold' : 'btn-glass'}`}>
                            {isCurrent ? 'Current Plan' : 'Select Plan'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
