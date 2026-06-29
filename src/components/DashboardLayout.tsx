import { useState, ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, BarChart3, LineChart, Zap, Settings, LogOut, Menu, X, ChevronRight, BookOpen, Sliders } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard/portfolio', icon: BarChart3,  label: 'Portfolio Monitor' },
  { path: '/dashboard/analyzer',  icon: LineChart,   label: 'Stock Analyzer' },
  { path: '/dashboard/evaluator', icon: Zap,         label: 'AlphaEdge' },
  { path: '/dashboard/journal',   icon: BookOpen,    label: 'Conviction Ledger' },
  { path: '/dashboard/stress-test', icon: Sliders,   label: 'What-If Engine' },
  { path: '/dashboard/settings',  icon: Settings,    label: 'Settings' },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { signOut, user } = useAuth();

  useEffect(() => { setMobileMenuOpen(false); }, [location]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'var(--bg-deepest)' }}>

      {/* ── Background ───────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#C9A84C] opacity-[0.025] blur-[120px] animate-blob" />
        <div className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-[#C9A84C] opacity-[0.02] blur-[100px] animate-blob animation-delay-4000" />
      </div>

      {/* ── Mobile overlay ───────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`fixed h-full z-50 flex flex-col transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${sidebarOpen ? 'w-60' : 'w-[68px]'}
        `}
        style={{
          background: 'rgba(4, 6, 13, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {sidebarOpen ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
                  <TrendingUp className="w-4 h-4 text-[#C9A84C]" />
                </div>
                <span className="font-cormorant text-lg font-semibold">Port<span className="gold-text">IQ</span></span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#4A4E65] hover:text-[#9298B0] transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
              <TrendingUp className="w-4.5 h-4.5 text-[#C9A84C] w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        {/* User chip */}
        {sidebarOpen && user && (
          <div className="px-3 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96B)', color: '#1a1000' }}>
                {user.email[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-[#F0EEE8] text-xs font-medium truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? item.label : undefined}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden
                  ${isActive
                    ? 'text-[#C9A84C]'
                    : 'text-[#4A4E65] hover:text-[#9298B0]'
                  }`}
                style={{
                  background: isActive ? 'rgba(201,168,76,0.08)' : undefined,
                  border: isActive ? '1px solid rgba(201,168,76,0.15)' : '1px solid transparent',
                }}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: 'var(--gold)' }} />}
                <item.icon className={`w-4.5 h-4.5 shrink-0 transition-colors duration-200 w-[18px] h-[18px] ${isActive ? 'text-[#C9A84C]' : 'group-hover:text-[#9298B0]'}`} />
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {sidebarOpen && isActive && (
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#C9A84C] opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleSignOut}
            title={!sidebarOpen ? 'Sign Out' : undefined}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#4A4E65] hover:text-red-400 transition-colors duration-200 w-full"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0 transition-colors" />
            {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile toggle ─────────────────────────────────────────── */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-xl text-[#9298B0]"
        style={{ background: 'rgba(4,6,13,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main
        className="relative z-10 flex-1 transition-all duration-300 p-4 sm:p-6 md:p-8 overflow-auto"
        style={{ marginLeft: sidebarOpen ? '240px' : '68px' }}
      >
        {children}
      </main>
    </div>
  );
}
