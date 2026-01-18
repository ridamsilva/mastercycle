
import React from 'react';
import { Subject } from '../types';

interface SubjectCardProps {
  subject: Subject;
  onDelete: (id: string) => void;
  onEdit: (subject: Subject) => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onDelete, onEdit }) => {
  const sessionDuration = (subject.totalHours / subject.frequency).toFixed(1);

  // NOVA ESCALA SOLICITADA
  const getProgressColor = (val: number) => {
    if (val < 70) return 'bg-rose-500';
    if (val < 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColor = (val: number) => {
    if (val < 70) return 'text-rose-600 dark:text-rose-400';
    if (val < 80) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md dark:hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" 
            style={{ backgroundColor: subject.color }} 
          />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[150px] uppercase text-xs">{subject.name}</h3>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => onEdit(subject)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Editar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button 
            onClick={() => onDelete(subject.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
            title="Excluir"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 dark:text-slate-400 mb-4 font-bold uppercase tracking-wider">
        <div>
          <span className="block font-black text-slate-700 dark:text-slate-300">{subject.totalHours}h Totais</span>
          Carga
        </div>
        <div>
          <span className="block font-black text-slate-700 dark:text-slate-300">{subject.frequency}x</span>
          {sessionDuration}h/sessão
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest mb-1">
          <span className="text-slate-500 dark:text-slate-400">Domínio</span>
          <span className={`${getTextColor(subject.masteryPercentage)}`}>{subject.masteryPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-500 ${getProgressColor(subject.masteryPercentage)}`} 
            style={{ width: `${subject.masteryPercentage}%` }}
          />
        </div>
      </div>

      {subject.notebookUrl && (
        <a 
          href={subject.notebookUrl.startsWith('http') ? subject.notebookUrl : `https://${subject.notebookUrl}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
        >
          Caderno
        </a>
      )}
    </div>
  );
};

export default SubjectCard;
