
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Subject, CycleItem, Topic } from './types.ts';
import { COLORS } from './constants.tsx';
import SubjectCard from './components/SubjectCard.tsx';
import CycleList from './components/CycleList.tsx';
import PomodoroTimer from './components/PomodoroTimer.tsx';
import PerformanceRank from './components/PerformanceRank.tsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabaseService } from './services/supabaseService.ts';

const App: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const saved = localStorage.getItem('mastercycle_subjects');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erro ao carregar matérias do cache:", e);
      return [];
    }
  });

  const [cycleItems, setCycleItems] = useState<CycleItem[]>(() => {
    try {
      const saved = localStorage.getItem('mastercycle_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erro ao carregar ciclo do cache:", e);
      return [];
    }
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('mastercycle_darkmode');
    return saved === 'true';
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [showConfigWarning, setShowConfigWarning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  const [modalTotalHours, setModalTotalHours] = useState<number>(1);
  const [modalFrequency, setModalFrequency] = useState<number>(1);
  const [modalColor, setModalColor] = useState<string>(COLORS[0]);

  useEffect(() => {
    const loadRemoteData = async () => {
      setSyncStatus('syncing');
      try {
        const remoteSubjects = await supabaseService.fetchSubjects();
        const remoteItems = await supabaseService.fetchCycleItems();
        
        // Se ambos retornarem null, provavelmente as tabelas não existem
        if (remoteSubjects === null && remoteItems === null) {
          setShowConfigWarning(true);
        } else {
          setShowConfigWarning(false);
          if (remoteSubjects && remoteSubjects.length > 0) {
            setSubjects(remoteSubjects);
          }
          if (remoteItems && remoteItems.length > 0) {
            setCycleItems(remoteItems);
          }
        }
        setSyncStatus('success');
      } catch (e) {
        console.error("Erro no carregamento remoto:", e);
        setSyncStatus('error');
      } finally {
        setIsInitialLoadDone(true);
      }
    };
    loadRemoteData();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('mastercycle_darkmode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    if (!isInitialLoadDone) return;

    localStorage.setItem('mastercycle_subjects', JSON.stringify(subjects));
    localStorage.setItem('mastercycle_items', JSON.stringify(cycleItems));
    
    const syncWithCloud = async () => {
      if (showConfigWarning) return; // Não tenta salvar se as tabelas não existem
      setSyncStatus('syncing');
      try {
        if (subjects.length > 0) {
          await supabaseService.upsertSubjects(subjects);
        }
        if (cycleItems.length > 0) {
          await supabaseService.upsertCycleItems(cycleItems);
        }
        setSyncStatus('success');
      } catch (error) {
        console.error("Erro na sincronização:", error);
        setSyncStatus('error');
      }
    };

    const timer = setTimeout(syncWithCloud, 2000); 
    return () => clearTimeout(timer);
  }, [subjects, cycleItems, isInitialLoadDone, showConfigWarning]);

  const generateCycle = useCallback((currentSubjects: Subject[]) => {
    if (currentSubjects.length === 0) {
      setCycleItems([]);
      return;
    }

    const newItems: CycleItem[] = [];
    let order = 0;

    const tempPool = currentSubjects.map(s => ({
      subjectId: s.id,
      remaining: s.frequency,
      duration: parseFloat((s.totalHours / s.frequency).toFixed(2))
    }));

    const totalSlots = currentSubjects.reduce((acc, s) => acc + s.frequency, 0);

    for (let i = 0; i < totalSlots; i++) {
      const lastId = newItems.length > 0 ? newItems[newItems.length - 1].subjectId : null;
      let candidates = tempPool.filter(p => p.remaining > 0);
      let filtered = candidates.filter(p => p.subjectId !== lastId);
      let selected = filtered.length > 0 
        ? filtered.sort((a, b) => b.remaining - a.remaining)[0]
        : candidates[0];

      if (selected) {
        newItems.push({
          id: `${selected.subjectId}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          subjectId: selected.subjectId,
          duration: selected.duration,
          completed: false,
          order: order++,
          performance: undefined
        });
        selected.remaining--;
      }
    }
    setCycleItems(newItems);
  }, []);

  const appendCycle = () => {
    if (subjects.length === 0) return;
    const newItems: CycleItem[] = [];
    const tempPool = subjects.map(s => ({
      subjectId: s.id,
      remaining: s.frequency,
      duration: parseFloat((s.totalHours / s.frequency).toFixed(2))
    }));
    const totalSlots = subjects.reduce((acc, s) => acc + s.frequency, 0);

    for (let i = 0; i < totalSlots; i++) {
      const lastId = newItems.length > 0 ? newItems[newItems.length - 1].subjectId : null;
      let candidates = tempPool.filter(p => p.remaining > 0);
      let filtered = candidates.filter(p => p.subjectId !== lastId);
      let selected = filtered.length > 0 ? filtered.sort((a, b) => b.remaining - a.remaining)[0] : candidates[0];

      if (selected) {
        const existingPerformance = cycleItems.find(item => item.subjectId === selected.subjectId)?.performance;
        newItems.push({
          id: `${selected.subjectId}-${Date.now()}-${i}`,
          subjectId: selected.subjectId,
          duration: selected.duration,
          completed: false,
          order: 0,
          performance: existingPerformance
        });
        selected.remaining--;
      }
    }
    const combined = [...newItems, ...cycleItems];
    const reindexed = combined.map((item, index) => ({ ...item, order: index }));
    setCycleItems(reindexed);
  };

  const handleAddOrEditSubject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const totalHours = parseFloat(formData.get('totalHours') as string);
    const frequency = parseInt(formData.get('frequency') as string);
    const notebookUrl = formData.get('notebookUrl') as string;
    const masteryPercentage = parseInt(formData.get('mastery') as string);

    if (editingSubject) {
      const updated = subjects.map(s => s.id === editingSubject.id ? {
        ...s, name, totalHours, frequency, notebookUrl, masteryPercentage, color: modalColor
      } : s);
      setSubjects(updated);
    } else {
      const newSubject: Subject = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        totalHours,
        frequency,
        notebookUrl,
        masteryPercentage,
        color: modalColor,
        topics: []
      };
      const updated = [...subjects, newSubject];
      setSubjects(updated);
      generateCycle(updated);
    }
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const deleteSubject = async (id: string) => {
    if (confirm("Deseja realmente excluir esta disciplina?")) {
      const updated = subjects.filter(s => s.id !== id);
      setSubjects(updated);
      setCycleItems(prev => prev.filter(item => item.subjectId !== id));
      if (!showConfigWarning) await supabaseService.deleteSubject(id);
    }
  };

  const toggleItemComplete = (itemId: string) => {
    setCycleItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const isNowCompleted = !item.completed;
        return { 
          ...item, 
          completed: isNowCompleted,
          completedAt: isNowCompleted ? Date.now() : undefined
        };
      }
      return item;
    }));
  };

  const updateItemPerformance = (itemId: string, value: number) => {
    const targetItem = cycleItems.find(i => i.id === itemId);
    if (!targetItem) return;

    setCycleItems(prev => prev.map(item => 
      item.subjectId === targetItem.subjectId ? { ...item, performance: value } : item
    ));

    setSubjects(prev => prev.map(s => {
      if (s.id === targetItem.subjectId) {
        const hasTopicsWithPerformance = s.topics && s.topics.some(t => t.performance !== undefined && t.performance !== 0);
        if (!hasTopicsWithPerformance) {
          return { ...s, masteryPercentage: value };
        }
      }
      return s;
    }));
  };

  const updateItemUrl = (itemId: string, url: string) => {
    setCycleItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, sessionUrl: url } : item
    ));
  };

  const updateSubjectTopics = (subjectId: string, topics: Topic[]) => {
    setSubjects(prev => prev.map(s => {
      if (s.id === subjectId) {
        const topicsWithPerformance = topics.filter(t => t.performance !== undefined && t.performance > 0);
        let newMastery = s.masteryPercentage;
        if (topicsWithPerformance.length > 0) {
          const sum = topicsWithPerformance.reduce((acc, t) => acc + (t.performance || 0), 0);
          newMastery = Math.round(sum / topicsWithPerformance.length);
        }
        return { ...s, topics, masteryPercentage: newMastery };
      }
      return s;
    }));
  };

  const reorderItems = (draggedId: string, targetId: string) => {
    const current = [...cycleItems].sort((a, b) => a.order - b.order);
    const draggedIdx = current.findIndex(i => i.id === draggedId);
    const targetIdx = current.findIndex(i => i.id === targetId);
    const [draggedItem] = current.splice(draggedIdx, 1);
    current.splice(targetIdx, 0, draggedItem);
    const updated = current.map((item, index) => ({ ...item, order: index }));
    setCycleItems(updated);
  };

  const openModal = (subject: Subject | null) => {
    setEditingSubject(subject);
    setModalTotalHours(subject?.totalHours || 1);
    setModalFrequency(subject?.frequency || 1);
    setModalColor(subject?.color || COLORS[subjects.length % COLORS.length]);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">MasterCycle</h1>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                  syncStatus === 'syncing' ? 'bg-amber-50 border-amber-200' :
                  syncStatus === 'error' || showConfigWarning ? 'bg-rose-50 border-rose-200' :
                  'bg-indigo-50 border-indigo-100 dark:bg-indigo-950 dark:border-indigo-900'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 
                    syncStatus === 'error' || showConfigWarning ? 'bg-rose-500' : 'bg-emerald-500'
                  }`} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">
                    {showConfigWarning ? 'Config Pendente' : 
                     syncStatus === 'syncing' ? 'Salvando...' : 
                     syncStatus === 'error' ? 'Erro Cloud' : 'Cloud Ativa'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={() => openModal(null)} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl">
              Nova Disciplina
            </button>
          </div>
        </div>
      </header>

      {showConfigWarning && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="text-amber-600 dark:text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Banco de Dados não configurado</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">Suas alterações serão salvas apenas localmente no navegador. Crie as tabelas no Supabase SQL Editor para ativar a nuvem.</p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <PomodoroTimer />
          <PerformanceRank subjects={subjects} />
          <section className="space-y-4">
             {subjects.length === 0 ? (
               <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                 Nenhuma disciplina adicionada ainda.
               </div>
             ) : (
               subjects.map(subject => (
                <SubjectCard key={subject.id} subject={subject} onDelete={deleteSubject} onEdit={openModal} />
               ))
             )}
          </section>
        </div>

        <div className="lg:col-span-8">
          <CycleList 
            items={cycleItems} 
            subjects={subjects} 
            onToggleComplete={toggleItemComplete}
            onUpdatePerformance={updateItemPerformance}
            onUpdateUrl={updateItemUrl}
            onReorder={reorderItems}
            onAppendCycle={appendCycle}
            onUpdateSubjectTopics={updateSubjectTopics}
          />
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleAddOrEditSubject} className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{editingSubject ? 'Editar' : 'Nova'} Disciplina</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Nome</label>
                <input name="name" defaultValue={editingSubject?.name} required placeholder="Ex: Matemática, Direito..." className="w-full p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent dark:text-white focus:border-indigo-500 focus:outline-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Horas Totais</label>
                  <input name="totalHours" type="number" step="0.5" defaultValue={editingSubject?.totalHours || 1} onChange={(e) => setModalTotalHours(Number(e.target.value))} className="w-full p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent dark:text-white focus:border-indigo-500 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Frequência</label>
                  <input name="frequency" type="number" defaultValue={editingSubject?.frequency || 1} onChange={(e) => setModalFrequency(Number(e.target.value))} className="w-full p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent dark:text-white focus:border-indigo-500 focus:outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Cor da Disciplina</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setModalColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${modalColor === color ? 'border-indigo-600 scale-110 shadow-md ring-2 ring-indigo-500/20' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                    <input 
                      type="color" 
                      value={modalColor} 
                      onChange={(e) => setModalColor(e.target.value)}
                      className="w-8 h-8 rounded-full border-none cursor-pointer bg-transparent"
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Custom</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                  Domínio Inicial (%)
                  <span className="text-indigo-600 font-bold" id="mastery-val">{editingSubject?.masteryPercentage || 0}%</span>
                </label>
                <input name="mastery" type="range" min="0" max="100" defaultValue={editingSubject?.masteryPercentage || 0} className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" onChange={(e) => {
                  const el = document.getElementById('mastery-val');
                  if (el) el.innerText = e.target.value + '%';
                }} />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Link do Caderno</label>
                <input name="notebookUrl" defaultValue={editingSubject?.notebookUrl} placeholder="Ex: drive.google.com/..." className="w-full p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent dark:text-white focus:border-indigo-500 focus:outline-none transition-all" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 p-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-all">Salvar Disciplina</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
