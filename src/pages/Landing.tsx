import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, BarChart3, Zap, Twitter, Linkedin, Github,
  Check, Shield, Clock, ArrowRight, ChevronDown, ChevronUp,
  Target, Brain, Sparkles, LineChart, PieChart, Activity,
  TrendingDown, DollarSign, BookOpen, Star,
} from 'lucide-react';
import { Chatbot } from '../components/Chatbot';

/* ── Ticker tape data ─────────────────────────────────────────────────── */
const TICKERS = [
  { sym: 'AAPL',  price: '₹16,342', chg: '+1.24%', up: true },
  { sym: 'TSLA',  price: '₹18,760', chg: '-0.87%', up: false },
  { sym: 'RELIANCE', price: '₹2,948', chg: '+0.63%', up: true },
  { sym: 'TCS',   price: '₹3,721', chg: '+1.02%', up: true },
  { sym: 'NVDA',  price: '₹89,430', chg: '+3.15%', up: true },
  { sym: 'HDFC',  price: '₹1,654', chg: '-0.41%', up: false },
  { sym: 'INFY',  price: '₹1,823', chg: '+0.79%', up: true },
  { sym: 'MSFT',  price: '₹31,200', chg: '+0.95%', up: true },
  { sym: 'WIPRO', price: '₹478',   chg: '-0.22%', up: false },
  { sym: 'AMZN',  price: '₹16,890', chg: '+1.48%', up: true },
];

function TickerBar() {
  const items = [...TICKERS, ...TICKERS];
  return (
    <div className="w-full overflow-hidden border-y border-white/[0.06] py-2.5 relative">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#03050C] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#03050C] to-transparent z-10 pointer-events-none" />
      <div className="flex gap-8 animate-ticker whitespace-nowrap" style={{ width: 'max-content' }}>
        {items.map((t, i) => (
          <div key={i} className="flex items-center gap-2.5 shrink-0">
            <span className="font-mono text-xs text-[#9298B0] font-medium tracking-widest">{t.sym}</span>
            <span className="font-mono text-xs text-[#F0EEE8]">{t.price}</span>
            <span className={`font-mono text-xs flex items-center gap-1 ${t.up ? 'text-emerald-400' : 'text-red-400'}`}>
              {t.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {t.chg}
            </span>
            <span className="text-white/10">|</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────── */
const FAQS = [
  { q: 'What is PortIQ and how does it work?', a: 'PortIQ is an AI-powered investment intelligence platform. Add your stock symbols, and our AI delivers comprehensive analysis — risk profiles, fundamental metrics, sentiment scoring, and actionable Buy/Hold/Sell recommendations — all within seconds.' },
  { q: 'Do I need to pay to use PortIQ?', a: 'No. Every new account gets a free allocation: 3 portfolio analyses, 2 stock analyses, and 1 AlphaEdge evaluation. After your free uses are exhausted, upgrade to a paid plan for unlimited access.' },
  { q: 'How accurate are the AI recommendations?', a: 'Our models are trained on extensive historical market data, fundamental indicators, and real-time sentiment signals. No tool guarantees returns, but our analysis framework is built to surface the most relevant signals for your decision-making.' },
  { q: 'Is my portfolio data secure?', a: 'Absolutely. We use industry-standard encryption. Your portfolio data is never shared with third parties and is protected under strict data governance standards.' },
  { q: 'Can I cancel my subscription anytime?', a: 'Yes — cancel at any time from Settings. You retain full access until the end of your billing period.' },
  { q: 'What payment methods do you accept?', a: 'All major payment methods via Razorpay: credit/debit cards, UPI, net banking, and digital wallets. Every transaction is secured and encrypted.' },
];

function FAQItem({ faq, open, onToggle }: { faq: typeof FAQS[0]; open: boolean; onToggle: () => void }) {
  return (
    <div className="glass-card overflow-hidden hover-lift">
      <button onClick={onToggle} className="w-full px-6 py-5 flex items-center justify-between text-left gap-4">
        <span className="font-cormorant text-lg text-[#F0EEE8] font-medium leading-snug">{faq.q}</span>
        <span className="shrink-0 w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-[#9298B0] transition-all duration-300" style={{ background: open ? 'rgba(201,168,76,0.12)' : undefined, borderColor: open ? 'rgba(201,168,76,0.3)' : undefined }}>
          {open ? <ChevronUp className="w-4 h-4 text-[#C9A84C]" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 border-t border-white/[0.06]">
          <p className="text-[#9298B0] text-sm leading-relaxed pt-4">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export function Landing() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const [showChatbot, setShowChatbot] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#03050C] text-[#F0EEE8] relative overflow-hidden">

      {/* ── Background ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid */}
        <div className="absolute inset-0 bg-grid opacity-60" />
        {/* Gold orbs */}
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-[#C9A84C] opacity-[0.04] blur-[100px] animate-blob" />
        <div className="absolute top-[20%] right-[5%] w-[400px] h-[400px] rounded-full bg-[#C9A84C] opacity-[0.03] blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[10%] left-[30%] w-[350px] h-[350px] rounded-full bg-amber-400 opacity-[0.025] blur-[100px] animate-blob animation-delay-4000" />
        {/* Radial vignette */}
        <div className="absolute inset-0 bg-radial-gradient" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.05) 0%, transparent 70%)' }} />
      </div>

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-[#03050C]/90 backdrop-blur-xl border-b border-white/[0.07]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <TrendingUp className="w-4 h-4 text-[#C9A84C]" />
            </div>
            <span className="font-cormorant text-xl font-semibold tracking-tight">
              Port<span className="gold-text">IQ</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            {['features', 'pricing'].map(id => (
              <a key={id} href={`#${id}`} className="text-[#9298B0] hover:text-[#F0EEE8] text-sm font-medium transition-colors duration-200 capitalize tracking-wide">{id}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:block text-[#9298B0] hover:text-[#F0EEE8] text-sm font-medium transition-colors duration-200">Sign In</Link>
            <Link to="/login" className="btn-gold text-sm px-5 py-2.5">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative pt-28 sm:pt-36 pb-10 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: Copy */}
            <div className="animate-fade-in-up">
              <span className="label-tag mb-6 inline-flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                AI-Powered Investment Intelligence
              </span>

              <h1 className="display-xl mb-6 mt-3 leading-none">
                <span className="text-[#F0EEE8]">Your Portfolio,</span>
                <br />
                <span className="gold-text italic">Analysed by AI</span>
              </h1>

              <p className="body-lg max-w-lg mb-8 text-[#9298B0]">
                Get institutional-grade portfolio insights, deep stock analysis, and precise Buy/Hold/Sell signals — in seconds. Built for investors who demand an edge.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link to="/login" className="btn-gold inline-flex items-center justify-center gap-2 text-base px-7 py-3.5">
                  Start Free — No Credit Card
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/login" className="btn-glass inline-flex items-center justify-center gap-2 text-base px-7 py-3.5">
                  Sign In
                </Link>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[#4A4E65] text-xs">
                {['10,000+ active investors', 'Bank-grade security', 'No setup required'].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Dashboard preview */}
            <div className="animate-fade-in-up animation-delay-200 relative">
              {/* Glow halo */}
              <div className="absolute -inset-6 rounded-3xl blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)' }} />

              {/* Main card */}
              <div className="relative rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(8,10,20,0.82)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  border: '1px solid rgba(201,168,76,0.18)',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}>

                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.22)' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-[#C9A84C]" />
                    </div>
                    <span className="text-[#F0EEE8] text-sm font-semibold">Portfolio Overview</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-xs font-medium">Live</span>
                  </div>
                </div>

                {/* Portfolio value + sparkline */}
                <div className="px-5 pt-5 pb-4">
                  <p className="text-[#4A4E65] text-xs uppercase tracking-widest mb-1.5">Total Portfolio Value</p>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <span className="number-display text-3xl text-[#F0EEE8] font-medium">₹12,84,320</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 text-sm font-medium">+₹28,640</span>
                        <span className="text-[#4A4E65] text-xs">(+2.28%) today</span>
                      </div>
                    </div>
                    <span className="label-tag text-[0.65rem]">1M: +18.4%</span>
                  </div>

                  {/* Sparkline SVG */}
                  <div className="w-full h-16">
                    <svg viewBox="0 0 320 60" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0 52 C15 50,28 54,42 44 S60 34,78 36 S100 26,118 22 S140 28,158 18 S178 10,196 12 S220 8,242 5 S272 9,300 4 S312 6,320 2 L320 60 L0 60 Z"
                        fill="url(#sparkGrad)" />
                      <path d="M0 52 C15 50,28 54,42 44 S60 34,78 36 S100 26,118 22 S140 28,158 18 S178 10,196 12 S220 8,242 5 S272 9,300 4 S312 6,320 2"
                        fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Top holdings */}
                <div className="px-5 pb-4">
                  <p className="text-[#4A4E65] text-xs uppercase tracking-widest mb-3">Top Holdings</p>
                  <div className="space-y-2">
                    {[
                      { sym: 'RLNC', name: 'RELIANCE', price: '₹2,948', chg: '+0.63%', up: true, alloc: '35%' },
                      { sym: 'TCS', name: 'TCS', price: '₹3,721', chg: '+1.02%', up: true, alloc: '28%' },
                      { sym: 'NVDA', name: 'NVIDIA', price: '₹89,430', chg: '+3.15%', up: true, alloc: '22%' },
                    ].map(s => (
                      <div key={s.sym} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.15)' }}>
                            <span className="font-mono text-[0.5rem] text-[#C9A84C] font-bold">{s.sym.slice(0,2)}</span>
                          </div>
                          <div>
                            <p className="font-mono text-xs text-[#F0EEE8] font-medium">{s.name}</p>
                            <p className="text-[#4A4E65] text-[0.6rem]">{s.alloc} alloc.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xs text-[#F0EEE8]">{s.price}</p>
                          <p className={`font-mono text-[0.6rem] flex items-center gap-0.5 justify-end ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>
                            {s.up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {s.chg}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AlphaEdge signal strip */}
                <div className="mx-5 mb-5 rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-[#C9A84C] shrink-0" />
                    <div>
                      <p className="text-[#F0EEE8] text-xs font-semibold leading-none">AlphaEdge Signal</p>
                      <p className="text-[#4A4E65] text-[0.6rem] mt-0.5">RELIANCE · Just now</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider"
                      style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                      BUY
                    </span>
                    <span className="text-[#4A4E65] text-xs font-mono">87% conf.</span>
                  </div>
                </div>
              </div>

              {/* Floating badge: Return */}
              <div className="absolute -left-5 top-[22%] rounded-xl px-3 py-2.5 hidden lg:flex items-center gap-2 animate-float"
                style={{
                  background: 'rgba(6,10,20,0.92)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(52,211,153,0.25)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-400 text-xs font-semibold leading-none">+18.4%</p>
                  <p className="text-[#4A4E65] text-[0.6rem] mt-0.5 leading-none">1M Return</p>
                </div>
              </div>

              {/* Floating badge: Risk */}
              <div className="absolute -right-5 bottom-[22%] rounded-xl px-3 py-2.5 hidden lg:flex items-center gap-2 animate-float animation-delay-2000"
                style={{
                  background: 'rgba(6,10,20,0.92)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(201,168,76,0.25)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                <Shield className="w-4 h-4 text-[#C9A84C] shrink-0" />
                <div>
                  <p className="text-[#C9A84C] text-xs font-semibold leading-none">Low Risk</p>
                  <p className="text-[#4A4E65] text-[0.6rem] mt-0.5 leading-none">Score: 32 / 100</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Ticker ─────────────────────────────────────────────────── */}
      <div className="animate-fade-in-up animation-delay-500 my-8">
        <TickerBar />
      </div>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section className="py-20 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 animate-fade-in-up">
            <span className="label-tag mb-4 inline-block">The Process</span>
            <h2 className="display-md text-[#F0EEE8] mt-3 mb-3">From Data to Decisions</h2>
            <p className="text-[#9298B0] text-base max-w-xl mx-auto">Our AI does the heavy lifting so you can focus on what matters — the final call.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '01', icon: BookOpen, title: 'Input Your Stocks', desc: 'Add any stock symbols — Indian or global markets. Our system recognises all major exchanges.' },
              { n: '02', icon: Activity, title: 'AI Processes Data', desc: 'Fundamentals, technicals, sentiment, and macroeconomic signals are all parsed simultaneously.' },
              { n: '03', icon: Brain, title: 'Get Deep Analysis', desc: 'Receive a comprehensive report with risk assessment, metrics, and pattern recognition insights.' },
              { n: '04', icon: Target, title: 'Act with Confidence', desc: 'Use Buy/Hold/Sell recommendations with confidence scores to make your final investment call.' },
            ].map((s, i) => (
              <div key={i} className={`glass-card p-7 hover-lift animate-fade-in-up animation-delay-${i * 100 + 200}`}>
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <s.icon className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <span className="number-display text-xs text-[#3A3E55] font-medium">{s.n}</span>
                </div>
                <h3 className="heading-sm text-[#F0EEE8] mb-2">{s.title}</h3>
                <p className="text-[#9298B0] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 animate-fade-in-up">
            <span className="label-tag mb-4 inline-block">Platform Features</span>
            <h2 className="display-md text-[#F0EEE8] mt-3 mb-3">Everything You Need to Invest Smarter</h2>
            <p className="text-[#9298B0] text-base max-w-xl mx-auto">Three powerful AI engines, one seamless platform.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-10">
            {/* Portfolio Monitor */}
            <div className="glass-card-gold p-8 hover-lift animate-fade-in-up animation-delay-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
                  <BarChart3 className="w-6 h-6 text-[#C9A84C]" />
                </div>
                <h3 className="heading-sm text-[#F0EEE8] mb-3">Portfolio Monitor</h3>
                <p className="text-[#9298B0] text-sm leading-relaxed mb-5">
                  Track multiple stocks simultaneously. Get AI-driven risk scoring, diversification gaps, concentration alerts, and overall portfolio health — all in one glance.
                </p>
                <ul className="space-y-2.5">
                  {['Multi-stock AI analysis', 'Risk & diversification scoring', 'Portfolio health insights', 'Concentration warnings'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#9298B0]">
                      <Check className="w-3.5 h-3.5 text-[#C9A84C] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Stock Analyzer */}
            <div className="glass-card p-8 hover-lift animate-fade-in-up animation-delay-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-white/[0.06] border border-white/[0.1]">
                  <LineChart className="w-6 h-6 text-[#F0EEE8]" />
                </div>
                <h3 className="heading-sm text-[#F0EEE8] mb-3">Stock Analyzer</h3>
                <p className="text-[#9298B0] text-sm leading-relaxed mb-5">
                  Deep-dive into any stock. Fundamentals, market sentiment, financial ratios, growth metrics, and peer comparison — synthesised into a clear, actionable report.
                </p>
                <ul className="space-y-2.5">
                  {['Fundamental analysis', 'Real-time sentiment tracking', 'Key financial ratios', 'Peer comparison'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#9298B0]">
                      <Check className="w-3.5 h-3.5 text-[#9298B0] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AlphaEdge Evaluator */}
            <div className="glass-card p-8 hover-lift animate-fade-in-up animation-delay-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-white/[0.06] border border-white/[0.1]">
                  <Zap className="w-6 h-6 text-[#F0EEE8]" />
                </div>
                <h3 className="heading-sm text-[#F0EEE8] mb-3">AlphaEdge Evaluator</h3>
                <p className="text-[#9298B0] text-sm leading-relaxed mb-5">
                  Tell the AI your buy price, current price, and context — receive a precise Buy, Hold, or Sell recommendation with a confidence score and detailed reasoning.
                </p>
                <ul className="space-y-2.5">
                  {['Buy / Hold / Sell signals', 'Confidence scoring', 'Position-aware reasoning', 'Exit strategy suggestions'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#9298B0]">
                      <Check className="w-3.5 h-3.5 text-[#9298B0] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Secondary benefit cards */}
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: 'Advanced AI Models', desc: 'Built on large language models fine-tuned for financial analysis and market intelligence.' },
              { icon: Clock, title: 'Real-Time Analysis', desc: 'Analysis generated on-demand with the latest market data, not stale cached reports.' },
              { icon: Shield, title: 'Bank-Grade Security', desc: 'Your portfolio data is encrypted end-to-end. Zero data sharing with third parties.' },
            ].map((b, i) => (
              <div key={i} className="glass-card p-6 flex items-start gap-4 hover-lift animate-fade-in-up" style={{ animationDelay: `${i * 100 + 400}ms` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  <b.icon className="w-4.5 h-4.5 text-[#C9A84C] w-[18px] h-[18px]" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#F0EEE8] mb-1 text-sm">{b.title}</h4>
                  <p className="text-[#9298B0] text-xs leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases Banner ────────────────────────────────────────── */}
      <section className="py-16 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card-gold p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)' }} />
            <div className="relative z-10 grid md:grid-cols-3 gap-8">
              {[
                { icon: PieChart, who: 'Individual Investors', desc: 'Understand your holdings, assess risk, and get clear buy/hold/sell guidance on your personal portfolio.' },
                { icon: Activity, who: 'Active Traders', desc: 'Lightning-fast analysis and recommendations. Evaluate any position in seconds before the market moves.' },
                { icon: DollarSign, who: 'Research Analysts', desc: 'Comprehensive fundamental reports, sentiment scores, and financial metrics for thorough due diligence.' },
              ].map((u, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <u.icon className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <div>
                    <h3 className="heading-sm text-[#F0EEE8] mb-2">{u.who}</h3>
                    <p className="text-[#9298B0] text-sm leading-relaxed">{u.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 animate-fade-in-up">
            <span className="label-tag mb-4 inline-block">Pricing</span>
            <h2 className="display-md text-[#F0EEE8] mt-3 mb-3">Simple, Transparent Pricing</h2>
            <p className="text-[#9298B0] text-base max-w-xl mx-auto">Start free, upgrade when you're ready for unlimited access.</p>
          </div>

          {/* Free tier */}
          <div className="glass-card p-7 sm:p-8 mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="label-tag mb-2 inline-block">FREE PLAN</span>
                <h3 className="display-md text-[#F0EEE8] mt-1">Try Everything</h3>
                <p className="text-[#9298B0] text-sm mt-1">No credit card required. One-time allocation.</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="number-display text-4xl text-[#F0EEE8]">₹0</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { feature: 'Portfolio Monitor', uses: '3 analyses' },
                { feature: 'Stock Analyzer', uses: '2 analyses' },
                { feature: 'AlphaEdge', uses: '1 evaluation' },
              ].map(item => (
                <div key={item.feature} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[#4A4E65] text-xs mb-1.5 leading-tight">{item.feature}</div>
                  <div className="number-display text-sm text-[#F0EEE8] font-medium">{item.uses}</div>
                </div>
              ))}
            </div>
            <Link to="/login" className="btn-glass w-full inline-flex items-center justify-center gap-2 text-sm py-3">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Paid tiers */}
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { id: 'monthly', label: 'Monthly', price: '₹499', per: '/month', popular: false, savings: null },
              { id: 'quarterly', label: 'Quarterly', price: '₹1,299', per: '/3 months', popular: true, savings: 'Save 13%' },
              { id: 'yearly', label: 'Yearly', price: '₹4,999', per: '/year', popular: false, savings: 'Save 17%' },
            ].map((plan) => (
              <div key={plan.id} className={`relative p-7 hover-lift animate-fade-in-up rounded-3xl overflow-hidden ${plan.popular ? 'gold-glow-card' : 'glass-card'}`}
                style={plan.popular ? { background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.22)' } : undefined}
              >
                {plan.popular && (
                  <div className="absolute top-4 right-4">
                    <span className="label-tag flex items-center gap-1 text-[0.65rem]">
                      <Star className="w-2.5 h-2.5 fill-[#C9A84C]" /> Popular
                    </span>
                  </div>
                )}
                <h3 className="heading-sm text-[#F0EEE8] mb-3">{plan.label}</h3>
                <div className="mb-5">
                  <span className="number-display text-3xl text-[#F0EEE8]">{plan.price}</span>
                  <span className="text-[#9298B0] text-sm ml-1">{plan.per}</span>
                </div>
                <ul className="space-y-2.5 mb-7">
                  {['Unlimited portfolio tracking', 'Unlimited stock analysis', 'Unlimited AlphaEdge evaluations', 'Real-time AI insights', ...(plan.savings ? [plan.savings] : [])].map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2.5 text-sm">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${fi === 4 && plan.savings ? 'text-[#C9A84C]' : plan.popular ? 'text-[#C9A84C]' : 'text-[#9298B0]'}`} />
                      <span className={fi === 4 && plan.savings ? 'gold-text font-semibold' : 'text-[#9298B0]'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/login" className={`w-full inline-flex items-center justify-center gap-2 text-sm py-3 rounded-xl font-medium transition-all duration-300 ${plan.popular ? 'btn-gold' : 'btn-glass'}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 animate-fade-in-up">
            <span className="label-tag mb-4 inline-block">FAQ</span>
            <h2 className="display-md text-[#F0EEE8] mt-3">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FAQItem key={i} faq={faq} open={openFAQ === i} onToggle={() => setOpenFAQ(openFAQ === i ? null : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────── */}
      <section className="py-20 px-5 sm:px-8 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card-gold p-10 sm:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
            <div className="relative z-10">
              <span className="label-tag mb-6 inline-block">Start Today</span>
              <h2 className="display-lg text-[#F0EEE8] mb-4 mt-3">Ready to Invest Smarter?</h2>
              <p className="text-[#9298B0] mb-8 text-base">Join thousands of investors already using PortIQ to make data-driven decisions. Free to start, no credit card required.</p>
              <Link to="/login" className="btn-gold inline-flex items-center gap-2 text-base px-8 py-4">
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-10 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <TrendingUp className="w-3.5 h-3.5 text-[#C9A84C]" />
            </div>
            <span className="font-cormorant text-lg font-semibold">Port<span className="gold-text">IQ</span></span>
          </div>
          <p className="text-[#4A4E65] text-xs">© 2025 PortIQ. All rights reserved. Not financial advice.</p>
          <div className="flex gap-5">
            {[
              { Icon: Twitter, href: 'https://twitter.com' },
              { Icon: Linkedin, href: 'https://linkedin.com' },
              { Icon: Github, href: 'https://github.com' },
            ].map(({ Icon, href }, i) => (
              <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#4A4E65] hover:text-[#C9A84C] transition-colors duration-300"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </footer>

      <Chatbot isOpen={showChatbot} onClose={() => setShowChatbot(false)} onOpen={() => setShowChatbot(true)} />
    </div>
  );
}
