
import React from 'react';
import { Subject } from '../types';

interface SubjectCardProps {
  subject: Subject;
  onDelete: (id: string) => void;
  onEdit: (subject: Subject) => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onDelete, onEdit }) => {
  const sessionDuration = (subject.totalHours / subject.frequency).toFixed(1);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md dark:hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" 
            style={{ backgroundColor: subject.color }} 
          />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[150px]">{subject.name}</h3>
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
      
      <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
        <div>
          <span className="block font-medium text-slate-700 dark:text-slate-300">{subject.totalHours}h Totais</span>
          Carga Horária
        </div>
        <div>
          <span className="block font-medium text-slate-700 dark:text-slate-300">{subject.frequency}x</span>
          {sessionDuration}h por sessão
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-slate-500 dark:text-slate-400">Domínio da Matéria</span>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{subject.masteryPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
          <div 
            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500" 
            style={{ width: `${subject.masteryPercentage}%` }}
          />
        </div>
      </div>

      {subject.notebookUrl && (
        <a 
          href={subject.notebookUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
          Caderno de Questões
        </a>
      )}
    </div>
  );
};

export default SubjectCard;
