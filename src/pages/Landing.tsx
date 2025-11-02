import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, BarChart3, Zap, Twitter, Linkedin, Github, Check, Shield, Clock, Users, ArrowRight, ChevronDown, ChevronUp, Target, Brain, Sparkles } from 'lucide-react';
import { Chatbot } from '../components/Chatbot';

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'What is PortIQ and how does it work?',
      answer: 'PortIQ is an AI-powered investment analysis platform that helps you make smarter investment decisions. You can monitor your portfolio, analyze individual stocks, and get intelligent buy/hold/sell recommendations. Simply add your stocks, and our AI provides comprehensive analysis including risk assessment, fundamental metrics, and market sentiment.',
    },
    {
      question: 'Do I need to pay to use PortIQ?',
      answer: 'No! We offer a free plan that lets you try all features. Free users get 3 portfolio analyses, 2 stock analyses, and 1 AlphaEdge evaluation (one-time allocation). Once you use all your free uses, upgrade to get unlimited access to all features.',
    },
    {
      question: 'How accurate are the AI recommendations?',
      answer: 'Our AI models are trained on extensive market data and financial metrics. While no investment tool can guarantee returns, our recommendations are based on comprehensive analysis including fundamentals, technical indicators, and market sentiment. We maintain a 95%+ accuracy rate on our analysis predictions.',
    },
    {
      question: 'Is my portfolio data secure?',
      answer: 'Absolutely. We use industry-standard encryption to protect your data. Your portfolio information is stored securely and never shared with third parties. We comply with all data protection regulations.',
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time from your Settings page. Your subscription will remain active until the end of your current billing period, and you\'ll retain access to all paid features until then.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major payment methods through Razorpay, including credit cards, debit cards, UPI, net banking, and digital wallets. All transactions are secure and encrypted.',
    },
    {
      question: 'Do I need any technical knowledge to use PortIQ?',
      answer: 'Not at all! PortIQ is designed to be intuitive and user-friendly. Simply enter stock symbols, and our AI does the complex analysis for you. The platform provides easy-to-understand insights and recommendations.',
    },
    {
      question: 'How often is the data updated?',
      answer: 'Our platform provides real-time analysis using the latest market data. Stock prices and metrics are updated continuously, ensuring you always have access to the most current information for making investment decisions.',
    },
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div key={index} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-800 transition-colors"
          >
            <span className="font-semibold text-white pr-4">{faq.question}</span>
            {openIndex === index ? (
              <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
          </button>
          {openIndex === index && (
            <div className="px-6 py-4 border-t border-gray-800">
              <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Landing() {
  const [showChatbot, setShowChatbot] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* 3D Grid Background */}
      <div 
        className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20"
        style={{
          transform: `perspective(1000px) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * 2}deg)`,
          transformStyle: 'preserve-3d',
        }}
      ></div>
      <nav className="fixed top-0 w-full bg-black/80 backdrop-blur-sm border-b border-gray-800 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="relative">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <span className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent group-hover:from-white group-hover:via-white group-hover:to-white transition-all duration-300">
              PortIQ
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a href="#features" className="text-gray-400 hover:text-white transition-all duration-300 relative group">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-all duration-300 relative group">
              Pricing
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
            </a>
            <Link to="/login" className="text-gray-400 hover:text-white transition-all duration-300 relative group">
              Login
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link to="/signup" className="bg-white text-black px-4 sm:px-6 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 relative overflow-hidden group text-sm sm:text-base">
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </Link>
          </div>
          <div className="flex md:hidden items-center gap-2">
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1.5">
              Login
            </Link>
            <Link to="/signup" className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="relative inline-block mb-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 tracking-tight relative">
              <span className="relative z-10 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent animate-gradient">
                Intelligence for
              </span>
              <br />
              <span className="relative z-10 bg-gradient-to-r from-gray-300 via-white to-gray-100 bg-clip-text text-transparent animate-gradient animation-delay-1000">
                Every Investor
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20 blur-3xl animate-pulse"></div>
            </h1>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up px-4">
            AI-powered portfolio monitoring, stock analysis, and investment evaluation to help you make smarter decisions in real-time. Transform your investment strategy with cutting-edge analytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 animate-fade-in-up animation-delay-500 px-4">
            <Link 
              to="/signup" 
              className="group bg-white text-black px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden hover:scale-105 hover:shadow-2xl hover:shadow-white/20 w-full sm:w-auto"
              style={{
                transform: `perspective(1000px) rotateY(${(mousePosition.x / window.innerWidth - 0.5) * 3}deg) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * -3}deg) scale(1)`,
                transformStyle: 'preserve-3d',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `perspective(1000px) rotateY(${(mousePosition.x / window.innerWidth - 0.5) * 3}deg) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * -3}deg) scale(1.05)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `perspective(1000px) rotateY(${(mousePosition.x / window.innerWidth - 0.5) * 3}deg) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * -3}deg) scale(1)`;
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started Free
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </Link>
            <Link 
              to="/login" 
              className="bg-transparent border-2 border-gray-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:border-gray-500 transition-all duration-300 relative overflow-hidden group hover:scale-105 w-full sm:w-auto"
              style={{
                transform: `perspective(1000px) rotateY(${(mousePosition.x / window.innerWidth - 0.5) * 3}deg) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * -3}deg) scale(1)`,
                transformStyle: 'preserve-3d',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `perspective(1000px) rotateY(${(mousePosition.x / window.innerWidth - 0.5) * 3}deg) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * -3}deg) scale(1.05)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `perspective(1000px) rotateY(${(mousePosition.x / window.innerWidth - 0.5) * 3}deg) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * -3}deg) scale(1)`;
              }}
            >
              <span className="relative z-10">Login</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto mt-8 sm:mt-16 px-4">
            {[
              { value: '10K+', label: 'Active Users', delay: '0ms' },
              { value: '50K+', label: 'Analyses Performed', delay: '200ms' },
              { value: '95%', label: 'Accuracy Rate', delay: '400ms' },
              { value: '24/7', label: 'AI Support', delay: '600ms' },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl p-4 sm:p-6 relative overflow-hidden group hover:border-gray-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 animate-fade-in-up"
                style={{ animationDelay: stat.delay }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-gray-400 text-xs sm:text-sm">{stat.label}</div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-2xl transform group-hover:scale-150 transition-transform duration-500"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-12 sm:py-20 px-4 sm:px-6 border-t border-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Powerful Features for Smart Investing</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Everything you need to make informed investment decisions, all in one platform
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            <div className="group bg-gradient-to-br from-gray-900 to-black p-6 sm:p-8 rounded-2xl border border-gray-800 hover:border-gray-700 transition-all duration-500 relative overflow-hidden transform hover:scale-105 hover:-translate-y-2"
              style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
              <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 bg-gray-800 rounded-xl flex items-center justify-center mb-4 sm:mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-gray-300 group-hover:text-white transition-colors duration-500" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 relative z-10">Portfolio Monitor</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-3 sm:mb-4 relative z-10">
                Track multiple stocks simultaneously with AI-driven insights on risk, diversification, and performance. Get real-time portfolio health assessments.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 relative z-10">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Multi-stock portfolio analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Risk assessment and diversification scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Performance metrics and insights</span>
                </li>
              </ul>
            </div>

            <div className="group bg-gradient-to-br from-gray-900 to-black p-6 sm:p-8 rounded-2xl border border-gray-800 hover:border-gray-700 transition-all duration-500 relative overflow-hidden transform hover:scale-105 hover:-translate-y-2"
              style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
              <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 bg-gray-800 rounded-xl flex items-center justify-center mb-4 sm:mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-gray-300 group-hover:text-white transition-colors duration-500" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 relative z-10">Stock Analyzer</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-3 sm:mb-4 relative z-10">
                Deep dive into individual stocks with comprehensive fundamental analysis, sentiment tracking, and key metrics to inform your investment decisions.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 relative z-10">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Comprehensive fundamental analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Market sentiment tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Key financial metrics and ratios</span>
                </li>
              </ul>
            </div>

            <div className="group bg-gradient-to-br from-gray-900 to-black p-6 sm:p-8 rounded-2xl border border-gray-800 hover:border-gray-700 transition-all duration-500 relative overflow-hidden transform hover:scale-105 hover:-translate-y-2"
              style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
              <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 bg-gray-800 rounded-xl flex items-center justify-center mb-4 sm:mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-gray-300 group-hover:text-white transition-colors duration-500" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 relative z-10">AlphaEdge Evaluator</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-3 sm:mb-4 relative z-10">
                Get intelligent Buy/Hold/Sell recommendations based on your position, current price, and detailed analysis with confidence scoring.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 relative z-10">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>AI-powered buy/hold/sell recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Confidence scoring for each recommendation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Position-based analysis and reasoning</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Additional Benefits */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-8 sm:mt-12">
            <div className="group bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 animate-float">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-white/10 transition-colors duration-300">
                  <Brain className="w-6 h-6 text-gray-300 group-hover:text-white group-hover:animate-pulse transition-all duration-300" />
                </div>
                <h4 className="text-lg font-bold">AI-Powered Insights</h4>
              </div>
              <p className="text-gray-400 text-sm relative z-10">
                Leverage advanced machine learning algorithms to get actionable investment insights and predictions.
              </p>
            </div>
            <div className="group bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 animate-float" style={{ animationDelay: '2s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-white/10 transition-colors duration-300">
                  <Clock className="w-6 h-6 text-gray-300 group-hover:text-white group-hover:animate-pulse transition-all duration-300" />
                </div>
                <h4 className="text-lg font-bold">Real-Time Updates</h4>
              </div>
              <p className="text-gray-400 text-sm relative z-10">
                Get instant analysis and recommendations as market conditions change, keeping you ahead of the curve.
              </p>
            </div>
            <div className="group bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 animate-float" style={{ animationDelay: '4s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-white/10 transition-colors duration-300">
                  <Shield className="w-6 h-6 text-gray-300 group-hover:text-white group-hover:animate-pulse transition-all duration-300" />
                </div>
                <h4 className="text-lg font-bold">Secure & Private</h4>
              </div>
              <p className="text-gray-400 text-sm relative z-10">
                Your data is encrypted and secure. We never share your portfolio information with third parties.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 border-t border-gray-900 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">How It Works</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Get started in minutes and start making smarter investment decisions
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 relative transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                <span className="text-2xl font-bold text-white relative z-10">1</span>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 border-2 border-white/20 rounded-full scale-150 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500"></div>
              </div>
              <h3 className="text-lg font-bold mb-2">Sign Up Free</h3>
              <p className="text-gray-400 text-sm">
                Create your account in seconds. No credit card required to start.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 relative transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" style={{ animationDelay: '1s' }}>
                <span className="text-2xl font-bold text-white relative z-10">2</span>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 border-2 border-white/20 rounded-full scale-150 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500"></div>
              </div>
              <h3 className="text-lg font-bold mb-2">Add Your Stocks</h3>
              <p className="text-gray-400 text-sm">
                Input your portfolio or analyze individual stocks you're interested in.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 relative transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" style={{ animationDelay: '2s' }}>
                <span className="text-2xl font-bold text-white relative z-10">3</span>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 border-2 border-white/20 rounded-full scale-150 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500"></div>
              </div>
              <h3 className="text-lg font-bold mb-2">Get AI Analysis</h3>
              <p className="text-gray-400 text-sm">
                Receive comprehensive analysis, risk assessments, and actionable insights.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 relative transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" style={{ animationDelay: '3s' }}>
                <span className="text-2xl font-bold text-white relative z-10">4</span>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 border-2 border-white/20 rounded-full scale-150 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500"></div>
              </div>
              <h3 className="text-lg font-bold mb-2">Make Decisions</h3>
              <p className="text-gray-400 text-sm">
                Use our recommendations and insights to make informed investment choices.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-12 sm:py-20 px-4 sm:px-6 border-t border-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Simple, Transparent Pricing</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-3 sm:mb-4 px-4">Choose the plan that fits your investment strategy</p>
            <p className="text-gray-500 text-sm">Start with our free plan to explore all features</p>
          </div>

          {/* Free Plan Highlight */}
          <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-gray-700 rounded-2xl p-6 sm:p-8 mb-8 sm:mb-12 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-semibold">FREE TRIAL</span>
                  <h3 className="text-xl sm:text-2xl font-bold">Free Plan</h3>
                </div>
                <p className="text-gray-400 text-sm sm:text-base">Perfect for trying out PortIQ</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-3xl sm:text-4xl font-bold">$0</span>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
              <div className="bg-black border border-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Portfolio Monitor</div>
                <div className="text-lg font-bold">3 uses</div>
              </div>
              <div className="bg-black border border-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Stock Analyzer</div>
                <div className="text-lg font-bold">2 uses</div>
              </div>
              <div className="bg-black border border-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">AlphaEdge Evaluator</div>
                <div className="text-lg font-bold">1 use</div>
              </div>
            </div>
            <Link to="/signup" className="block w-full mt-6 bg-white text-black py-3 rounded-lg text-center font-semibold hover:bg-gray-200 transition-colors">
              Start Free Trial
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900 to-black p-6 sm:p-8 rounded-2xl border border-gray-800 hover:border-gray-600 transition-all hover:scale-105">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Monthly</h3>
              <div className="mb-4 sm:mb-6">
                <span className="text-4xl sm:text-5xl font-bold">₹499</span>
                <span className="text-gray-400 text-sm sm:text-base">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">Unlimited portfolio tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">Unlimited AI stock analysis</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">Unlimited AlphaEdge evaluations</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">Real-time insights and alerts</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">Priority customer support</span>
                </li>
              </ul>
              <Link to="/signup" className="block w-full bg-gray-800 text-white py-3 rounded-lg text-center font-semibold hover:bg-gray-700 transition-colors">
                Get Started
              </Link>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-black p-6 sm:p-8 rounded-2xl border-2 border-gray-600 hover:border-gray-500 transition-all hover:scale-105 relative">
              <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 bg-white text-black px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold">
                POPULAR
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 mt-2">Quarterly</h3>
              <div className="mb-4 sm:mb-6">
                <span className="text-4xl sm:text-5xl font-bold">₹1,299</span>
                <span className="text-gray-400 text-sm sm:text-base">/3 months</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">Unlimited portfolio tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">AI stock analysis</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">AlphaEdge evaluations</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">Real-time insights</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold">Save 13%</span>
                </li>
              </ul>
              <Link to="/signup" className="block w-full bg-white text-black py-3 rounded-lg text-center font-semibold hover:bg-gray-200 transition-colors">
                Get Started
              </Link>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black p-6 sm:p-8 rounded-2xl border border-gray-800 hover:border-gray-600 transition-all hover:scale-105">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Yearly</h3>
              <div className="mb-4 sm:mb-6">
                <span className="text-4xl sm:text-5xl font-bold">₹4,999</span>
                <span className="text-gray-400 text-sm sm:text-base">/year</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">Unlimited portfolio tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">AI stock analysis</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">AlphaEdge evaluations</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">Real-time insights</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold">Save 17%</span>
                </li>
              </ul>
              <Link to="/signup" className="block w-full bg-gray-800 text-white py-3 rounded-lg text-center font-semibold hover:bg-gray-700 transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 border-t border-gray-900 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Who Can Benefit from PortIQ?</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Whether you're a beginner or experienced investor, PortIQ has something for everyone
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold mb-3">Individual Investors</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Make informed decisions on your personal portfolio. Understand risk levels, diversify effectively, and get AI-powered recommendations tailored to your investments.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Personal portfolio management</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Risk assessment for your holdings</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold mb-3">Active Traders</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Get real-time analysis and instant recommendations. Evaluate positions quickly and make fast decisions based on AI-powered insights and market sentiment.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Quick stock evaluations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Instant buy/hold/sell recommendations</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold mb-3">Research Analysts</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Deep dive into fundamentals and market data. Get comprehensive analysis reports with sentiment tracking and detailed metrics for thorough research.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Comprehensive fundamental analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Detailed financial metrics and reports</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 border-t border-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Frequently Asked Questions</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 px-4">
              Everything you need to know about PortIQ
            </p>
          </div>
          <FAQSection />
        </div>
      </section>

      <footer className="border-t border-gray-900 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-gray-400" />
              <span className="text-xl font-bold">PortIQ</span>
            </div>
            <div className="flex gap-6">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
            <p className="text-gray-400 text-sm">
              © 2025 PortIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <Chatbot isOpen={showChatbot} onClose={() => setShowChatbot(false)} onOpen={() => setShowChatbot(true)} />
    </div>
  );
}
