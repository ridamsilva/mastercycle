
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { SUPABASE_URL, SUPABASE_KEY } from '../constants';
import { Subject, CycleItem } from '../types';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const supabaseService = {
  async fetchSubjects(): Promise<Subject[] | null> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*');
      
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Erro ao buscar disciplinas:', error.message || error);
      return null;
    }
  },

  async upsertSubject(subject: Subject) {
    try {
      const { error } = await supabase
        .from('subjects')
        .upsert({
          id: subject.id,
          name: subject.name,
          totalHours: subject.totalHours,
          frequency: subject.frequency,
          notebookUrl: subject.notebookUrl,
          masteryPercentage: subject.masteryPercentage,
          color: subject.color,
          topics: subject.topics 
        });
      
      if (error) throw error;
    } catch (error: any) {
      console.error(`Erro ao salvar disciplina ${subject.name}:`, error.message || error);
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
      
      if (error) throw error;
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
