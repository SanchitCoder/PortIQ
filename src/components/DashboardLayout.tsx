import { useState, ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, BarChart3, LineChart, Zap, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Start with sidebar open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard/portfolio', icon: BarChart3, label: 'Portfolio Monitor' },
    { path: '/dashboard/analyzer', icon: LineChart, label: 'Stock Analyzer' },
    { path: '/dashboard/evaluator', icon: Zap, label: 'AlphaEdge Evaluator' },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 pointer-events-none"></div>
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 transition-all duration-300 flex flex-col fixed h-full z-50 relative`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-black opacity-80"></div>
        <div className="relative z-10 p-6 border-b border-gray-800 flex items-center justify-between">
          {sidebarOpen ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-2 group relative">
                <div className="relative">
                  <TrendingUp className="w-8 h-8 text-gray-300 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent group-hover:from-white group-hover:via-white group-hover:to-white transition-all duration-300">
                  PortIQ
                </span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-110 hover:rotate-90 relative group"
              >
                <X className="w-5 h-5 relative z-10" />
                <div className="absolute inset-0 bg-white/10 rounded-full scale-0 group-hover:scale-150 transition-transform duration-300"></div>
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-white transition-all duration-300 mx-auto transform hover:scale-110 relative group"
            >
              <Menu className="w-6 h-6 relative z-10" />
              <div className="absolute inset-0 bg-white/10 rounded-full scale-0 group-hover:scale-150 transition-transform duration-300"></div>
            </button>
          )}
        </div>

        <nav className="relative z-10 flex-1 p-4 space-y-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative overflow-hidden transform hover:scale-105 hover:-translate-x-1 ${
                  isActive
                    ? 'bg-gray-800 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                title={!sidebarOpen ? item.label : undefined}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className={`relative z-10 w-5 h-5 flex-shrink-0 flex items-center justify-center ${isActive ? 'transform rotate-6' : ''} group-hover:rotate-12 transition-transform duration-300`}>
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-sm"></div>
                  )}
                </div>
                {sidebarOpen && (
                  <span className="font-medium relative z-10">
                    {item.label}
                  </span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 p-4 border-t border-gray-800">
          <button
            onClick={handleSignOut}
            className="group flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-300 w-full relative overflow-hidden transform hover:scale-105"
            title={!sidebarOpen ? 'Sign Out' : undefined}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 w-5 h-5 flex-shrink-0 transform group-hover:rotate-12 transition-transform duration-300">
              <LogOut className="w-5 h-5" />
            </div>
            {sidebarOpen && <span className="font-medium relative z-10">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-lg p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <main
        className={`relative z-10 flex-1 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-20'
        } transition-all duration-300 p-4 sm:p-6 md:p-8`}
      >
        {children}
      </main>
    </div>
  );
}
