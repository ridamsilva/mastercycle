
import React, { useState, useEffect } from 'react';
import { Subject, CycleItem, CycleHistoryEntry } from '../types';
import { supabaseService, supabase } from '../services/supabaseService.ts';

interface UserProfileProps {
  subjects: Subject[];
  cycleItems: CycleItem[];
  history: CycleHistoryEntry[];
  onClose: () => void;
  onSelectHistory: (entry: CycleHistoryEntry) => void;
  onDeleteHistory: (ids: string[]) => void;
  onClearHistory: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ 
  subjects, cycleItems, history, onClose, onSelectHistory, onDeleteHistory, onClearHistory 
}) => {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setName(user.user_metadata?.full_name || '');
      }
    };
    fetchUser();
  }, []);

  const totalHours = subjects.reduce((acc, s) => acc + s.totalHours, 0);
  const completedItems = cycleItems.filter(i => i.completed).length;
  const completionRate = cycleItems.length > 0 ? Math.round((completedItems / cycleItems.length) * 100) : 0;
  const avgMastery = subjects.length > 0 
    ? Math.round(subjects.reduce((acc, s) => acc + s.masteryPercentage, 0) / subjects.length) 
    : 0;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setMessage(null);
    try {
      const { error } = await supabaseService.updateProfile(name);
      if (error) throw error;
      setMessage({ text: 'Perfil atualizado com sucesso!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao atualizar perfil', type: 'error' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ text: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' });
      return;
    }
    setIsUpdatingPassword(true);
    setMessage(null);
    try {
      const { error } = await supabaseService.updatePassword(newPassword);
      if (error) throw error;
      setMessage({ text: 'Senha alterada com sucesso!', type: 'success' });
      setNewPassword('');
      setIsPasswordFormOpen(false);
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao atualizar senha', type: 'error' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    await supabaseService.signOut();
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'EXCLUIR CONTA') return;
    setIsDeletingAccount(true);
    try {
      await supabaseService.deleteAccount();
      window.location.reload();
    } catch (err) {
      setMessage({ text: 'Erro ao excluir conta.', type: 'error' });
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const toggleHistorySelection = (id: string) => {
    setSelectedHistoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (confirm(`Deseja excluir ${selectedHistoryIds.length} registros selecionados?`)) {
      onDeleteHistory(selectedHistoryIds);
      setSelectedHistoryIds([]);
      setIsSelectionMode(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-end sm:p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
        
        <div className="relative w-full max-w-md h-full sm:h-auto sm:max-h-[95vh] bg-white dark:bg-slate-900 sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-500">
          <div className="bg-gradient-to-br from-brand-blue to-brand-darkBlue p-8 text-white relative shrink-0">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="flex items-center gap-5 mt-4">
              <div className="w-16 h-16 rounded-[24px] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl overflow-hidden p-3 text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" /></svg>
              </div>
              <div><h2 className="text-xl font-black tracking-tight">{name || 'Estudante'}</h2><p className="text-blue-100/80 text-[10px] font-bold uppercase tracking-wider">{user?.email}</p></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {message && (
              <div className={`p-4 rounded-2xl text-[10px] font-black uppercase border animate-in fade-in zoom-in duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{message.text}</div>
            )}

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Histórico de Ciclos</h3>
              <div className="flex gap-2">
                <button 
                   onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedHistoryIds([]); }} 
                   className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg border ${isSelectionMode ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                  {isSelectionMode ? 'Sair da Seleção' : 'Selecionar'}
                </button>
                <button onClick={onClearHistory} className="flex-1 py-2 text-[9px] font-black uppercase rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50">Excluir Tudo</button>
              </div>

              {isSelectionMode && selectedHistoryIds.length > 0 && (
                <button onClick={handleDeleteSelected} className="w-full py-3 bg-rose-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest animate-in slide-in-from-top-1">
                  Excluir Selecionados ({selectedHistoryIds.length})
                </button>
              )}

              <div className="space-y-3">
                {history.length > 0 ? history.map(h => (
                  <div key={h.id} className="flex items-center gap-3">
                    {isSelectionMode && (
                      <input 
                        type="checkbox" 
                        checked={selectedHistoryIds.includes(h.id)} 
                        onChange={() => toggleHistorySelection(h.id)}
                        className="w-5 h-5 rounded-md border-2 border-slate-200 text-brand-blue"
                      />
                    )}
                    <button 
                      onClick={() => !isSelectionMode && onSelectHistory(h)}
                      className="flex-1 text-left p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-brand-blue transition-all"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase">CICLO FINALIZADO</span>
                        <span className="text-[9px] font-bold text-emerald-500">{h.avgPerformance}% Média</span>
                      </div>
                      <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{new Date(h.completedAt).toLocaleDateString()}</span>
                        <span>{h.totalHours}H Estudadas</span>
                      </div>
                    </button>
                  </div>
                )) : (
                  <p className="text-[10px] font-bold text-slate-400 uppercase text-center py-4">Nenhum histórico encontrado.</p>
                )}
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configurações da Conta</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-2 border-transparent focus:border-brand-blue outline-none font-bold" />
                </div>
                <button type="submit" disabled={isUpdatingProfile} className="w-full py-3 bg-blue-50 text-brand-blue font-black rounded-xl uppercase text-[10px] tracking-widest border border-blue-100">{isUpdatingProfile ? '...' : 'Salvar Nome'}</button>
              </form>
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50">
             <button onClick={handleLogout} className="w-full py-4 bg-slate-200 text-slate-600 font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-slate-300">Sair da Conta</button>
             <button onClick={() => setIsDeleteModalOpen(true)} className="w-full py-4 bg-rose-50 text-rose-600 font-black rounded-2xl uppercase text-xs tracking-widest border border-rose-100">Excluir Conta</button>
          </div>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !isDeletingAccount && setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <h3 className="text-xl font-black mb-4">Tem certeza?</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">Esta ação apagará tudo definitivamente.</p>
            <input type="text" value={deleteConfirmationText} onChange={(e) => setDeleteConfirmationText(e.target.value)} placeholder="EXCLUIR CONTA" className="w-full p-4 bg-slate-50 rounded-2xl border-2 text-center font-black mb-4 outline-none focus:border-rose-500" />
            <button onClick={handleDeleteAccount} disabled={deleteConfirmationText !== 'EXCLUIR CONTA' || isDeletingAccount} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl uppercase text-xs disabled:opacity-20">{isDeletingAccount ? '...' : 'Confirmar'}</button>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfile;
