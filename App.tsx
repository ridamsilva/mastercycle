
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Subject, CycleItem, Topic } from './types';
import { COLORS, SUPABASE_URL, SUPABASE_KEY } from './constants';
import SubjectCard from './components/SubjectCard';
import CycleList from './components/CycleList';
import PomodoroTimer from './components/PomodoroTimer';
import PerformanceRank from './components/PerformanceRank';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const App: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('mastercycle_subjects');
    return saved ? JSON.parse(saved) : [];
  });

  const [cycleItems, setCycleItems] = useState<CycleItem[]>(() => {
    const saved = localStorage.getItem('mastercycle_items');
    return saved ? JSON.parse(saved) : [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [modalTotalHours, setModalTotalHours] = useState<number>(1);
  const [modalFrequency, setModalFrequency] = useState<number>(1);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('mastercycle_subjects', JSON.stringify(subjects));
    localStorage.setItem('mastercycle_items', JSON.stringify(cycleItems));
  }, [subjects, cycleItems]);

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
      
      let selected = filtered.length > 0 
        ? filtered.sort((a, b) => b.remaining - a.remaining)[0]
        : candidates[0];

      if (selected) {
        // Sync performance with the latest available data for this subject
        const existingPerformance = cycleItems.find(item => item.subjectId === selected.subjectId)?.performance;

        newItems.push({
          id: `${selected.subjectId}-${Date.now()}-${i}`,
          subjectId: selected.subjectId,
          duration: selected.duration,
          completed: false,
          order: 0, // Will be reindexed
          performance: existingPerformance
        });
        selected.remaining--;
      }
    }

    // New items go at the BEGINNING. Reindex everyone.
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
        ...s, name, totalHours, frequency, notebookUrl, masteryPercentage
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
        color: COLORS[subjects.length % COLORS.length],
        topics: []
      };
      const updated = [...subjects, newSubject];
      setSubjects(updated);
      generateCycle(updated);
    }
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const deleteSubject = (id: string) => {
    if (confirm("Deseja realmente excluir esta disciplina? Isso a removerá do ciclo atual.")) {
      const updated = subjects.filter(s => s.id !== id);
      setSubjects(updated);
      setCycleItems(prev => prev.filter(item => item.subjectId !== id));
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

    // Synchronize performance across all sessions of the same subject
    setCycleItems(prev => prev.map(item => 
      item.subjectId === targetItem.subjectId ? { ...item, performance: value } : item
    ));

    // Only update mastery via session performance if there are NO topics defined.
    // If topics exist, topics performance average takes precedence.
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
        // Calculate average performance of topics that have a performance value
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

  const chartData = useMemo(() => {
    return subjects.map(s => ({
      name: s.name,
      value: s.totalHours,
      color: s.color
    }));
  }, [subjects]);

  const openModal = (subject: Subject | null) => {
    setEditingSubject(subject);
    setModalTotalHours(subject?.totalHours || 1);
    setModalFrequency(subject?.frequency || 1);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen pb-12 bg-slate-50 selection:bg-indigo-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">MasterCycle</h1>
                <div className="group relative flex items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded border border-emerald-100 uppercase tracking-tighter hidden sm:inline-block">
                    Cloud Active
                  </span>
                  <div className="absolute left-0 top-full mt-1 px-3 py-2 bg-slate-800 text-white text-[9px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-slate-700">
                    <p className="font-black text-emerald-400 mb-1">SUPABASE INTEGRATED</p>
                    <p className="text-slate-400">URL: <span className="text-slate-200">{SUPABASE_URL}</span></p>
                    <p className="text-slate-400">KEY: <span className="text-slate-200">{SUPABASE_KEY.substring(0, 12)}...{SUPABASE_KEY.slice(-4)}</span></p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Estudos de Alta Performance</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => openModal(null)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Disciplina
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <PomodoroTimer />
          
          <PerformanceRank subjects={subjects} />

          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-black text-slate-800">Disciplinas</h2>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                {subjects.length} CADASTRADAS
              </span>
            </div>
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {subjects.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Crie sua primeira matéria
                </div>
              ) : (
                subjects.map(subject => (
                  <SubjectCard 
                    key={subject.id} 
                    subject={subject} 
                    onDelete={deleteSubject} 
                    onEdit={(s) => openModal(s)}
                  />
                ))
              )}
            </div>
          </section>

          {subjects.length > 0 && (
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-wider">Carga Horária Geral</h2>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      formatter={(value: number) => [`${value}h`, 'Carga Total']}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Meu Ciclo</h2>
          </div>
          
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

      {/* Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {editingSubject ? 'Editar Disciplina' : 'Nova Disciplina'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddOrEditSubject} className="p-8 space-y-6">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Nome da Disciplina</label>
                <input 
                  name="name"
                  defaultValue={editingSubject?.name}
                  required
                  autoFocus
                  placeholder="Ex: Português, Matemática..."
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Horas Totais</label>
                  <input 
                    name="totalHours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    defaultValue={editingSubject?.totalHours || 1}
                    onChange={(e) => setModalTotalHours(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none transition-all font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Vezes no Ciclo</label>
                  <input 
                    name="frequency"
                    type="number"
                    min="1"
                    defaultValue={editingSubject?.frequency || 1}
                    onChange={(e) => setModalFrequency(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="bg-indigo-600/5 p-4 rounded-2xl border-2 border-indigo-100/50 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700">Duração prevista por sessão:</span>
                <span className="text-lg font-black text-indigo-800">{(modalTotalHours / modalFrequency).toFixed(2)}h</span>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
                  Domínio Base (%)
                  <span id="mastery-val" className="text-indigo-600 font-black">{editingSubject?.masteryPercentage || 0}%</span>
                </label>
                <input 
                  name="mastery"
                  type="range"
                  min="0"
                  max="100"
                  defaultValue={editingSubject?.masteryPercentage || 0}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  onChange={(e) => {
                    const label = document.getElementById('mastery-val');
                    if (label) label.innerText = `${e.target.value}%`;
                  }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Link Base de Material</label>
                <input 
                  name="notebookUrl"
                  type="text"
                  defaultValue={editingSubject?.notebookUrl}
                  placeholder="Ex: drive.google.com/..."
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-300 text-sm"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-sm font-black text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 text-sm font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 uppercase tracking-wider"
                >
                  {editingSubject ? 'Salvar Disciplina' : 'Adicionar agora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
