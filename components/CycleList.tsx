
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
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] text-slate-400">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium">Crie disciplinas para ver seu ciclo aqui.</p>
      </div>
    );
  }

  const completedCount = items.filter(i => i.completed).length;

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Fluxo do Ciclo</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{completedCount} de {items.length} blocos finalizados</p>
          </div>
          {completedCount === items.length && (
            <button onClick={onAppendCycle} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all">
              NOVO CICLO +
            </button>
          )}
        </div>

        {/* Barra de Progresso Segmentada */}
        <div className="flex gap-1 h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
          {sortedItems.map((item, idx) => {
            const sub = getSubject(item.subjectId);
            return (
              <div 
                key={item.id}
                className={`flex-1 rounded-full transition-all duration-500 ${item.completed ? 'opacity-100 grayscale-0' : 'opacity-20 grayscale'}`}
                style={{ backgroundColor: sub?.color || '#ccc' }}
                title={`${sub?.name} - ${item.duration}h`}
              />
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedItems.map((item) => {
            const sub = getSubject(item.subjectId);
            if (!sub) return null;
            const isExpanded = expandedItemId === item.id;

            return (
              <div key={item.id} className={`${item.completed ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                <div 
                  draggable onDragStart={() => setDraggedItemId(item.id)} onDragOver={e => e.preventDefault()}
                  onDrop={() => draggedItemId && onReorder(draggedItemId, item.id)}
                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                  className={`flex items-center gap-4 px-6 py-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isExpanded ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                >
                  <button 
                    onClick={e => { e.stopPropagation(); onToggleComplete(item.id); }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all ${item.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}
                  >
                    {item.completed && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: sub.color }} />
                      <h4 className={`font-bold text-sm truncate ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>{sub.name}</h4>
                    </div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{item.duration} HORAS</span>
                  </div>

                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <input 
                      type="number" value={item.performance || ""} placeholder="%" 
                      onChange={e => onUpdatePerformance(item.id, Number(e.target.value))}
                      className="w-12 h-10 text-center text-xs font-black rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500" 
                    />
                    <svg className={`w-5 h-5 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-8 pb-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tópicos e Assuntos</h5>
                      <div className="flex gap-2">
                        <input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Novo assunto..." className="text-xs p-2 rounded-lg border dark:bg-slate-950 dark:border-slate-800" />
                        <button onClick={() => { 
                          if (!newTopicName) return;
                          onUpdateSubjectTopics(sub.id, [...(sub.topics || []), { id: Date.now().toString(), name: newTopicName, completed: false, duration: 1 }]);
                          setNewTopicName("");
                        }} className="bg-indigo-600 text-white px-3 rounded-lg text-[10px] font-bold">ADD</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {sub.topics?.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={t.completed} onChange={e => {
                              onUpdateSubjectTopics(sub.id, sub.topics.map(topic => topic.id === t.id ? { ...topic, completed: e.target.checked } : topic));
                            }} className="rounded text-indigo-600" />
                            <span className={`text-xs font-medium ${t.completed ? 'text-slate-400 line-through' : ''}`}>{t.name}</span>
                          </div>
                          <button onClick={() => onUpdateSubjectTopics(sub.id, sub.topics.filter(topic => topic.id !== t.id))} className="text-slate-300 hover:text-rose-500 transition-colors">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
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
