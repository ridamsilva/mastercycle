
import React from 'react';
import { Subject } from '../types';

interface SubjectCardProps {
  subject: Subject;
  onDelete: (id: string) => void;
  onEdit: (subject: Subject) => void;
}

const SubjectCard: React.FC<SubjectCardProps> = React.memo(({ subject, onDelete, onEdit }) => {
  const sessionDuration = (subject.totalHours / subject.frequency).toFixed(1);

  // Determinar cores uma única vez por renderização
  const isRed = subject.masteryPercentage < 70;
  const isOrange = subject.masteryPercentage < 80;

  const progressColor = isRed ? 'bg-rose-500' : isOrange ? 'bg-brand-orange' : 'bg-emerald-500';
  const textColor = isRed ? 'text-rose-600' : isOrange ? 'text-brand-orange' : 'text-emerald-600';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 p-6 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: subject.color }} />
          <h3 className="font-black text-slate-700 dark:text-slate-100 uppercase text-[13px] tracking-tight">{subject.name}</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(subject)} className="p-2 text-slate-400 hover:text-brand-blue hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={() => onDelete(subject.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <span className="block font-black text-slate-800 dark:text-slate-200 text-sm uppercase">{subject.totalHours}H TOTAIS</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carga</span>
        </div>
        <div>
          <span className="block font-black text-slate-800 dark:text-slate-200 text-sm uppercase">{subject.frequency}X</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sessionDuration}H/SESSÃO</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Domínio</span>
          <span className={`text-xs font-black ${textColor}`}>{subject.masteryPercentage}%</span>
        </div>
        <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-1000 ${progressColor}`} style={{ width: `${subject.masteryPercentage}%` }} />
        </div>
      </div>
    </div>
  );
});

export default SubjectCard;
