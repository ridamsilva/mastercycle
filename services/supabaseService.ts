
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLIC_ANON_KEY } from '../constants.tsx';
import { Subject, CycleItem, CycleHistoryEntry } from '../types.ts';

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

  async updatePassword(password: string) {
    return await supabase.auth.updateUser({
      password: password
    });
  },

  async deleteAccount() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from('subjects').delete().eq('user_id', session.user.id);
    await supabase.from('cycle_items').delete().eq('user_id', session.user.id);
    await supabase.from('study_history').delete().eq('user_id', session.user.id);
    return await this.signOut();
  },

  async fetchSubjects(): Promise<Subject[] | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      const { data, error } = await supabase.from('subjects').select('*').eq('user_id', session.user.id);
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
    } catch { return null; }
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
      await supabase.from('subjects').upsert(payload, { onConflict: 'id' });
    } catch {}
  },

  async fetchCycleItems(): Promise<CycleItem[] | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      const { data, error } = await supabase.from('cycle_items').select('*').eq('user_id', session.user.id).order('order', { ascending: true });
      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        subjectId: item.subject_id,
        duration: Number(item.duration),
        completed: Boolean(item.completed),
        order: Number(item.order),
        performance: item.performance != null ? Number(item.performance) : undefined,
        sessionUrl: item.session_url || "",
        completedAt: item.completed_at ? Number(item.completed_at) : undefined
      }));
    } catch { return null; }
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
        performance: item.performance != null ? Number(item.performance) : null,
        session_url: item.sessionUrl || null,
        completed_at: item.completedAt ? Number(item.completedAt) : null
      }));
      await supabase.from('cycle_items').upsert(payload, { onConflict: 'id' });
    } catch {}
  },

  async fetchHistory(): Promise<CycleHistoryEntry[] | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      const { data, error } = await supabase.from('study_history').select('*').eq('user_id', session.user.id).order('completed_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(h => ({
        id: h.id,
        completedAt: Number(h.completed_at),
        totalItems: Number(h.total_items),
        avgPerformance: Number(h.avg_performance),
        totalHours: Number(h.total_hours),
        cycleSnapshot: h.cycle_snapshot || []
      }));
    } catch { return null; }
  },

  async saveHistoryEntry(entry: CycleHistoryEntry) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.from('study_history').insert({
        id: entry.id,
        user_id: session.user.id,
        completed_at: Number(entry.completedAt),
        total_items: Number(entry.totalItems),
        avg_performance: Number(entry.avgPerformance),
        total_hours: Number(entry.totalHours),
        cycle_snapshot: entry.cycleSnapshot
      });
    } catch {}
  },

  async deleteSubject(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from('cycle_items').delete().eq('subject_id', id).eq('user_id', session.user.id);
    await supabase.from('subjects').delete().eq('id', id).eq('user_id', session.user.id);
    return true;
  }
};
