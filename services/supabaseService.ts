
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLIC_ANON_KEY } from '../constants.tsx';
import { Subject, CycleItem } from '../types.ts';

// Inicializa o cliente com a chave pública
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_ANON_KEY);

export const supabaseService = {
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

  async updateProfile(fullName: string) {
    return await supabase.auth.updateUser({
      data: { full_name: fullName }
    });
  },

  async updatePassword(newPassword: string) {
    return await supabase.auth.updateUser({
      password: newPassword
    });
  },

  async deleteAccount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await this.signOut();
  },

  async fetchSubjects(): Promise<Subject[] | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      
      return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        totalHours: Number(s.total_hours || 0),
        frequency: Number(s.frequency || 1),
        notebookUrl: s.notebook_url || "",
        masteryPercentage: Number(s.mastery_percentage || 0),
        color: s.color || "#6366f1",
        topics: s.topics || []
      }));
    } catch (e) {
      console.error("Falha ao carregar dados:", e);
      return null;
    }
  },

  async upsertSubjects(subjects: Subject[]) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const payload = subjects.map(s => ({
        id: s.id,
        user_id: session.user.id,
        name: s.name,
        total_hours: Number(s.totalHours),
        frequency: Number(s.frequency),
        notebook_url: s.notebookUrl || "",
        mastery_percentage: Number(s.masteryPercentage || 0),
        color: s.color,
        topics: s.topics || []
      }));

      const { error } = await supabase.from('subjects').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } catch (e) {
      console.error("Erro ao sincronizar disciplinas (upsert):", e);
      throw e;
    }
  },

  async fetchCycleItems(): Promise<CycleItem[] | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data, error } = await supabase
        .from('cycle_items')
        .select('*')
        .eq('user_id', session.user.id)
        .order('order', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        subjectId: item.subject_id,
        duration: Number(item.duration),
        completed: Boolean(item.completed),
        order: Number(item.order),
        performance: (item.performance !== null && item.performance !== undefined) ? Number(item.performance) : undefined,
        sessionUrl: item.session_url || "",
        completedAt: item.completed_at ? Number(item.completed_at) : undefined
      }));
    } catch (e) {
      console.error("Erro ao buscar ciclo:", e);
      return null;
    }
  },

  async upsertCycleItems(items: CycleItem[]) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const payload = items.map(item => ({
        id: item.id,
        user_id: session.user.id,
        subject_id: item.subjectId,
        duration: Number(item.duration),
        completed: Boolean(item.completed),
        order: Number(item.order),
        performance: (item.performance !== undefined && item.performance !== null) ? Number(item.performance) : null,
        session_url: item.sessionUrl || null,
        completed_at: item.completedAt ? Number(item.completedAt) : null
      }));

      const { error } = await supabase.from('cycle_items').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } catch (e) {
      console.error("Erro ao salvar progresso:", e);
      throw e;
    }
  },

  async deleteSubject(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    // Deleta os itens do ciclo vinculados primeiro
    const { error: cycleError } = await supabase
      .from('cycle_items')
      .delete()
      .eq('subject_id', id)
      .eq('user_id', session.user.id);
    
    if (cycleError) throw cycleError;
    
    const { error: subjectError } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (subjectError) throw subjectError;

    return true;
  }
};
