
import React, { useState } from 'react';
import { CycleItem, Subject, Topic } from '../types';

interface CycleListProps {
  items: CycleItem[];
  subjects: Subject[];
  onToggleComplete: (itemId: string) => void;
  onUpdatePerformance: (itemId: string, value: number) => void;
  onUpdateUrl: (itemId: string, url: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onAppendCycle: () => void;
  onUpdateSubjectTopics: (subjectId: string, topics: Topic[]) => void;
}

const CycleList: React.FC<CycleListProps> = ({ 
  items, subjects, onToggleComplete, onUpdatePerformance, onUpdateUrl, onReorder, onAppendCycle, onUpdateSubjectTopics
}) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");

  const getSubject = (id: string) => subjects.find(s => s.id === id);
  
  const sortedItems = [...items].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; 
    }
    return b.order - a.order; 
  });

  const getPerformanceStyles = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return 'bg-slate-100 dark:bg-slate-800 text-slate-400';
    if (val < 70) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'; 
    if (val < 80) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'; 
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'; 
  };

  const getPercentageColor = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return 'text-slate-400';
    if (val < 70) return 'text-rose-600 dark:text-rose-400';
    if (val < 80) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] text-slate-400">
        <p className="text-sm font-black uppercase tracking-widest opacity-30">Seu fluxo de estudos aparecerá aqui</p>
      </div>
    );
  }

  const completedCount = items.filter(i => i.completed).length;

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-600 rounded-full inline-block"></span>
              FLUXO DO CICLO ATUAL
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Progresso: {completedCount} / {items.length} blocos concluídos
            </p>
          </div>
          {completedCount === items.length && (
            <button onClick={onAppendCycle} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black hover:scale-105 active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none">
              RENOVAR CICLO
            </button>
          )}
        </div>

        <div className="flex gap-1.5 h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1">
          {[...items].sort((a,b) => a.order - b.order).map((item) => (
            <div 
              key={item.id}
              className={`flex-1 rounded-full transition-all duration-500 ${item.completed ? 'opacity-100' : 'opacity-20'}`}
              style={{ backgroundColor: getSubject(item.subjectId)?.color || '#ccc' }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-2">
        <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Lista de Atividades</h3>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
        {/* CABEÇALHO GRID COM LARGURAS FIXAS PARA ALINHAMENTO */}
        <div className="hidden sm:grid grid-cols-[60px_35%_40%_15%_40px] items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div /> 
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Disciplina</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Caderno / Link</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Nota (%)</span>
          </div>
          <div />
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedItems.map((item) => {
            const sub = getSubject(item.subjectId);
            if (!sub) return null;
            const isExpanded = expandedItemId === item.id;

            return (
              <div key={item.id} className={`${item.completed ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''}`}>
                <div 
                  draggable onDragStart={() => setDraggedItemId(item.id)} onDragOver={e => e.preventDefault()}
                  onDrop={() => draggedItemId && onReorder(draggedItemId, item.id)}
                  className={`grid grid-cols-1 sm:grid-cols-[60px_35%_40%_15%_40px] items-center gap-4 px-6 py-5 cursor-default hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-900/10 border-l-4 border-l-indigo-500' : ''}`}
                >
                  <button 
                    onClick={() => onToggleComplete(item.id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all shrink-0 ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}
                  >
                    {item.completed ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
                  </button>
                  
                  <div className="min-w-0 cursor-pointer" onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                      <h4 className={`font-black text-sm uppercase truncate ${item.completed ? 'text-slate-400' : 'text-slate-800 dark:text-white'}`}>{sub.name}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[9px] font-black text-indigo-500/70 uppercase tracking-widest">{item.duration}H</span>
                      {item.completed && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatDate(item.completedAt)}</span>}
                    </div>
                  </div>

                  {/* Campo Link / Caderno alinhado exatamente sob o título */}
                  <div className="px-2">
                    <div className="relative group flex items-center">
                      <input 
                        type="text" value={item.sessionUrl || ""} placeholder="Link material..." 
                        onChange={e => onUpdateUrl(item.id, e.target.value)}
                        className="w-full h-10 px-3 pr-8 text-[10px] font-bold rounded-xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-950 focus:border-indigo-500 outline-none transition-all"
                      />
                      {item.sessionUrl && (
                        <a href={item.sessionUrl.startsWith('http') ? item.sessionUrl : `https://${item.sessionUrl}`} target="_blank" rel="noopener noreferrer" className="absolute right-2 text-indigo-500 hover:text-indigo-700 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Campo Nota com Símbolo de % Dinâmico */}
                  <div className="flex justify-center">
                    <div className="relative flex items-center w-full max-w-[80px]">
                      <input 
                        type="number" value={item.performance ?? ""} placeholder="--" 
                        onChange={e => onUpdatePerformance(item.id, Number(e.target.value))}
                        className={`w-full h-10 text-center text-xs font-black rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all pr-4 ${getPerformanceStyles(item.performance)}`} 
                      />
                      {item.performance !== undefined && item.performance !== null && !isNaN(item.performance) && (
                        <span className={`absolute right-2 text-[10px] font-black ${getPercentageColor(item.performance)} pointer-events-none`}>
                          %
                        </span>
                      )}
                    </div>
                  </div>

                  <button onClick={() => setExpandedItemId(isExpanded ? null : item.id)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors justify-self-end">
                      <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-8 pb-6 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800">
                    <div className="pt-6 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Assuntos Detalhados</h5>
                          <div className="flex gap-2">
                            <input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Novo assunto..." className="text-xs p-2.5 rounded-xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:border-indigo-500 outline-none font-bold" />
                            <button onClick={() => { 
                              if (!newTopicName) return;
                              onUpdateSubjectTopics(sub.id, [...(sub.topics || []), { id: Date.now().toString(), name: newTopicName, completed: false, duration: 1 }]);
                              setNewTopicName("");
                            }} className="bg-indigo-600 text-white px-4 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-colors">ADD</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {(sub.topics || []).map(t => (
                            <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-100 group">
                              <div className="flex items-center gap-3 flex-1">
                                <input type="checkbox" checked={t.completed} onChange={e => {
                                  onUpdateSubjectTopics(sub.id, sub.topics.map(topic => topic.id === t.id ? { ...topic, completed: e.target.checked } : topic));
                                }} className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-200 dark:border-slate-800" />
                                <span className={`text-xs font-black uppercase ${t.completed ? 'text-slate-300 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{t.name}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <input 
                                    type="text" value={t.materialUrl || ""} placeholder="Link..." 
                                    onChange={e => onUpdateSubjectTopics(sub.id, sub.topics.map(topic => topic.id === t.id ? { ...topic, materialUrl: e.target.value } : topic))}
                                    className="w-32 h-8 px-2 pr-6 text-[9px] font-bold rounded-lg border border-slate-100 dark:border-slate-800 dark:bg-slate-950 focus:border-indigo-500 outline-none transition-all"
                                  />
                                  {t.materialUrl && (
                                    <a href={t.materialUrl.startsWith('http') ? t.materialUrl : `https://${t.materialUrl}`} target="_blank" rel="noopener noreferrer" className="absolute right-1 top-1.5 text-indigo-400 hover:text-indigo-600">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                  )}
                                </div>
                                <div className="relative flex items-center">
                                  <input 
                                    type="number" value={t.performance ?? ""} placeholder="%" 
                                    onChange={e => onUpdateSubjectTopics(sub.id, sub.topics.map(topic => topic.id === t.id ? { ...topic, performance: Number(e.target.value) } : topic))}
                                    className={`w-12 h-8 text-center text-[9px] font-black rounded-lg border-2 border-transparent transition-all pr-3 ${getPerformanceStyles(t.performance)}`}
                                  />
                                  {t.performance !== undefined && !isNaN(t.performance) && (
                                    <span className={`absolute right-1 text-[8px] font-black ${getPercentageColor(t.performance)}`}>%</span>
                                  )}
                                </div>
                                <button onClick={() => onUpdateSubjectTopics(sub.id, sub.topics.filter(topic => topic.id !== t.id))} className="p-1 text-slate-200 hover:text-rose-500 transition-colors">
                                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CycleList;
