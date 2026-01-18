
import React from 'react';
import { CycleHistoryEntry, Subject } from '../types';

interface HistoryDetailProps {
  entry: CycleHistoryEntry;
  subjects: Subject[];
  onClose: () => void;
}

const HistoryDetail: React.FC<HistoryDetailProps> = ({ entry, subjects, onClose }) => {
  const getSubject = (id: string) => subjects.find(s => s.id === id);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getPerformanceColor = (val: number | undefined) => {
    if (val === undefined) return 'text-slate-400';
    if (val < 70) return 'text-rose-500';
    if (val < 80) return 'text-brand-orange';
    return 'text-emerald-500';
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-10 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] bg-white dark:bg-slate-900 sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        <div className="bg-gradient-to-br from-brand-blue to-brand-darkBlue p-6 sm:p-10 text-white shrink-0 relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200">Relatório de Desempenho</span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase leading-none">Ciclo Finalizado</h2>
              <p className="text-blue-100/70 text-xs font-medium uppercase tracking-widest">{formatDate(entry.completedAt)}</p>
            </div>
            <div className="flex gap-8">
              <div className="text-center"><span className="block text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1">Média</span><span className="text-3xl font-black">{entry.avgPerformance}%</span></div>
              <div className="text-center border-l border-white/10 pl-8"><span className="block text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1">Horas</span><span className="text-3xl font-black">{entry.totalHours}H</span></div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 custom-scrollbar bg-slate-50 dark:bg-slate-900">
          {entry.cycleSnapshot.map((item, idx) => {
            const sub = getSubject(item.subjectId);
            // Prioriza o nome/cor persistidos no snapshot
            const displayName = item.subjectName || sub?.name || 'Disciplina Excluída';
            const displayColor = item.subjectColor || sub?.color || '#cbd5e1';
            
            return (
              <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0" style={{ backgroundColor: displayColor, color: 'white' }}>{idx + 1}</div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase text-xs truncate">{displayName}</h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.duration}H • CONCLUÍDO</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Desempenho</span>
                  <span className={`text-lg font-black ${getPerformanceColor(item.performance)}`}>{item.performance ?? '--'}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-center">
           <button onClick={onClose} className="px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]">Sair</button>
        </div>
      </div>
    </div>
  );
};

export default HistoryDetail;
