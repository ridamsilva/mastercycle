
import React from 'react';
import { Subject, CycleItem } from '../types';

interface UserProfileProps {
  user: any;
  subjects: Subject[];
  cycleItems: CycleItem[];
  onClose: () => void;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, subjects, cycleItems, onClose, onLogout }) => {
  const totalHours = subjects.reduce((acc, s) => acc + s.totalHours, 0);
  const completedItems = cycleItems.filter(i => i.completed).length;
  const completionRate = cycleItems.length > 0 ? Math.round((completedItems / cycleItems.length) * 100) : 0;
  const avgMastery = subjects.length > 0 
    ? Math.round(subjects.reduce((acc, s) => acc + s.masteryPercentage, 0) / subjects.length) 
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Profile Panel */}
      <div className="relative w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] bg-white dark:bg-slate-900 sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header com Gradiente */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-5 mt-4">
            <div className="w-20 h-20 rounded-[28px] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl shadow-xl">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Meu Perfil</h2>
              <p className="text-indigo-100/80 text-sm font-medium truncate max-w-[200px]">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Total</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{totalHours}h</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disciplinas</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{subjects.length}</span>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Desempenho Geral</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400">Ciclo Atual</span>
                  <span className="text-indigo-600">{completionRate}% Concluído</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-1000" 
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400">Domínio Médio</span>
                  <span className="text-emerald-600">{avgMastery}% Conhecimento</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${avgMastery}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/30">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Dados Sincronizados</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Seu progresso é salvo automaticamente na nuvem para você acessar de qualquer dispositivo.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button 
            onClick={onLogout}
            className="w-full py-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-black rounded-2xl transition-all flex items-center justify-center gap-3 border border-rose-100 dark:border-rose-900/30 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ENCERRAR SESSÃO
          </button>
          <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.2em] mt-6">
            MasterCycle Engine • v2.5.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
