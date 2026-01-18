
import React from 'react';
import { Subject, CycleItem } from '../types';
import { supabaseService } from '../services/supabaseService.ts';

interface UserProfileProps {
  subjects: Subject[];
  cycleItems: CycleItem[];
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ subjects, cycleItems, onClose }) => {
  const totalHours = subjects.reduce((acc, s) => acc + s.totalHours, 0);
  const completedItems = cycleItems.filter(i => i.completed).length;
  const completionRate = cycleItems.length > 0 ? Math.round((completedItems / cycleItems.length) * 100) : 0;
  const avgMastery = subjects.length > 0 
    ? Math.round(subjects.reduce((acc, s) => acc + s.masteryPercentage, 0) / subjects.length) 
    : 0;

  const handleLogout = async () => {
    await supabaseService.signOut();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end sm:p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] bg-white dark:bg-slate-900 sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-500">
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
              📊
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Meu Perfil</h2>
              <p className="text-indigo-100/80 text-sm font-medium">Estudo e Performance</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Total</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{totalHours}h</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Matérias</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{subjects.length}</span>
            </div>
          </div>

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
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
           <button 
            onClick={handleLogout}
            className="w-full py-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-black rounded-2xl transition-all uppercase text-xs tracking-widest border border-rose-100 dark:border-rose-900/40"
          >
            Sair da Conta
          </button>
           <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl transition-all uppercase text-xs tracking-widest"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
