
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

  const createNewSessions = useCallback((currentSubjects: Subject[], lastOrder: number) => {
    const newCycleId = `cycle-${Date.now()}`;
    const pool = currentSubjects.flatMap(s => {
      const dur = Number((s.totalHours / s.frequency).toFixed(2));
      return Array.from({ length: s.frequency }, () => ({ 
        sid: s.id, 
        sname: s.name, 
        scolor: s.color, 
        dur,
        url: s.notebookUrl // Herdando o link do cadastro da disciplina
      }));
    });
    
    const shuffled = pool.sort(() => Math.random() - 0.5);
    
    return shuffled.map((p, i) => ({ 
      id: generateId('item'), 
      subjectId: p.sid, 
      subjectName: p.sname,
      subjectColor: p.scolor,
      cycleId: newCycleId,
      duration: p.dur, 
      completed: false, 
      order: lastOrder + 1 + i,
      sessionUrl: p.url // Definindo o link para as novas sessões
    }));
  }, []);

  const handleAddNewCycle = useCallback(async () => {
    const done = cycleItems.filter(i => i.completed);
    
    if (done.length > 0) {
      const avg = Math.round(done.reduce((a, i) => a + (i.performance || 0), 0) / done.length);
      const entry: CycleHistoryEntry = { 
        id: generateId('h'), 
        completedAt: Date.now(), 
        totalItems: done.length, 
        avgPerformance: avg, 
        totalHours: done.reduce((a, i) => a + i.duration, 0), 
        cycleSnapshot: done.map(d => ({
          ...d,
          subjectName: d.subjectName || subjects.find(s => s.id === d.subjectId)?.name,
          subjectColor: d.subjectColor || subjects.find(s => s.id === d.subjectId)?.color,
        }))
      };
      setHistory(p => [entry, ...p]);
      if (session) supabaseService.saveHistoryEntry(entry);
    }

    const maxOrder = cycleItems.length > 0 ? Math.max(...cycleItems.map(i => i.order)) : 0;
    const newSessions = createNewSessions(subjects, maxOrder);
    
    setCycleItems(prev => [...prev, ...newSessions]);
  }, [cycleItems, subjects, session, createNewSessions]);

  const handleMoveItem = useCallback((id: string, direction: 'up' | 'down') => {
    setCycleItems(prev => {
      const items = [...prev].sort((a, b) => a.order - b.order);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return prev;
      
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= items.length) return prev;
      
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

      // Sincroniza o link com o cadastro principal da disciplina para futuros ciclos
      setSubjects(sPrev => sPrev.map(s => 
        s.id === targetItem.subjectId ? { ...s, notebookUrl: url } : s
      ));

      // Atualiza o link em todas as sessões DESTA disciplina no ciclo atual
      return prev.map(item => 
        item.subjectId === targetItem.subjectId 
          ? { ...item, sessionUrl: url } 
          : item
      );
    });
  }, [setSubjects]);

  const handleAddSubject = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name')).trim();
    const freq = Math.max(1, Number(fd.get('frequency')));
    const hours = Math.max(0, Number(fd.get('totalHours')));
    const url = String(fd.get('notebookUrl'));

    const isDuplicate = subjects.some(s => 
      s.name.toLowerCase() === name.toLowerCase() && 
      (!editingSubject || s.id !== editingSubject.id)
    );

    if (isDuplicate) {
      alert(`Erro: Já existe uma disciplina cadastrada com o nome "${name}". Por favor, escolha um nome diferente.`);
      return;
    }

    if (editingSubject) {
      setSubjects(p => p.map(s => s.id === editingSubject.id ? { ...s, name, totalHours: hours, frequency: freq, notebookUrl: url } : s));
      
      const newDuration = Number((hours / freq).toFixed(2));
      setCycleItems(prev => prev.map(item => {
        if (item.subjectId === editingSubject.id) {
          return {
            ...item,
            subjectName: name,
            duration: newDuration,
            sessionUrl: url // Atualiza o link nas sessões atuais também ao editar matéria
          };
        }
        return item;
      }));
    } else {
      const newSub: Subject = { 
        id: generateId('sub'), 
        name, 
        totalHours: hours, 
        frequency: freq, 
        notebookUrl: url, 
        masteryPercentage: 0, 
        color: COLORS[subjects.length % COLORS.length], 
        topics: [] 
      };
      setSubjects(p => [...p, newSub]);
      
      const dur = Number((hours / freq).toFixed(2));
      const startOrder = cycleItems.length > 0 ? Math.max(...cycleItems.map(i => i.order)) + 1 : 0;
      const newSessions: CycleItem[] = Array.from({ length: freq }, (_, i) => ({
        id: generateId('item'),
        subjectId: newSub.id,
        subjectName: name,
        subjectColor: newSub.color,
        cycleId: `cycle-${Date.now()}`,
        duration: dur,
        completed: false,
        order: startOrder + i,
        sessionUrl: url // Inicia novas sessões com o link fornecido
      }));
      setCycleItems(prev => [...prev, ...newSessions]);
    }
    setIsModalOpen(false);
  }, [editingSubject, subjects, cycleItems]);

  const handleDeleteSubject = useCallback(async (id: string) => {
    if (!confirm("Isso removerá a disciplina das sessões PENDENTES. As sessões concluídas continuarão no histórico. Continuar?")) return;
    setSubjects(p => p.filter(s => s.id !== id));
    setCycleItems(p => p.filter(i => i.subjectId !== id || i.completed));
    if (session) supabaseService.deleteSubject(id);
  }, [session]);

  const handleDeleteHistory = useCallback(async (ids: string[]) => {
    setHistory(prev => prev.filter(h => !ids.includes(h.id)));
    if (session) supabaseService.deleteHistoryEntries(ids);
  }, [session]);

  const handleClearHistory = useCallback(async () => {
    if (!confirm("Isso apagará TODO o seu histórico de estudos permanentemente. Deseja continuar?")) return;
    setHistory([]);
    if (session) supabaseService.clearAllHistory();
  }, [session]);

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
            onAppendCycle={handleAddNewCycle} 
            onUpdateSubjectTopics={(sid, t) => setSubjects(p => p.map(s => s.id === sid ? { ...s, topics: t } : s))}
          />
        </div>
        <div className="lg:col-span-4 order-1 lg:order-2 space-y-10">
          <PomodoroTimer />
          <PerformanceRank subjects={subjects} />
          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disciplinas Ativas</h3>
             {uniqueSubjects.map(s => <SubjectCard key={s.id} subject={s} onDelete={handleDeleteSubject} onEdit={s => { setEditingSubject(s); setIsModalOpen(true); }} />)}
          </div>
        </div>
      </main>

      {isStatsOpen && (
        <UserProfile 
          subjects={subjects} 
          cycleItems={cycleItems} 
          history={history} 
          onClose={() => setIsStatsOpen(false)} 
          onSelectHistory={setSelectedHistory}
          onDeleteHistory={handleDeleteHistory}
          onClearHistory={handleClearHistory}
        />
      )}
      
      {selectedHistory && <HistoryDetail entry={selectedHistory} subjects={subjects} onClose={() => setSelectedHistory(null)} />}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleAddSubject} className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg p-10 shadow-2xl space-y-6">
            <h2 className="text-xl font-black uppercase text-center">{editingSubject ? 'Editar' : 'Nova'} Disciplina</h2>
            <input name="name" defaultValue={editingSubject?.name} placeholder="Nome da Disciplina" required className="w-full p-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-800 font-bold outline-none focus:border-brand-blue" />
            <div className="grid grid-cols-2 gap-4">
              <input name="totalHours" type="number" defaultValue={editingSubject?.totalHours} placeholder="Carga Horária Total" className="w-full p-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-800 font-bold outline-none" />
              <input name="frequency" type="number" defaultValue={editingSubject?.frequency} placeholder="Frequência no Ciclo" className="w-full p-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-800 font-bold outline-none" />
            </div>
            <input name="notebookUrl" defaultValue={editingSubject?.notebookUrl} placeholder="Link do Caderno (opcional)" className="w-full p-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-800 outline-none" />
            <div className="flex gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-black text-slate-400 uppercase text-[10px]">Cancelar</button>
              <button type="submit" className="flex-1 p-4 rounded-2xl bg-brand-blue text-white font-black uppercase text-[10px]">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
