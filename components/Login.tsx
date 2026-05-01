import React, { useState } from 'react';
import { ICONS, APP_NAME } from '../constants';
import { User, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
  onGuestLogin: () => void;
  loading: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSignUp, onGuestLogin, loading }) => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (tab === 'login') onLogin(email, password);
    else onSignUp(email, password);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-green/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-brand-green/5 rounded-full blur-[128px]" />

      <div className="z-10 bg-brand-card border border-white/5 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-brand-green flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-green/20">
          <ICONS.Bank className="text-black w-8 h-8" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">{APP_NAME}</h1>
        <p className="text-brand-muted mb-8">
          Your unified personal wealth dashboard. Track stocks, crypto, cash, and liabilities in one secure place.
        </p>

        {/* Tab */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'login' ? 'bg-brand-green text-black' : 'text-brand-muted hover:text-white'}`}
          >
            登录
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'signup' ? 'bg-brand-green text-black' : 'text-brand-muted hover:text-white'}`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mb-3">
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 text-white placeholder-brand-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-green transition-colors"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 text-white placeholder-brand-muted rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-brand-green transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green text-black font-bold py-4 rounded-xl hover:bg-brand-green/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <span className="animate-pulse">处理中...</span> : tab === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <button
          onClick={onGuestLogin}
          disabled={loading}
          className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <User className="w-5 h-5" />
          Continue as Guest
        </button>

        <div className="mt-8 text-xs text-brand-muted">
          <p>Secure cloud storage powered by Supabase.</p>
          <p className="mt-1 opacity-50">Guest mode uses local browser storage.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
