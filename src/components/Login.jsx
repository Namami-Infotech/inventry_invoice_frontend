import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  Building2,
  Receipt,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { authService } from '../services/api';

export default function Login({ onLoginSuccess, companySetting }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const companyName = companySetting?.companyName || 'GST Invoicing Portal';
  const stateOrigin = companySetting?.state || '';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!identifier.trim() || !password) {
      setError('कृपया Username/Email और Password दर्ज करें');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await authService.login(identifier.trim(), password);

      if (res.data?.success) {
        const { token, user } = res.data;
        authService.saveSession(token, user);
        onLoginSuccess(user);
      } else {
        setError(res.data?.message || 'Login failed. Only Admin is authorized.');
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.message || err.message || 'Server connection error. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Subtle Ambient Decorative Accents */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-indigo-100/50 via-slate-50 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Centered Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/70 p-6 sm:p-8 text-slate-800 relative z-10 transition-all">
        {/* Brand / Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 shadow-md shadow-indigo-500/25 text-white mb-3 ring-4 ring-indigo-50">
            <Receipt className="w-6 h-6" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {companyName}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dual-GST Tax Invoice Engine {stateOrigin ? `• ${stateOrigin}` : ''}
          </p>

          {/* Admin Exclusive Badge */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 mt-3 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold tracking-wide shadow-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>केवल ADMIN लॉगिन कर सकते हैं (Admin Only)</span>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Admin Identifier */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Admin Email / Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. admin@namamienterprises.com"
                autoComplete="username"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-3 focus:ring-indigo-500/15 transition-all"
              />
            </div>
          </div>

          {/* Admin Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-3 focus:ring-indigo-500/15 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>प्रमाणित कर रहे हैं (Verifying)...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Admin Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-4 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>Protected System • 256-bit Encrypted Token Session</span>
        </div>
      </div>
    </div>
  );
}
