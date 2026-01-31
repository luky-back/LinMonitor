import React, { useState, useEffect } from 'react';
import { translations } from '../translations';
import { User, UserRole } from '../types';
import { Shield, Key, UserPlus, Server, Check, ArrowRight } from 'lucide-react';

interface AuthProps {
  mode: 'login' | 'register' | 'setup';
  language: string;
  onLogin: (username: string) => void;
  onRegister: (code: string, username: string, password: string) => void;
  onSetup: (username: string, password: string) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  error?: string;
}

const Auth: React.FC<AuthProps> = ({ mode, language, onLogin, onRegister, onSetup, onSwitchMode, error }) => {
  const t = translations[language] || translations['en'];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [renderMode, setRenderMode] = useState(mode);

  // Handle smooth transitions between Login/Register
  useEffect(() => {
    if (mode !== renderMode) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setRenderMode(mode);
        setIsExiting(false);
        // Clear fields on switch
        setUsername('');
        setPassword('');
        setCode('');
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fake success delay for visual feedback if not error
    if (!error) {
       // We perform the action. If it fails, parent will set error prop.
       // If it succeeds, we show success animation.
       // Here we wrap the parent call to intercept.
       const performAction = () => {
         if (renderMode === 'login') {
            onLogin(username);
         } else if (renderMode === 'setup') {
            onSetup(username, password);
         } else {
            onRegister(code, username, password);
         }
       };

       setIsSuccess(true);
       setTimeout(() => {
         performAction();
       }, 800);
    }
  };
  
  // Reset success if error appears
  useEffect(() => {
    if (error) {
      setIsSuccess(false);
    }
  }, [error]);

  const containerAnimation = isExiting 
    ? "opacity-0 scale-95 translate-y-4" 
    : "opacity-100 scale-100 translate-y-0";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>

      {/* Ripple/Wave Effect Container */}
      {isSuccess && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
           {/* The "Water Stone" Ripple */}
           <div className="w-[50vw] h-[50vw] bg-emerald-500/10 rounded-full ripple-out"></div>
           <div className="w-[40vw] h-[40vw] bg-blue-500/10 rounded-full ripple-out delay-100 absolute"></div>
           <div className="w-[30vw] h-[30vw] bg-purple-500/10 rounded-full ripple-out delay-200 absolute"></div>
        </div>
      )}

      <div className={`max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 transition-all duration-300 ease-out transform z-10 drop-in ${containerAnimation}`}>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-95 duration-300">
             <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/30 animate-in zoom-in spin-in-12 duration-500">
                <Check size={40} strokeWidth={3} />
             </div>
             <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
             <p className="text-slate-400">Redirecting to dashboard...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-500 ${
                  renderMode === 'setup' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 
                  renderMode === 'register' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 
                  'bg-gradient-to-br from-emerald-500 to-teal-600'
              }`}>
                  {renderMode === 'setup' ? <Server size={32} /> : renderMode === 'register' ? <UserPlus size={32} /> : <Shield size={32} />}
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white text-center mb-2 animate-in slide-in-from-bottom-2 fade-in duration-500">
              {renderMode === 'setup' ? t.setupTitle : renderMode === 'register' ? t.register : t.loginTitle}
            </h1>
            <p className="text-slate-400 text-center text-sm mb-8 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-100">
              {renderMode === 'setup' ? t.setupDesc : renderMode === 'register' ? t.registerCode : "Welcome back to PiMonitor"}
            </p>

            {error && (
              <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm text-center animate-in shake duration-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {renderMode === 'register' && (
                <div className="animate-in slide-in-from-bottom-2 fade-in duration-500 delay-200">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.inviteCode}</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 tracking-widest text-center font-mono uppercase transition-all focus:ring-2 focus:ring-blue-500/20"
                    placeholder="XXXXXX"
                    maxLength={6}
                    required
                  />
                </div>
              )}

              <div className="animate-in slide-in-from-bottom-2 fade-in duration-500 delay-200">
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.username}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div className="animate-in slide-in-from-bottom-2 fade-in duration-500 delay-300">
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{t.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all focus:ring-2 focus:ring-blue-500/20"
                  required
                  minLength={renderMode === 'setup' ? 12 : 4}
                />
                {renderMode === 'setup' && <p className="text-xs text-slate-500 mt-1">{t.passwordMin}</p>}
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-300 ${
                  renderMode === 'setup' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                }`}
              >
                {renderMode === 'setup' ? "Initialize Server" : renderMode === 'register' ? t.register : t.login}
                <ArrowRight size={18} />
              </button>
            </form>

            {renderMode !== 'setup' && (
              <div className="mt-6 text-center animate-in fade-in duration-500 delay-300">
                <button
                  onClick={() => onSwitchMode(renderMode === 'login' ? 'register' : 'login')}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {renderMode === 'login' ? "Have an invite code? Register" : "Already have an account? Login"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;