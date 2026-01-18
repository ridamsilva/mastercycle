
import React, { useMemo } from 'react';
import { Subject } from '../types';

interface PerformanceRankProps {
  subjects: Subject[];
}

const PerformanceRank: React.FC<PerformanceRankProps> = React.memo(({ subjects }) => {
  if (subjects.length === 0) return null;

  const ranked = useMemo(() => 
    [...subjects].sort((a, b) => a.masteryPercentage - b.masteryPercentage).slice(0, 5)
  , [subjects]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg flex items-center justify-center">🚩</div>
        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Atenção Prioritária</h3>
      </div>
      <div className="space-y-3">
        {ranked.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[10px] font-black text-slate-400 w-4">{i + 1}º</span>
              <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate uppercase">{s.name}</span>
            </div>
            <span className={`text-[10px] font-black ${s.masteryPercentage < 70 ? 'text-rose-500' : 'text-brand-orange'}`}>
              {s.masteryPercentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default PerformanceRank;
