
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Subject, CycleItem } from './types.ts';
import { COLORS } from './constants.tsx';
import SubjectCard from './components/SubjectCard.tsx';
import CycleList from './components/CycleList.tsx';
import PomodoroTimer from './components/PomodoroTimer.tsx';
import PerformanceRank from './components/PerformanceRank.tsx';
import UserProfile from './components/UserProfile.tsx';
import Auth from './components/Auth.tsx';
import { supabaseService, supabase } from './services/supabaseService.ts';

const LOCAL_STORAGE_KEY_SUBJECTS = 'mastercycle_subjects_local';
const LOCAL_STORAGE_KEY_CYCLE = 'mastercycle_cycle_local';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cycleItems, setCycleItems] = useState<CycleItem[]>([]);

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('mastercycle_darkmode') === 'true');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [masteryValue, setMasteryValue] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  
  const isInitialLoadRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth State Management
  useEffect(() => {
    supabaseService.getSession().then(session => {
      setSession(session);
      setIsCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT' || !session) {
        setSubjects([]);
        setCycleItems([]);
        localStorage.removeItem(LOCAL_STORAGE_KEY_SUBJECTS);
        localStorage.removeItem(LOCAL_STORAGE_KEY_CYCLE);
        isInitialLoadRef.current = false;
      } else {
        isInitialLoadRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Hydration logic
  useEffect(() => {
    if (!session || isInitialLoadRef.current) return;

    const hydrate = async () => {
      setSyncStatus('syncing');
      try {
        const cloudSubjects = await supabaseService.fetchSubjects();
        const cloudItems = await supabaseService.fetchCycleItems();

        if (cloudSubjects && cloudSubjects.length > 0) {
          setSubjects(cloudSubjects);
        } else {
          const savedSubjects = localStorage.getItem(LOCAL_STORAGE_KEY_SUBJECTS);
          if (savedSubjects) setSubjects(JSON.parse(savedSubjects));
        }

        if (cloudItems && cloudItems.length > 0) {
          setCycleItems(cloudItems);
        } else {
          const savedItems = localStorage.getItem(LOCAL_STORAGE_KEY_CYCLE);
          if (savedItems) setCycleItems(JSON.parse(savedItems));
        }

        setSyncStatus('success');
        isInitialLoadRef.current = true;
      } catch (e) {
        setSyncStatus('error');
      }
    };

    hydrate();
  }, [session]);

  // Autosave
  useEffect(() => {
    if (!isInitialLoadRef.current || !session) return;

    localStorage.setItem(LOCAL_STORAGE_KEY_SUBJECTS, JSON.stringify(subjects));
    localStorage.setItem(LOCAL_STORAGE_KEY_CYCLE, JSON.stringify(cycleItems));

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    
    syncTimerRef.current = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await supabaseService.upsertSubjects(subjects);
        await supabaseService.upsertCycleItems(cycleItems);
        setSyncStatus('success');
      } catch (e) {
        setSyncStatus('error');
      }
    }, 2000);
  }, [subjects, cycleItems, session]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('mastercycle_darkmode', String(isDarkMode));
  }, [isDarkMode]);

  // GERAÇÃO DE CICLO INTELIGENTE
  const generateCycle = useCallback(async (currentSubjects: Subject[], prevItems: CycleItem[] = [], resetCompleted = false) => {
    if (currentSubjects.length === 0) {
      setCycleItems([]);
      return;
    }

    const prevItemsMap: Record<string, CycleItem[]> = {};
    prevItems.forEach(item => {
      if (!prevItemsMap[item.subjectId]) prevItemsMap[item.subjectId] = [];
      prevItemsMap[item.subjectId].push(item);
    });

    const subjectOccurrenceCounters: Record<string, number> = {};
    const newItems: CycleItem[] = [];
    
    const tempPool = currentSubjects.map(s => ({
      subjectId: s.id,
      remaining: s.frequency,
      duration: parseFloat((s.totalHours / s.frequency).toFixed(2))
    }));
    
    const totalSlots = currentSubjects.reduce((acc, s) => acc + s.frequency, 0);

    for (let i = 0; i < totalSlots; i++) {
      let lastId: string | null = newItems.length > 0 ? newItems[newItems.length - 1].subjectId : null;
      let candidates = tempPool.filter(p => p.remaining > 0);
      let filtered = candidates.filter(p => p.subjectId !== lastId);
      let selected = filtered.length > 0 
        ? filtered.sort((a, b) => b.remaining - a.remaining)[0] 
        : candidates[0];

      if (selected) {
        const sId = selected.subjectId;
        const count = subjectOccurrenceCounters[sId] || 0;
        const existing = prevItemsMap[sId]?.[count];
        const subConfig = currentSubjects.find(s => s.id === sId);

        newItems.push({
          id: `slot-${i}`, 
          subjectId: sId,
          duration: selected.duration,
          completed: resetCompleted ? false : (existing?.completed || false),
          order: i,
          sessionUrl: existing?.sessionUrl || subConfig?.notebookUrl || "",
          performance: resetCompleted ? undefined : existing?.performance,
          completedAt: resetCompleted ? undefined : existing?.completedAt
        });
        
        subjectOccurrenceCounters[sId] = count + 1;
        selected.remaining--;
      }
    }

    setCycleItems(newItems);
  }, [session]);

  const handleUpdateUrl = (itemId: string, url: string) => {
    const item = cycleItems.find(i => i.id === itemId);
    if (!item) return;
    setCycleItems(prev => prev.map(i => i.subjectId === item.subjectId ? { ...i, sessionUrl: url } : i));
    setSubjects(prev => prev.map(s => s.id === item.subjectId ? { ...s, notebookUrl: url } : s));
  };

  const handleUpdatePerformance = (itemId: string, val: number) => {
    const item = cycleItems.find(i => i.id === itemId);
    if (!item) return;
    const cappedValue = Math.min(100, Math.max(0, val));
    setCycleItems(prev => prev.map(i => i.id === itemId ? { ...i, performance: cappedValue } : i));
    setSubjects(prev => prev.map(s => s.id === item.subjectId ? { ...s, masteryPercentage: cappedValue } : s));
  };

  const handleMoveItem = (id: string, direction: 'up' | 'down') => {
    setCycleItems(prev => {
      const list = [...prev].sort((a, b) => a.order - b.order);
      const index = list.findIndex(i => i.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === list.length - 1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const [item] = list.splice(index, 1);
      list.splice(targetIndex, 0, item);

      // Re-mapeia ordem e IDs para manter consistência no banco
      return list.map((item, idx) => ({
        ...item,
        order: idx,
        id: `slot-${idx}`
      }));
    });
  };

  const handleAddOrEditSubject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const totalHours = parseFloat(formData.get('totalHours') as string);
    const frequency = parseInt(formData.get('frequency') as string);
    const notebookUrl = (formData.get('notebookUrl') as string).trim();

    const isDuplicateName = subjects.some(s => 
      s.name.toLowerCase() === name.toLowerCase() && 
      (!editingSubject || s.id !== editingSubject.id)
    );

    if (isDuplicateName) {
      alert(`Já existe uma disciplina chamada "${name.toUpperCase()}".`);
      return;
    }

    let updated: Subject[];
    if (editingSubject) {
      updated = subjects.map(s => s.id === editingSubject.id ? { 
        ...s, name, totalHours, frequency, notebookUrl, masteryPercentage: masteryValue 
      } : s);
    } else {
      const newSubject: Subject = {
        id: `sub-${Date.now()}`,
        name, totalHours, frequency, notebookUrl, masteryPercentage: masteryValue,
        color: COLORS[subjects.length % COLORS.length],
        topics: []
      };
      updated = [...subjects, newSubject];
    }
    setSubjects(updated);
    generateCycle(updated, cycleItems);
    setIsModalOpen(false);
  };

  const deleteSubject = async (id: string) => {
    const subjectToDelete = subjects.find(s => s.id === id);
    if (!subjectToDelete) return;
    if (!confirm(`Excluir "${subjectToDelete.name.toUpperCase()}"?`)) return;
    
    const nextSubjects = subjects.filter(s => s.id !== id);
    setSubjects(nextSubjects);
    generateCycle(nextSubjects, cycleItems);
    
    if (session) {
      setSyncStatus('syncing');
      try {
        await supabaseService.deleteSubject(id);
        setSyncStatus('success');
      } catch (err) {
        setSyncStatus('error');
      }
    }
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 text-brand-blue font-black animate-pulse uppercase tracking-[0.5em]">Carregando...</div>;
  if (!session) return <Auth onSuccess={setSession} />;

  return (
    <div className="min-h-screen pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-inter text-slate-900 dark:text-slate-100">
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-4 h-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 relative group">
             <svg viewBox="0 0 250 250" className="w-full h-full drop-shadow-md">
                <path d="M125 35 A 90 90 0 0 0 35 125" fill="none" stroke="#0066b2" strokeWidth="18" strokeLinecap="round" />
                <path d="M110 20 L 145 35 L 110 50 Z" fill="#0066b2" />
                <path d="M125 215 A 90 90 0 0 0 215 125" fill="none" stroke="#f37021" strokeWidth="18" strokeLinecap="round" />
                <path d="M140 230 L 105 215 L 140 200 Z" fill="#f37021" />
                <g transform="rotate(-10, 125, 125)">
                  <rect x="80" y="65" width="90" height="120" rx="6" fill="white" stroke="#334155" strokeWidth="3" />
                  <path d="M120 125 L 132 140 L 155 110" stroke="#d00" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <g transform="rotate(40, 125, 125) translate(38, -84)">
                  <path d="M110 30 L 140 30 L 140 100 L 110 100 Z" fill="#0066b2" />
                  <path d="M110 30 Q 125 15 140 30" fill="#0066b2" />
                  <rect x="108" y="100" width="34" height="6" fill="#cbd5e1" />
                  <path d="M110 106 L 140 106 L 135 160 L 115 160 Z" fill="#f37021" />
                  <path d="M115 160 L 135 160 L 125 190 Z" fill="white" />
                  <circle cx="125" cy="190" r="3" fill="#334155" />
                </g>
             </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex text-xl font-black tracking-tighter uppercase leading-none">
              <span className="text-[#0066b2]">MASTER</span>
              <span className="text-[#f37021]">CYCLE</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`w-2 h-2 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                {syncStatus === 'syncing' ? 'Salvando' : syncStatus === 'error' ? 'Erro' : 'Cloud On'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all hover:bg-slate-200 dark:hover:bg-slate-700">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setIsStatsOpen(true)} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[#0066b2] transition-all hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
          </button>
          <button onClick={() => { setEditingSubject(null); setMasteryValue(0); setIsModalOpen(true); }} className="hidden sm:block px-6 py-3 bg-[#0066b2] text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-lg hover:bg-brand-darkBlue transition-all">
            Nova Matéria
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-10">
          <PomodoroTimer />
          <PerformanceRank subjects={subjects} />
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Suas Disciplinas</h3>
             </div>
             {subjects.map(s => <SubjectCard key={s.id} subject={s} onDelete={deleteSubject} onEdit={(sub) => { setEditingSubject(sub); setMasteryValue(sub.masteryPercentage); setIsModalOpen(true); }} />)}
          </div>
        </div>

        <div className="lg:col-span-8">
          <CycleList 
            items={cycleItems} 
            subjects={subjects} 
            onToggleComplete={id => setCycleItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed, completedAt: !i.completed ? Date.now() : undefined } : i))}
            onUpdatePerformance={handleUpdatePerformance}
            onUpdateUrl={handleUpdateUrl}
            onMoveItem={handleMoveItem}
            onAppendCycle={() => generateCycle(subjects, cycleItems, true)}
            onUpdateSubjectTopics={(sid, topics) => setSubjects(prev => prev.map(s => s.id === sid ? { ...s, topics } : s))}
          />
        </div>
      </main>

      {isStatsOpen && <UserProfile subjects={subjects} cycleItems={cycleItems} onClose={() => setIsStatsOpen(false)} />}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg p-10 shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-200 dark:border-slate-800">
            <form onSubmit={handleAddOrEditSubject} className="space-y-8">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{editingSubject ? 'Editar' : 'Nova'} Disciplina</h2>
              </div>
              <div className="space-y-5">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome</label>
                   <input name="name" defaultValue={editingSubject?.name} required className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-[#0066b2] transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Horas Totais</label>
                    <input name="totalHours" type="number" step="0.5" defaultValue={editingSubject?.totalHours || 2} className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-[#0066b2] transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Repetições</label>
                    <input name="frequency" type="number" min="1" defaultValue={editingSubject?.frequency || 1} className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-[#0066b2] transition-all" />
                  </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Link Base (Opcional)</label>
                   <input name="notebookUrl" defaultValue={editingSubject?.notebookUrl} className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-medium outline-none focus:border-[#0066b2] transition-all" />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-5 rounded-2xl bg-slate-100 font-black dark:bg-slate-800 text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 p-5 rounded-2xl bg-[#0066b2] text-white font-black uppercase text-[10px] tracking-widest hover:bg-brand-darkBlue transition-all">Salvar</button>
                </div>
                {editingSubject && (
                  <button type="button" onClick={() => deleteSubject(editingSubject.id)} className="w-full p-4 rounded-2xl text-rose-500 font-black uppercase text-[9px] tracking-[0.2em] border border-rose-100 dark:border-rose-900/40 hover:bg-rose-50 transition-all">Excluir Matéria</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
