
import React, { useState, useEffect, useCallback } from 'react';
import { Subject, CycleItem } from './types.ts';
import { COLORS } from './constants.tsx';
import SubjectCard from './components/SubjectCard.tsx';
import CycleList from './components/CycleList.tsx';
import PomodoroTimer from './components/PomodoroTimer.tsx';
import PerformanceRank from './components/PerformanceRank.tsx';
import Auth from './components/Auth.tsx';
import UserProfile from './components/UserProfile.tsx';
import { supabaseService, supabase } from './services/supabaseService.ts';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cycleItems, setCycleItems] = useState<CycleItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('mastercycle_darkmode') === 'true');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [masteryValue, setMasteryValue] = useState(0);
  const [modalError, setModalError] = useState<string | null>(null);

  const getPercentageColor = (val: number) => {
    if (val < 70) return 'text-rose-500';
    if (val < 80) return 'text-amber-500';
    return 'text-emerald-500';
  };

  useEffect(() => {
    let mounted = true;
    const checkInitialSession = async () => {
      try {
        const currentSession = await supabaseService.getSession();
        if (mounted) {
          setSession(currentSession);
          setIsCheckingAuth(false);
        }
      } catch (err) {
        if (mounted) setIsCheckingAuth(false);
      }
    };
    checkInitialSession();
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        if (!newSession) {
          setSubjects([]);
          setCycleItems([]);
          setIsInitialLoadDone(false);
        }
      }
    });
    const subscription = data?.subscription;
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const loadData = async () => {
      setSyncStatus('syncing');
      try {
        const remoteSubjects = await supabaseService.fetchSubjects();
        const remoteItems = await supabaseService.fetchCycleItems();
        if (remoteSubjects && remoteSubjects.length > 0) setSubjects(remoteSubjects);
        if (remoteItems && remoteItems.length > 0) setCycleItems(remoteItems);
        setSyncStatus('success');
      } catch (e) {
        setSyncStatus('error');
      } finally {
        setIsInitialLoadDone(true);
      }
    };
    loadData();
  }, [session]);

  useEffect(() => {
    if (!isInitialLoadDone || !session?.user || (subjects.length === 0 && cycleItems.length === 0)) return;
    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await supabaseService.upsertSubjects(subjects);
        await supabaseService.upsertCycleItems(cycleItems);
        setSyncStatus('success');
      } catch (err) {
        setSyncStatus('error');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [subjects, cycleItems, isInitialLoadDone, session]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('mastercycle_darkmode', String(isDarkMode));
  }, [isDarkMode]);

  const getNextAvailableColor = () => {
    const usedColors = subjects.map(s => s.color.toLowerCase());
    const available = COLORS.filter(c => !usedColors.includes(c.toLowerCase()));
    if (available.length > 0) return available[0];
    const hue = (subjects.length * 137.5) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const distributeSubjects = useCallback((currentSubjects: Subject[], startOrder: number = 0): CycleItem[] => {
    const newItems: CycleItem[] = [];
    const tempPool = currentSubjects.map(s => ({
      subjectId: s.id,
      remaining: s.frequency,
      duration: parseFloat((s.totalHours / s.frequency).toFixed(2))
    }));
    const totalSlots = currentSubjects.reduce((acc, s) => acc + s.frequency, 0);

    for (let i = 0; i < totalSlots; i++) {
      let lastId: string | null = null;
      if (newItems.length > 0) {
        lastId = newItems[newItems.length - 1].subjectId;
      } else if (cycleItems.length > 0) {
        lastId = [...cycleItems].sort((a,b) => a.order - b.order)[cycleItems.length - 1].subjectId;
      }

      let candidates = tempPool.filter(p => p.remaining > 0);
      let filtered = candidates.filter(p => p.subjectId !== lastId);
      
      let selected = filtered.length > 0 
        ? filtered.sort((a, b) => b.remaining - a.remaining)[0] 
        : candidates[0];

      if (selected) {
        newItems.push({
          id: `${selected.subjectId}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          subjectId: selected.subjectId,
          duration: selected.duration,
          completed: false,
          order: startOrder + i,
        });
        selected.remaining--;
      }
    }
    return newItems;
  }, [cycleItems]);

  const generateCycle = useCallback((currentSubjects: Subject[]) => {
    if (currentSubjects.length === 0) {
      setCycleItems([]);
      return;
    }
    const newItems = distributeSubjects(currentSubjects, 0);
    setCycleItems(newItems);
  }, [distributeSubjects]);

  const handleAddOrEditSubject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError(null);
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const totalHours = parseFloat(formData.get('totalHours') as string);
    const frequency = parseInt(formData.get('frequency') as string);
    const notebookUrl = formData.get('notebookUrl') as string;
    const masteryPercentage = masteryValue;

    const isDuplicate = subjects.some(s => 
      s.name.toLowerCase().trim() === name.toLowerCase().trim() && 
      (!editingSubject || s.id !== editingSubject.id)
    );

    if (isDuplicate) {
      setModalError(`A disciplina "${name}" já existe. Escolha outro nome.`);
      return;
    }

    let updated: Subject[];
    if (editingSubject) {
      updated = subjects.map(s => s.id === editingSubject.id ? {
        ...s, name, totalHours, frequency, notebookUrl, masteryPercentage
      } : s);
    } else {
      const newSubject: Subject = {
        id: Math.random().toString(36).substr(2, 9),
        name, totalHours, frequency, notebookUrl, masteryPercentage,
        color: getNextAvailableColor(),
        topics: []
      };
      updated = [...subjects, newSubject];
    }
    setSubjects(updated);
    if (!editingSubject) generateCycle(updated);
    setIsModalOpen(false);
    setEditingSubject(null);
    setModalError(null);
  };

  const deleteSubject = async (id: string) => {
    if (!confirm("Excluir disciplina?")) return;
    const updatedSubjects = subjects.filter(s => s.id !== id);
    const updatedCycleItems = cycleItems.filter(item => item.subjectId !== id);
    setSubjects(updatedSubjects);
    setCycleItems(updatedCycleItems);
    try {
      await supabaseService.deleteSubject(id);
      setSyncStatus('success');
    } catch (error) {
      setSyncStatus('error');
    }
  };

  const openModal = (subject: Subject | null) => {
    setModalError(null);
    if (subject) {
      setEditingSubject(subject);
      setMasteryValue(subject.masteryPercentage);
    } else {
      setEditingSubject(null);
      setMasteryValue(0);
    }
    setIsModalOpen(true);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="w-16 h-16 border-t-4 border-indigo-600 rounded-full animate-spin" />
          <h2 className="text-sm font-black text-indigo-600 uppercase tracking-widest">MasterCycle</h2>
        </div>
      </div>
    );
  }

  if (!session) return <Auth onSuccess={(s) => setSession(s)} />;

  return (
    <div className="min-h-screen pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-inter">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3" onClick={() => window.location.reload()} style={{cursor:'pointer'}}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white leading-none">MasterCycle</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className="text-[8px] font-black uppercase text-slate-400">{syncStatus === 'syncing' ? 'Sincronizando' : syncStatus === 'error' ? 'Erro Cloud' : 'Dados em Nuvem'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:scale-105 transition-all">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs uppercase">
                {session?.user?.email?.charAt(0)}
              </div>
            </button>
            <button onClick={() => openModal(null)} className="hidden sm:block px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95 uppercase tracking-widest">
              Add Disciplina
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-10">
          <section className="space-y-10">
             <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                  <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Temporizador de Foco</h3>
                </div>
                <PomodoroTimer />
             </div>
             
             <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1 h-4 bg-rose-500 rounded-full" />
                  <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Rank Estratégico</h3>
                </div>
                <PerformanceRank subjects={subjects} />
             </div>

             <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Gestão de Matérias</h3>
                </div>
                <div className="space-y-4">
                   {subjects.length === 0 ? (
                     <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                       <p className="text-xs font-bold uppercase tracking-widest mb-4">Sem disciplinas</p>
                       <button onClick={() => openModal(null)} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all uppercase">ADICIONAR AGORA</button>
                     </div>
                   ) : (
                     subjects.map(subject => (
                      <SubjectCard key={subject.id} subject={subject} onDelete={deleteSubject} onEdit={(s) => openModal(s)} />
                     ))
                   )}
                </div>
             </div>
          </section>
        </div>

        <div className="lg:col-span-8">
          <CycleList 
            items={cycleItems} 
            subjects={subjects} 
            onToggleComplete={itemId => {
              setCycleItems(prev => prev.map(i => i.id === itemId ? { 
                ...i, 
                completed: !i.completed, 
                completedAt: !i.completed ? Date.now() : undefined 
              } : i));
            }}
            onUpdatePerformance={(id, val) => {
              const target = cycleItems.find(i => i.id === id);
              if (!target) return;
              setCycleItems(prev => prev.map(i => i.subjectId === target.subjectId ? { ...i, performance: val } : i));
              setSubjects(prev => prev.map(s => s.id === target.subjectId ? { ...s, masteryPercentage: val } : s));
            }}
            onUpdateUrl={(id, url) => setCycleItems(prev => prev.map(i => i.id === id ? { ...i, sessionUrl: url } : i))}
            onReorder={(d, t) => {
              const current = [...cycleItems].sort((a,b) => a.order - b.order);
              const di = current.findIndex(i => i.id === d);
              const ti = current.findIndex(i => i.id === t);
              const [item] = current.splice(di, 1);
              current.splice(ti, 0, item);
              setCycleItems(current.map((i, idx) => ({ ...i, order: idx })));
            }}
            onAppendCycle={() => {
              const lastOrder = cycleItems.length > 0 ? Math.max(...cycleItems.map(i => i.order)) : 0;
              
              if (cycleItems.length > 0) {
                const currentSequence = [...cycleItems].sort((a,b) => a.order - b.order);
                const newItems = currentSequence.map((item, index) => ({
                  id: `${item.subjectId}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
                  subjectId: item.subjectId,
                  duration: item.duration,
                  completed: false,
                  order: lastOrder + index + 1
                }));
                setCycleItems([...cycleItems, ...newItems]);
              } else {
                const newItems = distributeSubjects(subjects, lastOrder + 1);
                setCycleItems([...cycleItems, ...newItems]);
              }
            }}
            onUpdateSubjectTopics={(sid, topics) => setSubjects(prev => prev.map(s => s.id === sid ? { ...s, topics } : s))}
          />
        </div>
      </main>

      {isProfileOpen && (
        <UserProfile 
          user={session?.user}
          subjects={subjects}
          cycleItems={cycleItems}
          onClose={() => setIsProfileOpen(false)}
          onLogout={async () => {
            await supabase.auth.signOut();
            setSession(null);
            setIsProfileOpen(false);
          }}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]">
            <form onSubmit={handleAddOrEditSubject} className="space-y-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{editingSubject ? 'Editar Disciplina' : 'Nova Disciplina'}</h2>
              
              {modalError && (
                <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs font-bold border border-rose-100 dark:border-rose-900/40 animate-in fade-in slide-in-from-top-2">
                  ⚠️ {modalError}
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Matéria</label>
                  <input name="name" defaultValue={editingSubject?.name} required placeholder="Ex: Direito Administrativo" className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500 focus:outline-none transition-all dark:text-white font-bold" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Carga Total (h)</label>
                    <input name="totalHours" type="number" step="0.5" defaultValue={editingSubject?.totalHours || 2} className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500 focus:outline-none dark:text-white font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequência Semanal</label>
                    <input name="frequency" type="number" defaultValue={editingSubject?.frequency || 1} className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500 focus:outline-none dark:text-white font-bold" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link do Caderno (Principal)</label>
                  <input name="notebookUrl" defaultValue={editingSubject?.notebookUrl} placeholder="https://app.tecconcursos.com.br/cadernos/..." className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500 focus:outline-none transition-all dark:text-white font-medium" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Domínio Atual (%)</label>
                    <span className={`text-sm font-black p-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 ${getPercentageColor(masteryValue)}`}>{masteryValue}%</span>
                  </div>
                  <input name="mastery" type="range" min="0" max="100" value={masteryValue} onChange={(e) => setMasteryValue(parseInt(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600 bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 transition-colors text-slate-600 dark:text-slate-300 uppercase text-xs tracking-widest">Cancelar</button>
                <button type="submit" className="flex-1 p-4 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-colors uppercase text-xs tracking-widest">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
