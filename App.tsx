
import React, { useState, useEffect, useCallback } from 'react';
import { Subject, CycleItem } from './types.ts';
import { COLORS } from './constants.tsx';
import SubjectCard from './components/SubjectCard.tsx';
import CycleList from './components/CycleList.tsx';
import PomodoroTimer from './components/PomodoroTimer.tsx';
import PerformanceRank from './components/PerformanceRank.tsx';
import Auth from './components/Auth.tsx';
import { supabaseService, supabase } from './services/supabaseService.ts';
import { getStudyAdvice } from './services/geminiService.ts';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cycleItems, setCycleItems] = useState<CycleItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('mastercycle_darkmode') === 'true');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [modalColor, setModalColor] = useState<string>(COLORS[0]);

  // Verificar Auth Inicial e Mudanças de Estado
  useEffect(() => {
    supabaseService.getSession().then(s => {
      setSession(s);
      setIsCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setSubjects([]);
        setCycleItems([]);
        setIsInitialLoadDone(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carregar dados quando a sessão estiver ativa
  useEffect(() => {
    if (!session?.user) {
      setIsInitialLoadDone(false);
      return;
    }
    
    const loadData = async () => {
      setSyncStatus('syncing');
      try {
        const remoteSubjects = await supabaseService.fetchSubjects();
        const remoteItems = await supabaseService.fetchCycleItems();
        
        if (remoteSubjects) setSubjects(remoteSubjects);
        if (remoteItems) setCycleItems(remoteItems);

        setSyncStatus('success');
      } catch (e) {
        setSyncStatus('error');
      } finally {
        setIsInitialLoadDone(true);
      }
    };
    loadData();
  }, [session]);

  // IA - Mentor
  useEffect(() => {
    if (subjects.length > 0 && isInitialLoadDone) {
      const fetchAdvice = async () => {
        const advice = await getStudyAdvice(subjects);
        setAiAdvice(advice);
      };
      const timer = setTimeout(fetchAdvice, 3000);
      return () => clearTimeout(timer);
    }
  }, [subjects.length, isInitialLoadDone]);

  // Tema Dark/Light
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('mastercycle_darkmode', String(isDarkMode));
  }, [isDarkMode]);

  // Sincronização automática
  useEffect(() => {
    if (!isInitialLoadDone || !session?.user) return;

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await supabaseService.upsertSubjects(subjects);
        await supabaseService.upsertCycleItems(cycleItems);
        setSyncStatus('success');
      } catch {
        setSyncStatus('error');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [subjects, cycleItems, isInitialLoadDone, session]);

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
    if (!confirm("Excluir disciplina? Isso removerá todos os registros associados.")) return;
    const updated = subjects.filter(s => s.id !== id);
    setSubjects(updated);
    setCycleItems(prev => prev.filter(item => item.subjectId !== id));
    await supabaseService.deleteSubject(id);
  };

  const handleSignOut = async () => {
    if (confirm("Deseja encerrar sua sessão?")) {
      await supabaseService.signOut();
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Iniciando MasterCycle...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">MasterCycle</h1>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                  syncStatus === 'syncing' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500 dark:text-slate-400">{syncStatus === 'syncing' ? 'Salvando' : 'Nuvem OK'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessão Ativa</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{session.user.email}</span>
            </div>
            
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:scale-105 transition-all text-lg">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <button onClick={handleSignOut} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:text-rose-600 transition-all text-slate-500" title="Sair">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            
            <button onClick={() => { setEditingSubject(null); setModalColor(COLORS[0]); setIsModalOpen(true); }} className="px-4 py-2 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95">
              ADICIONAR +
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          {aiAdvice && (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-5 rounded-[24px] text-white shadow-xl animate-in slide-in-from-left-4 duration-500">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-white/20 rounded-md flex items-center justify-center text-[10px] font-bold">AI</div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Mentor Estratégico</span>
              </div>
              <p className="text-xs font-medium leading-relaxed italic opacity-95">{aiAdvice}</p>
            </div>
          )}
          
          <PomodoroTimer />
          <PerformanceRank subjects={subjects} />
          
          <div className="space-y-4">
             {subjects.length === 0 ? (
               <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                 <p className="text-xs font-bold uppercase tracking-widest mb-2 opacity-50">Sem disciplinas</p>
                 <button onClick={() => setIsModalOpen(true)} className="text-[10px] font-black text-indigo-500 hover:underline">COMEÇAR AGORA</button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleAddOrEditSubject} className="space-y-6">
              <h2 className="text-xl font-black">{editingSubject ? 'Editar Disciplina' : 'Criar Disciplina'}</h2>
              <div className="space-y-4">
                <input name="name" defaultValue={editingSubject?.name} required placeholder="Ex: Matemática Financeira" className="w-full p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500 focus:outline-none" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Horas Totais</label>
                    <input name="totalHours" type="number" step="0.5" defaultValue={editingSubject?.totalHours || 2} className="w-full p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Vezes no Ciclo</label>
                    <input name="frequency" type="number" defaultValue={editingSubject?.frequency || 1} className="w-full p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setModalColor(c)} className={`w-8 h-8 rounded-full border-4 transition-transform ${modalColor === c ? 'border-white dark:border-slate-900 scale-125 ring-2 ring-indigo-500' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={modalColor} onChange={e => setModalColor(e.target.value)} className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-none p-0 overflow-hidden" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Domínio Atual</label>
                    <span className="text-[10px] font-black text-indigo-600">{editingSubject?.masteryPercentage || 0}%</span>
                  </div>
                  <input name="mastery" type="range" min="0" max="100" defaultValue={editingSubject?.masteryPercentage || 0} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600 bg-slate-200 dark:bg-slate-800" />
                </div>

                <input name="notebookUrl" defaultValue={editingSubject?.notebookUrl} placeholder="Link do Caderno (opcional)" className="w-full p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-800 focus:border-indigo-500" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 p-4 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
