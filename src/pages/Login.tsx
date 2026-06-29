import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { signIn, user } = useAuth();
  const navigate         = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-16 relative overflow-hidden" style={{ background: 'var(--bg-deepest)' }}>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-[#C9A84C] opacity-[0.04] blur-[120px] animate-blob" />
        <div className="absolute bottom-[5%] right-[5%] w-[350px] h-[350px] rounded-full bg-[#C9A84C] opacity-[0.03] blur-[100px] animate-blob animation-delay-4000" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-7 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <TrendingUp className="w-4.5 h-4.5 text-[#C9A84C] w-[18px] h-[18px]" />
            </div>
            <span className="font-cormorant text-xl font-semibold">Port<span className="gold-text">IQ</span></span>
          </Link>
          <h1 className="display-md text-[#F0EEE8] mb-2">Welcome Back</h1>
          <p className="text-[#9298B0] text-sm">Sign in to access your investment dashboard</p>
        </div>

        {/* Form card */}
        <div className="glass-card p-7 sm:p-8">
          {error && (
            <div className="mb-5 rounded-xl p-4 flex items-start gap-3 animate-fade-in-up"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#9298B0] mb-2 uppercase tracking-widest">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="premium-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9298B0] mb-2 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="premium-input pr-11"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4E65] hover:text-[#9298B0] transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full flex items-center justify-center gap-2 py-3.5 mt-2">
              {loading ? (
                <>
                  <span className="loader-gold scale-75" />
                  Signing in…
                </>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="gold-line my-6" />

          <p className="text-center text-[#9298B0] text-sm">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-[#C9A84C] hover:underline font-medium">Sign up</Link>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-[#4A4E65] hover:text-[#9298B0] text-sm transition-colors duration-200">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
