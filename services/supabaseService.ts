
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../constants.tsx';
import { Subject, CycleItem } from '../types.ts';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const supabaseService = {
  // --- AUTH ---
  async signUp(email: string, pass: string) {
    return await supabase.auth.signUp({ email, password: pass });
  },

  async signIn(email: string, pass: string) {
    return await supabase.auth.signInWithPassword({ email, password: pass });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  },

  // --- DATA ---
  async fetchSubjects(): Promise<Subject[] | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id); 
      
      if (error) throw error;
      
      return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        totalHours: s.total_hours ?? s.totalHours ?? 0,
        frequency: s.frequency,
        notebookUrl: s.notebook_url ?? s.notebookUrl ?? "",
        masteryPercentage: s.mastery_percentage ?? s.masteryPercentage ?? 0,
        color: s.color,
        topics: s.topics || []
      })) as Subject[];
    } catch (error: any) {
      console.error('Erro ao buscar disciplinas:', error.message);
      return null;
    }
  },

  async upsertSubjects(subjects: Subject[]) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || subjects.length === 0) return;

      const formattedSubjects = subjects.map(s => ({
        id: s.id,
        user_id: user.id,
        name: s.name,
        total_hours: s.totalHours, // Padrão snake_case
        frequency: s.frequency,
        notebook_url: s.notebookUrl || null,
        mastery_percentage: s.masteryPercentage || 0,
        color: s.color,
        topics: s.topics || []
      }));

      const { error } = await supabase
        .from('subjects')
        .upsert(formattedSubjects, { onConflict: 'id' });
      
      if (error) {
        console.error("Erro crítico no Upsert Subjects (Verifique se as colunas total_hours e mastery_percentage existem):", error);
        throw error;
      }
    } catch (error: any) {
      console.error('Falha na persistência de disciplinas:', error.message);
      throw error;
    }
  },

  async fetchCycleItems(): Promise<CycleItem[] | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from('cycle_items')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        subjectId: item.subject_id ?? item.subjectId,
        duration: item.duration,
        completed: item.completed,
        order: item.order,
        performance: item.performance || 0,
        sessionUrl: item.session_url ?? item.sessionUrl ?? "",
        completedAt: item.completed_at ?? item.completedAt ?? undefined
      })) as CycleItem[];
    } catch (error: any) {
      console.error('Erro ao buscar ciclo:', error.message);
      return null;
    }
  },

  async upsertCycleItems(items: CycleItem[]) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || items.length === 0) return;
      
      const formattedItems = items.map(item => ({
        id: item.id,
        user_id: user.id,
        subject_id: item.subjectId, // Padrão snake_case
        duration: item.duration,
        completed: item.completed,
        order: item.order,
        performance: item.performance || 0,
        session_url: item.sessionUrl || null,
        completed_at: item.completedAt || null
      }));

      const { error } = await supabase
        .from('cycle_items')
        .upsert(formattedItems, { onConflict: 'id' });
      
      if (error) {
        console.error("Erro crítico no Upsert Cycle Items (Verifique se as colunas subject_id e completed_at existem):", error);
        throw error;
      }
    } catch (error: any) {
      console.error('Falha na persistência do ciclo:', error.message);
      throw error;
    }
  },

  async deleteSubject(id: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const { error } = await supabase.from('subjects').delete().match({ id: id, user_id: user.id });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir:', error.message);
      throw error;
    }
  }
};
