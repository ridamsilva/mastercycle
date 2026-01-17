
import React from 'react';
import { Subject } from '../types';

interface PerformanceRankProps {
  subjects: Subject[];
}

const PerformanceRank: React.FC<PerformanceRankProps> = ({ subjects }) => {
  if (subjects.length === 0) return null;

  // Sort subjects by mastery percentage (ascending - worst first)
  const rankedSubjects = [...subjects].sort((a, b) => a.masteryPercentage - b.masteryPercentage);

  return (
    <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
          Rank de Desempenho
        </h3>
      </div>
      
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">
        Zonas de Atenção (Piores Médias)
      </p>

      <div className="space-y-3">
        {rankedSubjects.slice(0, 5).map((subject, index) => (
          <div key={subject.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-rose-200 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-black text-slate-300 w-4">{index + 1}º</span>
              <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: subject.color }} />
              <span className="text-xs font-bold text-slate-700 truncate max-w-[100px]">
                {subject.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ${
                    subject.masteryPercentage < 60 ? 'bg-rose-500' : 
                    subject.masteryPercentage < 80 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${subject.masteryPercentage}%` }}
                />
              </div>
              <span className={`text-[10px] font-black w-8 text-right ${
                subject.masteryPercentage < 60 ? 'text-rose-600' : 'text-slate-600'
              }`}>
                {subject.masteryPercentage}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {rankedSubjects.length > 5 && (
        <p className="text-[9px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">
          +{rankedSubjects.length - 5} outras disciplinas
        </p>
      )}
    </div>
  );
};

export default PerformanceRank;
