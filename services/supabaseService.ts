
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { SUPABASE_URL, SUPABASE_KEY } from '../constants.tsx';
import { Subject, CycleItem } from '../types.ts';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const supabaseService = {
  async fetchSubjects(): Promise<Subject[] | null> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*');
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('cache')) {
          console.warn('Tabela subjects não encontrada no Supabase. Verifique se as tabelas foram criadas no SQL Editor.');
          return null;
        }
        throw error;
      }
      return data;
    } catch (error: any) {
      console.error('Erro ao buscar disciplinas:', error.message || error);
      return null;
    }
  },

  async upsertSubjects(subjects: Subject[]) {
    try {
      if (subjects.length === 0) return;

      const formattedSubjects = subjects.map(s => ({
        id: s.id,
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
        .upsert(formattedSubjects);
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao salvar disciplinas:', error.message || error);
      throw error;
    }
  },

  async deleteSubject(id: string) {
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao excluir disciplina:', error.message || error);
    }
  },

  async fetchCycleItems(): Promise<CycleItem[] | null> {
    try {
      const { data, error } = await supabase
        .from('cycle_items')
        .select('*')
        .order('order', { ascending: true });
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('cache')) {
          console.warn('Tabela cycle_items não encontrada no Supabase.');
          return null;
        }
        throw error;
      }
      return data;
    } catch (error: any) {
      console.error('Erro ao buscar itens do ciclo:', error.message || error);
      return null;
    }
  },

  async upsertCycleItems(items: CycleItem[]) {
    try {
      if (items.length === 0) return;
      
      const formattedItems = items.map(item => ({
        id: item.id,
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
        .upsert(formattedItems);
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao salvar itens do ciclo:', error.message || error);
      throw error;
    }
  },

  async deleteCycleItem(id: string) {
    try {
      const { error } = await supabase
        .from('cycle_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao excluir item do ciclo:', error.message || error);
    }
  }
};
