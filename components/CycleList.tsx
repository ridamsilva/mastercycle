
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
  items, 
  subjects, 
  onToggleComplete, 
  onUpdatePerformance, 
  onUpdateUrl,
  onReorder,
  onAppendCycle,
  onUpdateSubjectTopics
}) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [tempUrl, setTempUrl] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");

  const getSubject = (id: string) => subjects.find(s => s.id === id);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white border border-dashed border-slate-300 rounded-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <p className="text-sm">Adicione disciplinas para gerar seu ciclo.</p>
      </div>
    );
  }

  const getPerformanceColorClass = (val: number | undefined) => {
    if (val === undefined || isNaN(val) || val === null) return 'bg-slate-50 text-slate-400 border-slate-200';
    if (val >= 0 && val <= 60) return 'bg-rose-500 text-white border-rose-600';
    if (val >= 61 && val <= 69) return 'bg-orange-500 text-white border-orange-600';
    if (val >= 70 && val <= 79) return 'bg-yellow-400 text-slate-900 border-yellow-500';
    if (val >= 80 && max100(val)) return 'bg-green-500 text-white border-green-600';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  const max100 = (val: number) => val <= 100;

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedItemId && draggedItemId !== targetId) {
      onReorder(draggedItemId, targetId);
    }
    setDraggedItemId(null);
  };

  const startEditUrl = (item: CycleItem, currentSubjectUrl: string) => {
    setEditingUrlId(item.id);
    setTempUrl(item.sessionUrl || currentSubjectUrl || "");
  };

  const saveUrl = (id: string) => {
    onUpdateUrl(id, tempUrl);
    setEditingUrlId(null);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const addTopicToSubject = (subjectId: string) => {
    if (!newTopicName.trim()) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const newTopic: Topic = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTopicName,
      completed: false,
      duration: 1, // default
    };

    onUpdateSubjectTopics(subjectId, [...(subject.topics || []), newTopic]);
    setNewTopicName("");
  };

  const updateTopic = (subjectId: string, topicId: string, updates: Partial<Topic>) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const updatedTopics = subject.topics.map(t => t.id === topicId ? { ...t, ...updates } : t);
    onUpdateSubjectTopics(subjectId, updatedTopics);
  };

  const deleteTopic = (subjectId: string, topicId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    onUpdateSubjectTopics(subjectId, subject.topics.filter(t => t.id !== topicId));
  };

  const completedCount = items.filter(i => i.completed).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const isComplete = items.length > 0 && items.every(i => i.completed);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Progresso do Ciclo</h2>
            <p className="text-sm text-slate-500">{completedCount} de {items.length} sessões concluídas</p>
          </div>
          {isComplete && (
            <button 
              onClick={onAppendCycle}
              className="px-6 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-100 animate-bounce active:scale-95"
            >
              Gerar novo ciclo
            </button>
          )}
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div 
            className="h-3 rounded-full bg-indigo-600 transition-all duration-1000 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
          <div className="col-span-1 text-left">Status</div>
          <div className="col-span-5 text-left">Disciplina</div>
          <div className="col-span-1">Tempo</div>
          <div className="col-span-2">Desempenho %</div>
          <div className="col-span-2">Material</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-slate-100">
          {[...items].sort((a, b) => a.order - b.order).map((item) => {
            const subject = getSubject(item.subjectId);
            if (!subject) return null;

            const finalUrl = item.sessionUrl || subject.notebookUrl;
            const isExpanded = expandedItemId === item.id;

            return (
              <React.Fragment key={item.id}>
                <div 
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item.id)}
                  className={`
                    grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-4 transition-all cursor-pointer
                    ${item.completed ? 'bg-slate-50/70' : 'bg-white hover:bg-slate-50/50'}
                    ${draggedItemId === item.id ? 'opacity-30 border-2 border-indigo-200' : ''}
                    ${isExpanded ? 'ring-2 ring-indigo-500 ring-inset z-10' : ''}
                  `}
                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                >
                  {/* Status */}
                  <div className="col-span-1 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleComplete(item.id)}
                      className={`
                        w-6 h-6 rounded-lg flex items-center justify-center transition-all border-2 active:scale-90
                        ${item.completed 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'border-slate-300 bg-white hover:border-indigo-400'
                        }
                      `}
                    >
                      {item.completed && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    {item.completed && item.completedAt && (
                      <span className="text-[8px] text-indigo-400 font-bold mt-1 text-center leading-tight">
                        {formatDate(item.completedAt).split(',')[0]}
                      </span>
                    )}
                  </div>

                  {/* Subject Name */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-2 h-6 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                    <div className="flex flex-col min-w-0">
                      <span className={`font-semibold text-sm truncate ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {subject.name}
                      </span>
                      <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tight">
                        {subject.topics?.length || 0} Assuntos
                      </span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="col-span-1 text-center">
                     <span className="text-xs font-bold text-slate-600">
                       {item.duration}h
                     </span>
                  </div>

                  {/* Performance */}
                  <div className="col-span-2 flex justify-center" onClick={(e) => e.stopPropagation()}>
                     <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.performance ?? ""}
                          placeholder="--"
                          onChange={(e) => {
                             const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                             onUpdatePerformance(item.id, val);
                          }}
                          className={`
                            w-14 h-9 text-center text-sm font-black rounded-lg border-2 focus:ring-0 focus:outline-none transition-all
                            ${getPerformanceColorClass(item.performance)}
                          `}
                        />
                        <span className="text-[10px] font-bold text-slate-400">%</span>
                     </div>
                  </div>

                  {/* Material Link */}
                  <div className="col-span-2 flex flex-col items-center justify-center min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                    {editingUrlId === item.id ? (
                      <div className="flex items-center gap-1 w-full animate-in slide-in-from-right-2">
                        <input 
                          className="text-[10px] w-full p-1.5 border-2 border-indigo-100 rounded-md focus:border-indigo-300 focus:outline-none"
                          value={tempUrl}
                          onChange={(e) => setTempUrl(e.target.value)}
                          placeholder="Link material"
                          autoFocus
                        />
                        <button 
                          onClick={() => saveUrl(item.id)} 
                          className="bg-green-500 text-white p-1 rounded-md active:scale-95"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        {finalUrl ? (
                          <a 
                            href={finalUrl.startsWith('http') ? finalUrl : `https://${finalUrl}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-full text-[10px] font-bold transition-all border border-indigo-100"
                          >
                            Abrir Material
                          </a>
                        ) : null}
                        <button 
                          onClick={() => startEditUrl(item, subject.notebookUrl)}
                          className="text-[10px] text-indigo-500 hover:text-indigo-800 underline font-semibold"
                        >
                          {finalUrl ? "Alterar Link" : "Adicionar Link"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Drag Handle or Metadata */}
                  <div className="col-span-1 flex flex-col items-end justify-center">
                    <div className="p-2 text-slate-300 hover:text-indigo-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Topics Section */}
                {isExpanded && (
                  <div className="bg-slate-50 px-8 py-6 border-x-2 border-indigo-500/20 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Assuntos da Disciplina</h4>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Novo assunto..."
                          value={newTopicName}
                          onChange={(e) => setNewTopicName(e.target.value)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 w-48"
                        />
                        <button 
                          onClick={() => addTopicToSubject(subject.id)}
                          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {subject.topics && subject.topics.length > 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                            <div className="col-span-1 text-center">Concl.</div>
                            <div className="col-span-4">Nome do Assunto</div>
                            <div className="col-span-2 text-center">Tempo (h)</div>
                            <div className="col-span-2 text-center">Desemp. (%)</div>
                            <div className="col-span-2 text-center">Material</div>
                            <div className="col-span-1"></div>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {subject.topics.map((topic) => (
                              <div key={topic.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-slate-50/50 transition-colors">
                                <div className="col-span-1 flex justify-center">
                                  <input 
                                    type="checkbox" 
                                    checked={topic.completed}
                                    onChange={(e) => updateTopic(subject.id, topic.id, { completed: e.target.checked })}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                  />
                                </div>
                                <div className="col-span-4">
                                  <input 
                                    type="text" 
                                    value={topic.name}
                                    onChange={(e) => updateTopic(subject.id, topic.id, { name: e.target.value })}
                                    className={`text-xs w-full bg-transparent border-none focus:ring-0 p-0 font-medium ${topic.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                                  />
                                </div>
                                <div className="col-span-2 text-center">
                                  <input 
                                    type="number" 
                                    value={topic.duration}
                                    step="0.1"
                                    onChange={(e) => updateTopic(subject.id, topic.id, { duration: parseFloat(e.target.value) || 0 })}
                                    className="text-xs w-12 text-center border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:ring-0 p-0"
                                  />
                                </div>
                                <div className="col-span-2 text-center">
                                  <input 
                                    type="number" 
                                    value={topic.performance ?? ""}
                                    placeholder="--"
                                    onChange={(e) => updateTopic(subject.id, topic.id, { performance: parseInt(e.target.value) || 0 })}
                                    className={`text-xs w-12 text-center font-black rounded border-none focus:ring-0 p-1 ${getPerformanceColorClass(topic.performance)}`}
                                  />
                                </div>
                                <div className="col-span-2 text-center">
                                  <input 
                                    type="text" 
                                    value={topic.materialUrl || ""}
                                    placeholder="Link..."
                                    onChange={(e) => updateTopic(subject.id, topic.id, { materialUrl: e.target.value })}
                                    className="text-[10px] w-full text-center border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:ring-0 p-0 truncate text-indigo-500 underline"
                                  />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                  <button 
                                    onClick={() => deleteTopic(subject.id, topic.id)}
                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-300">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum assunto cadastrado</p>
                          <p className="text-[9px] text-slate-400">Adicione assuntos acima para organizar este bloco de estudos.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <p className="text-center text-[11px] text-slate-400 font-medium bg-slate-100 py-2 rounded-lg">
        Dica: Clique na disciplina para ver e gerenciar os assuntos específicos.
      </p>
    </div>
  );
};

export default CycleList;
