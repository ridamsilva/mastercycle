
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = isLogin 
        ? await supabaseService.signIn(email, password)
        : await supabaseService.signUp(email, password);

      if (authError) throw authError;
      if (data.session) onSuccess(data.session);
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] p-10 shadow-xl border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" /></svg>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">MasterCycle</h1>
          <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Seu ciclo de estudos na nuvem</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase border border-rose-100">{error}</div>}
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
            <input 
              type="email" value={email} onChange={e => setEmail(e.target.value)} required 
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <input 
              type="password" value={password} onChange={e => setPassword(e.target.value)} required 
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold transition-all"
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
        >
          {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
        </button>
      </div>
    </div>
  );
};

export default Auth;
