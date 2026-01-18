
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabaseService.signIn(email, password);
        if (authError) throw authError;
        if (data.session) onSuccess(data.session);
      } else {
        const { data, error: authError } = await supabaseService.signUp(email, password);
        
        if (authError) {
          const errMsg = authError.message.toLowerCase();
          if (
            errMsg.includes('already registered') || 
            errMsg.includes('already exists') || 
            authError.status === 422 ||
            authError.status === 400 && errMsg.includes('registered')
          ) {
            setError('Este e-mail já está sendo utilizado por outra conta.');
          } else {
            setError(authError.message || 'Ocorreu um erro ao criar a conta.');
          }
          return;
        }

        if (data.user) {
          if (!data.session) {
            setSuccessMessage('Conta pré-registrada! Verifique seu e-mail para ativar sua conta.');
            setIsLogin(true);
            setEmail('');
            setPassword('');
          } else {
            onSuccess(data.session);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[40px] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          {/* LOGOTIPO ATUALIZADO: CANETA INCLINADA À DIREITA E PONTA NO FINAL DO CHECK */}
          <div className="w-48 h-48 relative mb-2 group">
            <svg viewBox="0 0 250 250" className="w-full h-full drop-shadow-2xl transition-transform duration-700 group-hover:scale-105">
              {/* Seta Azul Superior */}
              <path d="M125 35 A 90 90 0 0 0 35 125" fill="none" stroke="#0066b2" strokeWidth="18" strokeLinecap="round" />
              <path d="M110 20 L 145 35 L 110 50 Z" fill="#0066b2" />
              
              {/* Seta Laranja Inferior */}
              <path d="M125 215 A 90 90 0 0 0 215 125" fill="none" stroke="#f37021" strokeWidth="18" strokeLinecap="round" />
              <path d="M140 230 L 105 215 L 140 200 Z" fill="#f37021" />

              {/* Folha de Gabarito */}
              <g transform="rotate(-10, 125, 125)">
                <rect x="80" y="65" width="90" height="120" rx="6" fill="white" stroke="#334155" strokeWidth="3" />
                {[0, 1, 2, 3, 4].map(row => (
                  <g key={row} transform={`translate(0, ${row * 22})`}>
                    <circle cx="98" cy="85" r="5" stroke="#cbd5e1" strokeWidth="1.5" fill={row === 1 ? "#0066b2" : "none"} />
                    <circle cx="118" cy="85" r="5" stroke="#cbd5e1" strokeWidth="1.5" fill={row === 0 ? "#0066b2" : "none"} />
                    <circle cx="138" cy="85" r="5" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                    <circle cx="158" cy="85" r="5" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                  </g>
                ))}
                {/* Checkmark Vermelho */}
                <path d="M120 125 L 132 140 L 155 110" stroke="#d00" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Caneta (Ajustada: Inclinada para a Direita) */}
              <g transform="rotate(40, 125, 125) translate(38, -84)">
                {/* Corpo Superior Azul */}
                <path d="M110 30 L 140 30 L 140 100 L 110 100 Z" fill="#0066b2" />
                <path d="M110 30 Q 125 15 140 30" fill="#0066b2" />
                {/* Detalhe Clipe */}
                <rect x="135" y="45" width="10" height="40" rx="2" fill="#94a3b8" />
                {/* Anel Prata */}
                <rect x="108" y="100" width="34" height="6" fill="#cbd5e1" />
                {/* Grip Laranja */}
                <path d="M110 106 L 140 106 L 135 160 L 115 160 Z" fill="#f37021" />
                {/* Ponta Branca */}
                <path d="M115 160 L 135 160 L 125 190 Z" fill="white" />
                {/* Ponta Grafite (Este ponto encosta no final do check) */}
                <circle cx="125" cy="190" r="3" fill="#334155" />
              </g>

              {/* Brilhos */}
              <path d="M185 45 L 188 52 L 195 55 L 188 58 L 185 65 L 182 58 L 175 55 L 182 52 Z" fill="#f37021" />
              <path d="M205 75 L 207 80 L 212 82 L 207 84 L 205 89 L 203 84 L 198 82 L 203 80 Z" fill="#0066b2" />
            </svg>
          </div>

          <div className="flex text-4xl font-black tracking-tighter uppercase mb-1">
            <span className="text-[#0066b2]">MASTER</span>
            <span className="text-[#f37021]">CYCLE</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] text-center">Planejamento • Foco • Aprovação</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase border border-rose-100 dark:border-rose-900/40">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu E-mail</label>
            <input 
              type="email" value={email} onChange={e => setEmail(e.target.value)} required 
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-2 border-transparent focus:border-[#0066b2] outline-none font-bold transition-all"
              placeholder="estudante@foco.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Segura</label>
            <input 
              type="password" value={password} onChange={e => setPassword(e.target.value)} required 
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-2 border-transparent focus:border-[#0066b2] outline-none font-bold transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-[#0066b2] to-[#004a80] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 dark:shadow-none hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            {loading ? 'Sincronizando...' : isLogin ? 'Entrar no Ciclo' : 'Começar Agora'}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#f37021] transition-colors"
        >
          {isLogin ? 'Não tem conta? Crie aqui' : 'Já é membro? Faça Login'}
        </button>
      </div>
    </div>
  );
};

export default Auth;
