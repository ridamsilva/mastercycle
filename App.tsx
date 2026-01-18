
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

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SUBJECTS);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [cycleItems, setCycleItems] = useState<CycleItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CYCLE);
    return saved ? JSON.parse(saved) : [];
  });

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('mastercycle_darkmode') === 'true');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [masteryValue, setMasteryValue] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  
  const isInitialLoadRef = useRef(false);

  useEffect(() => {
    supabaseService.getSession().then(session => {
      setSession(session);
      setIsCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || isInitialLoadRef.current) return;

    const hydrate = async () => {
      setSyncStatus('syncing');
      try {
        const cloudSubjects = await supabaseService.fetchSubjects();
        const cloudItems = await supabaseService.fetchCycleItems();

        if (cloudSubjects && cloudSubjects.length > 0) {
          setSubjects(cloudSubjects);
        } else if (subjects.length > 0) {
          await supabaseService.upsertSubjects(subjects);
        }

        if (cloudItems && cloudItems.length > 0) {
          setCycleItems(cloudItems);
        } else if (cycleItems.length > 0) {
          await supabaseService.upsertCycleItems(cycleItems);
        }

        setSyncStatus('success');
        isInitialLoadRef.current = true;
      } catch (e) {
        setSyncStatus('error');
      }
    };

    hydrate();
  }, [session]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_SUBJECTS, JSON.stringify(subjects));
    localStorage.setItem(LOCAL_STORAGE_KEY_CYCLE, JSON.stringify(cycleItems));

    if (session && isInitialLoadRef.current) {
      const timer = setTimeout(async () => {
        setSyncStatus('syncing');
        try {
          await supabaseService.upsertSubjects(subjects);
          await supabaseService.upsertCycleItems(cycleItems);
          setSyncStatus('success');
        } catch (e) {
          setSyncStatus('error');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [subjects, cycleItems, session]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('mastercycle_darkmode', String(isDarkMode));
  }, [isDarkMode]);

  const generateCycle = useCallback((currentSubjects: Subject[], prevItems: CycleItem[] = []) => {
    if (currentSubjects.length === 0) {
      setCycleItems([]);
      return;
    }

    const prevDataMap: Record<string, { url: string, performance?: number }> = {};
    prevItems.forEach(item => {
      if (!prevDataMap[item.subjectId]) {
         prevDataMap[item.subjectId] = { url: item.sessionUrl || "", performance: item.performance };
      }
    });

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
        const persisted = prevDataMap[sId];

        newItems.push({
          id: `item-${sId}-${Date.now()}-${i}`,
          subjectId: sId,
          duration: selected.duration,
          completed: false,
          order: i,
          sessionUrl: persisted?.url || "",
          performance: persisted?.performance
        });
        selected.remaining--;
      }
    }
    setCycleItems(newItems);
  }, []);

  const handleUpdateUrl = (itemId: string, url: string) => {
    const item = cycleItems.find(i => i.id === itemId);
    if (!item) return;
    setCycleItems(prev => prev.map(i => i.subjectId === item.subjectId ? { ...i, sessionUrl: url } : i));
  };

  const handleUpdatePerformance = (itemId: string, val: number) => {
    const item = cycleItems.find(i => i.id === itemId);
    if (!item) return;
    setCycleItems(prev => prev.map(i => i.subjectId === item.subjectId ? { ...i, performance: val } : i));
    setSubjects(prev => prev.map(s => s.id === item.subjectId ? { ...s, masteryPercentage: val } : s));
  };

  const handleAddOrEditSubject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const totalHours = parseFloat(formData.get('totalHours') as string);
    const frequency = parseInt(formData.get('frequency') as string);
    const notebookUrl = formData.get('notebookUrl') as string;

    let updated: Subject[];
    if (editingSubject) {
      updated = subjects.map(s => s.id === editingSubject.id ? { 
        ...s, name, totalHours, frequency, notebookUrl, masteryPercentage: masteryValue 
      } : s);
    } else {
      const newSubject: Subject = {
        id: Math.random().toString(36).substr(2, 9),
        name, totalHours, frequency, notebookUrl, masteryPercentage: masteryValue,
        color: COLORS[subjects.length % COLORS.length],
        topics: []
      };
      updated = [...subjects, newSubject];
    }
    setSubjects(updated);
    
    if (!editingSubject) {
      generateCycle(updated, cycleItems);
    } else if (confirm("Atualizar fluxo mantendo sincronia de dados?")) {
      generateCycle(updated, cycleItems);
    }
    setIsModalOpen(false);
  };

  const deleteSubject = async (id: string) => {
    if (!confirm(`Deseja realmente excluir esta disciplina? Ela será removida de todos os ciclos não concluídos.`)) return;
    
    setSubjects(prev => prev.filter(s => s.id !== id));
    // Remove do ciclo apenas itens que NÃO foram concluídos
    setCycleItems(prev => prev.filter(item => item.subjectId !== id || item.completed === true));
    
    if (session) await supabaseService.deleteSubject(id);
    setIsModalOpen(false);
  };

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 text-[#0066b2] font-black animate-pulse uppercase tracking-[0.5em]">Carregando MasterCycle...</div>;
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
                {syncStatus === 'syncing' ? 'Sincronizando' : syncStatus === 'error' ? 'Erro de Sinc' : 'Nuvem Conectada'}
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
          <button onClick={() => { setEditingSubject(null); setMasteryValue(0); setIsModalOpen(true); }} className="hidden sm:block px-6 py-3 bg-[#0066b2] text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-lg hover:bg-[#004a80] transition-all">
            Nova Disciplina
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-10">
          <PomodoroTimer />
          <PerformanceRank subjects={subjects} />
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Disciplinas</h3>
                <button onClick={() => { setEditingSubject(null); setMasteryValue(0); setIsModalOpen(true); }} className="sm:hidden text-[10px] font-black text-[#0066b2] uppercase">Adicionar</button>
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
            onReorder={(d, t) => {
              const list = [...cycleItems].sort((a,b) => a.order - b.order);
              const di = list.findIndex(i => i.id === d);
              const ti = list.findIndex(i => i.id === t);
              const [item] = list.splice(di, 1);
              list.splice(ti, 0, item);
              setCycleItems(list.map((i, idx) => ({ ...i, order: idx })));
            }}
            onAppendCycle={() => generateCycle(subjects, cycleItems)}
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
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuração do Ciclo</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome da Matéria</label>
                   <input name="name" defaultValue={editingSubject?.name} required placeholder="Ex: Matemática" className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-[#0066b2] transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Horas Totais</label>
                    <input name="totalHours" type="number" step="0.5" min="0.5" defaultValue={editingSubject?.totalHours || 2} className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-[#0066b2] transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Vezes no Ciclo</label>
                    <input name="frequency" type="number" min="1" max="10" defaultValue={editingSubject?.frequency || 1} className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-[#0066b2] transition-all" />
                  </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Link do Caderno</label>
                   <input name="notebookUrl" defaultValue={editingSubject?.notebookUrl} placeholder="https://..." className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-medium outline-none focus:border-[#0066b2] transition-all" />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-5 rounded-2xl bg-slate-100 font-black dark:bg-slate-800 text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 p-5 rounded-2xl bg-[#0066b2] text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 dark:shadow-none hover:bg-[#004a80] transition-all">Salvar</button>
                </div>
                
                {editingSubject && (
                  <button 
                    type="button" 
                    onClick={() => deleteSubject(editingSubject.id)}
                    className="w-full p-4 rounded-2xl text-rose-500 font-black uppercase text-[9px] tracking-[0.2em] border border-rose-100 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                  >
                    Excluir Disciplina do Plano
                  </button>
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
