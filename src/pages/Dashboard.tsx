import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { BarChart3, LineChart, Zap } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard/portfolio', { replace: true });
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl animate-fade-in-up">
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Welcome to PortIQ
          </h1>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20 blur-3xl opacity-50"></div>
          <p className="text-gray-400 text-lg">Select a feature from the sidebar to get started</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: BarChart3, label: 'Portfolio Monitor', description: 'Track multiple stocks with AI-driven insights', path: '/dashboard/portfolio', delay: '0ms' },
            { icon: LineChart, label: 'Stock Analyzer', description: 'Deep dive into individual stock fundamentals', path: '/dashboard/analyzer', delay: '200ms' },
            { icon: Zap, label: 'AlphaEdge Evaluator', description: 'Get intelligent Buy/Hold/Sell recommendations', path: '/dashboard/evaluator', delay: '400ms' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                onClick={() => navigate(item.path)}
                className="group bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border border-gray-800 hover:border-gray-600 transition-all duration-500 cursor-pointer relative overflow-hidden transform hover:scale-105 hover:-translate-y-2 animate-fade-in-up"
                style={{ animationDelay: item.delay }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                <div className="relative z-10">
                  <div className="relative w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <Icon className="w-7 h-7 text-gray-300 group-hover:text-white transition-colors duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 relative z-10">{item.label}</h3>
                  <p className="text-gray-400 text-sm relative z-10">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
