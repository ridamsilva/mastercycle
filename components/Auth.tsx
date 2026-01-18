
import React, { useState } from 'react';
import { supabaseService } from '../services/supabaseService.ts';

interface AuthProps {
  onSuccess: (session: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = isLogin 
        ? await supabaseService.signIn(email, password)
        : await supabaseService.signUp(email, password);

      if (authError) throw authError;
      
      if (!isLogin && data.user && !data.session) {
        setError('🎉 Conta criada com sucesso! Por favor, confirme seu e-mail para ativar seu acesso.');
        setIsLogin(true);
      } else if (data.session) {
        onSuccess(data.session);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos. Tente novamente.');
      } else if (err.message.includes('User already registered')) {
        setError('Este e-mail já possui uma conta ativa.');
      } else if (err.message.includes('Email not confirmed')) {
        setError('Por favor, confirme seu e-mail antes de entrar.');
      } else {
        setError(err.message || 'Ocorreu um erro na conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950 font-inter selection:bg-indigo-100 selection:text-indigo-900">
      
      <div className="hidden lg:flex w-1/2 bg-indigo-600 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400 blur-[120px]" />
        </div>
        
        <div className="relative z-10 max-w-lg text-white">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-2xl mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          
          <h2 className="text-5xl font-black tracking-tighter mb-6 leading-tight">
            Seu próximo nível de <span className="text-indigo-200">performance</span> começa aqui.
          </h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                <span className="text-lg">🎯</span>
              </div>
              <div>
                <h4 className="font-bold text-lg">Ciclo Inteligente</h4>
                <p className="text-indigo-100 text-sm opacity-80">Distribuição automática de carga horária baseada em suas necessidades.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                <span className="text-lg">🤖</span>
              </div>
              <div>
                <h4 className="font-bold text-lg">Mentor IA</h4>
                <p className="text-indigo-100 text-sm opacity-80">Receba dicas estratégicas baseadas no seu desempenho real.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                <span className="text-lg">⏱️</span>
              </div>
              <div>
                <h4 className="font-bold text-lg">Foco Total</h4>
                <p className="text-indigo-100 text-sm opacity-80">Timer Pomodoro integrado para manter sua mente afiada.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="mb-10 lg:hidden text-center">
             <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                </svg>
             </div>
             <h1 className="text-2xl font-black text-slate-900 dark:text-white">MasterCycle</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {isLogin ? 'Continue sua jornada rumo à aprovação.' : 'Comece a organizar seus estudos agora mesmo.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                  </svg>
                </div>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 focus:outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="No mínimo 6 caracteres"
                  className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 focus:outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 font-medium"
                />
              </div>
            </div>

            {error && (
              <div className={`p-4 rounded-2xl text-xs font-bold animate-in zoom-in-95 ${
                error.includes('sucesso') 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30' 
                  : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/30'
              }`}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="tracking-widest uppercase text-xs">{isLogin ? 'Entrar no Sistema' : 'Começar Gratuitamente'}</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {isLogin ? 'Ainda não tem acesso?' : 'Já possui uma conta?'}
            </p>
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="px-6 py-2 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              {isLogin ? 'Cadastrar' : 'Fazer Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
