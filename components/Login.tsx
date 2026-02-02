import React from 'react';
import { ICONS, APP_NAME } from '../constants';
import { LogIn, User } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
  onGuestLogin: () => void;
  loading: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, onGuestLogin, loading }) => {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
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

        <div className="space-y-3">
          <button 
            onClick={onLogin}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
               <span className="animate-pulse">Connecting...</span>
            ) : (
               <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
               </>
            )}
          </button>

          <button 
            onClick={onGuestLogin}
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <User className="w-5 h-5" />
            Continue as Guest
          </button>
        </div>
        
        <div className="mt-8 text-xs text-brand-muted">
          <p>Secure cloud storage powered by Google Firebase.</p>
          <p className="mt-1 opacity-50">Guest mode uses local browser storage.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;