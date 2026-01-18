
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Subject, CycleItem, CycleHistoryEntry } from './types.ts';
import { COLORS } from './constants.tsx';
import SubjectCard from './components/SubjectCard.tsx';
import CycleList from './components/CycleList.tsx';
import PomodoroTimer from './components/PomodoroTimer.tsx';
import PerformanceRank from './components/PerformanceRank.tsx';
import UserProfile from './components/UserProfile.tsx';
import HistoryDetail from './components/HistoryDetail.tsx';
import Auth from './components/Auth.tsx';
import { supabaseService, supabase } from './services/supabaseService.ts';

const LOCAL_STORAGE_KEY_SUBJECTS = 'm_cycle_s';
const LOCAL_STORAGE_KEY_CYCLE = 'm_cycle_c';
const LOCAL_STORAGE_KEY_HISTORY = 'm_cycle_h';

const generateId = (p = 'id') => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cycleItems, setCycleItems] = useState<CycleItem[]>([]);
  const [history, setHistory] = useState<CycleHistoryEntry[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('m_dark') === 'true');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<CycleHistoryEntry | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  
  const isInitialLoadRef = useRef(false);
  const syncTimerRef = useRef<any>(null);

  const uniqueSubjects = useMemo(() => {
    const seen = new Set();
    return subjects.filter(s => {
      const name = s.name.toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [subjects]);

  useEffect(() => {
    supabaseService.getSession().then(s => { setSession(s); setIsCheckingAuth(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || isInitialLoadRef.current) return;
    (async () => {
      setSyncStatus('syncing');
      const [sCloud, iCloud, hCloud] = await Promise.all([
        supabaseService.fetchSubjects(),
        supabaseService.fetchCycleItems(),
        supabaseService.fetchHistory()
      ]);
      setSubjects(sCloud || JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_SUBJECTS) || '[]'));
      setCycleItems(iCloud || JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_CYCLE) || '[]'));
      setHistory(hCloud || JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_HISTORY) || '[]'));
      isInitialLoadRef.current = true;
      setSyncStatus('success');
    })();
  }, [session]);

  useEffect(() => {
    if (!isInitialLoadRef.current || !session) return;
    localStorage.setItem(LOCAL_STORAGE_KEY_SUBJECTS, JSON.stringify(subjects));
    localStorage.setItem(LOCAL_STORAGE_KEY_CYCLE, JSON.stringify(cycleItems));
    localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(history));

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await Promise.all([
          supabaseService.upsertSubjects(subjects),
          supabaseService.upsertCycleItems(cycleItems)
        ]);
        setSyncStatus('success');
      } catch { setSyncStatus('error'); }
    }, 3000);
  }, [subjects, cycleItems, history, session]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('m_dark', String(isDarkMode));
  }, [isDarkMode]);

  const generateCycle = useCallback((currentSubjects: Subject[], append = false) => {
    if (!currentSubjects.length) return;
    
    // Mapear o último estado de cada disciplina para herança
    const lastDataMap = new Map();
    cycleItems.forEach(item => {
      lastDataMap.set(item.subjectId, {
        performance: item.performance,
        sessionUrl: item.sessionUrl
      });
    });

    const newCycleId = `cycle-${Date.now()}`;
    const newItems: CycleItem[] = [];
    const pool = currentSubjects.flatMap(s => {
      const dur = Number((s.totalHours / s.frequency).toFixed(2));
      return Array.from({ length: s.frequency }, () => ({ sid: s.id, dur }));
    });
    
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const startOrder = append ? (cycleItems.length > 0 ? Math.max(...cycleItems.map(i => i.order)) + 1 : 0) : 0;
    
    shuffled.forEach((p, i) => {
      const history = lastDataMap.get(p.sid);
      newItems.push({ 
        id: generateId('item'), 
        subjectId: p.sid, 
        cycleId: newCycleId,
        duration: p.dur, 
        completed: false, 
        order: startOrder + i,
        performance: history?.performance, // Repete nota
        sessionUrl: history?.sessionUrl    // Repete link
      });
    });

    if (append) {
      setCycleItems(prev => [...prev, ...newItems]);
    } else {
      setCycleItems(newItems);
    }
  }, [cycleItems]);

  const handleRenovateCycle = useCallback(async () => {
    const activeItems = cycleItems.filter(i => !i.completed);
    if (activeItems.length > 0) {
      if (!confirm("Você ainda possui sessões pendentes no fluxo atual. Deseja adicionar um novo ciclo mesmo assim?")) return;
    }

    const done = cycleItems.filter(i => i.completed);
    if (done.length > 0) {
      const avg = Math.round(done.reduce((a, i) => a + (i.performance || 0), 0) / done.length);
      const entry: CycleHistoryEntry = { 
        id: generateId('h'), 
        completedAt: Date.now(), 
        totalItems: done.length, 
        avgPerformance: avg, 
        totalHours: done.reduce((a, i) => a + i.duration, 0), 
        cycleSnapshot: [...done] 
      };
      setHistory(p => [entry, ...p]);
      if (session) supabaseService.saveHistoryEntry(entry);
    }

    generateCycle(subjects, true);
  }, [cycleItems, subjects, session, generateCycle]);

  const handleMoveItem = useCallback((id: string, direction: 'up' | 'down') => {
    setCycleItems(prev => {
      const items = [...prev].sort((a, b) => a.order - b.order);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return prev;
      
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= items.length) return prev;
      
      // Impedir mover itens concluídos para cima de itens pendentes ou vice-versa se desejar ordem lógica, 
      // mas aqui permitimos organizar livremente dentro da lista
      const tempOrder = items[idx].order;
      items[idx].order = items[newIdx].order;
      items[newIdx].order = tempOrder;
      
      return [...items];
    });
  }, []);

  const handleUpdateUrl = useCallback((id: string, url: string) => {
    setCycleItems(prev => {
      const targetItem = prev.find(i => i.id === id);
      if (!targetItem) return prev;
      
      // Sincroniza em TODAS as sessões da mesma disciplina
      return prev.map(item => 
        item.subjectId === targetItem.subjectId 
          ? { ...item, sessionUrl: url } 
          : item
      );
    });
  }, []);

  const handleAddSubject = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name')).trim();
    const updated = editingSubject 
      ? subjects.map(s => s.id === editingSubject.id ? { ...s, name, totalHours: Number(fd.get('totalHours')), frequency: Number(fd.get('frequency')), notebookUrl: String(fd.get('notebookUrl')) } : s)
      : [...subjects, { id: generateId('sub'), name, totalHours: Number(fd.get('totalHours')), frequency: Number(fd.get('frequency')), notebookUrl: String(fd.get('notebookUrl')), masteryPercentage: 0, color: COLORS[subjects.length % COLORS.length], topics: [] }];
    setSubjects(updated);
    
    if (!editingSubject && cycleItems.length === 0) {
      generateCycle(updated, false);
    }
    setIsModalOpen(false);
  }, [editingSubject, subjects, cycleItems.length, generateCycle]);

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 text-brand-blue font-black animate-pulse">CARREGANDO...</div>;
  if (!session) return <Auth onSuccess={setSession} />;

  return (
    <div className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950 transition-colors font-inter text-slate-900 dark:text-slate-100">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 px-6 h-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-xl font-black uppercase tracking-tighter"><span className="text-brand-blue">MASTER</span><span className="text-brand-orange">CYCLE</span></div>
          <div className={`w-2 h-2 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">{isDarkMode ? '☀️' : '🌙'}</button>
          <button onClick={() => setIsStatsOpen(true)} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-blue">👤</button>
          <button onClick={() => { setEditingSubject(null); setIsModalOpen(true); }} className="h-11 px-6 bg-brand-blue text-white rounded-xl font-black uppercase text-[10px]">Nova Matéria</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 order-2 lg:order-1">
          <CycleList 
            items={cycleItems} 
            subjects={subjects} 
            onToggleComplete={id => setCycleItems(p => p.map(i => i.id === id ? { ...i, completed: !i.completed, completedAt: !i.completed ? Date.now() : undefined } : i))}
            onUpdatePerformance={(id, v) => setCycleItems(p => p.map(i => i.id === id ? { ...i, performance: v } : i))}
            onUpdateUrl={handleUpdateUrl}
            onMoveItem={handleMoveItem} 
            onAppendCycle={handleRenovateCycle} 
            onUpdateSubjectTopics={(sid, t) => setSubjects(p => p.map(s => s.id === sid ? { ...s, topics: t } : s))}
          />
        </div>
        <div className="lg:col-span-4 order-1 lg:order-2 space-y-10">
          <PomodoroTimer />
          <PerformanceRank subjects={subjects} />
          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matérias Ativas</h3>
             {uniqueSubjects.map(s => <SubjectCard key={s.id} subject={s} onDelete={id => { setSubjects(p => p.filter(sub => sub.id !== id)); }} onEdit={s => { setEditingSubject(s); setIsModalOpen(true); }} />)}
          </div>
        </div>
      </main>

      {isStatsOpen && <UserProfile subjects={subjects} cycleItems={cycleItems} history={history} onClose={() => setIsStatsOpen(false)} onSelectHistory={setSelectedHistory} />}
      {selectedHistory && <HistoryDetail entry={selectedHistory} subjects={subjects} onClose={() => setSelectedHistory(null)} />}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleAddSubject} className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg p-10 shadow-2xl space-y-6">
            <h2 className="text-xl font-black uppercase text-center">{editingSubject ? 'Editar' : 'Nova'} Matéria</h2>
            <input name="name" defaultValue={editingSubject?.name} placeholder="Nome da Disciplina" required className="w-full p-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-800 font-bold outline-none focus:border-brand-blue" />
            <div className="grid grid-cols-2 gap-4">
              <input name="totalHours" type="number" defaultValue={editingSubject?.totalHours} placeholder="Carga Horária" className="w-full p-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-800 font-bold outline-none" />
              <input name="frequency" type="number" defaultValue={editingSubject?.frequency} placeholder="Vezes no Ciclo" className="w-full p-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-800 font-bold outline-none" />
            </div>
            <input name="notebookUrl" defaultValue={editingSubject?.notebookUrl} placeholder="Link do Caderno (opcional)" className="w-full p-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-800 outline-none" />
            <div className="flex gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-black text-slate-400 uppercase text-[10px]">Cancelar</button>
              <button type="submit" className="flex-1 p-4 rounded-2xl bg-brand-blue text-white font-black uppercase text-[10px]">Confirmar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
