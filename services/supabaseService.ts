
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
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // --- DATA ---
  async fetchSubjects(): Promise<Subject[] | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id); 
      
      if (error) throw error;
      return data as Subject[];
    } catch (error: any) {
      console.error('Erro ao buscar disciplinas:', error.message);
      return null;
    }
  },

  async upsertSubjects(subjects: Subject[]) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || subjects.length === 0) return;

      const formattedSubjects = subjects.map(s => ({
        id: s.id,
        user_id: user.id,
        name: s.name,
        totalHours: s.totalHours,
        frequency: s.frequency,
        notebookUrl: s.notebookUrl || null,
        masteryPercentage: s.masteryPercentage || 0,
        color: s.color,
        topics: s.topics || []
      }));

      const { error } = await supabase
        .from('subjects')
        .upsert(formattedSubjects, { onConflict: 'id' });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao salvar disciplinas:', error.message);
    }
  },

  async deleteSubject(id: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Graças ao ON DELETE CASCADE no SQL, deletar a matéria já limpa o ciclo
      const { error } = await supabase
        .from('subjects')
        .delete()
        .match({ id: id, user_id: user.id });
      
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir:', error.message);
      throw error;
    }
  },

  async fetchCycleItems(): Promise<CycleItem[] | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('cycle_items')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true });

      if (error) throw error;
      return data as CycleItem[];
    } catch (error: any) {
      console.error('Erro ao buscar ciclo:', error.message);
      return null;
    }
  },

  async upsertCycleItems(items: CycleItem[]) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || items.length === 0) return;
      
      const formattedItems = items.map(item => ({
        id: item.id,
        user_id: user.id,
        subjectId: item.subjectId,
        duration: item.duration,
        completed: item.completed,
        order: item.order,
        performance: item.performance || 0,
        sessionUrl: item.sessionUrl || null,
        completedAt: item.completedAt || null
      }));

      const { error } = await supabase
        .from('cycle_items')
        .upsert(formattedItems, { onConflict: 'id' });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao salvar ciclo:', error.message);
    }
  }
};
