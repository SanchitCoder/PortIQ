import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { BarChart3, LineChart, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TOOLS = [
  {
    icon: BarChart3,
    label: 'Portfolio Monitor',
    description: 'Track your entire portfolio with AI risk analysis, diversification scoring, and actionable insights.',
    path: '/dashboard/portfolio',
    tag: '3 free analyses',
  },
  {
    icon: LineChart,
    label: 'Stock Analyzer',
    description: 'Deep-dive into any stock — fundamentals, market sentiment, financial ratios, and growth metrics.',
    path: '/dashboard/analyzer',
    tag: '2 free analyses',
  },
  {
    icon: Zap,
    label: 'AlphaEdge Evaluator',
    description: 'Input your position and get an AI-powered Buy / Hold / Sell verdict with confidence scoring.',
    path: '/dashboard/evaluator',
    tag: '1 free evaluation',
  },
];

export function Dashboard() {
  const navigate   = useNavigate();
  const { user }   = useAuth();

  useEffect(() => { navigate('/dashboard/portfolio', { replace: true }); }, [navigate]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto animate-fade-in-up">
        <div className="mb-10">
          <p className="label-tag mb-3">Welcome</p>
          <h1 className="display-lg text-[#F0EEE8] mb-3">
            Good to have you,{' '}
            <span className="gold-text italic">{user?.email?.split('@')[0] ?? 'Investor'}</span>
          </h1>
          <p className="text-[#9298B0]">Choose a tool below to get started with AI-powered investment intelligence.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {TOOLS.map((tool, i) => (
            <button
              key={tool.path}
              onClick={() => navigate(tool.path)}
              className={`glass-card p-7 text-left hover-lift group relative overflow-hidden animate-fade-in-up animation-delay-${(i + 1) * 100}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)' }}>
                    <tool.icon className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <span className="label-tag text-[0.65rem]">{tool.tag}</span>
                </div>
                <h3 className="heading-sm text-[#F0EEE8] mb-2">{tool.label}</h3>
                <p className="text-[#9298B0] text-sm leading-relaxed mb-5">{tool.description}</p>
                <div className="flex items-center gap-2 text-[#C9A84C] text-sm font-medium">
                  Open tool <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
