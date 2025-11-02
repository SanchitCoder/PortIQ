import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* 3D Grid Background */}
      <div 
        className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20"
        style={{
          transform: `perspective(1000px) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * 2}deg)`,
          transformStyle: 'preserve-3d',
        }}
      ></div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-6 mb-8">
            <Link to="/" className="inline-flex items-center gap-3 group relative">
              <div className="relative">
                <TrendingUp className="w-10 h-10 text-gray-300 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent group-hover:from-white group-hover:via-white group-hover:to-white transition-all duration-300">
                PortIQ
              </span>
            </Link>
            <div className="relative w-full">
              <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20 blur-3xl animate-pulse opacity-50 -z-10"></div>
            </div>
            <p className="text-gray-400 text-lg">Sign in to access your portfolio</p>
          </div>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 relative overflow-hidden group"
          style={{
            transformStyle: 'preserve-3d',
            transform: `perspective(1000px) rotateY(${(mousePosition.x / window.innerWidth - 0.5) * 2}deg) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * -2}deg)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
          <div className="relative z-10">
            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3 animate-fade-in-up relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent"></div>
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 relative z-10 animate-pulse" />
                <p className="text-red-400 text-sm relative z-10">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div className="animate-fade-in-up">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-300 hover:border-gray-600 focus:scale-[1.02] relative z-10"
                    placeholder="you@example.com"
                    required
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-transparent rounded-lg opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              <div className="animate-fade-in-up animation-delay-200">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-300 hover:border-gray-600 focus:scale-[1.02] relative z-10"
                    placeholder="Enter your password"
                    required
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-transparent rounded-lg opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-white text-black font-semibold py-3 rounded-lg mt-6 hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden transform hover:scale-105 hover:shadow-2xl hover:shadow-white/20"
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </button>

            <p className="text-center text-gray-400 mt-6 relative z-10">
              Don't have an account?{' '}
              <Link to="/signup" className="text-white hover:underline relative group/link transition-all duration-300">
                <span className="relative z-10">Sign up</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover/link:w-full transition-all duration-300"></span>
              </Link>
            </p>
          </div>
        </form>

        <div className="text-center mt-6 relative z-10">
          <Link to="/" className="text-gray-400 hover:text-white transition-all duration-300 text-sm relative group/back inline-flex items-center gap-2">
            <span className="relative z-10">← Back to home</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover/back:w-full transition-all duration-300"></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
