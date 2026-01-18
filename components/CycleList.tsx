
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
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);

  const getSubject = (id: string) => subjects.find(s => s.id === id);
  
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  const formatShortUrl = (url: string) => {
    if (!url) return "";
    try {
      const cleanUrl = url.replace('https://', '').replace('http://', '').replace('www.', '');
      const parts = cleanUrl.split('/');
      const domain = parts[0];
      if (domain.length > 15) return domain.substring(0, 12) + '...';
      return domain;
    } catch {
      return 'Abrir Link';
    }
  };

  const getPerformanceStyles = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return 'bg-slate-100 dark:bg-slate-800 text-slate-400';
    if (val < 70) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'; 
    if (val < 80) return 'bg-orange-100 text-brand-orange dark:bg-orange-900/40 dark:text-orange-300'; 
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'; 
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
              <span className="w-2 h-6 bg-brand-blue rounded-full inline-block"></span>
              FLUXO DO CICLO ATUAL
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Progresso: {completedCount} / {items.length} blocos concluídos
            </p>
          </div>
          {completedCount === items.length && (
            <button onClick={onAppendCycle} className="px-6 py-3 bg-brand-orange text-white rounded-2xl text-[10px] font-black hover:scale-105 active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-orange-200 dark:shadow-none">
              RENOVAR CICLO
            </button>
          )}
        </div>

        <div className="flex gap-1.5 h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1">
          {sortedItems.map((item) => (
            <div 
              key={item.id}
              className={`flex-1 rounded-full transition-all duration-500 ${item.completed ? 'opacity-100' : 'opacity-20'}`}
              style={{ backgroundColor: getSubject(item.subjectId)?.color || '#ccc' }}
            />
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
        <div className="grid grid-cols-[100px_1fr_120px_120px_40px] items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-center">
            <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.2em]">Status</span>
          </div> 
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Disciplina</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Material</span>
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
            const isEditingUrl = editingUrlId === item.id;

            return (
              <div key={item.id} className={`${item.completed ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''} transition-all duration-300`}>
                <div 
                  className={`grid grid-cols-[100px_1fr_120px_120px_40px] items-center gap-4 px-6 py-5 cursor-default hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isExpanded ? 'bg-blue-50/20 dark:bg-blue-900/10 border-l-4 border-l-brand-blue' : ''}`}
                >
                  <div className="flex justify-center">
                    <button 
                      onClick={() => onToggleComplete(item.id)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all shrink-0 ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}
                    >
                      {item.completed ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <div className="w-2 h-2 rounded-full bg-slate-200" />}
                    </button>
                  </div>
                  
                  <div className="min-w-0 cursor-pointer" onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                      <h4 className={`font-black text-sm uppercase truncate ${item.completed ? 'text-slate-700 dark:text-slate-200' : 'text-slate-800 dark:text-white'}`}>{sub.name}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[9px] font-black text-brand-blue/70 uppercase tracking-widest">{item.duration}H</span>
                      {item.completed && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatDate(item.completedAt)}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col justify-center items-center gap-0.5 relative">
                    {item.sessionUrl ? (
                      <>
                        <a 
                          href={item.sessionUrl.startsWith('http') ? item.sessionUrl : `https://${item.sessionUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline transition-all uppercase truncate max-w-[110px] text-center"
                          title={item.sessionUrl}
                        >
                          {formatShortUrl(item.sessionUrl)}
                        </a>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingUrlId(isEditingUrl ? null : item.id); 
                          }}
                          className="text-[8px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]"
                        >
                          EDITAR
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingUrlId(isEditingUrl ? null : item.id); 
                        }}
                        className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                        title="Adicionar Link"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}

                    {isEditingUrl && (
                      <div 
                        className="absolute top-full right-0 mt-3 z-50 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-72 animate-in fade-in zoom-in duration-200" 
                        onClick={e => e.stopPropagation()}
                      >
                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Link do Material ({sub.name})</label>
                        <input 
                          type="text" autoFocus value={item.sessionUrl || ""} 
                          onChange={e => onUpdateUrl(item.id, e.target.value)}
                          placeholder="Cole a URL aqui..."
                          className="w-full p-2.5 text-[10px] font-bold rounded-xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 outline-none focus:border-brand-blue"
                        />
                        <button 
                          onClick={() => setEditingUrlId(null)} 
                          className="w-full mt-3 py-2 text-[10px] font-black bg-blue-600 text-white rounded-lg uppercase shadow-lg hover:bg-blue-700 transition-colors"
                        >
                          Salvar Link
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CAMPO DE DESEMPENHO ATUALIZADO: % COLADO AO NÚMERO */}
                  <div className="flex justify-center">
                    <div className={`flex items-center justify-center w-full max-w-[85px] h-10 rounded-xl transition-all border-2 border-transparent focus-within:border-brand-blue ${getPerformanceStyles(item.performance)}`}>
                      <input 
                        type="number" 
                        value={item.performance ?? ""} 
                        placeholder="--" 
                        onChange={e => onUpdatePerformance(item.id, Number(e.target.value))}
                        className="w-8 bg-transparent text-right text-xs font-black outline-none border-none p-0" 
                      />
                      {(item.performance !== undefined && item.performance !== null && !isNaN(item.performance)) && (
                        <span className="text-[10px] font-black ml-0.5 opacity-80 pointer-events-none">
                          %
                        </span>
                      )}
                    </div>
                  </div>

                  <button onClick={() => setExpandedItemId(isExpanded ? null : item.id)} className="p-2 text-slate-300 hover:text-brand-blue transition-colors justify-self-end">
                      <svg className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-8 pb-6 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800">
                    <div className="pt-6 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Conteúdos da Sessão</h5>
                          <div className="flex gap-2">
                            <input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Novo tópico..." className="text-xs p-3 rounded-xl border-2 border-slate-100 dark:bg-slate-950 dark:border-slate-800 focus:border-brand-blue outline-none font-bold" />
                            <button onClick={() => { 
                              if (!newTopicName) return;
                              onUpdateSubjectTopics(sub.id, [...(sub.topics || []), { id: Date.now().toString(), name: newTopicName, completed: false, duration: 1 }]);
                              setNewTopicName("");
                            }} className="bg-brand-blue text-white px-5 rounded-xl text-[10px] font-black uppercase hover:bg-brand-darkBlue transition-colors">ADD</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {(sub.topics || []).map(t => (
                            <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-blue-100 group">
                              <div className="flex items-center gap-3 flex-1">
                                <input type="checkbox" checked={t.completed} onChange={e => {
                                  onUpdateSubjectTopics(sub.id, sub.topics.map(topic => topic.id === t.id ? { ...topic, completed: e.target.checked } : topic));
                                }} className="w-6 h-6 rounded-lg text-brand-blue focus:ring-brand-blue border-slate-200 dark:border-slate-800 cursor-pointer" />
                                <span className={`text-xs font-black uppercase ${t.completed ? 'text-slate-300 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{t.name}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <input 
                                    type="text" value={t.materialUrl || ""} placeholder="Link..." 
                                    onChange={e => onUpdateSubjectTopics(sub.id, sub.topics.map(topic => topic.id === t.id ? { ...topic, materialUrl: e.target.value } : topic))}
                                    className="w-40 h-9 px-3 pr-8 text-[10px] font-bold rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-950 focus:border-brand-blue outline-none transition-all"
                                  />
                                  {t.materialUrl && (
                                    <a href={t.materialUrl.startsWith('http') ? t.materialUrl : `https://${t.materialUrl}`} target="_blank" rel="noopener noreferrer" className="absolute right-2 top-2 text-brand-blue hover:text-brand-darkBlue">
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                  )}
                                </div>
                                <button onClick={() => onUpdateSubjectTopics(sub.id, sub.topics.filter(topic => topic.id !== t.id))} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
