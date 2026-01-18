
import React, { useState, useMemo } from 'react';
import { CycleItem, Subject, Topic } from '../types';

interface CycleListProps {
  items: CycleItem[];
  subjects: Subject[];
  onToggleComplete: (itemId: string) => void;
  onUpdatePerformance: (itemId: string, value: number) => void;
  onUpdateUrl: (itemId: string, url: string) => void;
  onMoveItem: (itemId: string, direction: 'up' | 'down') => void;
  onAppendCycle: () => void;
  onUpdateSubjectTopics: (subjectId: string, topics: Topic[]) => void;
}

const CycleRow = React.memo(({ 
  item, idx, sub, isExpanded, isEditingUrl, totalCount,
  onToggle, onExpand, onEditUrl, onUpdatePerf, onMove, onUpdateUrl 
}: any) => {
  if (!sub) return null;

  const getPerformanceStyles = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return 'bg-slate-100 dark:bg-slate-800 text-slate-400';
    if (val < 70) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'; 
    if (val < 80) return 'bg-orange-100 text-brand-orange dark:bg-orange-900/40 dark:text-orange-300'; 
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'; 
  };

  const formatShortUrl = (url: string) => {
    if (!url) return "";
    const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    return cleanUrl.length > 10 ? cleanUrl.substring(0, 8) + '..' : cleanUrl;
  };

  return (
    <div className={`${item.completed ? 'bg-slate-50/30 dark:bg-slate-800/10 opacity-75' : ''} transition-all duration-200 group/row`}>
      <div className={`grid grid-cols-[30px_45px_1fr_60px_60px_35px] sm:grid-cols-[40px_100px_1fr_100px_100px_40px] items-center gap-1 sm:gap-2 px-2 sm:px-6 py-3 sm:py-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isExpanded ? 'bg-blue-50/20 dark:bg-blue-900/10 border-l-4 border-l-brand-blue' : ''}`}>
        
        <div className="flex flex-col gap-1 opacity-60 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
          <button disabled={item.completed || idx === 0} onClick={() => onMove(item.id, 'up')} className="p-0.5 text-slate-300 hover:text-brand-blue disabled:opacity-0">
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" /></svg>
          </button>
          <button disabled={item.completed || idx === totalCount - 1} onClick={() => onMove(item.id, 'down')} className="p-0.5 text-slate-300 hover:text-brand-blue disabled:opacity-0">
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
          </button>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={() => onToggle(item.id)}
            className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl flex items-center justify-center border-2 transition-all ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}
          >
            {item.completed ? <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
          </button>
        </div>
        
        <div className="min-w-0 cursor-pointer" onClick={() => onExpand(isExpanded ? null : item.id)}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="shrink-0 w-1 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
            <h4 className={`font-black text-[10px] sm:text-sm uppercase truncate ${item.completed ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-white'}`}>{sub.name}</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] sm:text-[9px] font-black text-brand-blue/70 uppercase tracking-widest">{item.duration}H</span>
            {item.completedAt && <span className="text-[6px] sm:text-[8px] font-bold text-slate-400 uppercase">{new Date(item.completedAt).toLocaleDateString()}</span>}
          </div>
        </div>

        <div className="flex flex-col justify-center items-center relative">
          {item.sessionUrl ? (
            <>
              <a href={item.sessionUrl.startsWith('http') ? item.sessionUrl : `https://${item.sessionUrl}`} target="_blank" rel="noopener" className="text-[9px] sm:text-[11px] font-black text-blue-600 truncate max-w-[50px] sm:max-w-[100px]">{formatShortUrl(item.sessionUrl)}</a>
              <button onClick={() => onEditUrl(isEditingUrl ? null : item.id)} className="text-[7px] font-black text-slate-400 uppercase">EDIT</button>
            </>
          ) : (
            <button onClick={() => onEditUrl(isEditingUrl ? null : item.id)} className="p-1 text-slate-300 hover:text-blue-600"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" /></svg></button>
          )}
          {isEditingUrl && (
            <div className="absolute top-full right-0 mt-3 z-50 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-64 animate-in zoom-in duration-150">
              <input autoFocus value={item.sessionUrl || ""} onChange={e => onUpdateUrl(item.id, e.target.value)} placeholder="URL..." className="w-full p-2 text-[10px] font-bold rounded-lg border-2 dark:bg-slate-950 dark:border-slate-800" />
              <button onClick={() => onEditUrl(null)} className="w-full mt-2 py-1.5 text-[9px] font-black bg-blue-600 text-white rounded-md uppercase">OK</button>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <div className={`flex items-center justify-center w-full max-w-[55px] h-8 sm:h-10 rounded-lg sm:rounded-xl transition-all ${getPerformanceStyles(item.performance)}`}>
            <input type="number" value={item.performance ?? ""} placeholder="--" onChange={e => onUpdatePerf(item.id, Number(e.target.value))} className="w-6 sm:w-8 bg-transparent text-right text-[10px] sm:text-xs font-black outline-none border-none p-0" />
            {item.performance != null && <span className="text-[8px] font-black ml-0.5">%</span>}
          </div>
        </div>

        <button onClick={() => onExpand(isExpanded ? null : item.id)} className="p-1 text-slate-300 hover:text-brand-blue">
            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
    </div>
  );
});

const CycleList: React.FC<CycleListProps> = ({ 
  items, subjects, onToggleComplete, onUpdatePerformance, onUpdateUrl, onMoveItem, onAppendCycle, onUpdateSubjectTopics
}) => {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  // Filtra itens por status para melhor organização visual
  const activeItems = useMemo(() => items.filter(i => !i.completed).sort((a, b) => a.order - b.order), [items]);
  
  // Ordenar histórico: mais recentes (completedAt maior) ficam no topo do bloco de histórico
  const completedItems = useMemo(() => items.filter(i => i.completed).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)), [items]);

  const canRenovate = activeItems.length === 0 && items.length > 0;

  if (items.length === 0) return (
    <div className="py-20 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] text-center">
      <p className="text-sm font-black uppercase tracking-widest opacity-30">Seu ciclo de estudos aparecerá aqui</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
              <span className="w-1.5 h-5 bg-brand-blue rounded-full"></span> CICLO ATUAL
            </h2>
            <p className="text-[10px] font-black text-brand-blue uppercase mt-1">Sessões em aberto: {activeItems.length}</p>
          </div>
          {canRenovate && (
            <button 
              onClick={onAppendCycle} 
              className="px-6 py-3 bg-brand-orange text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-orange-100 hover:scale-105 active:scale-95 transition-all animate-in zoom-in duration-300"
            >
              Renovar Ciclo
            </button>
          )}
        </div>
        <div className="flex gap-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          {items.map(i => (
            <div key={i.id} className={`flex-1 transition-all duration-300 ${i.completed ? 'opacity-100' : 'opacity-10'}`} style={{ backgroundColor: subjects.find(s => s.id === i.subjectId)?.color || '#ccc' }} />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {activeItems.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-blue-50/30 dark:bg-blue-900/10 border-b border-slate-100 dark:border-slate-800">
               <h3 className="text-[10px] font-black text-brand-blue uppercase tracking-widest">Sessões Pendentes</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeItems.map((item, idx) => (
                <CycleRow 
                  key={item.id} item={item} idx={idx} totalCount={activeItems.length}
                  sub={subjects.find(s => s.id === item.subjectId)}
                  isExpanded={expandedItemId === item.id}
                  isEditingUrl={editingUrlId === item.id}
                  onToggle={onToggleComplete}
                  onExpand={setExpandedItemId}
                  onEditUrl={setEditingUrlId}
                  onUpdatePerf={onUpdatePerformance}
                  onMove={onMoveItem}
                  onUpdateUrl={onUpdateUrl}
                />
              ))}
            </div>
          </div>
        )}

        {completedItems.length > 0 && (
          <div className="space-y-4">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="w-full py-4 flex items-center justify-between px-6 bg-slate-100 dark:bg-slate-800/50 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 transition-colors"
            >
              <span>Histórico do Ciclo ({completedItems.length})</span>
              <span>{showHistory ? 'Ocultar' : 'Mostrar'}</span>
            </button>
            
            {showHistory && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-sm opacity-90 scale-[0.98]">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {completedItems.map((item, idx) => (
                    <CycleRow 
                      key={item.id} item={item} idx={idx} totalCount={completedItems.length}
                      sub={subjects.find(s => s.id === item.subjectId)}
                      isExpanded={expandedItemId === item.id}
                      isEditingUrl={editingUrlId === item.id}
                      onToggle={onToggleComplete}
                      onExpand={setExpandedItemId}
                      onEditUrl={setEditingUrlId}
                      onUpdatePerf={onUpdatePerformance}
                      onMove={onMoveItem}
                      onUpdateUrl={onUpdateUrl}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CycleList;
