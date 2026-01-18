
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
  const [modalColor, setModalColor] = useState<string>(COLORS[0]);

  // 1. Verificação de Autenticação
  useEffect(() => {
    let mounted = true;

    const checkInitialSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(currentSession);
          setIsCheckingAuth(false);
        }
      } catch (err) {
        console.error("Erro auth:", err);
        if (mounted) setIsCheckingAuth(false);
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        if (!newSession) {
          setSubjects([]);
          setCycleItems([]);
          setIsInitialLoadDone(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Carregar Dados do Usuário
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
        console.warn("Falha ao carregar dados remotos.");
        setSyncStatus('error');
      } finally {
        setIsInitialLoadDone(true);
      }
    };
    loadData();
  }, [session]);

  // 3. Sincronização Automática com Supabase
  useEffect(() => {
    if (!isInitialLoadDone || !session?.user || subjects.length === 0) return;

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await supabaseService.upsertSubjects(subjects);
        await supabaseService.upsertCycleItems(cycleItems);
        setSyncStatus('success');
      } catch (err) {
        console.error("Erro sync:", err);
        setSyncStatus('error');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [subjects, cycleItems, isInitialLoadDone, session]);

  // Gerenciamento de Tema
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('mastercycle_darkmode', String(isDarkMode));
  }, [isDarkMode]);

  const generateCycle = useCallback((currentSubjects: Subject[]) => {
    if (currentSubjects.length === 0) {
      setCycleItems([]);
      return;
    }
    const newItems: CycleItem[] = [];
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
      let selected = filtered.length > 0 ? filtered.sort((a, b) => b.remaining - a.remaining)[0] : candidates[0];

      if (selected) {
        newItems.push({
          id: `${selected.subjectId}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          subjectId: selected.subjectId,
          duration: selected.duration,
          completed: false,
          order: i,
        });
        selected.remaining--;
      }
    }
    setCycleItems(newItems);
  }, []);

  const handleAddOrEditSubject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const totalHours = parseFloat(formData.get('totalHours') as string);
    const frequency = parseInt(formData.get('frequency') as string);
    const notebookUrl = formData.get('notebookUrl') as string;
    const masteryPercentage = parseInt(formData.get('mastery') as string);

    let updated: Subject[];
    if (editingSubject) {
      updated = subjects.map(s => s.id === editingSubject.id ? {
        ...s, name, totalHours, frequency, notebookUrl, masteryPercentage, color: modalColor
      } : s);
    } else {
      const newSubject: Subject = {
        id: Math.random().toString(36).substr(2, 9),
        name, totalHours, frequency, notebookUrl, masteryPercentage,
        color: modalColor, topics: []
      };
      updated = [...subjects, newSubject];
    }
    setSubjects(updated);
    if (!editingSubject) generateCycle(updated);
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const deleteSubject = async (id: string) => {
    if (!confirm("Excluir disciplina? Isso removerá todos os blocos do ciclo.")) return;
    
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

  if (!session) {
    return <Auth onSuccess={(s) => setSession(s)} />;
  }

  return (
    <div className="min-h-screen pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-inter">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white leading-none">MasterCycle</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className="text-[8px] font-black uppercase text-slate-400">{syncStatus === 'syncing' ? 'Salvando' : syncStatus === 'error' ? 'Erro' : 'Salvo'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:scale-105 transition-all">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                {session?.user?.email?.charAt(0).toUpperCase()}
              </div>
            </button>
            <button onClick={() => { setEditingSubject(null); setModalColor(COLORS[0]); setIsModalOpen(true); }} className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95 uppercase tracking-widest">
              Adicionar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <PomodoroTimer />
          <PerformanceRank subjects={subjects} />
          
          <div className="space-y-4">
             {subjects.length === 0 ? (
               <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                 <p className="text-xs font-bold uppercase tracking-widest mb-4">Inicie seu Ciclo</p>
                 <button onClick={() => setIsModalOpen(true)} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all">CRIAR DISCIPLINA</button>
               </div>
             ) : (
               subjects.map(subject => (
                <SubjectCard key={subject.id} subject={subject} onDelete={deleteSubject} onEdit={(s) => { setEditingSubject(s); setModalColor(s.color); setIsModalOpen(true); }} />
               ))
             )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <CycleList 
            items={cycleItems} 
            subjects={subjects} 
            onToggleComplete={itemId => {
              setCycleItems(prev => prev.map(i => i.id === itemId ? { ...i, completed: !i.completed, completedAt: !i.completed ? Date.now() : undefined } : i));
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
              const newItems: CycleItem[] = [];
              const tempPool = subjects.map(s => ({
                subjectId: s.id, remaining: s.frequency, duration: parseFloat((s.totalHours / s.frequency).toFixed(2))
              }));
              for (let i = 0; i < subjects.reduce((a, s) => a + s.frequency, 0); i++) {
                const candidates = tempPool.filter(p => p.remaining > 0);
                const selected = candidates[0];
                if (selected) {
                  newItems.push({
                    id: `${selected.subjectId}-${Date.now()}-${i}`,
                    subjectId: selected.subjectId, duration: selected.duration, completed: false, order: lastOrder + i + 1
                  });
                  selected.remaining--;
                }
              }
              setCycleItems([...cycleItems, ...newItems]);
            }}
            onUpdateSubjectTopics={(sid, topics) => setSubjects(prev => prev.map(s => s.id === sid ? { ...s, topics } : s))}
          />
        </div>
      </main>

      {isProfileOpen && (
        <UserProfile 
          user={session.user}
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
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <form onSubmit={handleAddOrEditSubject} className="space-y-6">
              <h2 className="text-xl font-black">{editingSubject ? 'Editar Disciplina' : 'Nova Disciplina'}</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Matéria</label>
                  <input name="name" defaultValue={editingSubject?.name} required placeholder="Ex: Direito Constitucional" className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500 focus:outline-none transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Carga Total (h)</label>
                    <input name="totalHours" type="number" step="0.5" defaultValue={editingSubject?.totalHours || 2} className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequência</label>
                    <input name="frequency" type="number" defaultValue={editingSubject?.frequency || 1} className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500 focus:outline-none" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setModalColor(c)} className={`w-8 h-8 rounded-full border-4 transition-all ${modalColor === c ? 'border-white dark:border-slate-900 scale-125 ring-2 ring-indigo-500' : 'border-transparent opacity-60'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Domínio Atual</label>
                    <span className="text-xs font-black text-indigo-600">{editingSubject?.masteryPercentage || 0}%</span>
                  </div>
                  <input name="mastery" type="range" min="0" max="100" defaultValue={editingSubject?.masteryPercentage || 0} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600 bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 p-4 rounded-2xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-colors uppercase text-xs tracking-widest">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
