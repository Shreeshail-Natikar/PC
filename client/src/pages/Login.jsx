import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', rememberMe: true });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 dark:from-whatsapp-teal dark:via-teal-800 dark:to-cyan-900 transition-colors duration-500" />
      <div className="absolute inset-0 opacity-30 dark:opacity-40">
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-yellow-300/30 blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 rounded-full bg-emerald-200/20 blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />
      </div>

      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute top-4 right-4 z-20 p-3 rounded-full glass hover:scale-110 transition-all duration-200 text-gray-700 dark:text-gray-200"
      >
        {isDark ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="relative z-10 w-full max-w-sm glass-strong rounded-[2rem] shadow-2xl p-8 animate-scaleIn border border-white/40 dark:border-white/10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-whatsapp-teal to-whatsapp-green flex items-center justify-center shadow-xl animate-bounceSoft">
            <span className="text-3xl">💬</span>
          </div>
          <h1 className="text-2xl font-bold mb-1 text-gray-800 dark:text-white">
            Welcome back
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Sign in to your private chat
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-whatsapp-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <input
              type="email"
              required
              placeholder="Email"
              className="w-full rounded-xl border border-gray-300/70 dark:border-gray-600/50 bg-white/60 dark:bg-black/30 backdrop-blur pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green/50 focus:border-whatsapp-green dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="relative group">
            <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-whatsapp-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input
              type="password"
              required
              placeholder="Password"
              className="w-full rounded-xl border border-gray-300/70 dark:border-gray-600/50 bg-white/60 dark:bg-black/30 backdrop-blur pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green/50 focus:border-whatsapp-green dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 pl-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
              className="w-4 h-4 rounded accent-whatsapp-green cursor-pointer"
            />
            Remember me
          </label>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-2.5 animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-whatsapp-teal to-whatsapp-green py-3 text-white font-semibold shadow-lg shadow-whatsapp-green/30 hover:shadow-xl hover:shadow-whatsapp-green/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mt-7">
          No account yet?{' '}
          <Link to="/register" className="text-whatsapp-teal dark:text-whatsapp-green font-semibold hover:underline transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
