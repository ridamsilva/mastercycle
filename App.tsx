
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

  // Monitorar Autenticação
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

  // Carregamento Inicial da Nuvem (Hidratação)
  useEffect(() => {
    if (!session || isInitialLoadRef.current) return;

    const hydrate = async () => {
      setSyncStatus('syncing');
      try {
        const cloudSubjects = await supabaseService.fetchSubjects();
        const cloudItems = await supabaseService.fetchCycleItems();

        // Lógica de merge: Nuvem tem prioridade se houver dados
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

  // Persistência Local e Nuvem Automática (Debounce de 3 segundos)
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
          console.error("Erro na sincronização:", e);
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
      let lastId: string | null = newItems.length > 0 ? newItems[newItems.length - 1].subjectId : null;
      let candidates = tempPool.filter(p => p.remaining > 0);
      
      // Tenta não repetir a mesma matéria em seguida
      let filtered = candidates.filter(p => p.subjectId !== lastId);
      let selected = filtered.length > 0 
        ? filtered.sort((a, b) => b.remaining - a.remaining)[0] 
        : candidates[0];

      if (selected) {
        newItems.push({
          id: `item-${selected.subjectId}-${Date.now()}-${i}`,
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
    
    // Só regenera o ciclo se for uma nova matéria ou se o usuário confirmar
    if (!editingSubject) {
      generateCycle(updated);
    } else if (confirm("Deseja atualizar o fluxo do ciclo com as novas configurações?")) {
      generateCycle(updated);
    }
    
    setIsModalOpen(false);
  };

  const deleteSubject = async (id: string) => {
    if (!confirm("Excluir disciplina e remover do ciclo?")) return;
    setSubjects(prev => prev.filter(s => s.id !== id));
    setCycleItems(prev => prev.filter(item => item.subjectId !== id));
    if (session) await supabaseService.deleteSubject(id);
  };

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 text-indigo-600 font-black animate-pulse">CARREGANDO MASTER CYCLE...</div>;
  
  if (!session) return <Auth onSuccess={setSession} />;

  return (
    <div className="min-h-screen pb-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-inter text-slate-900 dark:text-slate-100">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" /></svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter leading-none">MasterCycle</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <span className="text-[8px] font-black uppercase text-slate-400">
                {syncStatus === 'syncing' ? 'Sincronizando' : syncStatus === 'error' ? 'Erro Sinc' : 'Nuvem Ativa'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setIsStatsOpen(true)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
          </button>
          <button onClick={() => { setEditingSubject(null); setMasteryValue(0); setIsModalOpen(true); }} className="hidden sm:block px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">
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
                <button onClick={() => { setEditingSubject(null); setMasteryValue(0); setIsModalOpen(true); }} className="sm:hidden text-[10px] font-black text-indigo-600 uppercase">Adicionar</button>
             </div>
             {subjects.map(s => <SubjectCard key={s.id} subject={s} onDelete={deleteSubject} onEdit={(sub) => { setEditingSubject(sub); setMasteryValue(sub.masteryPercentage); setIsModalOpen(true); }} />)}
             {subjects.length === 0 && <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-[10px] font-black uppercase tracking-widest opacity-50">Nenhuma matéria cadastrada</div>}
          </div>
        </div>

        <div className="lg:col-span-8">
          <CycleList 
            items={cycleItems} 
            subjects={subjects} 
            onToggleComplete={id => setCycleItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed, completedAt: !i.completed ? Date.now() : undefined } : i))}
            onUpdatePerformance={(id, val) => {
              const item = cycleItems.find(i => i.id === id);
              if (!item) return;
              
              // Atualiza apenas a sessão específica no histórico do ciclo
              setCycleItems(prev => prev.map(i => i.id === id ? { ...i, performance: val } : i));
              
              // Atualiza o domínio geral da matéria para refletir a última nota
              setSubjects(prev => prev.map(s => s.id === item.subjectId ? { ...s, masteryPercentage: val } : s));
            }}
            onUpdateUrl={(id, url) => setCycleItems(prev => prev.map(i => i.id === id ? { ...i, sessionUrl: url } : i))}
            onReorder={(d, t) => {
              const list = [...cycleItems].sort((a,b) => a.order - b.order);
              const di = list.findIndex(i => i.id === d);
              const ti = list.findIndex(i => i.id === t);
              const [item] = list.splice(di, 1);
              list.splice(ti, 0, item);
              setCycleItems(list.map((i, idx) => ({ ...i, order: idx })));
            }}
            onAppendCycle={() => generateCycle(subjects)}
            onUpdateSubjectTopics={(sid, topics) => setSubjects(prev => prev.map(s => s.id === sid ? { ...s, topics } : s))}
          />
        </div>
      </main>

      {isStatsOpen && <UserProfile subjects={subjects} cycleItems={cycleItems} onClose={() => setIsStatsOpen(false)} />}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg p-10 shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-200 dark:border-slate-800">
            <form onSubmit={handleAddOrEditSubject} className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{editingSubject ? 'Editar' : 'Nova'} Disciplina</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configure os parâmetros de estudo</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome da Matéria</label>
                   <input name="name" defaultValue={editingSubject?.name} required placeholder="Ex: Direito Constitucional" className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-indigo-500 transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Horas Totais</label>
                    <input name="totalHours" type="number" step="0.5" min="0.5" defaultValue={editingSubject?.totalHours || 2} placeholder="Horas" className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Frequência/Ciclo</label>
                    <input name="frequency" type="number" min="1" max="10" defaultValue={editingSubject?.frequency || 1} placeholder="Frequência" className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-indigo-500 transition-all" />
                  </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Link do Caderno (Opcional)</label>
                   <input name="notebookUrl" defaultValue={editingSubject?.notebookUrl} placeholder="https://notion.so/..." className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-medium outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>Domínio Atual</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{masteryValue}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={masteryValue} onChange={(e) => setMasteryValue(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                  <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">Arraste para definir seu nível de conhecimento inicial nesta matéria.</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-5 rounded-2xl bg-slate-100 font-black dark:bg-slate-800 text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 p-5 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
