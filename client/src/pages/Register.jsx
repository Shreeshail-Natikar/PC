import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-emerald-500 to-teal-600 dark:from-cyan-800 dark:via-whatsapp-teal dark:to-emerald-900 transition-colors duration-500" />
      <div className="absolute inset-0 opacity-30 dark:opacity-40">
        <div className="absolute top-20 right-20 w-80 h-80 rounded-full bg-pink-300/20 blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-purple-300/20 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-yellow-200/20 blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-xl animate-bounceSoft">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-2xl font-bold mb-1 text-gray-800 dark:text-white">
            Create your account
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Just the two of you — registration closes after 2 accounts
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-whatsapp-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              required
              placeholder="Name"
              className="w-full rounded-xl border border-gray-300/70 dark:border-gray-600/50 bg-white/60 dark:bg-black/30 backdrop-blur pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green/50 focus:border-whatsapp-green dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

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
              placeholder="Password (min 8 chars, 1 number)"
              className="w-full rounded-xl border border-gray-300/70 dark:border-gray-600/50 bg-white/60 dark:bg-black/30 backdrop-blur pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green/50 focus:border-whatsapp-green dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-2.5 animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-whatsapp-green py-3 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {submitting ? 'Creating account…' : '✨ Register'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mt-7">
          Already have an account?{' '}
          <Link to="/login" className="text-whatsapp-teal dark:text-whatsapp-green font-semibold hover:underline transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
